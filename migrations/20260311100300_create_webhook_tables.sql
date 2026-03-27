-- migrations/20260311100300_create_webhook_tables.sql
-- Webhook infrastructure: subscriptions and delivery log.
--
-- webhook_subscriptions: operator-owned URL + topic subscriptions.
-- webhook_deliveries: append-only audit log of every delivery attempt.
--
-- SECURITY: `secret` is the HMAC-SHA256 signing key. The portal signs every
-- outbound payload with this secret and includes the signature as
-- X-Webhook-Signature: sha256=<hex>. Consumers verify on their end.
-- The secret is write-only via the API — never returned after creation.
--
-- Auto-pause: when consecutive_failure_count reaches a threshold (enforced in
-- application code, not DB), status is set to 'failing' and the operator is
-- alerted. They must re-activate manually after fixing the endpoint.
--
-- Topics (initial set):
--   call.created            New call log ingested
--   call.priority_changed   Priority updated on a call
--   call.status_changed     Portal status changed (new → read → resolved, etc.)
--   billing.threshold_75    Business hits 75% of included minutes
--   billing.threshold_90    Business hits 90% of included minutes
--   billing.threshold_100   Business hits or exceeds 100% of included minutes
--   usage.upload_processed  Usage period CSV processed successfully
--   usage.upload_failed     Usage period CSV processing failed

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_org_id            UUID        NOT NULL REFERENCES operator_orgs(id) ON DELETE CASCADE,
  url                        TEXT        NOT NULL,
  -- HMAC signing secret. Write-only: never returned by any SELECT in application code.
  secret                     TEXT        NOT NULL,
  topics                     TEXT[]      NOT NULL DEFAULT '{}',
  status                     TEXT        NOT NULL DEFAULT 'active'
                                         CHECK (status IN ('active', 'paused', 'failing')),
  consecutive_failure_count  INTEGER     NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- Operators can view their own subscriptions (secret column excluded in application queries)
CREATE POLICY "webhook_subscriptions_operator_select" ON webhook_subscriptions
  FOR SELECT
  USING (
    operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_operator_org_id
  ON webhook_subscriptions (operator_org_id);

-- ─── webhook_deliveries ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  UUID        NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  topic            TEXT        NOT NULL,
  payload          JSONB       NOT NULL,
  -- HTTP response from the consumer endpoint; NULL if request never sent
  response_status  INTEGER,
  -- First 2000 chars of response body for debugging
  response_body    TEXT,
  attempt_number   INTEGER     NOT NULL DEFAULT 1,
  -- Set when this delivery is scheduled for retry; NULL = not retrying
  next_retry_at    TIMESTAMPTZ,
  -- Set on successful delivery (2xx response)
  delivered_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- webhook_deliveries is append-only — no RLS UPDATE/DELETE policies
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Operators can view deliveries for their own subscriptions
CREATE POLICY "webhook_deliveries_operator_select" ON webhook_deliveries
  FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM webhook_subscriptions
      WHERE operator_org_id IN (
        SELECT operator_org_id FROM operator_users
        WHERE user_id = (SELECT auth.uid())
      )
    )
  );

-- Index for retry queue: find pending retries efficiently
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
  ON webhook_deliveries (next_retry_at)
  WHERE next_retry_at IS NOT NULL AND delivered_at IS NULL;

-- Index for delivery history per subscription
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription_created
  ON webhook_deliveries (subscription_id, created_at DESC);
