CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_name            TEXT NOT NULL,
  generic_name          TEXT,
  dose_forms            TEXT[] DEFAULT '{}',
  routes                TEXT[] DEFAULT '{}',
  strengths             TEXT[] DEFAULT '{}',
  indication            TEXT,
  atc_code              TEXT,
  known_risks           TEXT[] DEFAULT '{}',
  medication_schedule   TEXT,
  special_warnings      TEXT,
  playbook_type         TEXT DEFAULT 'custom'
                        CHECK (playbook_type IN (
                          'diabetes','oncology','neurology','respiratory',
                          'cardiovascular','immunology','custom'
                        )),
  playbook_config       JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pv_projects (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id                 UUID REFERENCES products(id),
  name                       TEXT NOT NULL,
  description                TEXT,
  project_type               TEXT NOT NULL DEFAULT 'post_market_surveillance'
                             CHECK (project_type IN (
                               'post_market_surveillance',
                               'psp_safety',
                               'adherence_monitoring',
                               'therapeutic_failure',
                               'launch_watch',
                               'rural_monitoring',
                               'digital_biomarker'
                             )),
  status                     TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','active','paused','closed')),
  countries                  TEXT[] DEFAULT '{}',
  languages                  TEXT[] DEFAULT ARRAY['en']::TEXT[],
  channels_enabled           TEXT[] DEFAULT ARRAY['app']::TEXT[]
                             CHECK (channels_enabled <@ ARRAY[
                               'phone','whatsapp','app',
                               'smart_speaker','caregiver_app',
                               'kiosk','web','operator_entry'
                             ]::TEXT[]),
  patient_population         TEXT,
  detect_adverse_events      BOOLEAN NOT NULL DEFAULT TRUE,
  detect_medication_errors   BOOLEAN NOT NULL DEFAULT TRUE,
  detect_therapeutic_failure BOOLEAN NOT NULL DEFAULT FALSE,
  detect_fall_risk           BOOLEAN NOT NULL DEFAULT FALSE,
  min_completeness_score     INTEGER NOT NULL DEFAULT 60
                             CHECK (min_completeness_score BETWEEN 0 AND 100),
  sla_hours                  INTEGER NOT NULL DEFAULT 72,
  auto_escalate_serious      BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id                   UUID REFERENCES ss_users(id),
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE follow_up_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id       UUID REFERENCES pv_projects(id),
  question_text    TEXT NOT NULL,
  language         TEXT NOT NULL DEFAULT 'en',
  trigger_category TEXT,
  field_target     TEXT,
  display_order    INTEGER NOT NULL DEFAULT 0,
  is_mandatory     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
