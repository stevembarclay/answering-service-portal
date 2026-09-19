import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { MessagePriority, PortalStatus } from '@/types/answeringService'

export interface RecentCall {
  id: string
  timestamp: string
  callType: string
  priority: MessagePriority
  portalStatus: PortalStatus
  messageSnippet: string
}

export interface CallerHistory {
  callerNumber: string
  totalCalls: number
  callsLast30Days: number
  lastCallAt: string
  recentCalls: RecentCall[]
}

interface CallLogHistoryRow {
  id: string
  timestamp: string
  call_type: string
  priority: MessagePriority
  portal_status: PortalStatus
  message: string
}

export async function getCallerHistory(
  businessId: string,
  callerNumber: string
): Promise<CallerHistory | null> {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('call_logs')
    .select('id, timestamp, call_type, priority, portal_status, message')
    .eq('business_id', businessId)
    .eq('caller_number', callerNumber)
    .order('timestamp', { ascending: false })
    .limit(100)

  if (error) {
    logger.error('callerHistoryService.getCallerHistory failed', { error, businessId })
    return null
  }

  if (!rows || rows.length === 0) return null

  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  // SAFETY: The select above fetches exactly the CallLogHistoryRow shape declared in this file.
  const typedRows = rows as CallLogHistoryRow[]
  const callsLast30Days = typedRows.filter(
    (r) => now - new Date(r.timestamp).getTime() < thirtyDaysMs
  ).length

  const recentCalls: RecentCall[] = typedRows.slice(0, 5).map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    callType: r.call_type,
    priority: r.priority,
    portalStatus: r.portal_status,
    messageSnippet: r.message.slice(0, 100),
  }))

  return {
    callerNumber,
    totalCalls: typedRows.length,
    callsLast30Days,
    lastCallAt: typedRows[0]?.timestamp ?? '',
    recentCalls,
  }
}
