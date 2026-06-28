CREATE TABLE patients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id            UUID NOT NULL REFERENCES pv_projects(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id),
  patient_ref           TEXT NOT NULL,
  age_group             TEXT NOT NULL
                        CHECK (age_group IN ('65-70','71-75','76-80','81+')),
  sex                   TEXT NOT NULL CHECK (sex IN ('M','F','U')),
  country               TEXT NOT NULL,
  language              TEXT NOT NULL DEFAULT 'en',
  condition             TEXT,
  medication_schedule   TEXT,
  preferred_channel     TEXT NOT NULL DEFAULT 'app'
                        CHECK (preferred_channel IN (
                          'phone','whatsapp','app','smart_speaker','web'
                        )),
  caregiver_name        TEXT,
  caregiver_consent     BOOLEAN NOT NULL DEFAULT FALSE,
  consent_status        TEXT NOT NULL DEFAULT 'pending'
                        CHECK (consent_status IN ('consented','pending','withdrawn')),
  consent_date          DATE,
  enrollment_date       DATE DEFAULT CURRENT_DATE,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','withdrawn','completed')),
  risk_profile          JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reporters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id),
  patient_id       UUID REFERENCES patients(id),
  reporter_type    TEXT NOT NULL
                   CHECK (reporter_type IN ('patient','caregiver','hcp','operator','system')),
  relationship     TEXT,
  country          TEXT,
  is_primary       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
