-- Optional operator notes about a client — set during bulk import or manually.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS notes TEXT;
