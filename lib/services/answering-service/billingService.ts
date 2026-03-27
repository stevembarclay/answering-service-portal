import { createClient } from '@/lib/supabase/server'
import { computeEstimate } from '@/lib/services/answering-service/billingEngine'
import type { BillingEstimate, BillingInvoice, BillingRule, CallLog } from '@/types/answeringService'
import type { UsagePeriod } from '@/types/operator'

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

interface CallLogRow {
  id: string
  business_id: string
  timestamp: string
  caller_name: string | null
  caller_number: string | null
  callback_number: string | null
  call_type: string
  direction: CallLog['direction']
  duration_seconds: number
  telephony_status: CallLog['telephonyStatus']
  message: string
  priority: CallLog['priority']
  portal_status: CallLog['portalStatus']
}

interface BillingPeriodRow {
  id: string
  business_id: string
  period_start: string
  period_end: string
  status: BillingInvoice['status']
  total_cents: number
  call_count: number
  line_items: BillingInvoice['lineItems'] | null
  paid_at: string | null
  pdf_url: string | null
  created_at: string
}

interface UsagePeriodRow {
  id: string
  business_id: string
  operator_org_id: string
  period_date: string
  total_calls: number
  total_minutes: string
  call_type_breakdown: Record<string, { calls: number; minutes: number }>
  source: UsagePeriod['source']
  status: UsagePeriod['status']
  error_detail: UsagePeriod['errorDetail']
  raw_file_url: string | null
  processed_at: string | null
  created_at: string
}

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

function mapCall(row: CallLogRow): CallLog {
  return {
    id: row.id,
    businessId: row.business_id,
    timestamp: row.timestamp,
    callerName: row.caller_name ?? undefined,
    callerNumber: row.caller_number ?? undefined,
    callbackNumber: row.callback_number ?? undefined,
    callType: row.call_type,
    direction: row.direction,
    durationSeconds: row.duration_seconds,
    telephonyStatus: row.telephony_status,
    message: row.message,
    priority: row.priority,
    portalStatus: row.portal_status,
    actions: [],
    isNew: false,
    notes: [],
  }
}

function mapInvoice(row: BillingPeriodRow): BillingInvoice {
  return {
    id: row.id,
    businessId: row.business_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    status: row.status,
    totalCents: row.total_cents,
    callCount: row.call_count,
    lineItems: row.line_items ?? [],
    paidAt: row.paid_at ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
    createdAt: row.created_at,
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

function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  return { start, end }
}

export async function getBillingRules(businessId: string): Promise<BillingRule[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billing_rules')
    .select('id, business_id, type, name, amount, call_type_filter, included_minutes, overage_rate, time_column, active')
    .eq('business_id', businessId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error('Failed to load billing rules.')
  }

  // SAFETY: This query selects the exact BillingRuleRow shape declared above.
  return ((data ?? []) as BillingRuleRow[]).map(mapRule)
}

export async function getCurrentEstimate(businessId: string): Promise<BillingEstimate> {
  const supabase = await createClient()
  const period = getCurrentPeriod()
  const [rules, usageResult, businessResult] = await Promise.all([
    getBillingRules(businessId),
    supabase
      .from('usage_periods')
      .select('id, business_id, operator_org_id, period_date, total_calls, total_minutes, call_type_breakdown, source, status, error_detail, raw_file_url, processed_at, created_at')
      .eq('business_id', businessId)
      .eq('status', 'processed')
      .gte('period_date', period.start.toISOString().slice(0, 10))
      .lte('period_date', period.end.toISOString().slice(0, 10)),
    supabase.from('businesses').select('created_at').eq('id', businessId).maybeSingle(),
  ])

  if (usageResult.error) {
    throw new Error('Failed to load usage periods for the billing estimate.')
  }

  if (businessResult.error) {
    throw new Error('Failed to load business billing context.')
  }

  // SAFETY: Local DB types stub omits businesses.created_at, but the live schema provides it per Plan A.
  const businessCreatedAt =
    new Date((businessResult.data as { created_at?: string } | null)?.created_at ?? period.start.toISOString())

  const usagePeriods = ((usageResult.data ?? []) as UsagePeriodRow[]).map(mapUsagePeriod)

  return computeEstimate(businessId, usagePeriods, rules, period, businessCreatedAt)
}

export async function getPastInvoices(businessId: string): Promise<BillingInvoice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billing_periods')
    .select('id, business_id, period_start, period_end, status, total_cents, call_count, line_items, paid_at, pdf_url, created_at')
    .eq('business_id', businessId)
    .in('status', ['closed', 'paid'])
    .order('period_start', { ascending: false })

  if (error) {
    throw new Error('Failed to load past invoices.')
  }

  // SAFETY: This query selects the exact BillingPeriodRow shape declared above.
  return ((data ?? []) as BillingPeriodRow[]).map(mapInvoice)
}

export async function getInvoiceDetail(id: string, businessId: string): Promise<BillingInvoice | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billing_periods')
    .select('id, business_id, period_start, period_end, status, total_cents, call_count, line_items, paid_at, pdf_url, created_at')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  // SAFETY: This query selects the exact BillingPeriodRow shape declared above.
  return mapInvoice(data as BillingPeriodRow)
}
