-- IMPORTANT: Apply this migration via the Supabase dashboard SQL editor
-- or CLI before deploying Sprint 3. The backfill runs instantly for
-- typical volumes (<100k rows). For large tables, run in batches.

-- Add operator_org_id to call_logs for direct operator-level queries and Realtime filtering
ALTER TABLE call_logs
  ADD COLUMN IF NOT EXISTS operator_org_id UUID REFERENCES operator_orgs(id) ON DELETE SET NULL;

-- Backfill from businesses table
UPDATE call_logs cl
SET operator_org_id = b.operator_org_id
FROM businesses b
WHERE cl.business_id = b.id
  AND b.operator_org_id IS NOT NULL;

-- Index for operator activity feed queries
CREATE INDEX IF NOT EXISTS idx_call_logs_operator_org_id_timestamp
  ON call_logs(operator_org_id, timestamp DESC)
  WHERE operator_org_id IS NOT NULL;

-- RLS: operators can SELECT call_logs for their org directly
CREATE POLICY "operator_org_call_logs_select"
  ON call_logs FOR SELECT
  USING (
    operator_org_id IN (
      SELECT operator_org_id FROM operator_users
      WHERE user_id = auth.uid()
    )
  );
