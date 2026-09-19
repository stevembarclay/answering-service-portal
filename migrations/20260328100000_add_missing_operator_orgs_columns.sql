-- migrations/20260328100000_add_missing_operator_orgs_columns.sql
-- The create_operator_platform migration used CREATE TABLE IF NOT EXISTS, so
-- operator_orgs rows that already existed never received the branding/settings
-- columns. Add them idempotently here.

ALTER TABLE operator_orgs
  ADD COLUMN IF NOT EXISTS branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;
