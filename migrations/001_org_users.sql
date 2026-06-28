CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  industry            TEXT DEFAULT 'pharmaceutical',
  data_residency      TEXT DEFAULT 'EU',
  mfa_required        BOOLEAN NOT NULL DEFAULT TRUE,
  compliance_profile  JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ss_users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  full_name        TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'pv_reviewer'
                   CHECK (role IN (
                     'pharma_admin',
                     'pv_project_owner',
                     'pv_reviewer',
                     'medical_reviewer',
                     'signal_scientist',
                     'psp_operator',
                     'compliance_user',
                     'external_collaborator'
                   )),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
