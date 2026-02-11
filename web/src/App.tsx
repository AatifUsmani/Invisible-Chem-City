import { useEffect, useState, useCallback } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import type { Facility, Scenario } from './types'
import MapView from './MapView.tsx'
import ZonePanel from './ZonePanel.tsx'
import Tooltip from './Tooltip.tsx'
import ScenarioToggles from './ScenarioToggles.tsx'
import Legend from './Legend.tsx'
import Assistant from './assistant/Assistant.tsx'
import './App.css'
import ThreeBackground from './ThreeBackground'

console.log('MAPBOX TOKEN:', import.meta.env.VITE_MAPBOX_TOKEN)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

function App() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [hoverFacility, setHoverFacility] = useState<Facility | null>(null)
  const [selectedZone, setSelectedZone] = useState<Facility[] | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const { scrollYProgress } = useScroll()
  const intensity = useTransform(scrollYProgress, [0, 0.4, 0.8, 1], [0.3, 0.7, 1, 0.85])
  const [scrollIntensity, setScrollIntensity] = useState(0.5)

  useEffect(() => {
    intensity.on('change', (v) => setScrollIntensity(v))
  }, [intensity])

  useEffect(() => {
    fetch('./data/facilities.json')
      .then((r) => {
        console.log('Facilities fetch response:', { status: r.status, ok: r.ok })
        return r.json()
      })
      .then((data) => {
        console.log('Facilities loaded:', {
          count: data.length,
          sample: data[0],
          withRiskScores: data.filter((f: any) => f.risk_score != null).length,
        })
        setFacilities(data)
      })
      .catch((err) => {
        console.error('Failed to load facilities:', err)
        setFacilities([])
      })
  }, [])

  const getVisibleFacilities = useCallback(() => {
    if (scenario === 'removed') return []
    const transformed = facilities.map((f) => ({
      ...f,
      risk_score: scenario === 'doubled' ? Math.min(100, (f.risk_score ?? 0) * 1.5) : (f.risk_score ?? 0),
      total_release_kg: scenario === 'doubled' ? (f.total_release_kg ?? 0) * 2 : (f.total_release_kg ?? 0),
    }))

    const term = searchTerm.trim().toLowerCase()
    if (!term) return transformed

    return transformed.filter((f) => {
      const name = String((f as any).name || '').toLowerCase()
      const industry = String((f as any).industry || '').toLowerCase()
      const chems = (f as any).chemicals ? (f as any).chemicals.map((c: any) => String(c.name || '').toLowerCase()).join(' ') : ''
      return name.includes(term) || industry.includes(term) || chems.includes(term)
    })
  }, [facilities, scenario])

  const visibleFacilities = getVisibleFacilities()

  return (
    <div className="app">
      <ThreeBackground />
      <header className="header">
        <motion.h1 className="title" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          Invisible City
        </motion.h1>
        <motion.p className="tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
          Mapping hidden chemical risk in Toronto
        </motion.p>
        <div className="search-wrap">
          <input
            aria-label="Search facilities"
            className="search-input"
            placeholder="Search by facility, industry, or chemical..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setFocusedId(null) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Focus the first matching facility (if any)
                if (visibleFacilities && visibleFacilities.length > 0) {
                  setFocusedId(String(visibleFacilities[0].id))
                }
              }
            }}
          />
        </div>
        <motion.div className="cta-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <a href="#map" className="cta">Explore the Map</a>
        </motion.div>
        <div className="scroll-hint">
          🔴 Red = High Risk | 🟡 Yellow = Medium | 🟢 Green = Low Risk
        </div>
      </header>

      <main className="main">
        <div id="map" className="map-container">
          {!MAPBOX_TOKEN && (
            <div className="mapbox-warning">
              Add <code>VITE_MAPBOX_TOKEN</code> to <code>.env</code> for the map. Using placeholder.
            </div>
          )}
          <MapView
            facilities={visibleFacilities}
            scrollIntensity={scrollIntensity}
            onZoneSelect={setSelectedZone}
            onMapReady={() => {}}
            focusFacilityId={focusedId}
            onFocusComplete={() => setFocusedId(null)}
          />
        </div>

        <motion.div
          className="overlay-panel scenario-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ScenarioToggles scenario={scenario} onChange={setScenario} />
        </motion.div>

        {hoverFacility && (
          <Tooltip facility={hoverFacility} scenario={scenario} onClose={() => setHoverFacility(null)} />
        )}

        {selectedZone && selectedZone.length > 0 && (
          <ZonePanel facilities={selectedZone} onClose={() => setSelectedZone(null)} />
        )}

        <Legend />
      </main>

      <footer className="footer">
        <p>Data: facility-level risk scores and chemical releases. Anomalies = facilities that behave unusually vs peers.</p>
        <p><a href="https://open.toronto.ca/dataset/chemical-tracking-chemtrac/" target="_blank" rel="noopener noreferrer">Toronto Chemtrac / Open Data</a></p>
      </footer>

      <Assistant facilities={facilities} selectedZone={selectedZone} />
    </div>
  )
}

export default App
