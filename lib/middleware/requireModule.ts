import { createClient } from '@/lib/supabase/server'
import { getBusinessContext } from '@/lib/auth/server'

/**
 * Checks that the current user's business has the given module enabled.
 * Throws an Error if not authenticated or module is not enabled.
 *
 * Standalone deployments: set STANDALONE_MODE=true in .env.local to bypass the
 * enabled_modules check. Auth is still enforced — only the per-module gate is skipped.
 * This is the right setting if you're self-hosting for a single business and don't
 * need multi-tenant module gating.
 */

/** Alias for use in Next.js layouts and middleware (redirect-style usage). */
export const requireModuleAccess = checkModuleAccessOrThrow

export async function checkModuleAccessOrThrow(moduleName: string): Promise<void> {
  const context = await getBusinessContext()
  if (!context) {
    throw new Error('Unauthorized')
  }

  // Standalone mode: skip module gate. Auth is still enforced above.
  if (process.env.STANDALONE_MODE === 'true') {
    return
  }

  const supabase = await createClient()
  const { data: business, error } = await supabase
    .from('businesses')
    .select('enabled_modules')
    .eq('id', context.businessId)
    .single()

  if (error || !business) {
    throw new Error('Business not found')
  }

  // enabled_modules is stored as a JSONB array of strings
  const enabledModules: string[] = Array.isArray(business.enabled_modules)
    ? (business.enabled_modules as string[])
    : []

  if (!enabledModules.includes(moduleName)) {
    throw new Error(`Module '${moduleName}' is not enabled for this business`)
  }
}
