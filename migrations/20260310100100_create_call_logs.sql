-- migrations/20260310100100_create_call_logs.sql
-- Stores call records ingested from the telephony adapter.
-- The adapter writes to this table; the portal reads from it.
-- NOTE: recording_url is NOT stored here — it is generated fresh per request.

CREATE TABLE IF NOT EXISTS call_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  timestamp         TIMESTAMPTZ NOT NULL,
  caller_name       TEXT,
  caller_number     TEXT,
  callback_number   TEXT,
  call_type         TEXT        NOT NULL DEFAULT 'general-info',
  direction         TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  duration_seconds  INTEGER     NOT NULL DEFAULT 0,
  telephony_status  TEXT        NOT NULL CHECK (telephony_status IN ('completed', 'missed', 'voicemail')),
  message           TEXT        NOT NULL DEFAULT '',
  has_recording     BOOLEAN     NOT NULL DEFAULT FALSE,
  priority          TEXT        NOT NULL DEFAULT 'low'
                                CHECK (priority IN ('high', 'medium', 'low')),
  portal_status     TEXT        NOT NULL DEFAULT 'new'
                                CHECK (portal_status IN ('new', 'read', 'flagged_qa', 'assigned', 'resolved')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-update updated_at on row mutation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for the most common query: all calls for a business, newest first
CREATE INDEX IF NOT EXISTS call_logs_business_timestamp_idx
  ON call_logs (business_id, timestamp DESC);

-- Index for unread count and "since last visit" queries
CREATE INDEX IF NOT EXISTS call_logs_business_status_idx
  ON call_logs (business_id, portal_status);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Business members can read their own call logs
CREATE POLICY "call_logs_select" ON call_logs
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM users_businesses
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Service role only for INSERT/UPDATE (adapter and server actions use service role)
-- No direct client INSERT. No DELETE policy — call logs are immutable.
