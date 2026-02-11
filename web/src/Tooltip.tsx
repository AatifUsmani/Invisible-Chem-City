import { motion } from 'framer-motion'
import type { Facility, Scenario } from './types'
import './Tooltip.css'

interface TooltipProps {
  facility: Facility
  scenario: Scenario
  onClose: () => void
}

export default function Tooltip({ facility, scenario, onClose }: TooltipProps) {
  const baseRisk = facility.risk_score ?? 0

  const displayRisk =
    scenario === 'doubled'
      ? Math.min(100, baseRisk * 1.5)
      : baseRisk

  const displayRelease =
    scenario === 'doubled'
      ? facility.total_release_kg * 2
      : facility.total_release_kg

  return (
    <motion.div
      className="tooltip-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="tooltip-card"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tooltip-header">
          <strong>{facility.name}</strong>
          {facility.anomaly && (
            <span className="anomaly-badge">Anomaly</span>
          )}
        </div>

        <p className="tooltip-industry">
          {facility.industry}
        </p>

        <dl className="tooltip-stats">
          <dt>Risk score</dt>
          <dd>
            {facility.risk_score == null
              ? 'Not scored yet'
              : displayRisk.toFixed(1)}
          </dd>

          <dt>Total release</dt>
          <dd>
            {displayRelease.toLocaleString('en-CA', {
              maximumFractionDigits: 0
            })}{' '}
            kg
          </dd>
        </dl>

        <p className="tooltip-chemicals">Reported substances</p>
        <ul className="tooltip-list">
          {facility.chemicals
            .filter((c) => c.amount_kg > 0)
            .sort((a, b) => b.amount_kg - a.amount_kg)
            .slice(0, 6)
            .map((c) => (
              <li key={c.id}>
                <span className="chem-name">{c.name}</span>{' '}
                {c.amount_kg.toLocaleString('en-CA', {
                  maximumFractionDigits: 0
                })}{' '}
                kg
              </li>
            ))}
        </ul>

        <p className="tooltip-hint">
          Click facility on map to see zone exposure
        </p>
      </motion.div>
    </motion.div>
  )
}
