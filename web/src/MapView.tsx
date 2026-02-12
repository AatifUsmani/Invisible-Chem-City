import { useEffect, useRef, useMemo, useState } from 'react'
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

// Haversine for search risk analysis
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180; 
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
  const layersInitializedRef = useRef(false)

  // --- SEARCH STATE ---
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [communityRisk, setCommunityRisk] = useState<{
    address: string,
    score: number,
    nearbyCount: number
  } | null>(null)

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
        name: f.name,
        industry: f.industry,
        risk_score: f.risk_score ?? 0,
        total_release_kg: f.total_release_kg ?? 0,
        color: riskColor(f.risk_score),
        anomaly: f.anomaly ? 1 : 0,
        initials: getInitials(f.name || 'Unknown'),
      },
    })),
  }), [facilities])

  // --- SEARCH HANDLER ---
  const handleFindMyRisk = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;
    setIsSearching(true);
    try {
      const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?proximity=-79.38,43.65&access_token=${mapboxgl.accessToken}`);
      const data = await resp.json();
      if (!data.features?.length) {
        alert("Location not found.");
        return;
      }

      const [lon, lat] = data.features[0].center;
      const radiusKm = 3;
      const nearby = facilities.map(f => ({ ...f, dist: haversineDistance(lat, lon, f.latitude, f.longitude) })).filter(f => f.dist <= radiusKm);

      if (nearby.length > 0) {
        const weightedSum = nearby.reduce((acc, f) => acc + (f.risk_score ?? 0) * (1 - f.dist/radiusKm), 0);
        const weightTotal = nearby.reduce((acc, f) => acc + (1 - f.dist/radiusKm), 0);
        setCommunityRisk({ address: data.features[0].place_name, score: weightedSum / weightTotal, nearbyCount: nearby.length });
      } else {
        setCommunityRisk({ address: data.features[0].place_name, score: 0, nearbyCount: 0 });
      }
      mapRef.current.flyTo({ center: [lon, lat], zoom: 14, pitch: 45 });
    } catch (e) {
      console.error("Search error:", e);
    } finally { setIsSearching(false); }
  };

  // --- RESET HANDLER ---
  const handleReset = () => {
    setSearchQuery('');
    setCommunityRisk(null);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: TORONTO_CENTER, zoom: 10.2, pitch: 0, bearing: 0 });
    }
  };

  // --- MAP INIT ---
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: TORONTO_CENTER,
      zoom: 10.2,
      attributionControl: false
    })

    const setupLayers = () => {
      if (!map.isStyleLoaded()) return
      
      const source = map.getSource('facilities') as mapboxgl.GeoJSONSource | undefined
      if (!source) {
        map.addSource('facilities', { type: 'geojson', data: geojson, cluster: true, clusterMaxZoom: 14, clusterRadius: 50 })
        
        // Find label layer for z-ordering
        const layers = map.getStyle().layers || []
        let labelLayerId: string | undefined
        for (let i = layers.length - 1; i >= 0; i--) {
          if (layers[i].type === 'symbol' && (layers[i].layout as any)?.['text-field']) {
            labelLayerId = layers[i].id
            break
          }
        }

        // Add Layers (Verbose & Complete)
        map.addLayer({
          id: 'plumes', type: 'circle', source: 'facilities',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'total_release_kg'], 0, 6, 1000, 30, 10000, 100],
            'circle-color': ['get', 'color'], 'circle-opacity': 0.15
          }, filter: ['!', ['has', 'point_count']]
        }, labelLayerId)

        map.addLayer({
          id: 'facilities-cloud', type: 'circle', source: 'facilities',
          paint: {
            'circle-radius': ['*', ['+', 4, ['*', ['/', ['get', 'risk_score'], 100], 14]], 1],
            'circle-color': ['get', 'color'], 'circle-opacity': 0.4, 'circle-blur': 0.6
          }, filter: ['!', ['has', 'point_count']]
        }, labelLayerId)

        map.addLayer({
          id: 'unclustered-point', type: 'circle', source: 'facilities',
          paint: {
            'circle-radius': 6, 'circle-color': ['get', 'color'],
            'circle-stroke-width': ['case', ['==', ['get', 'anomaly'], 1], 3, 1], 'circle-stroke-color': '#fff'
          }, filter: ['!', ['has', 'point_count']]
        }, labelLayerId)

        map.addLayer({
          id: 'facility-labels', type: 'symbol', source: 'facilities',
          layout: { 'text-field': ['get', 'initials'], 'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'], 'text-size': 10 },
          paint: { 'text-color': '#fff', 'text-opacity': 0.8 },
          filter: ['!', ['has', 'point_count']]
        }, labelLayerId)

        map.addLayer({
          id: 'clusters', type: 'circle', source: 'facilities', filter: ['has', 'point_count'],
          paint: { 'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 30, '#f28cb1'], 'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 30] }
        }, labelLayerId)

        map.addLayer({
          id: 'cluster-count', type: 'symbol', source: 'facilities', filter: ['has', 'point_count'],
          layout: { 'text-field': '{point_count_abbreviated}', 'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'], 'text-size': 12 }
        }, labelLayerId)

        layersInitializedRef.current = true
        onMapReady()
      }
    }

    map.on('load', setupLayers)
    if (map.loaded()) setupLayers()

    // --- EVENTS ---
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (!features.length) return;
      const clusterId = features[0].properties?.cluster_id;
      const source = map.getSource('facilities') as mapboxgl.GeoJSONSource;
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err || zoom === null) return;
        const coords = (features[0].geometry as any).coordinates;
        map.easeTo({ center: coords, zoom: zoom });
      });
    });

    map.on('click', 'unclustered-point', (e) => {
      const id = e.features?.[0].properties?.id
      const f = facilities.find(fac => String(fac.id) === String(id))
      if (f) {
        // Trigger sidebar
        onZoneSelect([f]) 
        
        // --- DETAILED CUSTOM POPUP CONSTRUCTION (Restored) ---
        const prev = document.getElementById('custom-facility-popup')
        if (prev) prev.remove()

        const popupContainer = document.createElement('div')
        popupContainer.className = 'custom-popup-content'
        popupContainer.style.padding = '16px'
        popupContainer.style.color = '#e4e4e7'

        const nameEl = document.createElement('h2')
        nameEl.textContent = f.name
        nameEl.style.fontSize = '18px'; nameEl.style.fontWeight = '700'; nameEl.style.margin = '0 0 12px 0';
        popupContainer.appendChild(nameEl)

        const industryEl = document.createElement('p')
        industryEl.textContent = '📍 Industry: ' + (f.industry || '—')
        industryEl.style.fontSize = '13px'; industryEl.style.opacity = '0.9'; industryEl.style.margin = '0 0 8px 0';
        popupContainer.appendChild(industryEl)

        const riskEl = document.createElement('p')
        riskEl.textContent = '⚠️ Risk Score: ' + (f.risk_score?.toFixed(2) || '—') + ' / 100'
        riskEl.style.color = riskColor(f.risk_score ?? null); riskEl.style.fontWeight = 'bold'; riskEl.style.margin = '0 0 8px 0';
        popupContainer.appendChild(riskEl)

        const chemHeading = document.createElement('h4')
        chemHeading.textContent = '🧪 Chemicals (' + (f.chemicals?.length || 0) + ')'
        chemHeading.style.margin = '12px 0 8px 0'; chemHeading.style.borderTop = '1px solid #444'; chemHeading.style.paddingTop = '12px';
        popupContainer.appendChild(chemHeading)

        if (f.chemicals && f.chemicals.length > 0) {
          f.chemicals.forEach((chem) => {
            const cEl = document.createElement('p')
            cEl.textContent = '• ' + chem.name + ': ' + Number(chem.amount_kg).toLocaleString() + ' kg'
            cEl.style.fontSize = '12px'; cEl.style.margin = '4px 0';
            popupContainer.appendChild(cEl)
          })
        }

        const custom = document.createElement('div')
        custom.id = 'custom-facility-popup'
        custom.style.zIndex = '999999' // Fix z-index
        custom.appendChild(popupContainer)
        
        // Append to map
        map.getContainer().appendChild(custom)
        
        // Close button
        const closeBtn = document.createElement('button')
        closeBtn.textContent = '×'
        closeBtn.className = 'close-popup-btn' // Uses CSS class
        closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); custom.remove(); })
        custom.appendChild(closeBtn)
      }
    })

    map.on('mouseenter', 'unclustered-point', () => map.getCanvas().style.cursor = 'pointer')
    map.on('mouseleave', 'unclustered-point', () => map.getCanvas().style.cursor = '')

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; }
  }, [facilities])

  // --- SCROLL ANIMATION ---
  useEffect(() => {
    const map = mapRef.current
    if (!map || !layersInitializedRef.current) return
    try {
      if (map.getLayer('facilities-cloud')) {
        const radiusMult = 0.6 + 0.5 * scrollIntensity
        map.setPaintProperty('facilities-cloud', 'circle-radius', ['*', ['+', 4, ['*', ['/', ['get', 'risk_score'], 100], 14]], radiusMult])
        map.setPaintProperty('facilities-cloud', 'circle-opacity', 0.15 + 0.45 * scrollIntensity)
      }
      if (map.getLayer('plumes')) {
        const plumeOpacity = 0.05 + 0.35 * scrollIntensity
        map.setPaintProperty('plumes', 'circle-opacity', plumeOpacity)
      }
    } catch (e) { console.warn(e) }
  }, [scrollIntensity])

  // --- FOCUS EFFECT ---
  useEffect(() => {
    if (focusFacilityId && mapRef.current) {
      const f = facilities.find(fac => String(fac.id) === String(focusFacilityId))
      if (f) {
        mapRef.current.easeTo({ center: [f.longitude, f.latitude], zoom: 14 })
        // Could reuse popup logic here if needed
        onZoneSelect([f])
        if (onFocusComplete) onFocusComplete()
      }
    }
  }, [focusFacilityId, facilities])

  return (
    <div className="map-view-main" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ position: 'absolute', top: 0, bottom: 0, width: '100%' }} />
      
      {/* SEARCH BAR with RESET */}
      <div className="find-my-risk-container">
        <div className="search-bar-glass">
          <input 
            type="text" 
            placeholder="Find my community risk..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFindMyRisk()}
          />
          {(searchQuery || communityRisk) && (
            <button className="reset-btn" onClick={handleReset}>✕</button>
          )}
          <button onClick={handleFindMyRisk} disabled={isSearching}>
            {isSearching ? '...' : '→'}
          </button>
        </div>
      </div>

      {/* COMMUNITY RISK CARD */}
      {communityRisk && (
        <div className="community-risk-card">
          <button className="close-risk-card" onClick={() => setCommunityRisk(null)}>&times;</button>
          <div className="risk-address">{communityRisk.address.split(',')[0]}</div>
          <div className="risk-data-flex">
            <div className="risk-score-circle" style={{ borderColor: riskColor(communityRisk.score) }}>
              <div className="score-val">{communityRisk.score.toFixed(1)}</div>
              <div className="score-label">RISK</div>
            </div>
            <div className="risk-stats">
              <div className="stat-item"><strong>{communityRisk.nearbyCount}</strong> facilities</div>
              <div className="stat-item">within 3km radius</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}