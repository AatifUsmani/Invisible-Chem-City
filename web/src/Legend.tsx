import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './Legend.css'

export default function Legend() {
  const [expanded, setExpanded] = useState<string | null>(null)

  // Functional update ensures the state doesn't get "stuck"
  const toggleSection = (section: string) => {
    setExpanded((prev) => (prev === section ? null : section))
  }

  return (
    <div className="legend">
      <div className="legend-header">
        <div className="legend-title">Chemical Risk Guide</div>
      </div>

      {/* --- RISK SCORE SECTION --- */}
      <div className="legend-section">
        <button 
          type="button"
          className={`legend-section-header ${expanded === 'risk' ? 'active' : ''}`} 
          onClick={() => toggleSection('risk')}
        >
          <span className="legend-section-icon" style={{ pointerEvents: 'none' }}>
            {expanded === 'risk' ? '▼' : '▶'}
          </span>
          Risk Score (0-100)
        </button>
        <AnimatePresence>
          {expanded === 'risk' && (
            <motion.div 
              key="risk-content"
              className="legend-section-content" 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#22c55e' }}></div>
                <div>
                  <div className="legend-label">Low Risk (0-32)</div>
                  <div className="legend-description">Minimal chemical hazard.</div>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#eab308' }}></div>
                <div>
                  <div className="legend-label">Medium Risk (33-65)</div>
                  <div className="legend-description">Moderate concern.</div>
                </div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
                <div>
                  <div className="legend-label">High Risk (66-100)</div>
                  <div className="legend-description">Significant hazard.</div>
                </div>
              </div>
              <div className="legend-explanation">
                <strong>Advanced Calculation:</strong> Risk scores use a multi-factor toxicity-weighted model:
                <br/><br/>
                • <strong>Chemical Toxicity (40%):</strong> Each chemical weighted by EPA/IARC scores.
                <br/><br/>
                • <strong>Release Volume (25%):</strong> Total kg released.
                <br/><br/>
                • <strong>Maximum Single Toxin (20%):</strong> Highest toxicity chemical.
                <br/><br/>
                • <strong>Heavy Metals (15%):</strong> Lead/Mercury.
                <br/><br/>
                • <strong>Proximity Multiplier:</strong> Risk amplified by distance.
                <br/><br/>
                • <strong>Carcinogen Bonus:</strong> +15% risk for 2+ carcinogens.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- PROXIMITY SECTION --- */}
      <div className="legend-section">
        <button 
          className={`legend-section-header ${expanded === 'proximity' ? 'active' : ''}`} 
          onClick={() => toggleSection('proximity')}
        >
          <span className="legend-section-icon">{expanded === 'proximity' ? '▼' : '▶'}</span>
          Proximity Risk
        </button>
        <AnimatePresence>
          {expanded === 'proximity' && (
            <motion.div 
              className="legend-section-content" 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="legend-explanation">
                <strong>Location amplifies risk.</strong> Distance to hospitals (SickKids, Toronto General), universities (U of T, York), and residential areas.
                <br/><br/>
                • Within 1km: Up to 2.0x multiplier
                <br/>• 1-5km: 1.3-1.5x multiplier  
                <br/>• Beyond 5km: 1.0x baseline
                <br/><br/>
                <strong>Example:</strong> Score 1.57 = 57% risk increase due to downtown location near U of T.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- TOTAL RELEASE SECTION --- */}
      <div className="legend-section">
        <button 
          className={`legend-section-header ${expanded === 'release' ? 'active' : ''}`} 
          onClick={() => toggleSection('release')}
        >
          <span className="legend-section-icon">{expanded === 'release' ? '▼' : '▶'}</span>
          Total Release (kg)
        </button>
        <AnimatePresence>
          {expanded === 'release' && (
            <motion.div 
              className="legend-section-content" 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="legend-explanation">
                Annual emissions to air, water, and land.
                <br/><br/>
                • 0-100 kg: Small releases<br/>
                • 100-1,000 kg: Moderate<br/>
                • 1,000-10,000 kg: Large facilities<br/>
                • 10,000+ kg: Major emitters
                <br/><br/>
                <strong>Note:</strong> 1kg mercury is more dangerous than 1,000kg water vapor. Risk scores weight by toxicity.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- ANOMALY SECTION --- */}
      <div className="legend-section">
        <button 
          className={`legend-section-header ${expanded === 'anomaly' ? 'active' : ''}`} 
          onClick={() => toggleSection('anomaly')}
        >
          <span className="legend-section-icon">{expanded === 'anomaly' ? '▼' : '▶'}</span>
          Anomaly Detection
        </button>
        <AnimatePresence>
          {expanded === 'anomaly' && (
            <motion.div 
              className="legend-section-content" 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="legend-explanation">
                <strong>Ensemble ML System</strong> using 4 methods:
                <br/><br/>
                1. <strong>Isolation Forest:</strong> Global outliers across all features (200 estimators, 6% contamination).
                <br/><br/>
                2. <strong>Industry Analysis:</strong> Compares within same NAICS code (15% threshold).
                <br/><br/>
                3. <strong>Extreme Risk:</strong> Flags 95th percentile facilities.
                <br/><br/>
                4. <strong>Carcinogen + Proximity:</strong> 2+ carcinogens within 1.3x proximity zones.
                <br/><br/>
                <strong>Voting:</strong> Anomaly if 2+ methods agree. Confidence shows agreement strength.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- HOW TO USE SECTION --- */}
      <div className="legend-section">
        <button 
          className={`legend-section-header ${expanded === 'usage' ? 'active' : ''}`} 
          onClick={() => toggleSection('usage')}
        >
          <span className="legend-section-icon">{expanded === 'usage' ? '▼' : '▶'}</span>
          How to Use
        </button>
        <AnimatePresence>
          {expanded === 'usage' && (
            <motion.div 
              className="legend-section-content" 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="legend-explanation">
                <strong>🔍 Search:</strong> Enter address/postal code to find nearby facilities and risk.
                <br/><br/>
                <strong>🖱️ Click dots:</strong> See facility details (risk, chemicals, anomaly status).
                <br/><br/>
                <strong>📖 Stories:</strong> Scroll to see curated stories about highest-risk facilities.
                <br/><br/>
                <strong>🎨 Colors:</strong> Red (66-100), Yellow (33-65), Green (0-32). Thick white border = anomaly.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- CHEMICALS SECTION --- */}
      <div className="legend-section">
        <button 
          className={`legend-section-header ${expanded === 'chemicals' ? 'active' : ''}`} 
          onClick={() => toggleSection('chemicals')}
        >
          <span className="legend-section-icon">{expanded === 'chemicals' ? '▼' : '▶'}</span>
          Chemical Toxicity
        </button>
        <AnimatePresence>
          {expanded === 'chemicals' && (
            <motion.div 
              className="legend-section-content" 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="legend-explanation">
                Toxicity scores (0-100) based on EPA IRIS, IARC classifications:
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">Mercury (100)</div>
                    <div className="legend-description">Extreme neurotoxin. Accumulates in fish/food chain.</div>
                  </div>
                </div>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">Lead (95)</div>
                    <div className="legend-description">Damages children's IQ. No safe blood level.</div>
                  </div>
                </div>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">Formaldehyde (92)</div>
                    <div className="legend-description">Known carcinogen. Causes nasal/lung cancer.</div>
                  </div>
                </div>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">Chromium VI (90)</div>
                    <div className="legend-description">"Erin Brockovich chemical." Lung carcinogen.</div>
                  </div>
                </div>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">Benzene (88)</div>
                    <div className="legend-description">Causes leukemia. No safe exposure.</div>
                  </div>
                </div>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">PM2.5 (74)</div>
                    <div className="legend-description">Fine particles. Cardiovascular disease.</div>
                  </div>
                </div>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">NOx (68)</div>
                    <div className="legend-description">Respiratory irritant. Forms ozone/smog.</div>
                  </div>
                </div>
                <div className="legend-item">
                  <div style={{ flex: 1 }}>
                    <div className="legend-label">VOCs (58)</div>
                    <div className="legend-description">Some carcinogenic. Contribute to smog.</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}