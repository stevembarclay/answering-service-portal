-- Add platform-specific contact ID columns to on_call_contacts.
--
-- Both StarTel CMC and Amtelco IS reference contacts by internal numeric IDs,
-- not by name or phone number:
--   - StarTel "Add OnCall Assignment" requires a numeric `member` ID
--   - Amtelco IS "AssignShift" requires a numeric `contactIndex`
--
-- Operators set these values once per contact after obtaining IDs from their
-- platform's admin interface. Once set, on-call push to the platform works
-- automatically whenever the schedule changes.

ALTER TABLE on_call_contacts
  ADD COLUMN IF NOT EXISTS startel_member_id INTEGER,
  ADD COLUMN IF NOT EXISTS amtelco_contact_index INTEGER;

COMMENT ON COLUMN on_call_contacts.startel_member_id IS
  'StarTel CMC numeric member ID. Required for "Add OnCall Assignment" API calls. '
  'Find this in StarTel CMC > Client Maintenance > Members.';

COMMENT ON COLUMN on_call_contacts.amtelco_contact_index IS
  'Amtelco IS numeric contact index. Required for "AssignShift" SOAP operation. '
  'Find this in the Amtelco IS Directory.';
