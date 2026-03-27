import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { createModuleLogger } from '@/lib/utils/logger'

const logger = createModuleLogger('operatorService')
import type { ClientHealthBreakdown, ClientRow } from '@/types/operator'
import { loadSchedulerData, getBusinessTimezone } from '@/lib/services/answering-service/onCallService'
import { resolveActiveShift } from '@/lib/services/answering-service/onCallScheduler'

// ─── Pure computation ────────────────────────────────────────────────────────

interface HealthScoreInputs {
  daysSinceLastLogin: number | null  // null = never logged in
  openHighPriorityCount: number
  reviewedWithin7dPercent: number    // 0–100
  onboardingComplete: boolean
  override: number | null
}

export function computeHealthScore(inputs: HealthScoreInputs): ClientHealthBreakdown {
  if (inputs.override !== null) {
    return {
      total: inputs.override,
      loginRecency: 0,
      unresolvedHighPriority: 0,
      reviewedWithin7d: 0,
      onboardingComplete: 0,
      isOverride: true,
    }
  }

  const loginRecency =
    inputs.daysSinceLastLogin === null ? 0
    : inputs.daysSinceLastLogin <= 7 ? 40
    : inputs.daysSinceLastLogin <= 14 ? 25
    : inputs.daysSinceLastLogin <= 30 ? 10
    : 0

  const unresolvedHighPriority =
    inputs.openHighPriorityCount === 0 ? 30
    : inputs.openHighPriorityCount <= 2 ? 15
    : 0

  const reviewedWithin7d =
    inputs.reviewedWithin7dPercent >= 80 ? 20
    : inputs.reviewedWithin7dPercent >= 50 ? 10
    : 0

  const onboardingComplete = inputs.onboardingComplete ? 10 : 0

  return {
    total: loginRecency + unresolvedHighPriority + reviewedWithin7d + onboardingComplete,
    loginRecency,
    unresolvedHighPriority,
    reviewedWithin7d,
    onboardingComplete,
    isOverride: false,
  }
}

// ─── DB queries ──────────────────────────────────────────────────────────────

/**
 * Returns all non-churned clients for the operator org with computed health scores.
 * Health score inputs are fetched via individual aggregation queries per business.
 *
 * Performance note: this runs N+1 queries for N clients. Acceptable for initial
 * operator adoption (< 100 clients). Add a denormalized `health_score` column
 * once P95 latency becomes an issue.
 */
export async function getClientsWithHealthScores(
  operatorOrgId: string,
  page = 1,
  limit = 50
): Promise<{ clients: ClientRow[]; total: number }> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { count, error: countError } = await supabase
    .from('businesses')
    .select('id', { count: 'exact', head: true })
    .eq('operator_org_id', operatorOrgId)
    .is('churned_at', null)

  if (countError) throw new Error('Failed to load clients.')

  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('id, name, operator_org_id, health_score_override, churned_at')
    .eq('operator_org_id', operatorOrgId)
    .is('churned_at', null)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) throw new Error('Failed to load clients.')

  const now = new Date()
  const rows: ClientRow[] = []

  for (const biz of businesses ?? []) {
    // Login recency: equivalent to MAX(last_login_at) across ALL users on this business.
    // ORDER DESC + LIMIT 1 achieves the same result as an aggregate MAX().
    // IMPORTANT: do NOT filter by user_id here — we want the most recent login by any user.
    const { data: loginData } = await supabase
      .from('users_businesses')
      .select('last_login_at')
      .eq('business_id', biz.id)
      .order('last_login_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastLoginAt = (loginData as { last_login_at?: string | null } | null)?.last_login_at ?? null
    const daysSinceLastLogin = lastLoginAt
      ? Math.floor((now.getTime() - new Date(lastLoginAt).getTime()) / 86_400_000)
      : null

    // Unresolved high-priority open calls
    const { count: openHighCount } = await supabase
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', biz.id)
      .eq('priority', 'high')
      .not('portal_status', 'in', '("resolved","read")')

    // High-priority reviewed within 7d: % of calls in last 30d with a status_changed action
    // within 7 days of the call timestamp
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString()
    const { data: highPriorityCalls } = await supabase
      .from('call_logs')
      .select('id, timestamp, actions:message_actions(type, at)')
      .eq('business_id', biz.id)
      .eq('priority', 'high')
      .gte('timestamp', thirtyDaysAgo)

    let reviewedCount = 0
    const totalHighPriority = (highPriorityCalls ?? []).length
    for (const call of (highPriorityCalls ?? []) as Array<{
      timestamp: string
      actions?: Array<{ type: string; at: string }> | null
    }>) {
      const callTs = new Date(call.timestamp).getTime()
      const sevenDaysAfter = callTs + 7 * 86_400_000
      const hasReview = (call.actions ?? []).some(
        (a) => a.type === 'status_changed' && new Date(a.at).getTime() <= sevenDaysAfter
      )
      if (hasReview) reviewedCount++
    }
    const reviewedPercent = totalHighPriority > 0
      ? Math.round((reviewedCount / totalHighPriority) * 100)
      : 100

    // Onboarding complete
    const { data: wizard } = await supabase
      .from('answering_service_wizard_sessions')
      .select('status')
      .eq('business_id', biz.id)
      .maybeSingle()
    const onboardingComplete = (wizard as { status?: string | null } | null)?.status === 'completed'

    // Calls per week (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString()
    const { count: callsPerWeek } = await supabase
      .from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', biz.id)
      .gte('timestamp', sevenDaysAgo)

    // Billing usage percent: sum processed usage_periods for current calendar month
    // for any bucket-type billing rule
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10)
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(0, 10)

    const { data: bucketRule } = await supabase
      .from('billing_rules')
      .select('included_minutes')
      .eq('business_id', biz.id)
      .eq('type', 'bucket')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    let billingPercent: number | null = null
    if ((bucketRule as { included_minutes?: number | null } | null)?.included_minutes) {
      const { data: usagePeriods } = await supabase
        .from('usage_periods')
        .select('total_minutes')
        .eq('business_id', biz.id)
        .eq('status', 'processed')
        .gte('period_date', monthStart)
        .lte('period_date', monthEnd)

      const totalMinutes = ((usagePeriods ?? []) as Array<{ total_minutes: number | string }>).reduce(
        (sum, row) => sum + Number(row.total_minutes),
        0
      )
      billingPercent = Math.round(
        (totalMinutes / ((bucketRule as { included_minutes: number }).included_minutes)) * 100
      )
    }

    const healthScore = computeHealthScore({
      daysSinceLastLogin,
      openHighPriorityCount: openHighCount ?? 0,
      reviewedWithin7dPercent: reviewedPercent,
      onboardingComplete,
      override: (biz.health_score_override as number | null) ?? null,
    })

    rows.push({
      id: biz.id,
      name: biz.name as string,
      operatorOrgId: biz.operator_org_id as string,
      healthScore: healthScore.total,
      isHealthScoreOverride: healthScore.isOverride,
      lastLoginAt,
      callsPerWeek: callsPerWeek ?? 0,
      billingPercent,
      churnedAt: null,
    })
  }

  return { clients: rows, total: count ?? 0 }
}

export interface ClientDetail {
  id: string
  name: string
  hipaaMode: boolean
  notes?: string | null
  ownerEmail: string | null
  healthBreakdown: ClientHealthBreakdown
  lastLoginAt: string | null
  openHighPriorityCount: number
  callsThisMonth: number
  callsLastMonth: number
  onboardingStatus: string | null
  billingRules: Array<{ id: string; type: string; name: string; amount: number; active: boolean }>
  recentCalls: Array<{ id: string; timestamp: string; callType: string; priority: string; portalStatus: string; message: string }>
  apiKeys: Array<{ id: string; label: string; scopes: string[]; createdAt: string; revokedAt: string | null }>
  healthScoreOverride: number | null
}

export interface OperatorSetupStatus {
  hasBranding: boolean
  hasTemplate: boolean
  hasClients: boolean
  hasApiKeyOrWebhook: boolean
  hasCallData: boolean
  isComplete: boolean
}

export async function getClientDetail(
  businessId: string,
  operatorOrgId: string
): Promise<ClientDetail | null> {
  const supabase = await createClient()

  const { data: biz, error } = await supabase
    .from('businesses')
    .select('id, name, notes, health_score_override, operator_org_id, hipaa_mode')
    .eq('id', businessId)
    .eq('operator_org_id', operatorOrgId)
    .maybeSingle()

  if (error || !biz) return null

  const now = new Date()

  const { data: loginData } = await supabase
    .from('users_businesses')
    .select('last_login_at')
    .eq('business_id', businessId)
    .order('last_login_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastLoginAt = (loginData as { last_login_at?: string | null } | null)?.last_login_at ?? null
  const daysSinceLastLogin = lastLoginAt
    ? Math.floor((now.getTime() - new Date(lastLoginAt).getTime()) / 86_400_000)
    : null

  const { count: openHighCount } = await supabase
    .from('call_logs')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('priority', 'high')
    .not('portal_status', 'in', '("resolved","read")')

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const { data: highCalls } = await supabase
    .from('call_logs')
    .select('id, timestamp, actions:message_actions(type, at)')
    .eq('business_id', businessId)
    .eq('priority', 'high')
    .gte('timestamp', thirtyDaysAgo)

  let reviewedCount = 0
  const totalHigh = (highCalls ?? []).length
  for (const call of (highCalls ?? []) as Array<{
    timestamp: string
    actions?: Array<{ type: string; at: string }> | null
  }>) {
    const callTs = new Date(call.timestamp).getTime()
    const sevenDaysAfter = callTs + 7 * 86_400_000
    const hasReview = (call.actions ?? []).some(
      (a) => a.type === 'status_changed' && new Date(a.at).getTime() <= sevenDaysAfter
    )
    if (hasReview) reviewedCount++
  }
  const reviewedPercent = totalHigh > 0 ? Math.round((reviewedCount / totalHigh) * 100) : 100

  const { data: wizard } = await supabase
    .from('answering_service_wizard_sessions')
    .select('status')
    .eq('business_id', businessId)
    .maybeSingle()

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString()
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59)).toISOString()

  const [{ count: callsThisMonth }, { count: callsLastMonth }] = await Promise.all([
    supabase.from('call_logs').select('id', { count: 'exact', head: true })
      .eq('business_id', businessId).gte('timestamp', monthStart),
    supabase.from('call_logs').select('id', { count: 'exact', head: true })
      .eq('business_id', businessId).gte('timestamp', lastMonthStart).lte('timestamp', lastMonthEnd),
  ])

  const { data: billingRules } = await supabase
    .from('billing_rules')
    .select('id, type, name, amount, active')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  const { data: recentCalls } = await supabase
    .from('call_logs')
    .select('id, timestamp, call_type, priority, portal_status, message')
    .eq('business_id', businessId)
    .order('timestamp', { ascending: false })
    .limit(10)

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, label, scopes, created_at, revoked_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  const healthScore = computeHealthScore({
    daysSinceLastLogin,
    openHighPriorityCount: openHighCount ?? 0,
    reviewedWithin7dPercent: reviewedPercent,
    onboardingComplete: (wizard as { status?: string | null } | null)?.status === 'completed',
    override: (biz.health_score_override as number | null) ?? null,
  })

  // Fetch owner email via service role
  const serviceClient = createServiceRoleClient()
  const { data: ownerUb } = await supabase
    .from('users_businesses')
    .select('user_id')
    .eq('business_id', businessId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  let ownerEmail: string | null = null
  if (ownerUb?.user_id) {
    const { data: authData } = await serviceClient.auth.admin.getUserById(
      ownerUb.user_id as string
    )
    ownerEmail = authData?.user?.email ?? null
  }

  return {
    id: biz.id,
    name: biz.name as string,
    hipaaMode: (biz as { hipaa_mode?: boolean }).hipaa_mode ?? false,
    notes: (biz.notes as string | null | undefined) ?? null,
    ownerEmail,
    healthBreakdown: healthScore,
    lastLoginAt,
    openHighPriorityCount: openHighCount ?? 0,
    callsThisMonth: callsThisMonth ?? 0,
    callsLastMonth: callsLastMonth ?? 0,
    onboardingStatus: (wizard as { status?: string | null } | null)?.status ?? null,
    billingRules: ((billingRules ?? []) as Array<{
      id: string
      type: string
      name: string
      amount: number
      active: boolean
    }>),
    recentCalls: ((recentCalls ?? []) as Array<{
      id: string
      timestamp: string
      call_type: string
      priority: string
      portal_status: string
      message: string
    }>).map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      callType: r.call_type,
      priority: r.priority,
      portalStatus: r.portal_status,
      message: r.message,
    })),
    apiKeys: ((apiKeys ?? []) as Array<{
      id: string
      label: string
      scopes: string[] | null
      created_at: string
      revoked_at: string | null
    }>).map((k) => ({
      id: k.id,
      label: k.label,
      scopes: k.scopes ?? [],
      createdAt: k.created_at,
      revokedAt: k.revoked_at ?? null,
    })),
    healthScoreOverride: (biz.health_score_override as number | null) ?? null,
  }
}

export async function getOperatorSetupStatus(
  operatorOrgId: string
): Promise<OperatorSetupStatus> {
  const supabase = await createClient()

  const [
    orgResult,
    templateResult,
    clientResult,
    apiKeyResult,
    webhookResult,
    businessForCallsResult,
  ] = await Promise.all([
    supabase
      .from('operator_orgs')
      .select('branding')
      .eq('id', operatorOrgId)
      .maybeSingle(),
    supabase
      .from('billing_rule_templates')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .is('churned_at', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('api_keys')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .is('revoked_at', null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('webhook_subscriptions')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('businesses')
      .select('id')
      .eq('operator_org_id', operatorOrgId)
      .limit(50),
  ])

  // Log but don't throw — setup status is a non-critical checklist feature.
  // A missing column (e.g. before a migration runs) should degrade gracefully.
  if (orgResult.error) logger.warn('getOperatorSetupStatus: orgResult error', { error: orgResult.error.message })
  if (templateResult.error) logger.warn('getOperatorSetupStatus: templateResult error', { error: templateResult.error.message })
  if (clientResult.error) logger.warn('getOperatorSetupStatus: clientResult error', { error: clientResult.error.message })
  if (apiKeyResult.error) logger.warn('getOperatorSetupStatus: apiKeyResult error', { error: apiKeyResult.error.message })
  if (webhookResult.error) logger.warn('getOperatorSetupStatus: webhookResult error', { error: webhookResult.error.message })
  if (businessForCallsResult.error) logger.warn('getOperatorSetupStatus: businessForCallsResult error', { error: businessForCallsResult.error.message })

  const branding = (orgResult.data as { branding?: { logo_url?: string | null; primary_color?: string | null } | null } | null)?.branding
  const logoUrl = branding?.logo_url?.trim() ?? ''
  const primaryColor = branding?.primary_color?.trim() ?? ''
  const hasBranding = Boolean(logoUrl) || (primaryColor !== '' && primaryColor !== '#334155')

  const businessIds = ((businessForCallsResult.data ?? []) as Array<{ id: string }>).map(
    (business) => business.id
  )

  let hasCallData = false
  if (businessIds.length > 0) {
    const { data: callLog, error: callError } = await supabase
      .from('call_logs')
      .select('id')
      .in('business_id', businessIds)
      .limit(1)
      .maybeSingle()

    if (callError) logger.warn('getOperatorSetupStatus: callError', { error: callError.message })
    hasCallData = Boolean(callLog?.id)
  }

  const hasTemplate = Boolean(templateResult.data?.id)
  const hasClients = Boolean(clientResult.data?.id)
  const hasApiKeyOrWebhook = Boolean(apiKeyResult.data?.id || webhookResult.data?.id)
  const isComplete =
    hasBranding &&
    hasTemplate &&
    hasClients &&
    hasApiKeyOrWebhook &&
    hasCallData

  return {
    hasBranding,
    hasTemplate,
    hasClients,
    hasApiKeyOrWebhook,
    hasCallData,
    isComplete,
  }
}

export interface ClientOnCallStatus {
  contactName: string | null
  contactPhone: string | null
  contactRole: string | null
  shiftName: string | null
}

export async function getClientOnCallStatus(
  businessId: string,
  operatorOrgId: string
): Promise<ClientOnCallStatus> {
  // Verify the business belongs to this operator's org before reading on-call data
  const supabase = createServiceRoleClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('operator_org_id', operatorOrgId)
    .maybeSingle()

  if (!business) {
    return { contactName: null, contactPhone: null, contactRole: null, shiftName: null }
  }

  const timezone = await getBusinessTimezone(businessId) ?? 'America/New_York'
  const { shifts, contacts } = await loadSchedulerData(businessId)
  const resolved = resolveActiveShift(new Date(), timezone, shifts, contacts)

  if (!resolved || resolved.escalationSteps.length === 0) {
    return { contactName: null, contactPhone: null, contactRole: null, shiftName: null }
  }

  const first = resolved.escalationSteps[0]
  return {
    contactName: first.name,
    contactPhone: first.phone,
    contactRole: first.role,
    shiftName: resolved.shiftName,
  }
}
