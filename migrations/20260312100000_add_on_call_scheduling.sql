-- migrations/20260312100000_add_on_call_scheduling.sql
-- On-call scheduling: contacts, weekly shifts, and per-business timezone.
--
-- Writes go through service role only (no INSERT/UPDATE/DELETE RLS policies).
-- Business users can SELECT their own rows.
-- Operators can SELECT all rows in their org.

-- Business timezone for on-call shift resolution
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS on_call_timezone TEXT;

-- on_call_contacts: reusable contact book per business
CREATE TABLE IF NOT EXISTS on_call_contacts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  role            TEXT,
  notes           TEXT,
  display_order   INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE on_call_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY on_call_contacts_business_select ON on_call_contacts
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY on_call_contacts_operator_select ON on_call_contacts
  FOR SELECT USING (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN operator_orgs oo ON oo.id = b.operator_org_id
      JOIN operator_users ou ON ou.operator_org_id = oo.id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_on_call_contacts_business_id
  ON on_call_contacts (business_id);

-- on_call_shifts: recurring weekly shifts with inline escalation chain
CREATE TABLE IF NOT EXISTS on_call_shifts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  days_of_week      INT[]       NOT NULL,
  start_time        TIME        NOT NULL,
  end_time          TIME        NOT NULL,
  escalation_steps  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  active            BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE on_call_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY on_call_shifts_business_select ON on_call_shifts
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY on_call_shifts_operator_select ON on_call_shifts
  FOR SELECT USING (
    business_id IN (
      SELECT b.id FROM businesses b
      JOIN operator_orgs oo ON oo.id = b.operator_org_id
      JOIN operator_users ou ON ou.operator_org_id = oo.id
      WHERE ou.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_on_call_shifts_business_id
  ON on_call_shifts (business_id);
