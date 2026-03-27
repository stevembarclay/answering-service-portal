-- migrations/20260310100000_add_last_login_at_to_users_businesses.sql
-- Tracks when each user last loaded the messages list for their business.
-- Used to compute CallLog.isNew (calls since this timestamp are "new").

ALTER TABLE users_businesses
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN users_businesses.last_login_at IS
  'Updated on each messages list load. Used to compute "since last visit" delta.';
