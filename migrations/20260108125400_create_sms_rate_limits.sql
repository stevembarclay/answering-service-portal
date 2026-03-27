-- ============================================================================
-- Answering Service SMS Rate Limits
-- ============================================================================
-- Rate limiting for SMS magic link sends.
-- Prevents spam: one SMS per phone number per hour.

CREATE TABLE IF NOT EXISTS answering_service_sms_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'magic_link',
  message_id TEXT, -- Provider message ID for tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE answering_service_sms_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SMS rate limits for their business"
  ON answering_service_sms_rate_limits
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id
      FROM users_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert SMS rate limits"
  ON answering_service_sms_rate_limits
  FOR INSERT
  WITH CHECK (true); -- Server-side only, RLS allows insertion for rate limiting

CREATE INDEX IF NOT EXISTS idx_as_sms_rate_limits_phone ON answering_service_sms_rate_limits(phone_number);
CREATE INDEX IF NOT EXISTS idx_as_sms_rate_limits_business ON answering_service_sms_rate_limits(business_id);
CREATE INDEX IF NOT EXISTS idx_as_sms_rate_limits_sent_at ON answering_service_sms_rate_limits(sent_at);
CREATE INDEX IF NOT EXISTS idx_as_sms_rate_limits_phone_sent ON answering_service_sms_rate_limits(phone_number, sent_at);

CREATE INDEX IF NOT EXISTS idx_as_sms_rate_limits_phone_business_sent
  ON answering_service_sms_rate_limits(phone_number, business_id, sent_at DESC);

COMMENT ON TABLE answering_service_sms_rate_limits IS 'Rate limiting for SMS magic link sends. One SMS per phone number per hour.';
