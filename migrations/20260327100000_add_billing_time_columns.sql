-- Add time_column to billing_rules.
-- 'total'    = legacy behavior (uses 'minutes' from call_type_breakdown).
-- 'inbound'  = use inbound_minutes (falls back to minutes if absent).
-- 'outbound' = use outbound_minutes (0 if absent).
-- 'work'     = use work_minutes (falls back to minutes if absent).
--
-- DEFAULT 'total' preserves existing rule behaviour exactly.
ALTER TABLE billing_rules
  ADD COLUMN IF NOT EXISTS time_column TEXT NOT NULL DEFAULT 'total'
    CHECK (time_column IN ('total', 'inbound', 'outbound', 'work'));
