import { useEffect, useState, useCallback } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import type { Facility, Scenario } from './types'
import MapView from './MapView.tsx'
import ZonePanel from './ZonePanel.tsx'
import Tooltip from './Tooltip.tsx'
import ScenarioToggles from './ScenarioToggles.tsx'
import Legend from './Legend.tsx'
import Assistant from './assistant/Assistant.tsx'
import './App.css'
import ThreeBackground from './ThreeBackground.tsx'

console.log('MAPBOX TOKEN:', import.meta.env.VITE_MAPBOX_TOKEN)
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

interface Story {
  id: string
  title: string
  subtitle: string
  facilityId: string
  icon: string
  impact: string
  details: string[]
  stats: { label: string; value: string; danger?: boolean }[]
}

const STORIES: Story[] = [
  {
    id: 'portlands',
    title: 'The Waterfront Giant',
    subtitle: 'Toronto\'s #1 Polluter Hiding in Plain Sight',
    facilityId: '508',
    icon: '🏭',
    impact: 'The Portlands Energy Centre releases 423,461 kg of chemicals annually - more than any other facility in Toronto. Located right on our "clean" lakefront, this natural gas plant emits massive amounts of nitrogen oxides (respiratory irritant), formaldehyde (carcinogen), and volatile organic compounds.',
    details: [
      'Releases 396,211 kg of NOx annually - linked to asthma, bronchitis, and reduced lung function',
      'Formaldehyde emissions of 6,272 kg - a known human carcinogen',
      '18,550 kg of VOCs that contribute to smog and respiratory disease',
      'Located within 2km of residential neighborhoods and recreational waterfront areas'
    ],
    stats: [
      { label: 'Total Annual Emissions', value: '423,461 kg', danger: true },
      { label: 'Risk Score', value: '100/100', danger: true },
      { label: 'Carcinogenic Chemicals', value: 'Formaldehyde, Benzene' }
    ]
  },
  {
    id: 'university',
    title: 'Your Tuition Funds Toxic Air',
    subtitle: 'U of T Steam Plant: An Academic Anomaly',
    facilityId: '202',
    icon: '🎓',
    impact: 'The University of Toronto Central Steam Plant has been flagged as an environmental anomaly. While heating campus buildings, it releases 55,804 kg of pollutants annually, including 53,712 kg of nitrogen oxides - exposing students, faculty, and neighboring residents to harmful emissions.',
    details: [
      'Classified as an ANOMALY - releasing chemicals at unusual levels compared to similar facilities',
      '53,712 kg of NOx creates ground-level ozone and particulate matter',
      'Located in the heart of campus, affecting thousands of students daily',
      'Higher education institutions typically have cleaner alternatives available'
    ],
    stats: [
      { label: 'Status', value: 'ANOMALY DETECTED', danger: true },
      { label: 'Total Release', value: '55,804 kg' },
      { label: 'Students Exposed', value: '90,000+' }
    ]
  },
  {
    id: 'sanofi',
    title: 'Vaccines and Poison',
    subtitle: 'Pharmaceutical Giant\'s Toxic Emissions',
    facilityId: '527',
    icon: '💉',
    impact: 'Sanofi Pasteur manufactures vaccines in North York, but this public health mission comes with a hidden cost: 140,112 kg of annual chemical emissions including formaldehyde, a known carcinogen. The facility is located near residential areas and schools.',
    details: [
      '130,763 kg of nitrogen oxides - the highest pharmaceutical NOx emissions in Toronto',
      '297 kg of formaldehyde - causes cancer, respiratory damage, and eye irritation',
      'Anomaly status indicates releases exceed normal pharmaceutical manufacturing levels',
      'Within 1km of multiple schools and residential neighborhoods'
    ],
    stats: [
      { label: 'Total Emissions', value: '140,112 kg', danger: true },
      { label: 'Formaldehyde Release', value: '297 kg', danger: true },
      { label: 'Risk Score', value: '89/100', danger: true }
    ]
  },
  {
    id: 'ckf',
    title: 'The Takeout Container\'s Hidden Cost',
    subtitle: 'Foam Packaging Creates Toxic Cloud',
    facilityId: '22902',
    icon: '📦',
    impact: 'CKF Inc manufactures polystyrene foam products (takeout containers, coffee cups) and releases a staggering 438,267 kg of volatile organic compounds annually - the highest VOC emissions of any facility in our dataset. This single factory emits more pollution than many neighborhoods combined.',
    details: [
      '438,267 kg of VOCs - compounds that cause headaches, respiratory issues, and organ damage',
      'ANOMALY status: emissions are extraordinarily high even for manufacturing',
      'VOCs contribute to ground-level ozone (smog) affecting entire neighborhoods',
      'Located in Etobicoke near residential areas and the airport'
    ],
    stats: [
      { label: 'VOC Emissions', value: '438,267 kg', danger: true },
      { label: 'Status', value: 'CRITICAL ANOMALY', danger: true },
      { label: 'Neighborhood Impact', value: '5km radius' }
    ]
  },
  {
    id: 'wastewater',
    title: 'The Necessary Poison',
    subtitle: 'Sewage Plants Release Heavy Metals',
    facilityId: '569',
    icon: '💧',
    impact: 'Toronto\'s wastewater treatment plants serve a critical function, but Ashbridges Bay alone releases concerning levels of heavy metals including mercury, lead, cadmium, and nickel into the environment. These are neurotoxins and carcinogens that bioaccumulate in our ecosystem.',
    details: [
      '11 kg of mercury - an extreme neurotoxin that damages brains and nervous systems',
      '527 kg of lead - especially dangerous to children\'s developing brains',
      '422 kg of cadmium - causes kidney damage and cancer',
      '118 kg of PAHs (polycyclic aromatic hydrocarbons) - known carcinogens'
    ],
    stats: [
      { label: 'Mercury Released', value: '11 kg', danger: true },
      { label: 'Lead Released', value: '527 kg', danger: true },
      { label: 'Status', value: 'ANOMALY', danger: true }
    ]
  },
  {
    id: 'redpath',
    title: 'Sweet Product, Toxic Process',
    subtitle: 'Sugar Refinery\'s Massive Emissions',
    facilityId: '29269',
    icon: '🍬',
    impact: 'Redpath Sugar\'s downtown waterfront refinery releases 216,492 kg of chemicals annually. While producing a household staple, this facility emits massive amounts of nitrogen oxides and particulate matter that impact nearby communities and contribute to Toronto\'s air quality problems.',
    details: [
      '189,742 kg of NOx - one of the highest emitters in the entire city',
      '5,788 kg of fine particulate matter (PM2.5) - penetrates deep into lungs',
      'Downtown location means emissions affect dense residential and business areas',
      'ANOMALY classification indicates releases exceed industry standards'
    ],
    stats: [
      { label: 'Total Emissions', value: '216,492 kg', danger: true },
      { label: 'NOx Release', value: '189,742 kg', danger: true },
      { label: 'Risk Score', value: '92/100', danger: true }
    ]
  }
]

function App() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [hoverFacility, setHoverFacility] = useState<Facility | null>(null)
  const [selectedZone, setSelectedZone] = useState<Facility[] | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)
  const [storiesVisible, setStoriesVisible] = useState(false)

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

  const handleStoryClick = (storyId: string, facilityId: string) => {
    if (expandedStory === storyId) {
      setExpandedStory(null)
    } else {
      setExpandedStory(storyId)
      // Focus the facility on the map
      setTimeout(() => {
        setFocusedId(facilityId)
      }, 300)
    }
  }

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

        {/* Impact Stats */}
        <motion.div 
          className="impact-stats"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="impact-stat">
            <span className="impact-number">700</span>
            <span className="impact-label">Facilities Tracked</span>
          </div>
          <div className="impact-stat">
            <span className="impact-number danger">15+</span>
            <span className="impact-label">Release Carcinogens</span>
          </div>
          <div className="impact-stat">
            <span className="impact-number warning">42</span>
            <span className="impact-label">Toxic Anomalies</span>
          </div>
        </motion.div>

        {/* Stories Toggle Button */}
        <motion.button
          className="stories-toggle"
          onClick={() => setStoriesVisible(!storiesVisible)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {storiesVisible ? '✕ Close Stories' : '📖 Untold Stories'}
        </motion.button>

        {/* Story Cards */}
        <AnimatePresence>
          {storiesVisible && (
            <motion.div
              className="stories-container"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="stories-grid">
                {STORIES.map((story, idx) => (
                  <motion.div
                    key={story.id}
                    className={`story-card ${expandedStory === story.id ? 'expanded' : ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <button
                      className="story-header"
                      onClick={() => handleStoryClick(story.id, story.facilityId)}
                    >
                      <span className="story-icon">{story.icon}</span>
                      <div className="story-title-group">
                        <h3 className="story-title">{story.title}</h3>
                        <p className="story-subtitle">{story.subtitle}</p>
                      </div>
                      <span className="story-expand">{expandedStory === story.id ? '−' : '+'}</span>
                    </button>
                    
                    <AnimatePresence>
                      {expandedStory === story.id && (
                        <motion.div
                          className="story-content"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <p className="story-impact">{story.impact}</p>
                          
                          <div className="story-stats">
                            {story.stats.map((stat, i) => (
                              <div key={i} className={`story-stat ${stat.danger ? 'danger' : ''}`}>
                                <div className="story-stat-value">{stat.value}</div>
                                <div className="story-stat-label">{stat.label}</div>
                              </div>
                            ))}
                          </div>

                          <div className="story-details">
                            <h4>Key Facts:</h4>
                            <ul>
                              {story.details.map((detail, i) => (
                                <li key={i}>{detail}</li>
                              ))}
                            </ul>
                          </div>

                          <button
                            className="story-cta"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFocusedId(story.facilityId)
                              const mapEl = document.getElementById('map')
                              if (mapEl) {
                                mapEl.scrollIntoView({ behavior: 'smooth' })
                              }
                            }}
                          >
                            View on Map →
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="search-wrap">
          <input
            aria-label="Search facilities"
            className="search-input"
            placeholder="Search by facility, industry, or chemical..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setFocusedId(null) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
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