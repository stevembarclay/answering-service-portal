import { createClient } from '@/lib/supabase/server'
import type { OperatorContext } from '@/types/operator'

export interface BusinessContext {
  businessId: string
  userId: string
  role: string
}

export interface AuthUser {
  id: string
  email: string | undefined
}

/**
 * Gets the authenticated user's business context from the current Supabase session.
 * Returns null if the user is not authenticated or has no business membership.
 */
export async function getBusinessContext(): Promise<BusinessContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return null

    // Get the first business this user belongs to
    const { data: membership, error: memberError } = await supabase
      .from('users_businesses')
      .select('business_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (memberError || !membership) return null

    return {
      userId: user.id,
      businessId: membership.business_id as string,
      role: (membership.role as string) ?? 'member',
    }
  } catch {
    return null
  }
}

/**
 * Gets the authenticated user's basic info.
 * Returns null if the user is not authenticated.
 */
export async function getUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) return null

    return {
      id: user.id,
      email: user.email,
    }
  } catch {
    return null
  }
}

/**
 * Gets the operator context for the current Supabase session.
 * Returns null if the user has no operator_users row.
 * Never throws.
 */
export async function getOperatorContext(): Promise<OperatorContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return null

    const { data: membership, error: memberError } = await supabase
      .from('operator_users')
      .select('operator_org_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (memberError || !membership) return null

    // Defensive: reject unrecognized roles — do NOT add a fallback default like ?? 'member'
    const role = membership.role as string
    if (role !== 'admin' && role !== 'viewer') return null
    return {
      operatorOrgId: membership.operator_org_id as string,
      userId: user.id,
      role: role as 'admin' | 'viewer',
    }
  } catch {
    return null
  }
}

/**
 * For use in Next.js Server Components and route handlers.
 * Calls redirect('/login') if the user has no operator context.
 * Returns the operator context when the user is authenticated.
 */
export async function checkOperatorAccessOrThrow(): Promise<OperatorContext> {
  const { redirect } = await import('next/navigation')
  const context = await getOperatorContext()
  if (!context) {
    redirect('/login')
  }
  return context as OperatorContext
}
