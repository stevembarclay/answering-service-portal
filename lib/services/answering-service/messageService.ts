import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { logger } from '@/lib/utils/logger'
import type {
  BusinessMessageStatus,
  BusinessUser,
  CallLog,
  MessageAction,
  MessageNote,
  MessagePriority,
  PortalStatus,
  TelephonyStatus,
} from '@/types/answeringService'

interface MessageActionRow {
  id: string
  type: MessageAction['type']
  by_user_id: string
  at: string
  from_value: string | null
  to_value: string | null
}

interface WorkflowStatusRow {
  id: string
  business_id: string
  label: string
  color: string
  is_open: boolean
  sort_order: number
  is_system: boolean
}

interface NoteRow {
  id: string
  call_log_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
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
  telephony_status: TelephonyStatus
  message: string
  has_recording: boolean
  priority: MessagePriority
  portal_status: PortalStatus
  workflow_status_id: string | null
  assigned_to: string | null
  message_actions: MessageActionRow[] | null
  workflow_status: WorkflowStatusRow | null
  message_notes: NoteRow[] | null
}

function mapActionRow(row: MessageActionRow): MessageAction {
  if (row.type === 'priority_updated') {
    return {
      id: row.id,
      type: row.type,
      by: row.by_user_id,
      at: row.at,
      from: (row.from_value ?? 'low') as MessagePriority,
      to: (row.to_value ?? 'low') as MessagePriority,
    }
  }

  if (row.type === 'status_changed') {
    return {
      id: row.id,
      type: row.type,
      by: row.by_user_id,
      at: row.at,
      from: (row.from_value ?? 'new') as PortalStatus,
      to: (row.to_value ?? 'new') as PortalStatus,
    }
  }

  if (row.type === 'workflow_status_changed') {
    return {
      id: row.id,
      type: row.type,
      by: row.by_user_id,
      at: row.at,
      from: row.from_value,
      to: row.to_value,
    }
  }

  if (row.type === 'assigned') {
    return {
      id: row.id,
      type: row.type,
      by: row.by_user_id,
      at: row.at,
      to: row.to_value,
    }
  }

  return {
    id: row.id,
    type: 'flagged_qa',
    by: row.by_user_id,
    at: row.at,
  }
}

function mapCallLogRow(row: CallLogRow, lastLoginAt: string | null): CallLog {
  const workflowStatus: BusinessMessageStatus | null = row.workflow_status
    ? {
        id: row.workflow_status.id,
        businessId: row.workflow_status.business_id,
        label: row.workflow_status.label,
        color: row.workflow_status.color,
        isOpen: row.workflow_status.is_open,
        sortOrder: row.workflow_status.sort_order,
        isSystem: row.workflow_status.is_system,
      }
    : null

  const notes: MessageNote[] = (row.message_notes ?? []).map((n) => ({
    id: n.id,
    callLogId: n.call_log_id,
    userId: n.user_id,
    body: n.body,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  }))

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
    actions: (row.message_actions ?? []).map(mapActionRow),
    isNew: lastLoginAt ? row.timestamp > lastLoginAt : true,
    workflowStatusId: row.workflow_status_id,
    workflowStatus,
    assignedTo: row.assigned_to,
    assignedToEmail: undefined, // resolved separately via service role for detail view
    notes,
  }
}

export async function getMessages(
  businessId: string,
  userId: string,
  page = 1,
  limit = 50
): Promise<{ messages: CallLog[]; hasMore: boolean }> {
  const supabase = await createClient()
  const offset = (page - 1) * limit

  const { data: membership, error: membershipError } = await supabase
    .from('users_businesses')
    .select('last_login_at')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .single()

  if (membershipError) {
    throw new Error('Could not determine message freshness for this user.')
  }

  const lastLoginAt = membership?.last_login_at ?? null

  const { data, error } = await supabase
    .from('call_logs')
    .select(
      `id, business_id, timestamp, caller_name, caller_number, callback_number, call_type,
       direction, duration_seconds, telephony_status, message, has_recording, priority,
       portal_status, workflow_status_id, assigned_to,
       message_actions (id, type, by_user_id, at, from_value, to_value),
       workflow_status:business_message_statuses!workflow_status_id (id, business_id, label, color, is_open, sort_order, is_system),
       message_notes (id, call_log_id, user_id, body, created_at, updated_at)`
    )
    .eq('business_id', businessId)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error('Failed to load messages.')
  }

  const priorityOrder: Record<MessagePriority, number> = { high: 0, medium: 1, low: 2 }
  // SAFETY: This query selects the exact CallLogRow shape declared above.
  // The `as unknown` is needed because Supabase infers workflow_status as an
  // array type (it doesn't know the FK cardinality), but PostgREST returns a
  // single object for many-to-one relations.
  const rows = (data ?? []) as unknown as CallLogRow[]

  const messages = rows
    .map((row) => mapCallLogRow(row, lastLoginAt))
    .sort((left, right) => {
      const priorityDiff = priorityOrder[left.priority] - priorityOrder[right.priority]
      return priorityDiff !== 0 ? priorityDiff : right.timestamp.localeCompare(left.timestamp)
    })

  void (async () => {
    try {
      await supabase
        .from('users_businesses')
        .update({ last_login_at: new Date().toISOString() })
        .eq('business_id', businessId)
        .eq('user_id', userId)
    } catch (updateError: unknown) {
      logger.error('Failed to update last_login_at after message load', {
        businessId,
        userId,
        error: updateError,
      })
    }
  })()

  // PHI access logging is a managed-platform feature (HIPAA compliance mode).
  // In the community edition this block is intentionally absent.

  return { messages, hasMore: rows.length === limit }
}

export async function getMessage(id: string, businessId: string, userId: string): Promise<CallLog | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('call_logs')
    .select(
      `id, business_id, timestamp, caller_name, caller_number, callback_number, call_type,
       direction, duration_seconds, telephony_status, message, has_recording, priority,
       portal_status, workflow_status_id, assigned_to,
       message_actions (id, type, by_user_id, at, from_value, to_value),
       workflow_status:business_message_statuses!workflow_status_id (id, business_id, label, color, is_open, sort_order, is_system),
       message_notes (id, call_log_id, user_id, body, created_at, updated_at)`
    )
    .eq('id', id)
    .eq('business_id', businessId)
    .single()

  if (error || !data) {
    return null
  }

  // SAFETY: This query selects the exact CallLogRow shape declared above.
  // The `as unknown` is needed because Supabase infers workflow_status as an
  // array type due to FK cardinality uncertainty, but PostgREST returns an object.
  const row = data as unknown as CallLogRow
  const message = mapCallLogRow(row, null)

  // PHI access logging is a managed-platform feature (HIPAA compliance mode).
  // In the community edition this block is intentionally absent.
  void userId

  // Resolve assigned user email using service role (auth.users not accessible via RLS)
  if (row.assigned_to) {
    try {
      // SAFETY: service role is needed to read auth.users emails for team member display.
      // This is read-only, scoped to a single user ID, and never used for auth decisions.
      const adminClient = createServiceRoleClient()
      const { data: userData } = await adminClient.auth.admin.getUserById(row.assigned_to)
      message.assignedToEmail = userData?.user?.email ?? null
    } catch (emailError) {
      logger.error('Failed to resolve assigned user email', {
        assignedTo: row.assigned_to,
        error: emailError,
      })
      // Non-fatal: display will fall back to showing the UUID
    }
  }

  if (row.has_recording) {
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('call-recordings')
      .createSignedUrl(`${businessId}/${id}.mp3`, 3600)

    if (!signedUrlError && signedUrlData?.signedUrl) {
      message.recordingUrl = signedUrlData.signedUrl
    }
  }

  return message
}

/**
 * Returns all users who are members of the given business (for the assign picker).
 * Requires service role because auth.users is not accessible via RLS.
 * This is read-only and only used to display team member names for assignment.
 */
export async function getBusinessUsers(businessId: string): Promise<BusinessUser[]> {
  const supabase = await createClient()

  // Get user IDs via RLS-accessible users_businesses table
  const { data: members, error: membersError } = await supabase
    .from('users_businesses')
    .select('user_id')
    .eq('business_id', businessId)

  if (membersError || !members) {
    logger.error('getBusinessUsers failed to fetch members', { businessId, error: membersError })
    return []
  }

  if (members.length === 0) {
    return []
  }

  const userIds = (members as { user_id: string }[]).map((m) => m.user_id)

  // SAFETY: service role is needed to read auth.users emails for team member display.
  // This is read-only, scoped to a specific business's user IDs, not used for auth decisions.
  const adminClient = createServiceRoleClient()
  const results: BusinessUser[] = []

  for (const uid of userIds) {
    try {
      const { data } = await adminClient.auth.admin.getUserById(uid)
      if (data?.user?.email) {
        results.push({ userId: uid, email: data.user.email })
      }
    } catch (err) {
      logger.error('getBusinessUsers failed to fetch user', { uid, error: err })
    }
  }

  return results
}

export async function updatePriority(
  id: string,
  businessId: string,
  userId: string,
  priority: MessagePriority
): Promise<void> {
  const supabase = await createClient()

  const { data: current, error: currentError } = await supabase
    .from('call_logs')
    .select('priority')
    .eq('id', id)
    .eq('business_id', businessId)
    .single()

  if (currentError || !current) {
    throw new Error('Message not found.')
  }

  const currentPriority = current.priority as MessagePriority

  if (currentPriority === priority) {
    return
  }

  const { error: updateError } = await supabase
    .from('call_logs')
    .update({ priority })
    .eq('id', id)
    .eq('business_id', businessId)

  if (updateError) {
    throw new Error('Failed to update priority.')
  }

  const { error: insertError } = await supabase.from('message_actions').insert({
    call_log_id: id,
    business_id: businessId,
    type: 'priority_updated',
    by_user_id: userId,
    at: new Date().toISOString(),
    from_value: currentPriority,
    to_value: priority,
  })

  if (insertError) {
    throw new Error('Priority updated, but the audit log could not be written.')
  }
}

export async function flagQA(id: string, businessId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  const { data: current, error: currentError } = await supabase
    .from('call_logs')
    .select('portal_status')
    .eq('id', id)
    .eq('business_id', businessId)
    .single()

  if (currentError || !current) {
    throw new Error('Message not found.')
  }

  if ((current.portal_status as PortalStatus) === 'flagged_qa') {
    return
  }

  const { error: updateError } = await supabase
    .from('call_logs')
    .update({ portal_status: 'flagged_qa' })
    .eq('id', id)
    .eq('business_id', businessId)

  if (updateError) {
    throw new Error('Failed to flag message for QA.')
  }

  const { error: insertError } = await supabase.from('message_actions').insert({
    call_log_id: id,
    business_id: businessId,
    type: 'flagged_qa',
    by_user_id: userId,
    at: new Date().toISOString(),
  })

  if (insertError) {
    throw new Error('Message flagged, but the audit log could not be written.')
  }
}

export async function markRead(id: string, businessId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('call_logs')
    .update({ portal_status: 'read' })
    .eq('id', id)
    .eq('business_id', businessId)
    .eq('portal_status', 'new')

  if (error) {
    throw new Error('Failed to update read status.')
  }
}
