-- migrations/20260326100000_add_message_status_and_notes.sql
-- Adds custom workflow statuses, private notes, and message assignment.
-- Extends call_logs with workflow_status_id and assigned_to.
-- Expands message_actions type constraint to include new action types.

-- ─── 1. business_message_statuses ────────────────────────────────────────────
-- Per-business custom workflow statuses (e.g. "Needs Callback", "Handled").
-- System statuses (is_system = true) cannot be deleted by users.

CREATE TABLE IF NOT EXISTS business_message_statuses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  color       TEXT        NOT NULL DEFAULT '#94a3b8',  -- hex color for dot
  is_open     BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_message_statuses_business_idx
  ON business_message_statuses (business_id, sort_order);

ALTER TABLE business_message_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_message_statuses_select"
  ON business_message_statuses FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM users_businesses
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "business_message_statuses_insert"
  ON business_message_statuses FOR INSERT
  WITH CHECK (business_id IN (
    SELECT business_id FROM users_businesses
    WHERE user_id = (SELECT auth.uid())
  ));

CREATE POLICY "business_message_statuses_update"
  ON business_message_statuses FOR UPDATE
  USING (business_id IN (
    SELECT business_id FROM users_businesses
    WHERE user_id = (SELECT auth.uid())
  ));

-- Only non-system statuses can be deleted
CREATE POLICY "business_message_statuses_delete"
  ON business_message_statuses FOR DELETE
  USING (
    is_system = false
    AND business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Seed default statuses for all existing businesses (idempotent)
INSERT INTO business_message_statuses (business_id, label, color, is_open, sort_order, is_system)
SELECT b.id, s.label, s.color, s.is_open, s.sort_order, s.is_system
FROM businesses b
CROSS JOIN (VALUES
  ('Needs Attention', '#f59e0b', true,  0, true),
  ('Needs Callback',  '#3b82f6', true,  1, true),
  ('In Progress',     '#8b5cf6', true,  2, true),
  ('Handled',         '#22c55e', false, 3, true)
) AS s(label, color, is_open, sort_order, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM business_message_statuses bms
  WHERE bms.business_id = b.id AND bms.label = s.label
);

-- ─── 2. Add workflow columns to call_logs ────────────────────────────────────
-- workflow_status_id links to the business's custom status.
-- assigned_to links to an auth.users row (a business team member).

ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS workflow_status_id UUID
    REFERENCES business_message_statuses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS call_logs_workflow_status_idx
  ON call_logs (workflow_status_id)
  WHERE workflow_status_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS call_logs_assigned_to_idx
  ON call_logs (assigned_to)
  WHERE assigned_to IS NOT NULL;

-- UPDATE policy for business members to set workflow fields on their call logs.
-- (The SELECT policy from the create_call_logs migration already exists.)
-- Using a DO block for idempotency since Postgres has no CREATE POLICY IF NOT EXISTS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'call_logs'
      AND policyname = 'call_logs_business_update_workflow'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "call_logs_business_update_workflow" ON call_logs
        FOR UPDATE
        USING (business_id IN (
          SELECT business_id FROM users_businesses
          WHERE user_id = (SELECT auth.uid())
        ))
        WITH CHECK (business_id IN (
          SELECT business_id FROM users_businesses
          WHERE user_id = (SELECT auth.uid())
        ))
    $policy$;
  END IF;
END $$;

-- ─── 3. message_notes ────────────────────────────────────────────────────────
-- Private notes written by business users on individual messages.
-- CRITICAL: No operator-access policy is added — not now, not ever.
-- These notes may contain PHI/PII (e.g. medical callbacks). Operators must
-- never see them — this is enforced at the RLS layer, not just the API layer.

CREATE TABLE IF NOT EXISTS message_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID        NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS message_notes_call_log_idx
  ON message_notes (call_log_id, created_at DESC);

CREATE TRIGGER message_notes_updated_at
  BEFORE UPDATE ON message_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE message_notes ENABLE ROW LEVEL SECURITY;

-- Business members can read all notes for their business's messages
CREATE POLICY "message_notes_business_select"
  ON message_notes FOR SELECT
  USING (business_id IN (
    SELECT business_id FROM users_businesses
    WHERE user_id = (SELECT auth.uid())
  ));

-- Business members can add notes (must own the note and be in the business)
CREATE POLICY "message_notes_business_insert"
  ON message_notes FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Users may only edit their own notes
CREATE POLICY "message_notes_user_update"
  ON message_notes FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

-- Users may only delete their own notes
CREATE POLICY "message_notes_user_delete"
  ON message_notes FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ─── 4. Expand message_actions type constraint ────────────────────────────────
-- Add workflow_status_changed and assigned to the allowed action types.
-- Uses a DO block to find and replace the existing check constraint by its
-- current name, without hardcoding a name that may differ across deployments.

DO $$
DECLARE
  v_constraint TEXT;
  v_already_updated BOOLEAN;
BEGIN
  SELECT
    conname,
    pg_get_constraintdef(oid) LIKE '%workflow_status_changed%'
  INTO v_constraint, v_already_updated
  FROM pg_constraint
  WHERE conrelid = 'message_actions'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%priority_updated%'
  LIMIT 1;

  -- Skip if the constraint already includes the new types
  IF v_already_updated IS TRUE THEN
    RETURN;
  END IF;

  -- Drop old constraint if found
  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE message_actions DROP CONSTRAINT %I', v_constraint);
  END IF;

  -- Add expanded constraint
  ALTER TABLE message_actions ADD CONSTRAINT message_actions_type_check
    CHECK (type IN (
      'priority_updated',
      'flagged_qa',
      'status_changed',
      'workflow_status_changed',
      'assigned'
    ));
END $$;
