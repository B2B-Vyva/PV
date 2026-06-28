CREATE TABLE interactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id               UUID NOT NULL REFERENCES pv_projects(id),
  patient_id               UUID REFERENCES patients(id),
  reporter_id              UUID REFERENCES reporters(id),
  channel                  TEXT NOT NULL
                           CHECK (channel IN (
                             'phone','whatsapp','app','smart_speaker',
                             'caregiver_app','web','kiosk','operator_entry'
                           )),
  transcript_text          TEXT,
  audio_reference          TEXT,
  language                 TEXT NOT NULL DEFAULT 'en',
  duration_seconds         INTEGER,
  interaction_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ai_processed             BOOLEAN NOT NULL DEFAULT FALSE,
  ai_processed_at          TIMESTAMPTZ,
  safety_mention_detected  BOOLEAN NOT NULL DEFAULT FALSE,
  observations_count       INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE safety_observations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id),
  interaction_id          UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  patient_id              UUID REFERENCES patients(id),
  product_id              UUID REFERENCES products(id),
  observation_type        TEXT NOT NULL
                          CHECK (observation_type IN (
                            'adverse_event','medication_error','therapeutic_failure',
                            'fall_risk','hospitalization_mention','death_mention',
                            'caregiver_concern','vitals_alert','dose_confusion'
                          )),
  verbatim_extract        TEXT NOT NULL,
  normalized_term         TEXT,
  suggested_meddra_pt     TEXT,
  suggested_meddra_code   TEXT,
  ai_confidence           NUMERIC(5,1),
  severity_indicator      TEXT DEFAULT 'unknown'
                          CHECK (severity_indicator IN ('mild','moderate','serious','critical','unknown')),
  is_serious              BOOLEAN NOT NULL DEFAULT FALSE,
  seriousness_criteria    TEXT[] DEFAULT '{}',
  is_duplicate_candidate  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE lead_seq START 1000;

CREATE TABLE safety_leads (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id                 UUID NOT NULL REFERENCES pv_projects(id),
  product_id                 UUID REFERENCES products(id),
  patient_id                 UUID REFERENCES patients(id),
  lead_number                TEXT NOT NULL UNIQUE
                             DEFAULT ('SL-' || LPAD(nextval('lead_seq')::TEXT, 5, '0')),
  status                     TEXT NOT NULL DEFAULT 'new'
                             CHECK (status IN (
                               'new','ai_structured','needs_followup',
                               'caregiver_requested','urgent_review',
                               'in_medical_review','ready_handoff',
                               'exported','closed_non_pv',
                               'closed_duplicate','closed_insufficient'
                             )),
  urgency                    TEXT NOT NULL DEFAULT 'standard'
                             CHECK (urgency IN ('standard','urgent','critical')),
  is_serious                 BOOLEAN NOT NULL DEFAULT FALSE,
  seriousness_criteria       TEXT[] DEFAULT '{}',
  suspected_product          TEXT,
  dose                       TEXT,
  route                      TEXT,
  concomitant_meds           TEXT,
  event_description          TEXT,
  suggested_meddra_pt        TEXT,
  suggested_meddra_code      TEXT,
  onset_date                 DATE,
  event_duration             TEXT,
  outcome                    TEXT,
  causality_suggestion       TEXT,
  completeness_score         INTEGER NOT NULL DEFAULT 0,
  has_identifiable_patient   BOOLEAN NOT NULL DEFAULT FALSE,
  has_identifiable_reporter  BOOLEAN NOT NULL DEFAULT FALSE,
  has_suspected_product      BOOLEAN NOT NULL DEFAULT FALSE,
  has_suspected_event        BOOLEAN NOT NULL DEFAULT FALSE,
  missing_fields             TEXT[] DEFAULT '{}',
  ai_narrative               TEXT,
  ai_confidence              INTEGER,
  primary_channel            TEXT,
  primary_language           TEXT,
  assigned_to                UUID REFERENCES ss_users(id),
  medical_reviewer_id        UUID REFERENCES ss_users(id),
  reviewer_notes             TEXT,
  received_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_due_at                 TIMESTAMPTZ,
  first_reviewed_at          TIMESTAMPTZ,
  case_packet_id             UUID,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_evidence (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID NOT NULL REFERENCES safety_leads(id) ON DELETE CASCADE,
  interaction_id  UUID NOT NULL REFERENCES interactions(id),
  observation_id  UUID REFERENCES safety_observations(id),
  evidence_type   TEXT NOT NULL
                  CHECK (evidence_type IN (
                    'primary_interaction','caregiver_confirmation',
                    'follow_up_response','operator_note','system_alert'
                  )),
  added_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE follow_up_tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  lead_id               UUID NOT NULL REFERENCES safety_leads(id) ON DELETE CASCADE,
  patient_id            UUID REFERENCES patients(id),
  reporter_id           UUID REFERENCES reporters(id),
  task_type             TEXT NOT NULL
                        CHECK (task_type IN (
                          'question_to_patient','question_to_caregiver',
                          'reviewer_action_required','medical_review_required'
                        )),
  question_text         TEXT NOT NULL,
  channel               TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','responded','overdue','closed')),
  response_text         TEXT,
  response_received_at  TIMESTAMPTZ,
  due_at                TIMESTAMPTZ,
  created_by            TEXT NOT NULL DEFAULT 'system',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE review_decisions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  lead_id          UUID NOT NULL REFERENCES safety_leads(id),
  reviewer_id      UUID NOT NULL REFERENCES ss_users(id),
  action           TEXT NOT NULL
                   CHECK (action IN (
                     'approved_extraction','rejected_extraction','edited_field',
                     'added_note','requested_followup','caregiver_prompted',
                     'escalated_urgent','merged_duplicate','assigned_medical',
                     'approved_handoff','closed_non_pv',
                     'closed_duplicate','closed_insufficient'
                   )),
  field_edited     TEXT,
  old_value        TEXT,
  new_value        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE packet_seq START 5000;

CREATE TABLE case_packets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  lead_id           UUID NOT NULL REFERENCES safety_leads(id) UNIQUE,
  packet_number     TEXT NOT NULL UNIQUE
                    DEFAULT ('CP-' || LPAD(nextval('packet_seq')::TEXT, 5, '0')),
  e2b_ready_json    JSONB,
  pdf_narrative     TEXT,
  line_listing_row  JSONB,
  export_format     TEXT CHECK (export_format IN ('e2b_r3','pdf','csv','api_webhook')),
  exported_to       TEXT,
  exported_at       TIMESTAMPTZ,
  exported_by       UUID REFERENCES ss_users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE safety_leads
  ADD CONSTRAINT fk_leads_packet
  FOREIGN KEY (case_packet_id) REFERENCES case_packets(id);

CREATE TABLE signals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id            UUID REFERENCES pv_projects(id),
  product_id            UUID REFERENCES products(id),
  drug                  TEXT NOT NULL,
  reaction_meddra_pt    TEXT NOT NULL,
  reaction_meddra_code  TEXT,
  n                     INTEGER NOT NULL DEFAULT 0,
  prr                   NUMERIC(8,2),
  prr_lower_ci          NUMERIC(8,2),
  prr_upper_ci          NUMERIC(8,2),
  ror                   NUMERIC(8,2),
  ebgm                  NUMERIC(8,2),
  chi_squared           NUMERIC(8,2),
  signal_status         TEXT NOT NULL DEFAULT 'baseline'
                        CHECK (signal_status IN ('baseline','monitor','review')),
  first_detected_at     TIMESTAMPTZ DEFAULT NOW(),
  last_computed_at      TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by           UUID REFERENCES ss_users(id),
  reviewed_at           TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, drug, reaction_meddra_pt)
);

CREATE TABLE signal_background_rates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reaction_meddra_code  TEXT NOT NULL UNIQUE,
  reaction_meddra_pt    TEXT NOT NULL,
  background_n          INTEGER NOT NULL,
  background_total      INTEGER NOT NULL DEFAULT 100000,
  data_source           TEXT DEFAULT 'synthetic_pilot',
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  project_id       UUID REFERENCES pv_projects(id),
  user_id          UUID REFERENCES ss_users(id),
  action           TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID,
  previous_state   JSONB,
  new_state        JSONB,
  ip_address       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE model_versions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id),
  model_name       TEXT NOT NULL,
  version_tag      TEXT NOT NULL,
  prompt_hash      TEXT,
  deployed_at      TIMESTAMPTZ DEFAULT NOW(),
  notes            TEXT
);

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is insert-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_insert_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
