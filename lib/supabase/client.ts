import { createBrowserClient } from '@supabase/ssr'

// Note: Database types defined in ./database.types.ts.
// The generic is omitted here due to a type-level incompatibility between
// @supabase/ssr@0.6.x and @supabase/supabase-js@2.99.x generic signatures.
// Replace untyped clients with createBrowserClient<Database>() once packages align.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
