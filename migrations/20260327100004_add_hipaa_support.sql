-- HIPAA support schema.
-- This migration is included in all deployments (including community edition)
-- for schema compatibility. HIPAA compliance workflows (audit trail enforcement,
-- access logging, hipaa_mode toggling) are managed-platform features.
-- Setting hipaa_mode=true on a self-hosted deployment does not constitute
-- HIPAA compliance without the appropriate BAA and operational controls.

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS hipaa_mode BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  operator_org_id UUID REFERENCES operator_orgs(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_events_operator_select" ON audit_events
  FOR SELECT
  USING (
    operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "audit_events_business_select" ON audit_events
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS audit_events_business_id_idx
  ON audit_events (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_events_operator_org_id_idx
  ON audit_events (operator_org_id, created_at DESC);
