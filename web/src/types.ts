export interface Chemical {
  id: string
  name: string
  amount_kg: number
  exposure_pathways: string[]
  use_type: string[]
  health_impact: string
}

export interface Facility {
  id: string
  name: string
  industry: string
  latitude: number
  longitude: number
  employee_count: number
  total_release_kg: number
  chemicals: Chemical[]
  chemical_name: string

  // ML-populated later (safe defaults now)
  risk_score: number | null
  anomaly?: boolean
  max_toxicity?: number
}

export type Scenario = 'normal' | 'doubled' | 'removed'
