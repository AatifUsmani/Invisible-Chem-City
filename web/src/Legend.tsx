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
              <strong>Advanced Calculation:</strong> Risk scores are calculated using a multi-factor toxicity-weighted model that considers:
              <br/><br/>
              • <strong>Chemical Toxicity (40%):</strong> Each chemical weighted by EPA/IARC toxicity scores. Mercury, lead, formaldehyde, and carcinogens receive highest weights (80-100/100). VOCs and NOx receive moderate weights (58-68/100).
              <br/><br/>
              • <strong>Release Volume (25%):</strong> Total kg released annually, log-transformed and industry-normalized for fair comparison.
              <br/><br/>
              • <strong>Maximum Single Toxin (20%):</strong> Highest toxicity chemical present - even small amounts of extreme neurotoxins elevate risk.
              <br/><br/>
              • <strong>Heavy Metals (15%):</strong> Mercury, lead, cadmium, chromium VI tracked separately due to bioaccumulation and persistence.
              <br/><br/>
              • <strong>Proximity Multiplier:</strong> Risk amplified 1.0-2.0x based on distance to schools, hospitals, and residential areas. Facilities within 1km of sensitive locations receive up to 40% risk boost.
              <br/><br/>
              • <strong>Carcinogen Bonus:</strong> Facilities releasing 2+ known carcinogens receive +15% risk score.
            </div>
          </motion.div>
        )}
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('proximity')}>
          <span className="legend-section-icon">{expanded === 'proximity' ? '▼' : '▶'}</span>
          Proximity Risk Multiplier
        </button>
        {expanded === 'proximity' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="legend-explanation">
              <strong>What it measures:</strong> How location amplifies chemical risk based on distance to vulnerable populations.
              <br/><br/>
              <strong>Calculation:</strong> Uses haversine distance to major hospitals (SickKids, Toronto General, Sunnybrook), universities (U of T, York), and high-density residential areas. Risk decays with distance:
              <br/>• Within 1km: Up to 2.0x multiplier
              <br/>• 1-5km: 1.3-1.5x multiplier  
              <br/>• Beyond 5km: 1.0x (baseline)
              <br/><br/>
              <strong>Why it matters:</strong> The same emissions near a children's hospital pose greater public health risk than in an industrial zone. Proximity accounts for population density, vulnerable demographics (children, elderly, hospital patients), and exposure pathways.
              <br/><br/>
              <strong>Example:</strong> A facility with proximity score 1.57 has its risk amplified by 57% due to location in downtown core near U of T.
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
              Cumulative chemical emissions to air, water, and land per year.
              <br/><br/>
              • 0-100 kg: Small releases<br/>
              • 100-1,000 kg: Moderate<br/>
              • 1,000-10,000 kg: Large facilities<br/>
              • 10,000+ kg: Major industrial emitters
              <br/><br/>
              <strong>Note:</strong> Volume alone doesn't determine risk. 1kg of mercury is far more dangerous than 1,000kg of water vapor. Risk scores weight each chemical by toxicity.
            </div>
          </motion.div>
        )}
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('anomaly')}>
          <span className="legend-section-icon">{expanded === 'anomaly' ? '▼' : '▶'}</span>
          Anomalies & Detection
        </button>
        {expanded === 'anomaly' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="legend-explanation">
              <strong>What it means:</strong> Anomalies flag facilities with unusual emissions patterns compared to industry peers - potentially indicating reporting errors, process changes, or inadequate controls.
              <br/><br/>
              <strong>Ensemble Detection System:</strong> Uses 4 machine learning methods voting in combination:
              <br/><br/>
              1. <strong>Isolation Forest (Global):</strong> Identifies facilities that deviate from normal patterns across all features (risk score, toxicity exposure, release volume, chemical mix). Uses 200 estimators with 6% contamination threshold.
              <br/><br/>
              2. <strong>Industry-Specific Analysis:</strong> Compares each facility against others in same NAICS industry code. A sugar refinery is judged against refineries, not hospitals. 15% contamination threshold within industries.
              <br/><br/>
              3. <strong>Extreme Risk Detection:</strong> Flags facilities above 95th percentile for raw risk scores - the "long tail" of highest-risk operations.
              <br/><br/>
              4. <strong>Carcinogen + Proximity:</strong> Identifies dangerous combinations - facilities releasing 2+ carcinogens within 1.3x proximity zones.
              <br/><br/>
              <strong>Voting System:</strong> Anomaly declared if 2+ of 4 methods agree. Confidence score (0-100%) shows agreement strength.
              <br/><br/>
              <strong>Features analyzed:</strong> Risk score, toxicity-weighted exposure, release volume, maximum chemical toxicity, carcinogen count, heavy metal mass, industry-normalized release.
              <br/><br/>
              <strong>Why ensemble?</strong> Single models miss patterns. Combining methods catches different anomaly types: statistical outliers, industry deviations, extreme values, and toxic combinations.
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
              <strong>🔍 Search:</strong> Enter your address, workplace, or postal code in the search box. The map finds nearby facilities and shows their risk levels.
              <br/><br/>
              <strong>🖱️ Click dots</strong> for facility details (risk score, chemicals, anomaly status). Click × or outside popup to close.
              <br/><br/>
              <strong>🔍 Click clusters</strong> to zoom into grouped facilities and reveal individual sites.
              <br/><br/>
              <strong>📖 Story Cards:</strong> Scroll up to see curated stories about Toronto's highest-risk facilities - wastewater plants, industrial emitters, and carcinogen sources.
              <br/><br/>
              <strong>🎨 Color Coding:</strong> Red = high risk (66-100), Yellow = medium (33-65), Green = low (0-32). White border = normal facility. Thick white border = anomaly detected.
            </div>
          </motion.div>
        )}
      </div>

      <div className="legend-section">
        <button className="legend-section-header" onClick={() => toggleSection('chemicals')}>
          <span className="legend-section-icon">{expanded === 'chemicals' ? '▼' : '▶'}</span>
          Chemical Toxicity Database
        </button>
        {expanded === 'chemicals' && (
          <motion.div className="legend-section-content" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
            <div className="legend-explanation">
              Each chemical receives a toxicity score (0-100) based on EPA IRIS classifications, IARC carcinogen groups, and bioaccumulation potential. Higher scores = more dangerous.
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Mercury (Score: 100)</div>
                  <div className="legend-description">Extreme neurotoxin. Damages developing brains, accumulates in fish/food chain. Even tiny amounts hazardous.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Lead (Score: 95)</div>
                  <div className="legend-description">Neurotoxin affecting children's IQ and development. No safe blood level. Persists in soil/paint for decades.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Formaldehyde (Score: 92)</div>
                  <div className="legend-description">Known human carcinogen (IARC Group 1). Causes nasal/lung cancer. Respiratory irritant at low doses.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Hexavalent Chromium / Chromium VI (Score: 90)</div>
                  <div className="legend-description">The "Erin Brockovich chemical." Lung carcinogen, damages DNA. Far more toxic than Chromium III.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Benzene (Score: 88)</div>
                  <div className="legend-description">Known carcinogen causing leukemia and blood disorders. No safe exposure level established.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Cadmium (Score: 87)</div>
                  <div className="legend-description">Kidney damage, lung cancer. Accumulates in body over lifetime. Found in industrial emissions and cigarettes.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">PAHs - Polycyclic Aromatic Hydrocarbons (Score: 83)</div>
                  <div className="legend-description">Family of carcinogens from combustion. Benzo(a)pyrene most studied. Linked to lung/skin cancer.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Tetrachloroethylene / Perchloroethylene (Score: 82)</div>
                  <div className="legend-description">Dry-cleaning solvent. Probable carcinogen, neurotoxin. Contaminates groundwater easily.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">PM2.5 - Fine Particulate Matter (Score: 74)</div>
                  <div className="legend-description">Particles less than 2.5μm penetrate deep into lungs. Cardiovascular disease, respiratory illness, premature death.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Nitrogen Oxides - NOx (Score: 68)</div>
                  <div className="legend-description">Combustion byproduct. Respiratory irritant, forms ground-level ozone and smog. Aggravates asthma.</div>
                </div>
              </div>
              <div className="legend-item">
                <div style={{ flex: 1 }}>
                  <div className="legend-label">Volatile Organic Compounds - VOCs (Score: 58)</div>
                  <div className="legend-description">Broad class of carbon-based chemicals. Some carcinogenic (benzene), others irritants. Contribute to smog formation.</div>
                </div>
              </div>
              <div className="legend-explanation" style={{ marginTop: 10 }}>
                <strong>Scoring Methodology:</strong> Toxicity scores derived from EPA Integrated Risk Information System (IRIS), IARC carcinogen classifications (Group 1 = known, Group 2A = probable), acute/chronic toxicity data, and environmental persistence. Carcinogens, neurotoxins, and bioaccumulative compounds score 80-100. Respiratory irritants and moderate toxins score 50-80. Click any facility to see its specific chemicals and toxicity-weighted risk.
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}