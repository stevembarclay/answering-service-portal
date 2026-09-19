-- migrations/20260310100400_create_billing_periods.sql
-- Stores finalized billing period invoices.
-- Open period = current month's running estimate source.
-- Closed/paid periods = past invoices shown to the client.

CREATE TABLE IF NOT EXISTS billing_periods (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'closed', 'paid')),
  total_cents  INTEGER,    -- set when status → closed
  call_count   INTEGER,    -- set when status → closed
  line_items   JSONB,      -- BillingLineItem[] stored on close
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS billing_periods_business_status_idx
  ON billing_periods (business_id, status, period_start DESC);

ALTER TABLE billing_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_periods_select" ON billing_periods
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );
