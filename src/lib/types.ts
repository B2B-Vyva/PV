export type LeadStatus =
  | 'new'
  | 'ai_structured'
  | 'needs_followup'
  | 'caregiver_requested'
  | 'urgent_review'
  | 'in_medical_review'
  | 'ready_handoff'
  | 'exported'
  | 'closed_non_pv'
  | 'closed_duplicate'
  | 'closed_insufficient'

export type SafetyLead = {
  id: string
  lead_number: string
  status: LeadStatus
  urgency: 'standard' | 'urgent' | 'critical'
  is_serious: boolean
  seriousness_criteria: string[]
  event_description: string
  suggested_meddra_pt: string
  suggested_meddra_code: string
  suspected_product: string
  dose: string
  outcome: string
  completeness_score: number
  missing_fields: string[]
  ai_narrative: string
  ai_confidence: number
  primary_channel: string
  received_at: string
  sla_due_at: string
  patient_ref: string
  age_group: string
  sex: string
  country: string
  assigned_to_name?: string
}

export type Evidence = {
  id: string
  lead_id: string
  evidence_type: string
  channel: string
  reporter_type: string
  transcript_text: string
  observation_type: string
  verbatim_extract: string
  suggested_meddra_pt: string
  ai_confidence: number
  interaction_at: string
}

export type Signal = {
  id: string
  drug: string
  reaction_meddra_pt: string
  reaction_meddra_code: string
  n: number
  prr: number
  ror: number
  ebgm: number
  chi_squared: number
  signal_status: 'baseline' | 'monitor' | 'review'
  last_computed_at: string
  notes?: string
}

export type Interaction = {
  id: string
  patient_ref: string
  reporter_type: string
  channel: string
  transcript_text: string
  language: string
  ai_processed: boolean
  safety_mention_detected: boolean
  observations_count: number
  interaction_at: string
}

export type Followup = {
  id: string
  lead_id: string
  lead_number: string
  patient_ref: string
  task_type: string
  question_text: string
  channel: string
  status: 'pending' | 'sent' | 'responded' | 'overdue' | 'closed'
  due_at: string
  response_text?: string
}

export type Project = {
  id: string
  name: string
  status: string
  project_type: string
  countries: string[]
  languages: string[]
  channels_enabled: string[]
  sla_hours: number
  patient_count: number
  lead_count: number
  brand_name: string
}

export type Patient = {
  id: string
  patient_ref: string
  age_group: string
  sex: string
  country: string
  language: string
  condition: string
  preferred_channel: string
  consent_status: string
  status: string
  lead_count: number
  interaction_count: number
}

export type AuditEntry = {
  id: string
  created_at: string
  action: string
  entity_type: string
  user_name: string
  ip_address: string
}
