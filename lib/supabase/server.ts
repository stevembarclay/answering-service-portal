import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Note: Database types defined in ./database.types.ts.
// The generic is omitted here due to a type-level incompatibility between
// @supabase/ssr@0.6.x and @supabase/supabase-js@2.99.x generic signatures.
// Replace untyped clients with createServerClient<Database>() once packages align.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {
            // setAll called from a Server Component — cookies can't be set
            // but this is fine if you're not doing auth mutations
          }
        },
      },
    }
  )
}
