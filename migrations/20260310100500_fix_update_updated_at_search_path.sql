-- migrations/20260310100500_fix_update_updated_at_search_path.sql
-- Fix mutable search_path on update_updated_at_column trigger function.
-- Security advisor lint: function_search_path_mutable
-- Adding SET search_path = public prevents search_path injection attacks.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
