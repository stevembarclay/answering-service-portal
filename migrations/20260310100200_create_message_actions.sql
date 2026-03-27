-- migrations/20260310100200_create_message_actions.sql
-- Append-only audit log for actions taken on call_logs.
-- WORM: INSERT policy only. No UPDATE, no DELETE.

CREATE TABLE IF NOT EXISTS message_actions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID        NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('priority_updated', 'flagged_qa', 'status_changed')),
  by_user_id  UUID        NOT NULL,  -- user_id; never email or display name
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_value  TEXT,
  to_value    TEXT
);

CREATE INDEX IF NOT EXISTS message_actions_call_log_idx
  ON message_actions (call_log_id, at DESC);

ALTER TABLE message_actions ENABLE ROW LEVEL SECURITY;

-- Business members can read actions on their call logs
CREATE POLICY "message_actions_select" ON message_actions
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Business members can insert actions (portal writes via authenticated client)
CREATE POLICY "message_actions_insert" ON message_actions
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
    AND by_user_id = (SELECT auth.uid())
  );

-- NO UPDATE policy. NO DELETE policy. This table is append-only (WORM).
