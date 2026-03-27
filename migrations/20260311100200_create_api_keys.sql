-- migrations/20260311100200_create_api_keys.sql
-- API keys for the public API surface.
--
-- Keys can be scoped to either a business (client-issued) or an operator org
-- (operator-issued for cross-client access). Exactly one of business_id or
-- operator_org_id must be set — enforced by the CHECK constraint below.
--
-- SECURITY: Only key_hash is stored (SHA-256 of the raw key). The raw key is
-- shown to the user exactly once at creation time and never stored. If lost,
-- revoke and regenerate.
--
-- allowed_ips: optional CIDR allowlist. NULL = no IP restriction.
-- scopes: JSON array of permission strings, e.g. ["calls:read", "billing:read"]

CREATE TABLE IF NOT EXISTS api_keys (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Owner: exactly one of these must be set
  business_id      UUID        REFERENCES businesses(id) ON DELETE CASCADE,
  operator_org_id  UUID        REFERENCES operator_orgs(id) ON DELETE CASCADE,
  -- The SHA-256 hash of the raw API key; the raw key is never stored
  key_hash         TEXT        NOT NULL UNIQUE,
  label            TEXT        NOT NULL,
  scopes           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Optional CIDR IP allowlist; NULL means unrestricted
  allowed_ips      TEXT[],
  expires_at       TIMESTAMPTZ,
  last_used_at     TIMESTAMPTZ,
  -- Soft delete: set revoked_at to invalidate without losing the audit record
  revoked_at       TIMESTAMPTZ,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Exactly one owner
  CONSTRAINT api_keys_owner_check CHECK (
    (business_id IS NOT NULL)::int + (operator_org_id IS NOT NULL)::int = 1
  )
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Business members can view API keys for their own business
CREATE POLICY "api_keys_business_select" ON api_keys
  FOR SELECT
  USING (
    business_id IS NOT NULL
    AND business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Operators can view all API keys within their org
CREATE POLICY "api_keys_operator_select" ON api_keys
  FOR SELECT
  USING (
    operator_org_id IS NOT NULL
    AND operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Service role only for INSERT/UPDATE/DELETE (key generation happens server-side)

CREATE INDEX IF NOT EXISTS idx_api_keys_business_id
  ON api_keys (business_id) WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_api_keys_operator_org_id
  ON api_keys (operator_org_id) WHERE operator_org_id IS NOT NULL;

-- Fast lookup by hash on every authenticated API request
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys (key_hash) WHERE revoked_at IS NULL;
