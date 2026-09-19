import type { IOnCallPushAdapter, OnCallAssignment } from '@/lib/integrations/types'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { createModuleLogger } from '@/lib/utils/logger'

import { resolveActiveShift } from './onCallScheduler'
import { loadSchedulerData } from './onCallService'

const moduleLogger = createModuleLogger('onCallPushService')

// ── Types ──────────────────────────────────────────────────────────────────

interface BusinessPushRow {
  operator_org_id: string | null
  on_call_timezone: string | null
  startel_client_id: string | null
  amtelco_client_id: string | null
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve the current on-call assignment for a business and push it to
 * the operator's call-center platform (StarTel CMC or Amtelco IS).
 *
 * Community edition: native adapter push is not available. Always returns false.
 */
export async function pushCurrentOnCall(businessId: string): Promise<boolean> {
  try {
    return await _push(businessId)
  } catch (error) {
    moduleLogger.error('pushCurrentOnCall: unexpected error', { businessId, error })
    return false
  }
}

/**
 * Push current on-call assignments for every business that has an
 * external platform client ID configured. Called by the cron job.
 *
 * Community edition: native adapter push is not available.
 */
export async function pushAllConfiguredBusinesses(): Promise<{
  attempted: number
  skipped: number
  errors: string[]
}> {
  const supabase = createServiceRoleClient()

  const { data: rows, error } = await supabase
    .from('businesses')
    .select('id, operator_org_id, on_call_timezone, startel_client_id, amtelco_client_id')
    .or('startel_client_id.not.is.null,amtelco_client_id.not.is.null')

  if (error) {
    moduleLogger.error('pushAllConfiguredBusinesses: failed to query businesses', { error })
    return { attempted: 0, skipped: 0, errors: [error.message] }
  }

  let attempted = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows ?? []) {
    if (typeof row.id !== 'string') continue
    try {
      const pushed = await _push(row.id, row as unknown as BusinessPushRow)
      if (pushed) {
        attempted++
      } else {
        skipped++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`${row.id}: ${message}`)
      moduleLogger.error('pushAllConfiguredBusinesses: push failed', { businessId: row.id, error: err })
    }
  }

  return { attempted, skipped, errors }
}

// ── Internal ───────────────────────────────────────────────────────────────

async function _push(businessId: string, cachedRow?: BusinessPushRow): Promise<boolean> {
  const row = cachedRow ?? (await fetchBusinessRow(businessId))
  if (!row) {
    moduleLogger.warn('_push: business not found', { businessId })
    return false
  }

  const { operatorOrgId, externalClientId, platform } = resolveExternalId(row)
  if (!operatorOrgId || !externalClientId || !platform) {
    return false
  }

  const adapter = await buildPushAdapter(operatorOrgId, platform)
  if (!adapter) {
    return false
  }

  if (!row.on_call_timezone) {
    moduleLogger.warn('_push: no timezone configured, falling back to UTC', { businessId })
  }
  const timezone = row.on_call_timezone ?? 'UTC'
  const { shifts, contacts } = await loadSchedulerData(businessId)
  const resolved = resolveActiveShift(new Date(), timezone, shifts, contacts)

  if (!resolved) {
    moduleLogger.debug('_push: no active shift — skipping push', { businessId })
    return false
  }

  const assignment: OnCallAssignment = {
    shiftName: resolved.shiftName,
    shiftStartsAt: resolved.shiftStartsAt,
    shiftEndsAt: resolved.shiftEndsAt,
    escalationSteps: resolved.escalationSteps,
  }

  const result = await adapter.pushOnCallAssignment(externalClientId, assignment)

  if (result.ok) {
    moduleLogger.info('_push: on-call assignment pushed', { businessId, platform, externalClientId })
  } else {
    moduleLogger.warn('_push: platform push returned not-ok', {
      businessId,
      platform,
      externalClientId,
      message: result.message,
    })
  }

  return true
}

async function fetchBusinessRow(businessId: string): Promise<BusinessPushRow | null> {
  const supabase = createServiceRoleClient()
  const { data } = await supabase
    .from('businesses')
    .select('operator_org_id, on_call_timezone, startel_client_id, amtelco_client_id')
    .eq('id', businessId)
    .maybeSingle()

  // SAFETY: operator_org_id and on_call_timezone exist on businesses but are
  // not yet reflected in database.types.ts.
  return data as unknown as BusinessPushRow | null
}

function resolveExternalId(row: BusinessPushRow): {
  operatorOrgId: string | null
  externalClientId: string | null
  platform: 'startel' | 'amtelco' | null
} {
  if (!row.operator_org_id) return { operatorOrgId: null, externalClientId: null, platform: null }

  if (row.startel_client_id) {
    return { operatorOrgId: row.operator_org_id, externalClientId: row.startel_client_id, platform: 'startel' }
  }
  if (row.amtelco_client_id) {
    return { operatorOrgId: row.operator_org_id, externalClientId: row.amtelco_client_id, platform: 'amtelco' }
  }

  return { operatorOrgId: row.operator_org_id, externalClientId: null, platform: null }
}

// Community edition: native StarTel/Amtelco adapters are not included.
// On-call push to external platforms requires the managed Stintwell platform.
async function buildPushAdapter(
  _operatorOrgId: string,
  _platform: 'startel' | 'amtelco'
): Promise<IOnCallPushAdapter | null> {
  return null
}
