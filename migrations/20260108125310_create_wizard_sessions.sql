-- ============================================================================
-- Answering Service Wizard Sessions
-- ============================================================================
-- Onboarding wizard session persistence.
-- Stores partial form responses and wizard state for resume functionality.

CREATE TABLE IF NOT EXISTS answering_service_wizard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  wizard_data JSONB DEFAULT '{}'::jsonb,
  path_selected TEXT CHECK (path_selected IN ('self_serve', 'concierge')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ
);

ALTER TABLE answering_service_wizard_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wizard sessions for their business"
  ON answering_service_wizard_sessions
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id
      FROM users_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert wizard sessions for their business"
  ON answering_service_wizard_sessions
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id
      FROM users_businesses
      WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update wizard sessions for their business"
  ON answering_service_wizard_sessions
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id
      FROM users_businesses
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id
      FROM users_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete wizard sessions for their business"
  ON answering_service_wizard_sessions
  FOR DELETE
  USING (
    business_id IN (
      SELECT business_id
      FROM users_businesses
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_as_wizard_sessions_business_id ON answering_service_wizard_sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_as_wizard_sessions_user_id ON answering_service_wizard_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_as_wizard_sessions_status ON answering_service_wizard_sessions(status);
CREATE INDEX IF NOT EXISTS idx_as_wizard_sessions_business_status ON answering_service_wizard_sessions(business_id, status);
CREATE INDEX IF NOT EXISTS idx_as_wizard_sessions_updated_at ON answering_service_wizard_sessions(updated_at);

CREATE TRIGGER update_as_wizard_sessions_updated_at
  BEFORE UPDATE ON answering_service_wizard_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE answering_service_wizard_sessions IS 'Stores onboarding wizard session state and partial form responses for resume functionality.';
