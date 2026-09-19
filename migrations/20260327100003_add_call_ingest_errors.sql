-- Persists per-row failures from the call ingest pipeline.
-- Currently ingest errors are only returned in the API response and lost.
-- This table provides a historical error record for the integration health dashboard.
CREATE TABLE IF NOT EXISTS call_ingest_errors (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_org_id  UUID        NOT NULL REFERENCES operator_orgs(id) ON DELETE CASCADE,
  business_id      UUID,
  raw_payload      JSONB       NOT NULL,
  issue            TEXT        NOT NULL,
  source           TEXT        NOT NULL DEFAULT 'api'
                               CHECK (source IN ('api', 'csv', 'startel', 'amtelco', 'zapier')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE call_ingest_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_ingest_errors_operator_select" ON call_ingest_errors
  FOR SELECT
  USING (
    operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_call_ingest_errors_operator_created
  ON call_ingest_errors (operator_org_id, created_at DESC);
