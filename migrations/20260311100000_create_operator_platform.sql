-- migrations/20260311100000_create_operator_platform.sql
-- Adds the operator layer to the multi-tenant hierarchy.
-- New hierarchy: Operator Org → Businesses → Users
--
-- operator_orgs: one row per answering service company deploying the portal.
-- operator_users: links Supabase Auth users to an operator org.
-- businesses: gains operator_org_id FK, churned_at, and health_score_override.
--
-- RLS pattern: operator users can SELECT across all businesses in their org.
-- INSERT/UPDATE/DELETE on operator tables is service-role only.

-- ─── operator_orgs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operator_orgs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  plan        TEXT        NOT NULL DEFAULT 'trial'
                          CHECK (plan IN ('trial', 'pro', 'enterprise')),
  status      TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'suspended', 'cancelled')),
  -- White-label config: logo_url, primary_color, secondary_color, custom_domain, etc.
  branding    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Operator-level defaults: alert_thresholds, default_timezone, notification_prefs, etc.
  settings    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE operator_orgs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_operator_orgs_updated_at
  BEFORE UPDATE ON operator_orgs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── operator_users ───────────────────────────────────────────────────────────
-- Created before operator_orgs RLS policy because that policy references this table.

CREATE TABLE IF NOT EXISTS operator_users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_org_id  UUID        NOT NULL REFERENCES operator_orgs(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL DEFAULT 'viewer'
                               CHECK (role IN ('admin', 'viewer')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_org_id, user_id)
);

ALTER TABLE operator_users ENABLE ROW LEVEL SECURITY;

-- Users can view their own operator_users rows
CREATE POLICY "operator_users_select" ON operator_users
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_operator_users_user_id
  ON operator_users (user_id);

CREATE INDEX IF NOT EXISTS idx_operator_users_org_id
  ON operator_users (operator_org_id);

-- operator_orgs RLS: defined after operator_users so the subquery reference resolves
-- Service role only for INSERT/UPDATE/DELETE
CREATE POLICY "operator_orgs_select" ON operator_orgs
  FOR SELECT
  USING (
    id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- ─── businesses: add operator columns ────────────────────────────────────────
-- operator_org_id: which operator deployed this business's portal.
-- churned_at: set when a client leaves; used in operator health dashboard.
-- health_score_override: operator can manually pin a score (0-100) when
--   they know context the system doesn't (e.g. client is fine but logs in via API).

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS operator_org_id     UUID        REFERENCES operator_orgs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS churned_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS health_score_override SMALLINT  CHECK (health_score_override BETWEEN 0 AND 100);

CREATE INDEX IF NOT EXISTS idx_businesses_operator_org_id
  ON businesses (operator_org_id);

-- Operators can view all businesses in their org (in addition to the existing
-- "users can view their own business" policy already on this table)
CREATE POLICY "businesses_operator_select" ON businesses
  FOR SELECT
  USING (
    operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );
