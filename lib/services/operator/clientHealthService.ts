import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { createModuleLogger } from '@/lib/utils/logger'
import type { ClientHealthBreakdown, ClientRow } from '@/types/operator'

const logger = createModuleLogger('clientHealthService')

// ─── Pure computation ─────────────────────────��──────────────────────────────

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

// ─── Types ─────────────────────────────────────────────────────────────���─────

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

// ─── DB queries ─────────────────────────────────────────────────────────────���

/**
 * Returns all non-churned clients for the operator org with computed health scores.
 * Batches all per-client data queries using IN clauses + Promise.all to avoid N+1.
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

  const bizList = businesses ?? []
  if (bizList.length === 0) return { clients: [], total: count ?? 0 }

  const businessIds = bizList.map((b) => b.id as string)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString().slice(0, 10)
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString().slice(0, 10)

  // Batch all per-client data in parallel
  const [
    loginResult,
    openHighResult,
    highCallResult,
    wizardResult,
    weekCallResult,
    bucketRuleResult,
  ] = await Promise.all([
    supabase.from('users_businesses')
      .select('business_id, last_login_at')
      .in('business_id', businessIds),
    supabase.from('call_logs')
      .select('business_id')
      .in('business_id', businessIds)
      .eq('priority', 'high')
      .not('portal_status', 'in', '("resolved","read")'),
    supabase.from('call_logs')
      .select('business_id, timestamp, actions:message_actions(type, at)')
      .in('business_id', businessIds)
      .eq('priority', 'high')
      .gte('timestamp', thirtyDaysAgo),
    supabase.from('answering_service_wizard_sessions')
      .select('business_id, status')
      .in('business_id', businessIds),
    supabase.from('call_logs')
      .select('business_id')
      .in('business_id', businessIds)
      .gte('timestamp', sevenDaysAgo),
    supabase.from('billing_rules')
      .select('business_id, included_minutes')
      .in('business_id', businessIds)
      .eq('type', 'bucket')
      .eq('active', true),
  ])

  // For businesses with bucket rules, batch-fetch usage periods
  type BucketRuleRow = { business_id: string; included_minutes: number | null }
  const bucketRules = (bucketRuleResult.data ?? []) as BucketRuleRow[]
  const bizIdsWithBucket = [...new Set(bucketRules.map((r) => r.business_id))]

  let usagePeriods: Array<{ business_id: string; total_minutes: number | string }> = []
  if (bizIdsWithBucket.length > 0) {
    const { data: usageData } = await supabase
      .from('usage_periods')
      .select('business_id, total_minutes')
      .in('business_id', bizIdsWithBucket)
      .eq('status', 'processed')
      .gte('period_date', monthStart)
      .lte('period_date', monthEnd)
    usagePeriods = (usageData ?? []) as typeof usagePeriods
  }

  // Build per-business lookup maps for O(1) joins in memory
  type LoginRow = { business_id: string; last_login_at: string | null }
  const loginByBiz = new Map<string, string | null>()
  for (const row of (loginResult.data ?? []) as LoginRow[]) {
    const existing = loginByBiz.get(row.business_id)
    if (!existing || (row.last_login_at && row.last_login_at > existing)) {
      loginByBiz.set(row.business_id, row.last_login_at ?? null)
    }
  }

  const openHighByBiz = new Map<string, number>()
  for (const row of (openHighResult.data ?? []) as Array<{ business_id: string }>) {
    openHighByBiz.set(row.business_id, (openHighByBiz.get(row.business_id) ?? 0) + 1)
  }

  type HighCallRow = {
    business_id: string
    timestamp: string
    actions?: Array<{ type: string; at: string }> | null
  }
  const highCallsByBiz = new Map<string, HighCallRow[]>()
  for (const row of (highCallResult.data ?? []) as HighCallRow[]) {
    const arr = highCallsByBiz.get(row.business_id) ?? []
    arr.push(row)
    highCallsByBiz.set(row.business_id, arr)
  }

  const wizardByBiz = new Map<string, string | null>()
  for (const row of (wizardResult.data ?? []) as Array<{ business_id: string; status: string | null }>) {
    wizardByBiz.set(row.business_id, row.status ?? null)
  }

  const weekCallsByBiz = new Map<string, number>()
  for (const row of (weekCallResult.data ?? []) as Array<{ business_id: string }>) {
    weekCallsByBiz.set(row.business_id, (weekCallsByBiz.get(row.business_id) ?? 0) + 1)
  }

  const bucketRuleByBiz = new Map<string, number>()
  for (const rule of bucketRules) {
    if (rule.included_minutes) bucketRuleByBiz.set(rule.business_id, rule.included_minutes)
  }

  const usageByBiz = new Map<string, number>()
  for (const row of usagePeriods) {
    usageByBiz.set(row.business_id, (usageByBiz.get(row.business_id) ?? 0) + Number(row.total_minutes))
  }

  // Join in memory
  const rows: ClientRow[] = []
  for (const biz of bizList) {
    const id = biz.id as string

    const lastLoginAt = loginByBiz.get(id) ?? null
    const daysSinceLastLogin = lastLoginAt
      ? Math.floor((now.getTime() - new Date(lastLoginAt).getTime()) / 86_400_000)
      : null

    const openHighCount = openHighByBiz.get(id) ?? 0

    const highCalls = highCallsByBiz.get(id) ?? []
    let reviewedCount = 0
    for (const call of highCalls) {
      const callTs = new Date(call.timestamp).getTime()
      const sevenDaysAfterCall = callTs + 7 * 86_400_000
      const hasReview = (call.actions ?? []).some(
        (a) => a.type === 'status_changed' && new Date(a.at).getTime() <= sevenDaysAfterCall
      )
      if (hasReview) reviewedCount++
    }
    const reviewedPercent = highCalls.length > 0
      ? Math.round((reviewedCount / highCalls.length) * 100)
      : 100

    const onboardingComplete = wizardByBiz.get(id) === 'completed'
    const callsPerWeek = weekCallsByBiz.get(id) ?? 0

    const includedMinutes = bucketRuleByBiz.get(id) ?? null
    let billingPercent: number | null = null
    if (includedMinutes) {
      const totalMinutes = usageByBiz.get(id) ?? 0
      billingPercent = Math.round((totalMinutes / includedMinutes) * 100)
    }

    const healthScore = computeHealthScore({
      daysSinceLastLogin,
      openHighPriorityCount: openHighCount,
      reviewedWithin7dPercent: reviewedPercent,
      onboardingComplete,
      override: (biz.health_score_override as number | null) ?? null,
    })

    rows.push({
      id,
      name: biz.name as string,
      operatorOrgId: biz.operator_org_id as string,
      healthScore: healthScore.total,
      isHealthScoreOverride: healthScore.isOverride,
      lastLoginAt,
      callsPerWeek,
      billingPercent,
      churnedAt: null,
    })
  }

  return { clients: rows, total: count ?? 0 }
}

/**
 * Returns full detail for a single client, running all independent queries in parallel.
 */
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString()
  const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59)).toISOString()

  // Run all independent queries in parallel
  const [
    loginResult,
    openHighResult,
    highCallsResult,
    wizardResult,
    callsThisMonthResult,
    callsLastMonthResult,
    billingRulesResult,
    recentCallsResult,
    apiKeysResult,
    ownerUbResult,
  ] = await Promise.all([
    supabase.from('users_businesses')
      .select('last_login_at')
      .eq('business_id', businessId)
      .order('last_login_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('priority', 'high')
      .not('portal_status', 'in', '("resolved","read")'),
    supabase.from('call_logs')
      .select('id, timestamp, actions:message_actions(type, at)')
      .eq('business_id', businessId)
      .eq('priority', 'high')
      .gte('timestamp', thirtyDaysAgo),
    supabase.from('answering_service_wizard_sessions')
      .select('status')
      .eq('business_id', businessId)
      .maybeSingle(),
    supabase.from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('timestamp', monthStart),
    supabase.from('call_logs')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('timestamp', lastMonthStart)
      .lte('timestamp', lastMonthEnd),
    supabase.from('billing_rules')
      .select('id, type, name, amount, active')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true }),
    supabase.from('call_logs')
      .select('id, timestamp, call_type, priority, portal_status, message')
      .eq('business_id', businessId)
      .order('timestamp', { ascending: false })
      .limit(10),
    supabase.from('api_keys')
      .select('id, label, scopes, created_at, revoked_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    supabase.from('users_businesses')
      .select('user_id')
      .eq('business_id', businessId)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle(),
  ])

  const lastLoginAt = (loginResult.data as { last_login_at?: string | null } | null)?.last_login_at ?? null
  const daysSinceLastLogin = lastLoginAt
    ? Math.floor((now.getTime() - new Date(lastLoginAt).getTime()) / 86_400_000)
    : null

  const highCalls = (highCallsResult.data ?? []) as Array<{
    timestamp: string
    actions?: Array<{ type: string; at: string }> | null
  }>
  let reviewedCount = 0
  const totalHigh = highCalls.length
  for (const call of highCalls) {
    const callTs = new Date(call.timestamp).getTime()
    const sevenDaysAfter = callTs + 7 * 86_400_000
    const hasReview = (call.actions ?? []).some(
      (a) => a.type === 'status_changed' && new Date(a.at).getTime() <= sevenDaysAfter
    )
    if (hasReview) reviewedCount++
  }
  const reviewedPercent = totalHigh > 0 ? Math.round((reviewedCount / totalHigh) * 100) : 100

  const healthScore = computeHealthScore({
    daysSinceLastLogin,
    openHighPriorityCount: openHighResult.count ?? 0,
    reviewedWithin7dPercent: reviewedPercent,
    onboardingComplete: (wizardResult.data as { status?: string | null } | null)?.status === 'completed',
    override: (biz.health_score_override as number | null) ?? null,
  })

  // Fetch owner email — requires service role for auth.admin API
  let ownerEmail: string | null = null
  const ownerUb = ownerUbResult.data
  if (ownerUb?.user_id) {
    try {
      const serviceClient = createServiceRoleClient()
      const { data: authData } = await serviceClient.auth.admin.getUserById(
        ownerUb.user_id as string
      )
      ownerEmail = authData?.user?.email ?? null
    } catch (err) {
      logger.warn('Failed to fetch owner email', { businessId, err })
    }
  }

  return {
    id: biz.id,
    name: biz.name as string,
    hipaaMode: (biz as { hipaa_mode?: boolean }).hipaa_mode ?? false,
    notes: (biz.notes as string | null | undefined) ?? null,
    ownerEmail,
    healthBreakdown: healthScore,
    lastLoginAt,
    openHighPriorityCount: openHighResult.count ?? 0,
    callsThisMonth: callsThisMonthResult.count ?? 0,
    callsLastMonth: callsLastMonthResult.count ?? 0,
    onboardingStatus: (wizardResult.data as { status?: string | null } | null)?.status ?? null,
    billingRules: ((billingRulesResult.data ?? []) as Array<{
      id: string
      type: string
      name: string
      amount: number
      active: boolean
    }>),
    recentCalls: ((recentCallsResult.data ?? []) as Array<{
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
    apiKeys: ((apiKeysResult.data ?? []) as Array<{
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
