import { createClient } from '@/lib/supabase/server'
import { computeEstimate } from '@/lib/services/answering-service/billingEngine'
import { createModuleLogger } from '@/lib/utils/logger'
import type { BillingLineItem, BillingRule } from '@/types/answeringService'
import type { UsagePeriod } from '@/types/operator'

const logger = createModuleLogger('monthCloseService')
// ---------------------------------------------------------------------------
// Public types (used by API routes and page components)
// ---------------------------------------------------------------------------

export interface MonthCloseRow {
  periodId: string
  businessId: string
  clientName: string
  periodStart: string               // ISO 8601
  periodEnd: string                 // ISO 8601
  status: 'open' | 'closed' | 'paid'
  callCount: number
  computedTotalCents: number        // sum of line items (immutable once closed)
  adjustmentCents: number           // signed: negative = credit
  adjustmentNote: string | null
  finalTotalCents: number           // computedTotalCents + adjustmentCents
  closedAt: string | null
  closedByUserId: string | null
  lineItems: BillingLineItem[]
}

export interface MonthCloseSummary {
  totalOpenCount: number
  totalClosedCount: number
  totalRevenueCents: number         // sum of finalTotalCents for all rows
}

export interface MonthCloseResponse {
  month: string                     // YYYY-MM
  rows: MonthCloseRow[]
  summary: MonthCloseSummary
}

export interface ClosePeriodOptions {
  adjustmentCents?: number
  adjustmentNote?: string
  closedByUserId: string
}

export interface BatchCloseResult {
  succeeded: string[]
  failed: Array<{ id: string; error: string }>
}

// ---------------------------------------------------------------------------
// Internal DB row types
// ---------------------------------------------------------------------------

interface BillingPeriodWithClient {
  id: string
  business_id: string
  period_start: string
  period_end: string
  status: 'open' | 'closed' | 'paid'
  total_cents: number | null
  call_count: number | null
  line_items: unknown
  adjustment_cents: number
  adjustment_note: string | null
  closed_by_user_id: string | null
  closed_at: string | null
  businesses: { name: string }
}

interface BillingRuleRow {
  id: string
  business_id: string
  type: BillingRule['type']
  name: string
  amount: number
  call_type_filter: string[] | null
  included_minutes: number | null
  overage_rate: number | null
  time_column: string
  active: boolean
}

interface UsagePeriodRow {
  id: string
  business_id: string
  operator_org_id: string
  period_date: string
  total_calls: number
  total_minutes: string
  call_type_breakdown: UsagePeriod['callTypeBreakdown']
  source: UsagePeriod['source']
  status: UsagePeriod['status']
  error_detail: UsagePeriod['errorDetail']
  raw_file_url: string | null
  processed_at: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapRule(row: BillingRuleRow): BillingRule {
  return {
    id: row.id,
    businessId: row.business_id,
    type: row.type,
    name: row.name,
    amount: row.amount,
    callTypeFilter: row.call_type_filter ?? undefined,
    includedMinutes: row.included_minutes ?? undefined,
    overageRate: row.overage_rate ?? undefined,
    // SAFETY: time_column is CHECK-constrained in DB to the BillingRule union members.
    timeColumn: (row.time_column as BillingRule['timeColumn']) ?? 'total',
    active: row.active,
  }
}

function mapUsagePeriod(row: UsagePeriodRow): UsagePeriod {
  return {
    id: row.id,
    businessId: row.business_id,
    operatorOrgId: row.operator_org_id,
    periodDate: row.period_date,
    totalCalls: row.total_calls,
    totalMinutes: Number(row.total_minutes),
    callTypeBreakdown: row.call_type_breakdown ?? {},
    source: row.source,
    status: row.status,
    errorDetail: row.error_detail,
    rawFileUrl: row.raw_file_url,
    processedAt: row.processed_at,
    createdAt: row.created_at,
  }
}

/**
 * Parse the line_items JSONB column from a closed period into BillingLineItem[].
 * Returns an empty array for open periods or malformed data.
 */
function parseLineItems(raw: unknown): BillingLineItem[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (item): item is BillingLineItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).ruleId === 'string' &&
      typeof (item as Record<string, unknown>).ruleName === 'string' &&
      typeof (item as Record<string, unknown>).subtotalCents === 'number'
  )
}

function buildMonthCloseRow(row: BillingPeriodWithClient): MonthCloseRow {
  const lineItems = parseLineItems(row.line_items)
  // For closed/paid periods, use the stored total_cents as the computed base.
  // For open periods, total_cents is null — callers that need the estimate compute it separately.
  const computedTotalCents =
    row.status !== 'open' && row.total_cents !== null
      ? row.total_cents - row.adjustment_cents
      : (row.total_cents ?? 0)
  const finalTotalCents = computedTotalCents + row.adjustment_cents

  return {
    periodId: row.id,
    businessId: row.business_id,
    clientName: row.businesses.name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    callCount: row.call_count ?? 0,
    computedTotalCents,
    adjustmentCents: row.adjustment_cents,
    adjustmentNote: row.adjustment_note,
    finalTotalCents,
    closedAt: row.closed_at,
    closedByUserId: row.closed_by_user_id,
    lineItems,
  }
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/**
 * Returns all billing period rows for the given operator org and calendar month,
 * with live estimates computed for open periods.
 *
 * @param operatorOrgId - Comes from getOperatorContext(); never trusted from request input.
 * @param month - YYYY-MM format, e.g. "2026-03"
 */
export async function getMonthClose(
  operatorOrgId: string,
  month: string
): Promise<MonthCloseResponse> {
  const supabase = await createClient()

  const [year, monthNum] = month.split('-').map(Number)
  const monthStart = new Date(Date.UTC(year, monthNum - 1, 1))
  const monthEnd = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59))
  const monthStartStr = monthStart.toISOString().slice(0, 10)
  const monthEndStr = monthEnd.toISOString().slice(0, 10)

  // 1. Load all billing periods for this operator's clients for the selected month.
  // billing_periods doesn't carry operator_org_id — scope via businesses join.
  const { data: periodsData, error: periodsError } = await supabase
    .from('billing_periods')
    .select(`
      id, business_id, period_start, period_end, status,
      total_cents, call_count, line_items,
      adjustment_cents, adjustment_note, closed_by_user_id, closed_at,
      businesses!inner(name, operator_org_id)
    `)
    .eq('businesses.operator_org_id', operatorOrgId)
    .gte('period_start', monthStart.toISOString())
    .lte('period_start', monthEnd.toISOString())
    .order('businesses(name)', { ascending: true })

  if (periodsError) {
    logger.error({ error: periodsError, operatorOrgId, month }, 'Failed to load billing periods for month close')
    throw new Error('Failed to load billing periods.')
  }

  // SAFETY: The select above joins businesses and filters by operator_org_id,
  // so each row has a businesses object. The Supabase client types this as an array
  // due to FK inference; we cast after verifying shape.
  const rows = (periodsData ?? []) as unknown as BillingPeriodWithClient[]

  // 2. For open periods, compute live estimates to show current totals.
  const openRows = rows.filter((r) => r.status === 'open')
  let estimateMap: Record<string, { computedTotalCents: number; callCount: number; lineItems: BillingLineItem[] }> = {}

  if (openRows.length > 0) {
    const businessIds = openRows.map((r) => r.business_id)

    // Batch load rules + usage for all open businesses (no N+1)
    const [rulesResult, usageResult, bizResult] = await Promise.all([
      supabase
        .from('billing_rules')
        .select('id, business_id, type, name, amount, call_type_filter, included_minutes, overage_rate, time_column, active')
        .in('business_id', businessIds)
        .eq('active', true),
      supabase
        .from('usage_periods')
        .select('id, business_id, operator_org_id, period_date, total_calls, total_minutes, call_type_breakdown, source, status, error_detail, raw_file_url, processed_at, created_at')
        .in('business_id', businessIds)
        .eq('status', 'processed')
        .gte('period_date', monthStartStr)
        .lte('period_date', monthEndStr),
      supabase
        .from('businesses')
        .select('id, created_at')
        .in('id', businessIds),
    ])

    if (rulesResult.error || usageResult.error || bizResult.error) {
      logger.error({ rulesError: rulesResult.error, usageError: usageResult.error, bizError: bizResult.error }, 'Failed to load estimate data for open periods')
      throw new Error('Failed to compute estimates for open billing periods.')
    }

    const rulesByBusiness: Record<string, BillingRule[]> = {}
    for (const row of (rulesResult.data ?? []) as BillingRuleRow[]) {
      if (!rulesByBusiness[row.business_id]) rulesByBusiness[row.business_id] = []
      rulesByBusiness[row.business_id].push(mapRule(row))
    }

    const usageByBusiness: Record<string, UsagePeriod[]> = {}
    for (const row of (usageResult.data ?? []) as UsagePeriodRow[]) {
      if (!usageByBusiness[row.business_id]) usageByBusiness[row.business_id] = []
      usageByBusiness[row.business_id].push(mapUsagePeriod(row))
    }

    const bizCreatedAt: Record<string, string> = {}
    for (const b of (bizResult.data ?? []) as { id: string; created_at: string }[]) {
      bizCreatedAt[b.id] = b.created_at
    }

    const period = { start: monthStart, end: monthEnd }

    for (const openRow of openRows) {
      const rules = rulesByBusiness[openRow.business_id] ?? []
      const usagePeriods = usageByBusiness[openRow.business_id] ?? []
      const createdAt = new Date(bizCreatedAt[openRow.business_id] ?? monthStart.toISOString())
      const estimate = computeEstimate(openRow.business_id, usagePeriods, rules, period, createdAt)
      estimateMap[openRow.id] = {
        computedTotalCents: estimate.totalCents,
        callCount: estimate.callCount,
        lineItems: estimate.lineItems,
      }
    }
  }

  // 3. Assemble the final rows, overlaying live estimates for open periods.
  const monthCloseRows: MonthCloseRow[] = rows.map((row) => {
    if (row.status === 'open' && estimateMap[row.id]) {
      const est = estimateMap[row.id]
      return {
        periodId: row.id,
        businessId: row.business_id,
        clientName: row.businesses.name,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        status: row.status,
        callCount: est.callCount,
        computedTotalCents: est.computedTotalCents,
        adjustmentCents: row.adjustment_cents,
        adjustmentNote: row.adjustment_note,
        finalTotalCents: est.computedTotalCents + row.adjustment_cents,
        closedAt: row.closed_at,
        closedByUserId: row.closed_by_user_id,
        lineItems: est.lineItems,
      }
    }
    return buildMonthCloseRow(row)
  })

  const summary: MonthCloseSummary = {
    totalOpenCount: monthCloseRows.filter((r) => r.status === 'open').length,
    totalClosedCount: monthCloseRows.filter((r) => r.status !== 'open').length,
    totalRevenueCents: monthCloseRows.reduce((sum, r) => sum + r.finalTotalCents, 0),
  }

  return { month, rows: monthCloseRows, summary }
}

/**
 * Closes a single billing period:
 * 1. Verifies the operator owns this period (via businesses.operator_org_id).
 * 2. Rejects if already closed/paid (409-level error).
 * 3. Recomputes total_cents from scratch (billing rules + usage) and freezes it.
 * 4. Stores adjustment_cents, adjustment_note, closed_by_user_id, closed_at.
 *
 * @param periodId - The billing_periods.id to close.
 * @param operatorOrgId - From getOperatorContext(); never from request input.
 * @param opts - closedByUserId is required; adjustmentCents/Note are optional.
 */
export async function closePeriod(
  periodId: string,
  operatorOrgId: string,
  opts: ClosePeriodOptions
): Promise<MonthCloseRow> {
  const { adjustmentCents = 0, adjustmentNote = null, closedByUserId } = opts
  const supabase = await createClient()

  // 1. Load the period and verify operator scope in one query.
  const { data: periodData, error: loadError } = await supabase
    .from('billing_periods')
    .select(`
      id, business_id, period_start, period_end, status,
      total_cents, call_count, line_items,
      adjustment_cents, adjustment_note, closed_by_user_id, closed_at,
      businesses!inner(name, operator_org_id, created_at)
    `)
    .eq('id', periodId)
    .eq('businesses.operator_org_id', operatorOrgId)
    .maybeSingle()

  if (loadError) {
    logger.error({ error: loadError, periodId, operatorOrgId }, 'Failed to load period for close')
    throw new Error('Failed to load billing period.')
  }

  if (!periodData) {
    const err = new Error('Billing period not found or not accessible.')
    ;(err as Error & { code: string }).code = 'NOT_FOUND'
    throw err
  }

  // SAFETY: businesses join is !inner and we verified operator_org_id above.
  const period = periodData as unknown as BillingPeriodWithClient & {
    businesses: { name: string; operator_org_id: string; created_at: string }
  }

  // 2. Reject if already closed or paid.
  if (period.status === 'closed' || period.status === 'paid') {
    const err = new Error('Billing period is already closed.')
    ;(err as Error & { code: string }).code = 'ALREADY_CLOSED'
    throw err
  }

  // 3. Recompute total from source data at close time (billing rules + usage).
  const businessId = period.business_id
  const periodStart = new Date(period.period_start)
  const periodEnd = new Date(period.period_end)
  const monthStartStr = periodStart.toISOString().slice(0, 10)
  const monthEndStr = periodEnd.toISOString().slice(0, 10)

  const [rulesResult, usageResult] = await Promise.all([
    supabase
      .from('billing_rules')
      .select('id, business_id, type, name, amount, call_type_filter, included_minutes, overage_rate, time_column, active')
      .eq('business_id', businessId)
      .eq('active', true),
    supabase
      .from('usage_periods')
      .select('id, business_id, operator_org_id, period_date, total_calls, total_minutes, call_type_breakdown, source, status, error_detail, raw_file_url, processed_at, created_at')
      .eq('business_id', businessId)
      .eq('status', 'processed')
      .gte('period_date', monthStartStr)
      .lte('period_date', monthEndStr),
  ])

  if (rulesResult.error || usageResult.error) {
    logger.error({ rulesError: rulesResult.error, usageError: usageResult.error, periodId }, 'Failed to load billing data for recompute')
    throw new Error('Failed to recompute billing total.')
  }

  const rules = ((rulesResult.data ?? []) as BillingRuleRow[]).map(mapRule)
  const usagePeriods = ((usageResult.data ?? []) as UsagePeriodRow[]).map(mapUsagePeriod)
  const businessCreatedAt = new Date(period.businesses.created_at)

  const estimate = computeEstimate(
    businessId,
    usagePeriods,
    rules,
    { start: periodStart, end: periodEnd },
    businessCreatedAt
  )

  const computedTotalCents = estimate.totalCents
  const finalTotalCents = computedTotalCents + adjustmentCents

  // 4. Persist the closed state. Race guard: .eq('status','open') means a
  // concurrent close returns null and triggers ALREADY_CLOSED below.
  const { data: updatedData, error: updateError } = await supabase
    .from('billing_periods')
    .update({
      status: 'closed',
      total_cents: finalTotalCents,
      call_count: estimate.callCount,
      // SAFETY: BillingLineItem[] is JSON-serializable (string/number fields only).
      line_items: estimate.lineItems as unknown as import('@/lib/supabase/database.types').Json,
      adjustment_cents: adjustmentCents,
      adjustment_note: adjustmentNote,
      closed_by_user_id: closedByUserId,
      closed_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .eq('status', 'open')
    .select(`
      id, business_id, period_start, period_end, status,
      total_cents, call_count, line_items,
      adjustment_cents, adjustment_note, closed_by_user_id, closed_at,
      businesses!inner(name, operator_org_id)
    `)
    .maybeSingle()

  if (updateError) {
    logger.error({ error: updateError, periodId }, 'Failed to update billing period on close')
    throw new Error('Failed to close billing period.')
  }

  if (!updatedData) {
    // 0 rows updated means a race — someone else closed it first.
    const err = new Error('Billing period is already closed.')
    ;(err as Error & { code: string }).code = 'ALREADY_CLOSED'
    throw err
  }

  return buildMonthCloseRow(updatedData as unknown as BillingPeriodWithClient)
}

/**
 * Batch-closes a list of billing period IDs.
 * Already-closed periods are skipped (idempotent).
 * Collects errors per period without aborting the entire batch.
 *
 * @param periodIds - Array of billing_periods.id values to close.
 * @param operatorOrgId - From getOperatorContext(); never from request input.
 * @param closedByUserId - The operator user performing the batch close.
 */
export async function batchClosePeriods(
  periodIds: string[],
  operatorOrgId: string,
  closedByUserId: string
): Promise<BatchCloseResult> {
  const succeeded: string[] = []
  const failed: Array<{ id: string; error: string }> = []

  for (const id of periodIds) {
    try {
      await closePeriod(id, operatorOrgId, { closedByUserId })
      succeeded.push(id)
    } catch (err) {
      const code = (err as Error & { code?: string }).code
      if (code === 'ALREADY_CLOSED') {
        // Idempotent — treat as success for batch operations
        succeeded.push(id)
      } else {
        const message = err instanceof Error ? err.message : 'Unknown error'
        logger.warn({ id, message }, 'Batch close: period failed')
        failed.push({ id, error: message })
      }
    }
  }

  return { succeeded, failed }
}
