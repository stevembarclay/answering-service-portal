import type {
  BillingEstimate,
  BillingInvoice,
  BillingLineItem,
  BillingRule,
  CallLog,
} from '@/types/answeringService'
import type { UsagePeriod } from '@/types/operator'

function filterByCallType(calls: CallLog[], filter: string[] | undefined): CallLog[] {
  if (!filter || filter.length === 0) {
    return calls
  }

  return calls.filter((call) => filter.includes(call.callType))
}

function durationCalls(calls: CallLog[]): CallLog[] {
  return calls.filter((call) => call.durationSeconds > 0)
}

function totalRoundedMinutes(calls: CallLog[]): number {
  return calls.reduce((sum, call) => sum + Math.ceil(call.durationSeconds / 60), 0)
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function applyPerCall(rule: BillingRule, calls: CallLog[]): BillingLineItem {
  const filtered = filterByCallType(calls, rule.callTypeFilter)
  const count = filtered.length

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription: `${count} call${count === 1 ? '' : 's'} × ${formatCurrency(rule.amount)}`,
    subtotalCents: count * rule.amount,
  }
}

function applyPerMinute(rule: BillingRule, calls: CallLog[]): BillingLineItem {
  const filtered = durationCalls(filterByCallType(calls, rule.callTypeFilter))
  const minutes = totalRoundedMinutes(filtered)

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription: `${minutes} min × ${formatCurrency(rule.amount)}/min`,
    subtotalCents: minutes * rule.amount,
  }
}

function applyFlatMonthly(rule: BillingRule): BillingLineItem {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription: 'Monthly fee',
    subtotalCents: rule.amount,
  }
}

function applySetupFee(
  rule: BillingRule,
  businessCreatedAt: Date,
  periodStart: Date
): BillingLineItem | null {
  const isFirstPeriod =
    businessCreatedAt.getUTCFullYear() === periodStart.getUTCFullYear() &&
    businessCreatedAt.getUTCMonth() === periodStart.getUTCMonth()

  if (!isFirstPeriod) {
    return null
  }

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription: 'One-time setup fee',
    subtotalCents: rule.amount,
  }
}

function applyBucket(rule: BillingRule, calls: CallLog[]): BillingLineItem {
  const filtered = durationCalls(filterByCallType(calls, rule.callTypeFilter))
  const minutes = totalRoundedMinutes(filtered)
  const includedMinutes = rule.includedMinutes ?? 0
  const overageRate = rule.overageRate ?? 0
  const overageMinutes = Math.max(0, minutes - includedMinutes)
  const subtotalCents = overageMinutes * overageRate

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription:
      overageMinutes === 0
        ? `${minutes} of ${includedMinutes} min included (no overage)`
        : `${includedMinutes} min included + ${overageMinutes} overage × ${formatCurrency(overageRate)}/min`,
    subtotalCents,
  }
}

export function calculateBilling(
  rules: BillingRule[],
  calls: CallLog[],
  period: { start: Date; end: Date },
  businessCreatedAt: Date
): BillingLineItem[] {
  const lineItems: BillingLineItem[] = []

  for (const rule of rules.filter((candidate) => candidate.active)) {
    switch (rule.type) {
      case 'per_call':
        lineItems.push(applyPerCall(rule, calls))
        break
      case 'per_minute':
        lineItems.push(applyPerMinute(rule, calls))
        break
      case 'flat_monthly':
        lineItems.push(applyFlatMonthly(rule))
        break
      case 'setup_fee': {
        const setupFee = applySetupFee(rule, businessCreatedAt, period.start)
        if (setupFee) {
          lineItems.push(setupFee)
        }
        break
      }
      case 'bucket':
        lineItems.push(applyBucket(rule, calls))
        break
    }
  }

  return lineItems
}

/**
 * @deprecated Use computeEstimate() with usage_periods instead.
 */
export function calculateEstimate(
  businessId: string,
  rules: BillingRule[],
  calls: CallLog[],
  period: { start: Date; end: Date },
  businessCreatedAt: Date
): BillingEstimate {
  const lineItems = calculateBilling(rules, calls, period, businessCreatedAt)

  return {
    businessId,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    asOf: new Date().toISOString(),
    totalCents: lineItems.reduce((sum, item) => sum + item.subtotalCents, 0),
    callCount: calls.length,
    lineItems,
  }
}

export function calculateInvoice(
  businessId: string,
  rules: BillingRule[],
  calls: CallLog[],
  period: { start: Date; end: Date },
  businessCreatedAt: Date
): Pick<BillingInvoice, 'businessId' | 'periodStart' | 'periodEnd' | 'totalCents' | 'callCount' | 'lineItems'> {
  const lineItems = calculateBilling(rules, calls, period, businessCreatedAt)

  return {
    businessId,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    totalCents: lineItems.reduce((sum, item) => sum + item.subtotalCents, 0),
    callCount: calls.length,
    lineItems,
  }
}

interface AggregatedUsage {
  totalCalls: number
  totalMinutes: number
  byType: Record<string, {
    calls: number
    minutes: number
    inbound_minutes: number
    outbound_minutes: number
    work_minutes: number
  }>
}

function aggregateUsagePeriods(periods: UsagePeriod[]): AggregatedUsage {
  const byType: Record<string, {
    calls: number
    minutes: number
    inbound_minutes: number
    outbound_minutes: number
    work_minutes: number
  }> = {}
  let totalCalls = 0
  let totalMinutes = 0

  for (const period of periods) {
    totalCalls += period.totalCalls
    totalMinutes += Number(period.totalMinutes)
    for (const [type, data] of Object.entries(period.callTypeBreakdown)) {
      if (!byType[type]) {
        byType[type] = { calls: 0, minutes: 0, inbound_minutes: 0, outbound_minutes: 0, work_minutes: 0 }
      }
      byType[type].calls += data.calls
      byType[type].minutes += data.minutes
      byType[type].inbound_minutes += data.inbound_minutes ?? 0
      byType[type].outbound_minutes += data.outbound_minutes ?? 0
      byType[type].work_minutes += data.work_minutes ?? 0
    }
  }

  return { totalCalls, totalMinutes, byType }
}

function resolveMinutes(
  timeColumn: string | undefined,
  entry: { minutes: number; inbound_minutes: number; outbound_minutes: number; work_minutes: number }
): number {
  switch (timeColumn ?? 'total') {
    case 'inbound':  return entry.inbound_minutes !== 0 ? entry.inbound_minutes : entry.minutes
    case 'outbound': return entry.outbound_minutes
    case 'work':     return entry.work_minutes !== 0 ? entry.work_minutes : entry.minutes
    default:         return entry.minutes  // 'total'
  }
}

function applyPerCallFromUsage(rule: BillingRule, usage: AggregatedUsage): BillingLineItem {
  const count = rule.callTypeFilter
    ? rule.callTypeFilter.reduce((sum, t) => sum + (usage.byType[t]?.calls ?? 0), 0)
    : usage.totalCalls

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription: `${count} call${count === 1 ? '' : 's'} × ${formatCurrency(rule.amount)}`,
    subtotalCents: count * rule.amount,
  }
}

function applyPerMinuteFromUsage(rule: BillingRule, usage: AggregatedUsage): BillingLineItem {
  const minutes = rule.callTypeFilter
    ? rule.callTypeFilter.reduce((sum, t) => {
        const entry = usage.byType[t]
        return sum + (entry ? resolveMinutes(rule.timeColumn, entry) : 0)
      }, 0)
    : usage.totalMinutes
  const roundedMinutes = Math.ceil(minutes)

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription: `${roundedMinutes} min × ${formatCurrency(rule.amount)}/min`,
    subtotalCents: roundedMinutes * rule.amount,
  }
}

function applyBucketFromUsage(rule: BillingRule, usage: AggregatedUsage): BillingLineItem {
  const minutes = rule.callTypeFilter
    ? rule.callTypeFilter.reduce((sum, t) => {
        const entry = usage.byType[t]
        return sum + (entry ? resolveMinutes(rule.timeColumn, entry) : 0)
      }, 0)
    : usage.totalMinutes
  const roundedMinutes = Math.ceil(minutes)
  const includedMinutes = rule.includedMinutes ?? 0
  const overageRate = rule.overageRate ?? 0
  const overageMinutes = Math.max(0, roundedMinutes - includedMinutes)

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    unitDescription:
      overageMinutes === 0
        ? `${roundedMinutes} of ${includedMinutes} min included (no overage)`
        : `${includedMinutes} min included + ${overageMinutes} overage × ${formatCurrency(overageRate)}/min`,
    subtotalCents: overageMinutes * overageRate,
  }
}

export function computeEstimate(
  businessId: string,
  usagePeriods: UsagePeriod[],
  billingRules: BillingRule[],
  period: { start: Date; end: Date },
  businessCreatedAt: Date
): BillingEstimate {
  const usage = aggregateUsagePeriods(usagePeriods)
  const lineItems: BillingLineItem[] = []

  for (const rule of billingRules.filter((r) => r.active)) {
    switch (rule.type) {
      case 'per_call':
        lineItems.push(applyPerCallFromUsage(rule, usage))
        break
      case 'per_minute':
        lineItems.push(applyPerMinuteFromUsage(rule, usage))
        break
      case 'flat_monthly':
        lineItems.push(applyFlatMonthly(rule))
        break
      case 'setup_fee': {
        const item = applySetupFee(rule, businessCreatedAt, period.start)
        if (item) lineItems.push(item)
        break
      }
      case 'bucket':
        lineItems.push(applyBucketFromUsage(rule, usage))
        break
    }
  }

  return {
    businessId,
    periodStart: period.start.toISOString(),
    periodEnd: period.end.toISOString(),
    asOf: new Date().toISOString(),
    totalCents: lineItems.reduce((sum, item) => sum + item.subtotalCents, 0),
    callCount: usage.totalCalls,
    lineItems,
  }
}
