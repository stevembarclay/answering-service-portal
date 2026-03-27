import { createServiceRoleClient } from '@/lib/supabase/service'
import type { IngestSource } from '@/lib/integrations/types'
import { fireWebhookEvent } from '@/lib/services/operator/webhookService'
import { assignPriority } from '@/lib/services/operator/priorityEngine'
import { logger } from '@/lib/utils/logger'

export interface RawCallInput {
  timestamp: string               // ISO 8601 required
  businessId: string
  callerName?: string
  callerNumber?: string
  callbackNumber?: string
  callType: string                // slug e.g. 'urgent', 'new-client'
  direction: 'inbound' | 'outbound'
  durationSeconds: number         // 0 for missed/voicemail
  telephonyStatus: 'completed' | 'missed' | 'voicemail'
  message: string                 // agent's written note — must not be empty
  recordingUrl?: string           // publicly accessible URL or Supabase Storage path
}

export interface CallValidationResult {
  valid: boolean
  issue?: string
}

export interface CallIngestResult {
  businessId: string
  status: 'inserted' | 'error'
  callId?: string
  issue?: string
}

const VALID_DIRECTIONS = new Set(['inbound', 'outbound'])
const VALID_TELEPHONY_STATUSES = new Set(['completed', 'missed', 'voicemail'])

export function validateCallRow(
  row: RawCallInput,
  allowedBusinessIds: string[]
): CallValidationResult {
  if (!allowedBusinessIds.includes(row.businessId)) {
    return { valid: false, issue: `business_id "${row.businessId}" does not belong to this operator org.` }
  }
  if (!row.timestamp || isNaN(Date.parse(row.timestamp))) {
    return { valid: false, issue: 'timestamp must be a valid ISO 8601 date string.' }
  }
  if (!row.message || row.message.trim().length === 0) {
    return { valid: false, issue: 'message must not be empty.' }
  }
  if (!VALID_DIRECTIONS.has(row.direction)) {
    return { valid: false, issue: `direction must be "inbound" or "outbound", got "${row.direction}".` }
  }
  if (!VALID_TELEPHONY_STATUSES.has(row.telephonyStatus)) {
    return { valid: false, issue: `telephony_status must be "completed", "missed", or "voicemail", got "${row.telephonyStatus}".` }
  }
  if (row.durationSeconds < 0) {
    return { valid: false, issue: `duration_seconds must be >= 0, got ${row.durationSeconds}.` }
  }
  if (!row.callType || row.callType.trim().length === 0) {
    return { valid: false, issue: 'call_type must not be empty.' }
  }
  return { valid: true }
}

/**
 * Parse a CSV string of call log records.
 *
 * Expected header (order matters):
 *   timestamp,business_id,caller_name,caller_number,callback_number,call_type,direction,duration_seconds,telephony_status,message
 *
 * caller_name, caller_number, callback_number may be empty strings (treated as absent).
 * message may contain commas if quoted.
 */
export function parseCsvCallRows(csv: string): RawCallInput[] {
  const lines = csv.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim())
  const requiredHeaders = [
    'timestamp', 'business_id', 'call_type', 'direction',
    'duration_seconds', 'telephony_status', 'message',
  ]
  if (requiredHeaders.some((h) => !headers.includes(h))) return []

  const idx = (name: string) => headers.indexOf(name)

  const rows: RawCallInput[] = []

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV split — handles quoted fields with commas
    const cols = splitCsvLine(lines[i])
    if (cols.length < headers.length) continue

    const timestamp = cols[idx('timestamp')]?.trim()
    const businessId = cols[idx('business_id')]?.trim()
    const callType = cols[idx('call_type')]?.trim()
    const direction = cols[idx('direction')]?.trim()
    const durationSeconds = parseInt(cols[idx('duration_seconds')] ?? '', 10)
    const telephonyStatus = cols[idx('telephony_status')]?.trim()
    const message = cols[idx('message')]?.trim()

    if (!timestamp || !businessId || !callType || !direction || isNaN(durationSeconds) || !telephonyStatus || !message) {
      continue
    }

    const row: RawCallInput = {
      timestamp,
      businessId,
      callType,
      direction: direction as RawCallInput['direction'],
      durationSeconds,
      telephonyStatus: telephonyStatus as RawCallInput['telephonyStatus'],
      message,
    }

    const callerName = cols[idx('caller_name')]?.trim()
    if (callerName) row.callerName = callerName

    const callerNumber = cols[idx('caller_number')]?.trim()
    if (callerNumber) row.callerNumber = callerNumber

    const callbackNumber = cols[idx('callback_number')]?.trim()
    if (callbackNumber) row.callbackNumber = callbackNumber

    rows.push(row)
  }

  return rows
}

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

/**
 * Ingest a batch of raw call inputs for the given operator.
 * Validates each row, assigns priority, inserts into call_logs, fires webhooks.
 * Uses service role client — call_logs has no INSERT RLS policy.
 */
export async function ingestCalls(
  rows: RawCallInput[],
  operatorOrgId: string,
  allowedBusinessIds: string[],
  source: IngestSource = 'api'
): Promise<CallIngestResult[]> {
  const supabase = createServiceRoleClient()
  const results: CallIngestResult[] = []

  for (const row of rows) {
    const validation = validateCallRow(row, allowedBusinessIds)

    if (!validation.valid) {
      void persistCallIngestError(supabase, {
        operatorOrgId,
        businessId: row.businessId,
        row,
        issue: validation.issue ?? 'Validation failed.',
        source,
      })
      results.push({ businessId: row.businessId, status: 'error', issue: validation.issue })
      continue
    }

    const priority = assignPriority(row.callType)

    // TODO: add recording_storage_path column to call_logs to persist recording URLs
    // Migration needed: ALTER TABLE call_logs ADD COLUMN recording_storage_path TEXT;
    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        business_id: row.businessId,
        timestamp: row.timestamp,
        caller_name: row.callerName ?? null,
        caller_number: row.callerNumber ?? null,
        callback_number: row.callbackNumber ?? null,
        call_type: row.callType,
        direction: row.direction,
        duration_seconds: row.durationSeconds,
        telephony_status: row.telephonyStatus,
        message: row.message,
        priority,
        portal_status: 'new',
        has_recording: row.recordingUrl ? true : false,
        operator_org_id: operatorOrgId,
      })
      .select('id')
      .single()

    if (error || !data) {
      logger.error('Failed to insert call log', { businessId: row.businessId, error })
      void persistCallIngestError(supabase, {
        operatorOrgId,
        businessId: row.businessId,
        row,
        issue: 'Database write failed.',
        source,
      })
      results.push({ businessId: row.businessId, status: 'error', issue: 'Database write failed.' })
      continue
    }

    const callId = typeof data.id === 'string' ? data.id : ''

    await fireWebhookEvent(operatorOrgId, 'call.created', {
      callId,
      businessId: row.businessId,
      callType: row.callType,
      priority,
      timestamp: row.timestamp,
    }).catch((err) => logger.error('Failed to fire call.created webhook', { err }))

    results.push({ businessId: row.businessId, status: 'inserted', callId })
  }

  return results
}

interface PersistCallIngestErrorInput {
  operatorOrgId: string
  businessId: string
  row: RawCallInput
  issue: string
  source: IngestSource
}

async function persistCallIngestError(
  supabase: ReturnType<typeof createServiceRoleClient>,
  input: PersistCallIngestErrorInput
): Promise<void> {
  const businessId = isUuid(input.businessId) ? input.businessId : null

  const { error } = await supabase.from('call_ingest_errors').insert({
    operator_org_id: input.operatorOrgId,
    business_id: businessId,
    raw_payload: input.row,
    issue: input.issue,
    source: input.source,
  })

  if (error) {
    logger.error('Failed to persist call ingest error', {
      operatorOrgId: input.operatorOrgId,
      businessId: input.businessId,
      error,
    })
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
