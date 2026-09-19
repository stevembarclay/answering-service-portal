-- migrations/20260311100400_create_billing_rule_templates.sql
-- Operator-level billing rule templates.
--
-- Problem: operators must currently recreate their standard billing plan from
-- scratch for every new client. Templates let them define "Standard Plan" once
-- and apply it during client provisioning.
--
-- The `rules` column stores an array of BillingRule-shaped objects, matching
-- the shape in billing_rules but without id or business_id (those are assigned
-- when the template is applied to a business).
--
-- ONE-WAY DOOR: the shape of objects in `rules` must stay compatible with the
-- billing_rules table schema. If billing_rules columns change, add a migration
-- that updates existing template JSONB accordingly.
--
-- Example rules value:
-- [
--   { "type": "flat_monthly", "name": "Monthly Maintenance", "amount": 2500, "active": true },
--   { "type": "per_minute", "name": "Per Minute", "amount": 85, "active": true },
--   { "type": "bucket", "name": "100-Minute Bundle", "amount": 7500,
--     "included_minutes": 100, "overage_rate": 95, "active": true }
-- ]

CREATE TABLE IF NOT EXISTS billing_rule_templates (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_org_id  UUID        NOT NULL REFERENCES operator_orgs(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,       -- e.g. "Standard Plan", "Medical Premium"
  description      TEXT,
  -- Array of BillingRule shapes (minus id and business_id)
  rules            JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE billing_rule_templates ENABLE ROW LEVEL SECURITY;

-- Operators can view their own templates
CREATE POLICY "billing_rule_templates_operator_select" ON billing_rule_templates
  FOR SELECT
  USING (
    operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Service role only for INSERT/UPDATE/DELETE

CREATE TRIGGER update_billing_rule_templates_updated_at
  BEFORE UPDATE ON billing_rule_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_billing_rule_templates_operator_org_id
  ON billing_rule_templates (operator_org_id);
