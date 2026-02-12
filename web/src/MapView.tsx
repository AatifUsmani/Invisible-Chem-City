import { useEffect, useRef, useMemo } from 'react'
import mapboxgl from 'mapbox-gl'
import type { Facility } from './types'
import './MapView.css'

console.log('MAPBOX TOKEN:', import.meta.env.VITE_MAPBOX_TOKEN)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || ''

const TORONTO_CENTER: [number, number] = [-79.38, 43.65]

function riskColor(risk: number | null): string {
  if (risk == null) return '#9ca3af' // gray = not scored
  if (risk < 33) return '#22c55e'
  if (risk < 66) return '#eab308'
  return '#ef4444'
}

interface MapViewProps {
  facilities: Facility[]
  scrollIntensity: number
  onZoneSelect: (facilities: Facility[] | null) => void
  onMapReady: () => void
  focusFacilityId?: string | null
  onFocusComplete?: () => void
}

export default function MapView({ facilities, scrollIntensity, onZoneSelect, onMapReady, focusFacilityId, onFocusComplete }: MapViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const layersInitializedRef = useRef(false)

  // Generate initials from facility name
  function getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3)
  }

  const geojson = useMemo(() => ({
    type: 'FeatureCollection' as const,
    features: facilities.map((f) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [f.longitude, f.latitude] },
      properties: {
        id: f.id,
        name: (f as any).name,
        industry: (f as any).industry,
        risk_score: f.risk_score ?? 0,
        total_release_kg: f.total_release_kg ?? 0,
        main_chemical: (f as any).chemical || (f as any).main_chemical || null,
        color: riskColor(f.risk_score),
        anomaly: f.anomaly ? 1 : 0,
        initials: getInitials((f as any).name || 'Unknown'),
      },
    })),
  }), [facilities])

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    console.log('Mapbox initialization:', { token: token ? `${token.substring(0, 10)}...` : 'MISSING' })
    
    if (!token) {
      console.warn('Mapbox token missing. Add VITE_MAPBOX_TOKEN to .env')
      containerRef.current.innerHTML = '<div style="padding: 20px; color: #999;">Mapbox token not configured. Add VITE_MAPBOX_TOKEN to .env</div>'
      return
    }

    if (mapRef.current) {
      console.log('Map already initialized, skipping')
      return
    }

    try {
      mapboxgl.accessToken = token
      console.log('Token set, creating map...')
      
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: TORONTO_CENTER,
        zoom: 10.2,
        attributionControl: false,
        preserveDrawingBuffer: false,
        pitch: 0,
        bearing: 0,
      })

      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
      mapRef.current = map
      console.log('Map instance created')

      // Cleanup any leftover Mapbox popups that might persist from earlier runs
      try {
        const existingPopups = Array.from(document.querySelectorAll('.mapboxgl-popup'))
        existingPopups.forEach((p) => { if (p.parentElement) p.parentElement.removeChild(p) })
        if (existingPopups.length) console.log('Removed', existingPopups.length, 'pre-existing mapbox popup(s) on init')
      } catch (e) {
        // not critical
      }

      // Handle style loading errors
      map.on('styleimagemissing', (e) => {
        console.warn('Style image missing:', e.id)
      })

      map.on('error', (e) => {
        console.error('Mapbox error event:', e)
        if (e.error) {
          console.error('Error message:', e.error.message)
        }
      })

      // Track style loading
      const handleStyleLoad = () => {
        console.log('✓ Map style loaded successfully')
        onMapReady()
      }

      map.on('load', handleStyleLoad)

      // If already loaded (shouldn't happen but safety check)
      if (map.loaded()) {
        console.log('Map already loaded')
        onMapReady()
      }

      return () => {
        if (mapRef.current) {
          console.log('Cleaning up map...')
          markersRef.current.forEach((m) => m.remove())
          markersRef.current = []
          try {
            mapRef.current.off('load', handleStyleLoad)
            mapRef.current.remove()
          } catch (e) {
            console.warn('Error removing map:', e)
          }
          mapRef.current = null
          layersInitializedRef.current = false
        }
      }
    } catch (err) {
      console.error('Failed to initialize map:', err)
      if (containerRef.current) {
        containerRef.current.innerHTML = `<div style="padding: 20px; color: #ef4444;">Error: ${err instanceof Error ? err.message : 'Unknown error'}</div>`
      }
    }
  }, [onMapReady])

  // Update data and set up layers - wrapped in load event for proper timing
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      console.log('Map not ready yet')
      return
    }

    const setupLayers = () => {
      if (!map.isStyleLoaded()) {
        console.log('Style not loaded yet, waiting...')
        return
      }

      console.log('✓ Map load event fired - setting up layers. Facilities:', facilities.length)

      // Always update geojson if source exists
      const source = map.getSource('facilities') as mapboxgl.GeoJSONSource | undefined
      if (source) {
        try {
          console.log('Updating source data...')
          source.setData(geojson)
          console.log('✓ Source data updated')
        } catch (e) {
          console.warn('Error updating source:', e)
        }
        return // Source exists, just update data
      }

      // If source doesn't exist, create it and all layers
      try {
        console.log('Creating facilities source...')
        map.addSource('facilities', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        })
        console.log('✓ Source created')

        // Find first label layer for proper z-ordering (put our data BEFORE labels)
        const layers = map.getStyle().layers || []
        let labelLayerId: string | undefined
        for (let i = layers.length - 1; i >= 0; i--) {
          const layer = layers[i]
          if (layer.type === 'symbol' && (layer.layout as any)?.['text-field']) {
            labelLayerId = layer.id
            break
          }
        }
        console.log('Found label layer for z-ordering:', labelLayerId)

        // Add layers BEFORE the label layer so they don't get covered
        if (!map.getLayer('plumes')) {
          map.addLayer({
            id: 'plumes',
            type: 'circle',
            source: 'facilities',
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['get', 'total_release_kg'],
                0, 6,
                1000, 30,
                10000, 100,
              ],
              'circle-color': ['coalesce', ['get', 'color'], '#888'],
              'circle-opacity': 0.15,
            },
            filter: ['!', ['has', 'point_count']],
          }, labelLayerId)
          console.log('✓ Plumes layer added (beforeId:', labelLayerId, ')')
        }

        if (!map.getLayer('facilities-cloud')) {
          map.addLayer({
            id: 'facilities-cloud',
            type: 'circle',
            source: 'facilities',
            paint: {
              'circle-radius': ['*', ['+', 4, ['*', ['/', ['get', 'risk_score'], 100], 14]], 1],
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.4,
              'circle-blur': 0.6,
            },
            filter: ['!', ['has', 'point_count']],
          }, labelLayerId)
          console.log('✓ Cloud layer added')
        }

        if (!map.getLayer('unclustered-point')) {
          map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'facilities',
            paint: {
              'circle-radius': 6,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': ['case', ['==', ['get', 'anomaly'], 1], 3, 1],
              'circle-stroke-color': '#fff',
            },
            filter: ['!', ['has', 'point_count']],
          }, labelLayerId)
          console.log('✓ Unclustered points layer added')
        }

        // Add facility labels (initials)
        if (!map.getLayer('facility-labels')) {
          map.addLayer({
            id: 'facility-labels',
            type: 'symbol',
            source: 'facilities',
            layout: {
              'text-field': ['get', 'initials'],
              'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
              'text-size': 10,
              'text-offset': [0, 0],
              'text-anchor': 'center',
            },
            paint: {
              'text-color': '#fff',
              'text-opacity': 0.8,
            },
            filter: ['!', ['has', 'point_count']],
          }, labelLayerId)
          console.log('✓ Facility labels layer added')
        }

        if (!map.getLayer('clusters')) {
          map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'facilities',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 30, '#f28cb1'
              ],
              'circle-radius': [
                'step', ['get', 'point_count'], 15, 10, 20, 30, 30
              ],
            },
          }, labelLayerId)
          console.log('✓ Clusters layer added')
        }

        if (!map.getLayer('cluster-count')) {
          map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'facilities',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            },
          }, labelLayerId)
          console.log('✓ Cluster count layer added')
        }

        layersInitializedRef.current = true
        console.log('✓ All layers initialized and marked ready for animations')

        // Define handlers
        const handleClusterClick = (e: any) => {
          console.log('🖱️ Cluster clicked')
          if (!e.features?.length) return
          const clusterId = e.features[0].properties?.cluster_id
          const coords = (e.features[0].geometry as any).coordinates // Capture coords HERE
          const src = map.getSource('facilities') as any
          if (clusterId == null) return
          src.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
            if (err) {
              console.warn('Error getting cluster expansion zoom:', err)
              return
            }
            console.log('📍 Zooming to cluster at', coords, 'zoom level', zoom)
            map.easeTo({ center: coords, zoom })
          })
        }

        const handlePointClick = (e: any) => {
          console.log('🖱️ Point clicked:', e.features?.[0]?.properties)
          if (!e.features?.length) return
          const props: any = e.features[0].properties || {}
          const id = String(props.id) // Ensure string comparison
          
          console.log('📍 Looking for facility ID:', id, 'Type:', typeof id)
          console.log('📊 Total facilities available:', facilities.length)
          
          // Find full facility data
          const clicked = facilities.find((f) => String(f.id) === id)
          if (!clicked) {
            console.warn('❌ Facility not found with ID:', id)
            console.log('📋 First 3 available:', facilities.slice(0, 3).map(f => ({ id: f.id, name: f.name, idType: typeof f.id })))
            return
          }
          console.log('✅ Found facility:', { name: clicked.name, id: clicked.id, hasChemicals: Boolean(clicked.chemicals?.length) })
          
          const nearby = facilities.filter((f) => distance(f, clicked) < 0.015)
          onZoneSelect(nearby.length > 0 ? nearby : [clicked])

          // Extract and ensure all data is properly typed as strings
          const name = String(clicked.name || 'Unknown').trim()
          const industry = String(clicked.industry || '—').trim()
          const riskScore = clicked.risk_score != null ? Number(clicked.risk_score).toFixed(2) : '—'
          const totalRelease = clicked.total_release_kg != null ? Number(clicked.total_release_kg).toLocaleString() : '—'
          
          console.log('📄 Data for popup:', { name, industry, riskScore, totalRelease })
          console.log('🧪 Chemicals:', clicked.chemicals)
          
          // Determine risk color based on score
          let riskColor = '#9ca3af'
          if (riskScore !== '—') {
            const score = parseFloat(String(riskScore))
            if (score < 33) riskColor = '#22c55e'
            else if (score < 66) riskColor = '#eab308'
            else riskColor = '#ef4444'
          }      
          
          // Create popup content as actual DOM elements instead of HTML string
          const popupContainer = document.createElement('div')
          // mark with a class for easier inspection
          popupContainer.className = 'custom-popup-content'
          popupContainer.style.padding = '16px'
          popupContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
          popupContainer.style.color = '#e4e4e7'
          popupContainer.style.fontSize = '14px'
          popupContainer.style.lineHeight = '1.6'

          // Facility name heading
          const nameEl = document.createElement('h2')
          nameEl.textContent = name
          nameEl.style.margin = '0 0 12px 0'
          nameEl.style.fontSize = '18px'
          nameEl.style.fontWeight = '700'
          nameEl.style.color = '#fafafa'
          popupContainer.appendChild(nameEl)

          // Industry
          const industryEl = document.createElement('p')
          industryEl.textContent = '📍 Industry: ' + industry
          industryEl.style.margin = '0 0 8px 0'
          industryEl.style.fontSize = '13px'
          industryEl.style.opacity = '0.9'
          popupContainer.appendChild(industryEl)

          // Risk Score
          const riskEl = document.createElement('p')
          riskEl.textContent = '⚠️ Risk Score: ' + riskScore + ' / 100'
          riskEl.style.margin = '0 0 8px 0'
          riskEl.style.fontSize = '13px'
          riskEl.style.fontWeight = 'bold'
          riskEl.style.color = riskColor
          popupContainer.appendChild(riskEl)

          // Total Release
          const totalEl = document.createElement('p')
          totalEl.textContent = '📊 Total Release: ' + totalRelease + ' kg'
          totalEl.style.margin = '0 0 12px 0'
          totalEl.style.fontSize = '13px'
          totalEl.style.fontWeight = 'bold'
          popupContainer.appendChild(totalEl)

          // Chemicals heading
          const chemHeading = document.createElement('h4')
          chemHeading.textContent = '🧪 Chemicals (' + (clicked.chemicals?.length || 0) + ')'
          chemHeading.style.margin = '12px 0 8px 0'
          chemHeading.style.fontSize = '13px'
          chemHeading.style.fontWeight = 'bold'
          chemHeading.style.borderTop = '1px solid rgba(255,255,255,0.2)'
          chemHeading.style.paddingTop = '12px'
          popupContainer.appendChild(chemHeading)

          // Chemicals list
          if (clicked.chemicals && clicked.chemicals.length > 0) {
            clicked.chemicals.forEach((chem: any) => {
              const chemEl = document.createElement('p')
              chemEl.textContent = '• ' + String(chem.name) + ': ' + Number(chem.amount_kg).toLocaleString() + ' kg'
              chemEl.style.margin = '4px 0'
              chemEl.style.fontSize = '12px'
              chemEl.style.paddingLeft = '12px'
              popupContainer.appendChild(chemEl)
            })
          } else {
            const noChem = document.createElement('p')
            noChem.textContent = 'No chemical data available'
            noChem.style.margin = '4px 0'
            noChem.style.fontSize = '12px'
            noChem.style.opacity = '0.7'
            popupContainer.appendChild(noChem)
          }

          // Anomaly alert if present
          if (clicked.anomaly) {
            const anomalyEl = document.createElement('p')
            anomalyEl.textContent = '⚠️ ANOMALY DETECTED'
            anomalyEl.style.margin = '12px 0 0 0'
            anomalyEl.style.padding = '8px'
            anomalyEl.style.color = '#ef4444'
            anomalyEl.style.fontWeight = 'bold'
            anomalyEl.style.backgroundColor = 'rgba(239,68,68,0.1)'
            anomalyEl.style.borderRadius = '3px'
            popupContainer.appendChild(anomalyEl)
          }

          console.log('✅ Popup DOM container created with all data')
          console.log('Content:', { name, industry, riskScore, totalRelease, chemicals: clicked.chemicals?.length })
          // Diagnostic: dump innerHTML of constructed container before attaching
          try {
            console.log('DEBUG: popupContainer.innerHTML ->', popupContainer.innerHTML)
            const children = Array.from(popupContainer.children).map((c) => ({ tag: c.tagName, text: (c.textContent || '').trim().slice(0, 120) }))
            console.log('DEBUG: popupContainer children ->', children)
            console.log('DEBUG: computed style for container ->', window.getComputedStyle(popupContainer))
          } catch (e) {
            console.warn('Could not dump popupContainer diagnostics', e)
          }

          // Create a custom popup element appended to the map container (avoids Mapbox popup quirks)
          try {
            // Remove any existing custom popup
            const prev = document.getElementById('custom-facility-popup')
            if (prev && prev.parentElement) prev.parentElement.removeChild(prev)

            // Also remove any leftover Mapbox-created popups to avoid duplicates
            try {
              const mapboxPopups = Array.from(document.querySelectorAll('.mapboxgl-popup'))
              mapboxPopups.forEach((p) => { if (p.parentElement) p.parentElement.removeChild(p) })
              const mapboxTips = Array.from(document.querySelectorAll('.mapboxgl-popup-tip'))
              mapboxTips.forEach((t) => { if (t.parentElement) t.parentElement.removeChild(t) })
              // ensure old popup content nodes are removed too
              const mapboxContents = Array.from(document.querySelectorAll('.mapboxgl-popup-content'))
              mapboxContents.forEach((c) => { if (c.parentElement) c.parentElement.removeChild(c) })
              console.log('Removed', mapboxPopups.length, 'existing Mapbox popup(s) to avoid duplicates')
            } catch (remErr) {
              console.warn('Error while removing leftover Mapbox popups:', remErr)
            }

            // append to body so popup floats above Mapbox canvas and controls
            const mapContainer = map.getContainer()
            const custom = document.createElement('div')
            custom.id = 'custom-facility-popup'
            custom.style.position = 'absolute'
            custom.style.zIndex = '999999'
            custom.style.pointerEvents = 'auto'
            custom.style.transform = 'translate(-50%, -100%)'
            custom.style.left = '0px'
            custom.style.top = '0px'
            custom.style.maxWidth = '560px'
            custom.style.background = 'rgba(18,18,20,0.98)'
            custom.style.color = '#e4e4e7'
            custom.style.border = '1px solid rgba(255,255,255,0.08)'
            custom.style.borderRadius = '10px'
            custom.style.boxShadow = '0 12px 28px rgba(0,0,0,0.5)'
            custom.style.overflow = 'auto'
            custom.style.maxHeight = '85vh'

            // Insert the prepared content container into custom popup
            custom.appendChild(popupContainer)

            // Attach to body so it renders above map canvas
            // Start hidden and animate into view for a smoother UX
            custom.style.opacity = '0'
            custom.style.transform = 'translate(-50%, -105%) scale(0.98)'
            custom.style.transition = 'opacity 260ms ease, transform 260ms cubic-bezier(.2,.9,.2,1)'
            mapContainer.appendChild(custom)

                        // Position popup: Now handled primarily by CSS classes
            // We just need to ensure the ID is set and it's attached to the DOM

            custom.id = 'custom-facility-popup';

            // Attach to map container (if not already attached)
            if (!document.getElementById('custom-facility-popup')) {
              mapContainer.appendChild(custom);
            }


            // Trigger enter animation
            requestAnimationFrame(() => {
              custom.style.opacity = '1'
              custom.style.transform = 'translate(-50%, -100%) scale(1)'
            })

            // Close handlers
            const removeCustom = () => {
              const el = document.getElementById('custom-facility-popup')
              if (el && el.parentElement) el.parentElement.removeChild(el)
              map.off('click', onMapClickClose)
              map.off('move', onMapMoveClose)
              window.removeEventListener('resize', onResizeClose)
              document.removeEventListener('click', onDocumentClick)
            }

            // Handlers - declared as functions so we can remove them
            const onMapClickClose = (_ev?: any) => {
              // map click outside popup should close it
              removeCustom()
            }
            const onMapMoveClose = () => removeCustom()
            const onResizeClose = () => removeCustom()

            // Close when clicking outside the popup
            const onDocumentClick = (evt: MouseEvent) => {
              const target = evt.target as Node | null
              const popupEl = document.getElementById('custom-facility-popup')
              if (!popupEl) return
              if (target && !popupEl.contains(target)) {
                removeCustom()
              }
            }

            // Add a close button in the corner
            const closeBtn = document.createElement('button')
            closeBtn.setAttribute('aria-label', 'Close')
            closeBtn.textContent = '×'
            closeBtn.style.position = 'absolute'
            closeBtn.style.top = '8px'
            closeBtn.style.right = '10px'
            closeBtn.style.background = 'transparent'
            closeBtn.style.border = 'none'
            closeBtn.style.color = '#cbd5e1'
            closeBtn.style.fontSize = '20px'
            closeBtn.style.cursor = 'pointer'
            closeBtn.style.padding = '4px'
            closeBtn.style.lineHeight = '1'
            closeBtn.addEventListener('click', (e) => {
              e.stopPropagation()
              removeCustom()
            })
            custom.appendChild(closeBtn)

            // Attach listeners
            map.on('click', onMapClickClose)
            map.on('move', onMapMoveClose)
            window.addEventListener('resize', onResizeClose)
            // document click must be registered after popup is attached
            setTimeout(() => document.addEventListener('click', onDocumentClick), 0)
          } catch (e) {
            console.warn('Failed to create custom popup', e)
          }
        }

        const handlePointEnter = () => { map.getCanvas().style.cursor = 'pointer' }
        const handlePointLeave = () => { map.getCanvas().style.cursor = '' }

        // Attach handlers - mapbox will handle duplicate listeners
        try {
          map.on('click', 'clusters', handleClusterClick as any)
          map.on('click', 'unclustered-point', handlePointClick as any)
          map.on('mouseenter', 'unclustered-point', handlePointEnter as any)
          map.on('mouseleave', 'unclustered-point', handlePointLeave as any)
          console.log('✓ All event handlers attached (cluster + point click + hover)')
        } catch (e) {
          console.warn('Error attaching handlers:', e)
        }
      } catch (e) {
        console.error('Error setting up layers:', e)
      }
    }

    // If map is already loaded, set up immediately
    if (map.loaded()) {
      console.log('Map already loaded, setting up layers now')
      setupLayers()
    } else {
      // Otherwise wait for load event
      console.log('Waiting for map load event...')
      map.once('load', setupLayers)
    }

    return () => {
      if (map) {
        try {
          map.off('load', setupLayers)
        } catch (e) {
          // map may be removed
        }
      }
    }
  }, [geojson, facilities, onZoneSelect])

  // Programmatic focus: pan to a facility and open popup when parent requests it
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!layersInitializedRef.current) return
    if (!focusFacilityId) return

    // Find the facility by id
    const clicked = facilities.find((f) => String(f.id) === String(focusFacilityId))
    if (!clicked) {
      console.warn('Focus requested but facility not found:', focusFacilityId)
      if (onFocusComplete) onFocusComplete()
      return
    }

    const coord: [number, number] = [clicked.longitude, clicked.latitude]

    try {
      // Pan and zoom a bit to bring the feature into view
      map.easeTo({ center: coord, zoom: Math.max(map.getZoom(), 12), duration: 800 })
    } catch (e) {
      console.warn('Error easing to focused facility:', e)
    }

    // Create a popup similar to interactive click
    try {
      // Clean previous custom popup
      const prev = document.getElementById('custom-facility-popup')
      if (prev && prev.parentElement) prev.parentElement.removeChild(prev)

      const mapContainer = map.getContainer()

      const popupContainer = document.createElement('div')
      popupContainer.className = 'custom-popup-content'
      popupContainer.style.padding = '16px'
      popupContainer.style.fontFamily = 'system-ui, -apple-system, sans-serif'
      popupContainer.style.color = '#e4e4e7'
      popupContainer.style.fontSize = '14px'

      const nameEl = document.createElement('h2')
      nameEl.textContent = String(clicked.name || 'Unknown')
      nameEl.style.margin = '0 0 12px 0'
      nameEl.style.fontSize = '18px'
      nameEl.style.fontWeight = '700'
      popupContainer.appendChild(nameEl)

      const industryEl = document.createElement('p')
      industryEl.textContent = '📍 ' + String(clicked.industry || '—')
      industryEl.style.margin = '0 0 8px 0'
      industryEl.style.fontSize = '13px'
      industryEl.style.opacity = '0.9'
      popupContainer.appendChild(industryEl)

      const riskScore = clicked.risk_score != null ? Number(clicked.risk_score).toFixed(2) : '—'
      const riskEl = document.createElement('p')
      riskEl.textContent = '⚠️ Risk Score: ' + riskScore + ' / 100'
      riskEl.style.margin = '0 0 8px 0'
      riskEl.style.fontSize = '13px'
      riskEl.style.fontWeight = 'bold'
      riskEl.style.color = riskColor(clicked.risk_score ?? null)
      popupContainer.appendChild(riskEl)

      const totalEl = document.createElement('p')
      totalEl.textContent = '📊 Total Release: ' + (clicked.total_release_kg != null ? Number(clicked.total_release_kg).toLocaleString() : '—') + ' kg'
      totalEl.style.margin = '0 0 12px 0'
      totalEl.style.fontSize = '13px'
      totalEl.style.fontWeight = 'bold'
      popupContainer.appendChild(totalEl)

      const chemHeading = document.createElement('h4')
      chemHeading.textContent = '🧪 Chemicals (' + (clicked.chemicals?.length || 0) + ')'
      chemHeading.style.margin = '12px 0 8px 0'
      chemHeading.style.fontSize = '13px'
      chemHeading.style.fontWeight = 'bold'
      popupContainer.appendChild(chemHeading)

      if (clicked.chemicals && clicked.chemicals.length > 0) {
        clicked.chemicals.forEach((chem: any) => {
          const chemEl = document.createElement('p')
          chemEl.textContent = '• ' + String(chem.name) + ': ' + Number(chem.amount_kg).toLocaleString() + ' kg'
          chemEl.style.margin = '4px 0'
          chemEl.style.fontSize = '12px'
          chemEl.style.paddingLeft = '12px'
          popupContainer.appendChild(chemEl)
        })
      } else {
        const noChem = document.createElement('p')
        noChem.textContent = 'No chemical data available'
        noChem.style.margin = '4px 0'
        noChem.style.fontSize = '12px'
        noChem.style.opacity = '0.7'
        popupContainer.appendChild(noChem)
      }

      if (clicked.anomaly) {
        const anomalyEl = document.createElement('p')
        anomalyEl.textContent = '⚠️ ANOMALY DETECTED'
        anomalyEl.style.margin = '12px 0 0 0'
        anomalyEl.style.padding = '8px'
        anomalyEl.style.color = '#ef4444'
        anomalyEl.style.fontWeight = 'bold'
        anomalyEl.style.backgroundColor = 'rgba(239,68,68,0.1)'
        anomalyEl.style.borderRadius = '3px'
        popupContainer.appendChild(anomalyEl)
      }

      const custom = document.createElement('div')
      custom.id = 'custom-facility-popup'
      custom.style.position = 'absolute'
      custom.style.zIndex = '999999'
      custom.style.pointerEvents = 'auto'
      custom.style.transform = 'translate(-50%, -100%)'
      custom.style.left = '0px'
      custom.style.top = '0px'
      custom.style.maxWidth = '560px'
      custom.style.background = 'rgba(18,18,20,0.98)'
      custom.style.color = '#e4e4e7'
      custom.style.border = '1px solid rgba(255,255,255,0.08)'
      custom.style.borderRadius = '10px'
      custom.style.boxShadow = '0 12px 28px rgba(0,0,0,0.5)'
      custom.style.overflow = 'auto'
      custom.style.maxHeight = '85vh'

      custom.appendChild(popupContainer)
      // animate into view
      custom.style.opacity = '0'
      custom.style.transform = 'translate(-50%, -105%) scale(0.98)'
      custom.style.transition = 'opacity 260ms ease, transform 260ms cubic-bezier(.2,.9,.2,1)'
      mapContainer.appendChild(custom) // Append to map, not body

    
      // Position popup: Now handled primarily by CSS classes
      // We just need to ensure the ID is set and it's attached to the DOM

      custom.id = 'custom-facility-popup';

      // Remove all the 'let top/left' and 'mapRect' math logic.
      // The CSS handles the 50% left and 65% top positioning.

      // Attach to map container (if not already attached)
      if (!document.getElementById('custom-facility-popup')) {
        mapContainer.appendChild(custom);
      }

      const removeCustom = () => {
        const el = document.getElementById('custom-facility-popup')
        if (el && el.parentElement) el.parentElement.removeChild(el)
        map.off('click', onMapClickClose)
        map.off('move', onMapMoveClose)
        window.removeEventListener('resize', onResizeClose)
        document.removeEventListener('click', onDocumentClick)
      }

      const onMapClickClose = (_ev?: any) => removeCustom()
      const onMapMoveClose = () => removeCustom()
      const onResizeClose = () => removeCustom()
      const onDocumentClick = (evt: MouseEvent) => {
        const target = evt.target as Node | null
        const popupEl = document.getElementById('custom-facility-popup')
        if (!popupEl) return
        if (target && !popupEl.contains(target)) removeCustom()
      }

      const closeBtn = document.createElement('button')
      closeBtn.setAttribute('aria-label', 'Close')
      closeBtn.textContent = '×'
      closeBtn.style.position = 'absolute'
      closeBtn.style.top = '8px'
      closeBtn.style.right = '10px'
      closeBtn.style.background = 'transparent'
      closeBtn.style.border = 'none'
      closeBtn.style.color = '#cbd5e1'
      closeBtn.style.fontSize = '20px'
      closeBtn.style.cursor = 'pointer'
      closeBtn.style.padding = '4px'
      closeBtn.style.lineHeight = '1'
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); removeCustom() })
      custom.appendChild(closeBtn)

      map.on('click', onMapClickClose)
      map.on('move', onMapMoveClose)
      window.addEventListener('resize', onResizeClose)
      setTimeout(() => document.addEventListener('click', onDocumentClick), 0)

      console.log('✅ Programmatic popup opened for', clicked.name)
    } catch (e) {
      console.warn('Error creating programmatic popup:', e)
    }

    if (onFocusComplete) onFocusComplete()
  }, [focusFacilityId, facilities, onFocusComplete])

  // Update scroll-responsive paint properties for cloud plume animations
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!layersInitializedRef.current) return

    try {
      // Animate cloud layer - expands and pulses based on scroll
      if (map.getLayer('facilities-cloud')) {
        const radiusMult = 0.6 + 0.5 * scrollIntensity
        map.setPaintProperty('facilities-cloud', 'circle-radius', [
          '*',
          ['+', 4, ['*', ['/', ['get', 'risk_score'], 100], 14]],
          radiusMult,
        ])
        map.setPaintProperty('facilities-cloud', 'circle-opacity', 0.15 + 0.45 * scrollIntensity)
        console.log('✓ Cloud animation updated:', { intensity: scrollIntensity, opacity: 0.15 + 0.45 * scrollIntensity })
      }

      // Animate plume layer - grows larger at bottom of page
      if (map.getLayer('plumes')) {
        const plumeOpacity = 0.05 + 0.35 * scrollIntensity
        map.setPaintProperty('plumes', 'circle-opacity', plumeOpacity)
        map.setPaintProperty('plumes', 'circle-radius', [
          'interpolate', ['linear'], ['get', 'total_release_kg'],
          0, 6 * (0.8 + 0.6 * scrollIntensity),
          1000, 30 * (0.8 + 0.6 * scrollIntensity),
          10000, 100 * (0.8 + 0.6 * scrollIntensity),
        ])
      }
    } catch (e) {
      console.warn('Error updating paint properties:', e)
    }
  }, [scrollIntensity])

  return <div ref={containerRef} className="map-view" aria-label="map" />

  function distance(a: Facility, b: Facility): number {
    return Math.sqrt((a.latitude - b.latitude) ** 2 + (a.longitude - b.longitude) ** 2)
  }
}