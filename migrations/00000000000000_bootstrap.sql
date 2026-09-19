-- ============================================================================
-- Bootstrap: foundational tables and functions
-- ============================================================================
-- Creates the base tables that the answering service module depends on.
-- In the original multi-tenant platform, these tables were provided by the host.
-- For standalone deployments, this migration creates them from scratch.
--
-- Run this FIRST, before all other migrations.

-- Trigger function used by multiple tables to auto-update `updated_at`.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Core multi-tenant table: one row per business (operator's client).
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled_modules JSONB DEFAULT '["answering_service"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own business"
  ON businesses FOR SELECT
  USING (
    id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (select auth.uid())
    )
  );

-- Junction table: links Supabase Auth users to businesses.
CREATE TABLE IF NOT EXISTS users_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (user_id, business_id)
);

ALTER TABLE users_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships"
  ON users_businesses FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own memberships"
  ON users_businesses FOR UPDATE
  USING (user_id = (select auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_businesses_user_id ON users_businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_users_businesses_business_id ON users_businesses(business_id);

-- Auto-update timestamps
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
