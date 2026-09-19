import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service role key.
 * Use ONLY in server-side code for operations that require bypassing RLS
 * (e.g. inserting API keys, processing usage periods).
 * Always perform your own authorization checks before calling this.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
