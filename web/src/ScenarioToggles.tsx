import type { Scenario } from './types'
import './ScenarioToggles.css'

interface ScenarioTogglesProps {
  scenario: Scenario
  onChange: (s: Scenario) => void
}

const options: { value: Scenario; label: string }[] = [
  { value: 'normal', label: 'Current' },
  { value: 'removed', label: 'What if removed?' },
  { value: 'doubled', label: 'What if 2× emissions?' },
]

export default function ScenarioToggles({ scenario, onChange }: ScenarioTogglesProps) {
  return (
    <div className="scenario-toggles">
      <span className="scenario-label">Scenario</span>
      <div className="scenario-buttons">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`scenario-btn ${scenario === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
