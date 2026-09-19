-- Add external platform client ID columns to businesses.
-- These are set by the operator (one per business) and used by the
-- on-call push service to write the current on-call assignment back
-- to the operator's StarTel CMC or Amtelco IS instance.
--
-- Only one column will ever be populated per business (an operator
-- runs either StarTel or Amtelco, not both).

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS startel_client_id TEXT,
  ADD COLUMN IF NOT EXISTS amtelco_client_id TEXT;

COMMENT ON COLUMN businesses.startel_client_id IS
  'StarTel CMC Client ID — used to push on-call assignments to the agent interface via the CMC REST API.';

COMMENT ON COLUMN businesses.amtelco_client_id IS
  'Amtelco IS Client ID — used to push on-call assignments to the agent interface via the IS Web API.';
