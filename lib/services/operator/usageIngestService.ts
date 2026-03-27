import { createClient } from '@/lib/supabase/server'
import { fireWebhookEvent } from '@/lib/services/operator/webhookService'
import { sendThresholdAlertEmail } from '@/lib/services/operator/emailService'
import { logger } from '@/lib/utils/logger'

export interface ParsedRow {
  date: string
  businessId: string
  totalCalls: number
  totalMinutes: number
  callTypeBreakdown: Record<string, {
    calls: number
    minutes: number
    inbound_minutes?: number
    outbound_minutes?: number
    work_minutes?: number
  }>
}

export interface ValidationResult {
  valid: boolean
  issue?: string
}

export interface IngestResult {
  businessId: string
  date: string
  status: 'processed' | 'error'
  issue?: string
}

const THRESHOLD_LEVELS = [75, 90, 100] as const

/**
 * Parse a CSV string into structured rows.
 * Expected format:
 *   date,business_id,total_calls,total_minutes[,{calltype}_calls,{calltype}_minutes,...]
 *
 * Call type columns must be in _calls / _minutes pairs.
 * Within the same CSV, the last row for a (business_id, date) pair wins.
 */
export function parseCsvRows(csv: string): ParsedRow[] {
  const lines = csv.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim())
  const dateIdx = headers.indexOf('date')
  const bizIdx = headers.indexOf('business_id')
  const callsIdx = headers.indexOf('total_calls')
  const minutesIdx = headers.indexOf('total_minutes')

  if ([dateIdx, bizIdx, callsIdx, minutesIdx].includes(-1)) return []

  const callTypeColPairs: Array<{
    type: string
    callsIdx: number
    minutesIdx: number
    inboundMinutesIdx: number
    outboundMinutesIdx: number
    workMinutesIdx: number
  }> = []
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].endsWith('_calls') && headers[i] !== 'total_calls') {
      const typeName = headers[i].slice(0, -6)
      const minutesColIdx = headers.indexOf(`${typeName}_minutes`)
      if (minutesColIdx !== -1) {
        callTypeColPairs.push({
          type: typeName,
          callsIdx: i,
          minutesIdx: minutesColIdx,
          inboundMinutesIdx: headers.indexOf(`${typeName}_inbound_minutes`),
          outboundMinutesIdx: headers.indexOf(`${typeName}_outbound_minutes`),
          workMinutesIdx: headers.indexOf(`${typeName}_work_minutes`),
        })
      }
    }
  }

  const seen = new Map<string, ParsedRow>()

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim())
    if (cols.length < 4) continue

    const date = cols[dateIdx]
    const businessId = cols[bizIdx]
    const totalCalls = parseInt(cols[callsIdx], 10)
    const totalMinutes = parseFloat(cols[minutesIdx])

    if (!date || !businessId || isNaN(totalCalls) || isNaN(totalMinutes)) continue

    const callTypeBreakdown: ParsedRow['callTypeBreakdown'] = {}
    for (const { type, callsIdx: cIdx, minutesIdx: mIdx, inboundMinutesIdx, outboundMinutesIdx, workMinutesIdx } of callTypeColPairs) {
      const calls = parseInt(cols[cIdx] ?? '0', 10)
      const minutes = parseFloat(cols[mIdx] ?? '0')
      if (!isNaN(calls) && !isNaN(minutes)) {
        const entry: ParsedRow['callTypeBreakdown'][string] = { calls, minutes }
        if (inboundMinutesIdx !== -1) {
          const v = parseFloat(cols[inboundMinutesIdx] ?? '0')
          if (!isNaN(v)) entry.inbound_minutes = v
        }
        if (outboundMinutesIdx !== -1) {
          const v = parseFloat(cols[outboundMinutesIdx] ?? '0')
          if (!isNaN(v)) entry.outbound_minutes = v
        }
        if (workMinutesIdx !== -1) {
          const v = parseFloat(cols[workMinutesIdx] ?? '0')
          if (!isNaN(v)) entry.work_minutes = v
        }
        callTypeBreakdown[type] = entry
      }
    }

    const key = `${businessId}|${date}`
    seen.set(key, { date, businessId, totalCalls, totalMinutes, callTypeBreakdown })
  }

  return Array.from(seen.values())
}

export function validateRow(
  row: ParsedRow,
  allowedBusinessIds: string[]
): ValidationResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    return { valid: false, issue: `Invalid date format: "${row.date}". Expected YYYY-MM-DD.` }
  }

  if (!allowedBusinessIds.includes(row.businessId)) {
    return { valid: false, issue: `business_id "${row.businessId}" does not belong to this operator org.` }
  }

  if (row.totalCalls < 0) {
    return { valid: false, issue: `total_calls must be >= 0, got ${row.totalCalls}.` }
  }
  if (row.totalMinutes < 0) {
    return { valid: false, issue: `total_minutes must be >= 0, got ${row.totalMinutes}.` }
  }

  return { valid: true }
}

export function checkBillingThresholds(input: {
  previousMinutes: number
  newMinutes: number
  includedMinutes: number
}): number[] {
  const { previousMinutes, newMinutes, includedMinutes } = input
  const prevPct = (previousMinutes / includedMinutes) * 100
  const newPct = (newMinutes / includedMinutes) * 100

  return THRESHOLD_LEVELS.filter((level) => prevPct < level && newPct >= level)
}

export async function checkAndFireThresholdAlerts(
  businessId: string,
  operatorOrgId: string,
  periodDate: string,
  newRowMinutes: number,
  previousRowMinutes: number
): Promise<void> {
  const supabase = await createClient()
  const periodMonth = new Date(`${periodDate}T00:00:00Z`)
  const monthStart = new Date(Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth(), 1))
    .toISOString().slice(0, 10)
  const monthEnd = new Date(Date.UTC(periodMonth.getUTCFullYear(), periodMonth.getUTCMonth() + 1, 0))
    .toISOString().slice(0, 10)

  const { data: usagePeriods } = await supabase
    .from('usage_periods')
    .select('total_minutes')
    .eq('business_id', businessId)
    .eq('status', 'processed')
    .gte('period_date', monthStart)
    .lte('period_date', monthEnd)

  const totalAfter = ((usagePeriods ?? []) as Array<{ total_minutes: number | string }>).reduce(
    (sum, r) => sum + Number(r.total_minutes),
    0
  )
  const totalBefore = totalAfter - newRowMinutes + previousRowMinutes

  const { data: bucketRules } = await supabase
    .from('billing_rules')
    .select('id, included_minutes')
    .eq('business_id', businessId)
    .eq('type', 'bucket')
    .eq('active', true)

  for (const rule of (bucketRules ?? []) as Array<{ included_minutes: number | null }>) {
    if (!rule.included_minutes) continue
    const crossed = checkBillingThresholds({
      previousMinutes: totalBefore,
      newMinutes: totalAfter,
      includedMinutes: rule.included_minutes,
    })
    for (const level of crossed) {
      logger.info(`Billing threshold ${level}% crossed for business ${businessId}`)
      await fireWebhookEvent(operatorOrgId, `billing.threshold_${level}`, {
        businessId,
        thresholdPercent: level,
        totalMinutes: totalAfter,
        includedMinutes: rule.included_minutes,
      }).catch((err) => logger.error('Failed to fire threshold webhook', { err }))
      await sendThresholdAlertEmail({
        operatorOrgId,
        businessId,
        thresholdPercent: level,
        totalMinutes: totalAfter,
        includedMinutes: rule.included_minutes,
      }).catch((err) => logger.error('Failed to send threshold alert email', { err }))
    }
  }
}

/**
 * Upserts a set of ParsedRows into usage_periods for the given operator.
 * Rows that fail validation get status='error'; valid rows get status='processed'.
 * Returns per-row results for the API response.
 */
export async function ingestRows(
  rows: ParsedRow[],
  operatorOrgId: string,
  allowedBusinessIds: string[],
  source: 'csv_upload' | 'api' = 'csv_upload'
): Promise<IngestResult[]> {
  const supabase = await createClient()

  const results: IngestResult[] = []

  for (const row of rows) {
    const validation = validateRow(row, allowedBusinessIds)

    if (!validation.valid) {
      await supabase.from('usage_periods').upsert({
        business_id: row.businessId,
        operator_org_id: operatorOrgId,
        period_date: row.date,
        total_calls: 0,
        total_minutes: 0,
        call_type_breakdown: {},
        source,
        status: 'error',
        error_detail: { issue: validation.issue },
        processed_at: null,
      }, { onConflict: 'business_id,period_date' })

      await fireWebhookEvent(operatorOrgId, 'usage.upload_failed', {
        businessId: row.businessId,
        date: row.date,
        issue: validation.issue,
      }).catch((err) => logger.error('Failed to fire usage upload failure webhook', { err }))

      results.push({ businessId: row.businessId, date: row.date, status: 'error', issue: validation.issue })
      continue
    }

    const { data: existingRow } = await supabase
      .from('usage_periods')
      .select('total_minutes')
      .eq('business_id', row.businessId)
      .eq('period_date', row.date)
      .maybeSingle()
    const previousRowMinutes = existingRow
      ? Number((existingRow as { total_minutes: number | string }).total_minutes)
      : 0

    const { error } = await supabase.from('usage_periods').upsert({
      business_id: row.businessId,
      operator_org_id: operatorOrgId,
      period_date: row.date,
      total_calls: row.totalCalls,
      total_minutes: row.totalMinutes,
      call_type_breakdown: row.callTypeBreakdown,
      source,
      status: 'processed',
      error_detail: null,
      processed_at: new Date().toISOString(),
    }, { onConflict: 'business_id,period_date' })

    if (error) {
      results.push({ businessId: row.businessId, date: row.date, status: 'error', issue: 'Database write failed.' })
    } else {
      await fireWebhookEvent(operatorOrgId, 'usage.upload_processed', {
        businessId: row.businessId,
        date: row.date,
        totalCalls: row.totalCalls,
        totalMinutes: row.totalMinutes,
      }).catch((err) => logger.error('Failed to fire usage upload processed webhook', { err }))

      await checkAndFireThresholdAlerts(
        row.businessId,
        operatorOrgId,
        row.date,
        row.totalMinutes,
        previousRowMinutes
      )
      results.push({ businessId: row.businessId, date: row.date, status: 'processed' })
    }
  }

  return results
}
