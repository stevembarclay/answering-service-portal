-- migrations/20260330100000_add_billing_period_adjustments.sql
-- Adds adjustment + audit fields to billing_periods for the operator month-close workflow.
-- adjustment_cents: signed integer (negative = credit, positive = surcharge).
-- total_cents is recomputed from scratch on close and stored permanently.
-- closed_by_user_id + closed_at provide the audit trail.

ALTER TABLE billing_periods
  ADD COLUMN IF NOT EXISTS adjustment_cents    INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS adjustment_note     TEXT,
  ADD COLUMN IF NOT EXISTS closed_by_user_id   UUID         REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS closed_at           TIMESTAMPTZ;

COMMENT ON COLUMN billing_periods.adjustment_cents IS
  'Operator-applied adjustment in cents. Negative = credit, positive = surcharge. Added to computed line-items total for the final invoice amount.';

COMMENT ON COLUMN billing_periods.adjustment_note IS
  'Required when adjustment_cents != 0. Reason for the adjustment shown on the PDF.';

COMMENT ON COLUMN billing_periods.closed_by_user_id IS
  'The operator user who closed this billing period.';

COMMENT ON COLUMN billing_periods.closed_at IS
  'Timestamp when the period was closed by the operator. NULL means the period is still open.';
