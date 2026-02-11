import { useState } from 'react'
import { motion } from 'framer-motion'
import './Legend.css'

export default function Legend() {
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggleSection = (section: string) => {
    setExpanded(expanded === section ? null : section)
  }

  return (
    <div className="legend">
      <div className="legend-header">
        <div className="legend-title">Chemical Risk Guide</div>
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('risk')}>
          <span className="legend-section-icon">{expanded === 'risk' ? '▼' : '▶'}</span>
          Risk Score (0-100)
        </button>
        {expanded === 'risk' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
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
              <strong>How calculated:</strong> Volume + toxicity of compounds
            </div>
          </motion.div>
        )}
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('release')}>
          <span className="legend-section-icon">{expanded === 'release' ? '▼' : '▶'}</span>
          Total Release (kg)
        </button>
        {expanded === 'release' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="legend-explanation">
              Cumulative chemical emissions to air/water per year.
              <br/><br/>
              • 0-100 kg: Small releases<br/>
              • 100-1k kg: Moderate<br/>
              • 1k+ kg: Large facilities
            </div>
          </motion.div>
        )}
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('anomaly')}>
          <span className="legend-section-icon">{expanded === 'anomaly' ? '▼' : '▶'}</span>
          Anomalies & Alerts
        </button>
        {expanded === 'anomaly' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="legend-explanation">
              <strong>What it means:</strong> An anomaly indicates the facility's reported emissions or chemical mix look unusual compared to similar sites.
            </div>
            <div style={{ marginTop: 8 }} className="legend-explanation">
              <strong>Signals considered:</strong> large year-over-year jumps in total release, uncommon chemical constituents for that industry, or an unusual chemical ratio compared to peers.
            </div>
            <div style={{ marginTop: 8 }} className="legend-explanation">
              <strong>How detected (brief):</strong> an unsupervised model is used to score how much a facility deviates from expected patterns (e.g., Isolation Forest on historical releases and chemical fingerprints). Higher anomaly scores imply more unusual behavior, but do not by themselves prove an incident — they are prompts for further review.
            </div>
            <div style={{ marginTop: 8 }} className="legend-explanation">
              <strong>Recommended next steps:</strong> verify original reports, inspect historical trends for the facility, and consider contacting the reporting authority if values appear erroneous or unexplained.
            </div>
          </motion.div>
        )}
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('usage')}>
          <span className="legend-section-icon">{expanded === 'usage' ? '▼' : '▶'}</span>
          How to Use
        </button>
        {expanded === 'usage' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="legend-explanation">
              <strong>🖱️ Click dots</strong> for facility details (risk, total release, chemicals). Use the popup's × to close or click outside to dismiss.<br/>
              <strong>🔍 Click clusters</strong> to zoom into grouped facilities; continue zooming to reveal individual sites.<br/>
              <strong>📌 Hover</strong> over dots to preview (if enabled).<br/>
              <strong>⬆️ Scroll</strong> to activate plume and cloud animations which indicate relative risk intensity.
              <br/><br/>
              Tips:
              <br/>• Use the legend sections to understand color coding and units.
              <br/>• The chemicals list shows the compounds reported for each facility; higher mass + high toxicity raises the risk score.
              <br/>• Click a facility and then use the zone panel (if opened) to explore nearby facilities and cumulative exposures.
            </div>
          </motion.div>
        )}
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('chemicals')}>
          <span className="legend-section-icon">{expanded === 'chemicals' ? '▼' : '▶'}</span>
          Chemicals (common names)
        </button>
        {expanded === 'chemicals' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="legend-explanation">
              This list describes common chemicals shown in the dataset and their primary health concerns.
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Particulate Matter 2.5 (PM2.5)</div>
                  <div className="legend-description">Fine particles that irritate lungs and increase cardiorespiratory risk.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Nitrogen Oxides (NOx)</div>
                  <div className="legend-description">Combustion byproduct that harms respiratory health and contributes to ozone formation.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Volatile Organic Compounds (VOCs)</div>
                  <div className="legend-description">A class of organics that can irritate and some are carcinogenic; contribute to smog.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Benzene</div>
                  <div className="legend-description">A known human carcinogen linked to blood cancers (leukemia).</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Cadmium</div>
                  <div className="legend-description">A toxic metal linked to lung cancer and kidney damage.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Chromium (VI)</div>
                  <div className="legend-description">Hexavalent chromium is carcinogenic and damages the respiratory system.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Lead</div>
                  <div className="legend-description">Affects many organs; particularly harmful to children's neurodevelopment.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Mercury</div>
                  <div className="legend-description">Neurotoxin that accumulates in the food chain (fish).</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Formaldehyde</div>
                  <div className="legend-description">Irritant and carcinogen associated with respiratory effects.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Trichloroethylene / Tetrachloroethylene</div>
                  <div className="legend-description">Industrial solvents; linked to liver and kidney effects and cancer risks.</div>
                </div>
              </div>
              <div className="legend-explanation" style={{ marginTop: 10 }}>
                  For full chemical details see the dataset's chemical reference. This section lists the most commonly reported compounds; click a facility to see the exact per-facility chemicals and amounts.
                </div>
              </div>
            </motion.div>
        )}
      </div>
    </div>
  )
}
