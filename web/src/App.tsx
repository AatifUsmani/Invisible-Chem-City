import { useEffect, useState} from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import type { Facility } from './types'
import MapView from './MapView.tsx'
import ZonePanel from './ZonePanel.tsx'
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
    id: 'wastewater',
    title: 'The Necessary Poison',
    subtitle: 'Toronto\'s Sewage Plants: Essential but Deadly',
    facilityId: '569',
    icon: '💧',
    impact: 'Toronto\'s three wastewater treatment plants rank as the city\'s highest risk facilities. Ashbridges Bay (#1, risk 97.26) and Highland Creek (#2, risk 100) release mercury, lead, cadmium, and PAHs - neurotoxins and carcinogens that bioaccumulate in Lake Ontario and enter our food chain.',
    details: [
      'Highland Creek releases 11 kg of mercury annually - an extreme neurotoxin that damages developing brains',
      'Ashbridges Bay emits 527 kg of lead - especially dangerous to children within a 5km radius',
      '422 kg of cadmium causes kidney damage and cancer, persisting in soil for decades',
      'All three plants flagged as ANOMALIES - releasing heavy metals at unusual levels for modern treatment facilities'
    ],
    stats: [
      { label: 'Combined Risk Score', value: '97-100/100', danger: true },
      { label: 'Mercury Released', value: '11 kg/year', danger: true },
      { label: 'Status', value: 'CRITICAL ANOMALY', danger: true }
    ]
  },
  {
    id: 'owens',
    title: 'Fiberglass Nightmare',
    subtitle: 'Insulation Factory\'s Carcinogenic Cloud',
    facilityId: '23905',
    icon: '🏚️',
    impact: 'Owens Corning manufactures fiberglass insulation while releasing formaldehyde (carcinogen) and hexavalent chromium - the "Erin Brockovich chemical." Risk score 80.79, flagged as ANOMALY for releasing carcinogens at levels far exceeding industry norms.',
    details: [
      'Formaldehyde emissions cause cancer, respiratory damage, and eye irritation in nearby communities',
      'Hexavalent chromium (Chromium VI) is a known human carcinogen that damages DNA',
      'ANOMALY status indicates releases are extraordinarily high even for manufacturing',
      'Located in residential area - families living within 2km breathe these emissions daily'
    ],
    stats: [
      { label: 'Risk Score', value: '80.79/100', danger: true },
      { label: 'Carcinogens Released', value: '1 type', danger: true },
      { label: 'Status', value: 'ANOMALY', danger: true }
    ]
  },
  {
    id: 'ingot',
    title: 'Metal Foundry\'s Toxic Legacy',
    subtitle: 'Lead and Heavy Metals in Your Backyard',
    facilityId: '24200',
    icon: '⚙️',
    impact: 'Ingot Metal Company operates a metal foundry with a risk score of 79.82. This ANOMALY facility releases lead, cadmium, and other heavy metals that accumulate in soil and water. Located near residential areas with a 1.06 proximity risk multiplier.',
    details: [
      'Lead exposure causes permanent brain damage, especially in children under 6',
      'Heavy metals don\'t break down - they accumulate in the environment for generations',
      'ANOMALY classification shows releases exceed what\'s normal for similar foundries',
      'Proximity risk 1.06 means nearby residents face elevated exposure'
    ],
    stats: [
      { label: 'Risk Score', value: '79.82/100', danger: true },
      { label: 'Proximity Risk', value: '1.06x', danger: true },
      { label: 'Status', value: 'ANOMALY', danger: true }
    ]
  },
  {
    id: 'university',
    title: 'Your Tuition Funds Toxic Air',
    subtitle: 'U of T Steam Plant Near Downtown Core',
    facilityId: '202',
    icon: '🎓',
    impact: 'University of Toronto Central Steam Plant (risk 66.63) heats campus buildings while releasing 55,804 kg of nitrogen oxides annually. Located in dense downtown core with 1.57 proximity multiplier - thousands of students, residents, and workers exposed daily.',
    details: [
      '53,712 kg of NOx creates ground-level ozone and fine particulate matter',
      'Proximity score 1.57 means location amplifies risk by 57% due to population density',
      'Downtown location means emissions affect Canada\'s highest-density urban area',
      'Educational institutions typically have cleaner alternatives available'
    ],
    stats: [
      { label: 'Risk Score', value: '66.63/100', danger: true },
      { label: 'Proximity Risk', value: '1.57x', danger: true },
      { label: 'Students Exposed', value: '90,000+' }
    ]
  },
  {
    id: 'redpath',
    title: 'Sweet Product, Toxic Process',
    subtitle: 'Sugar Refinery\'s Downtown Emissions',
    facilityId: '29269',
    icon: '🍬',
    impact: 'Redpath Sugar\'s waterfront refinery (risk 65.35) releases 216,492 kg annually including massive nitrogen oxide emissions. ANOMALY status indicates releases exceed industry standards. Proximity score 1.26 amplifies risk in dense downtown location.',
    details: [
      '189,742 kg of NOx - one of the highest single-pollutant emitters in the city',
      '5,788 kg of fine particulate matter (PM2.5) penetrates deep into lungs',
      'Downtown waterfront location affects office workers, residents, and tourists',
      'ANOMALY classification shows unusual emissions for sugar refining operations'
    ],
    stats: [
      { label: 'Total Emissions', value: '216,492 kg', danger: true },
      { label: 'Proximity Risk', value: '1.26x', danger: true },
      { label: 'Status', value: 'ANOMALY', danger: true }
    ]
  },
  {
    id: 'portlands',
    title: 'The Waterfront Polluter',
    subtitle: 'Power Plant With Carcinogenic Emissions',
    facilityId: '508',
    icon: '🏭',
    impact: 'Portlands Energy Centre (risk 69.59) generates electricity while releasing formaldehyde, benzene, and other carcinogens. With 3 carcinogenic chemicals and ANOMALY status, this facility represents a significant cancer risk on Toronto\'s "clean" waterfront.',
    details: [
      'Releases 3 different known carcinogens including formaldehyde and benzene',
      'Formaldehyde emissions of 6,272 kg - causes cancer and respiratory disease',
      'ANOMALY status indicates unusual emissions for a natural gas power plant',
      'Located within 2km of recreational waterfront and residential areas'
    ],
    stats: [
      { label: 'Risk Score', value: '69.59/100', danger: true },
      { label: 'Carcinogens', value: '3 types', danger: true },
      { label: 'Status', value: 'ANOMALY', danger: true }
    ]
  }
]

function App() {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedZone, setSelectedZone] = useState<Facility[] | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)

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

        {/* Stories section - always visible */}
        <motion.div
          className="stories-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        ></motion.div>

        {/* Story Cards */}
        <AnimatePresence>
          { (
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
            facilities={facilities}
            scrollIntensity={scrollIntensity}
            onZoneSelect={setSelectedZone}
            onMapReady={() => {}}
            focusFacilityId={focusedId}
            onFocusComplete={() => setFocusedId(null)}
          />
        </div>

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