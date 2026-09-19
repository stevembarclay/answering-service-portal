-- migrations/20260311100100_create_usage_periods.sql
-- Daily usage snapshots written by the billing ingest pipeline.
-- The pipeline supports two sources: CSV file upload and direct API connection.
--
-- Flow:
--   1. Operator uploads a CSV (or API connector pushes) → row inserted with status='pending'
--   2. Background processor validates and aggregates → status='processed' or status='error'
--   3. Client dashboard reads processed rows to compute the running billing estimate.
--
-- ONE-WAY DOOR: period_date + business_id is unique. Re-uploading the same day
-- requires an explicit DELETE + re-insert (or an upsert with ON CONFLICT DO UPDATE).
-- Do not change call_type_breakdown key names without a migration.

CREATE TABLE IF NOT EXISTS usage_periods (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID          NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  operator_org_id      UUID          NOT NULL REFERENCES operator_orgs(id) ON DELETE CASCADE,
  period_date          DATE          NOT NULL,
  total_calls          INTEGER       NOT NULL DEFAULT 0 CHECK (total_calls >= 0),
  -- Stored as NUMERIC to avoid floating-point billing errors
  total_minutes        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total_minutes >= 0),
  -- Keyed by call_type slug; values are { calls: n, minutes: n }
  -- Must match callType slugs in call_logs and wizard configuration
  call_type_breakdown  JSONB         NOT NULL DEFAULT '{}'::jsonb,
  source               TEXT          NOT NULL DEFAULT 'csv_upload'
                                     CHECK (source IN ('csv_upload', 'api')),
  status               TEXT          NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'processed', 'error')),
  -- Structured error info from the processor, e.g. { "row": 14, "issue": "unknown call_type" }
  error_detail         JSONB,
  -- URL to the original uploaded file in Supabase Storage (for operator audit)
  raw_file_url         TEXT,
  processed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- One row per business per day; re-upload requires explicit replacement
  UNIQUE (business_id, period_date)
);

ALTER TABLE usage_periods ENABLE ROW LEVEL SECURITY;

-- Businesses can read their own processed usage (for the billing meter on client portal)
CREATE POLICY "usage_periods_business_select" ON usage_periods
  FOR SELECT
  USING (
    status = 'processed'
    AND business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Operators can read all usage periods for businesses in their org (including pending/error)
CREATE POLICY "usage_periods_operator_select" ON usage_periods
  FOR SELECT
  USING (
    operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Service role only for INSERT/UPDATE/DELETE (ingest pipeline uses service role)

CREATE INDEX IF NOT EXISTS idx_usage_periods_business_date
  ON usage_periods (business_id, period_date DESC);

CREATE INDEX IF NOT EXISTS idx_usage_periods_operator_status
  ON usage_periods (operator_org_id, status);
