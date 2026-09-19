-- migrations/20260310100300_create_billing_rules.sql
-- Per-business billing rule configuration.
-- Operators insert rules via Supabase admin or seed script. No portal UI in V1.
-- THIS IS THE ONE-WAY DOOR: call_type_filter values must match callType slugs
-- used in call_logs and the wizard's call types configuration. Do not rename
-- without a migration that updates existing rule rows.

CREATE TABLE IF NOT EXISTS billing_rules (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL CHECK (type IN (
                                  'per_call', 'per_minute', 'flat_monthly', 'setup_fee', 'bucket'
                                )),
  name              TEXT        NOT NULL,
  amount            INTEGER     NOT NULL CHECK (amount >= 0),  -- cents
  call_type_filter  TEXT[],     -- NULL = applies to all call types
  included_minutes  INTEGER,    -- bucket only
  overage_rate      INTEGER,    -- bucket only; cents per minute
  active            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_rules ENABLE ROW LEVEL SECURITY;

-- Business members can read their own billing rules
CREATE POLICY "billing_rules_select" ON billing_rules
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE for authenticated users — operator manages via service role
