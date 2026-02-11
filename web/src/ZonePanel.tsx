import { motion } from 'framer-motion'
import type { Facility } from './types'
import './ZonePanel.css'

interface ZonePanelProps {
  facilities: Facility[]
  onClose: () => void
}

export default function ZonePanel({ facilities, onClose }: ZonePanelProps) {
  // Total release across all rows
  const totalRelease = facilities.reduce(
    (sum, f) => sum + (f.total_release_kg ?? 0),
    0
  )

  // Average risk score (rows already have it)
  const avgRisk =
    facilities.length > 0
      ? facilities.reduce((s, f) => s + (f.risk_score ?? 0), 0) /
        facilities.length
      : 0

  // Aggregate chemicals by name
  const byChem = facilities.reduce<Record<string, number>>((acc, f) => {
    const name = f.chemical_name
    if (!name) return acc
    acc[name] = (acc[name] ?? 0) + (f.total_release_kg ?? 0)
    return acc
  }, {})

  return (
    <motion.div
      className="zone-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="zone-panel"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="zone-header">
          <h2>Cumulative exposure — zone</h2>
          <button
            type="button"
            className="zone-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="zone-stats">
          <div>Total release: {totalRelease.toLocaleString()} kg</div>
          <div>Average risk score: {avgRisk.toFixed(2)}</div>
        </div>
        <h3>Chemicals</h3>
        <ul className="zone-chem-list">
          {Object.entries(byChem).map(([chem, amt]) => (
            <li key={chem}>
              {chem}: {amt.toLocaleString()} kg
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  )
}     
