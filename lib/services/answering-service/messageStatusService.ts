import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { BusinessMessageStatus } from '@/types/answeringService'

interface StatusRow {
  id: string
  business_id: string
  label: string
  color: string
  is_open: boolean
  sort_order: number
  is_system: boolean
  created_at: string
}

function mapStatusRow(row: StatusRow): BusinessMessageStatus {
  return {
    id: row.id,
    businessId: row.business_id,
    label: row.label,
    color: row.color,
    isOpen: row.is_open,
    sortOrder: row.sort_order,
    isSystem: row.is_system,
  }
}

export async function getStatusesForBusiness(businessId: string): Promise<BusinessMessageStatus[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('business_message_statuses')
    .select('id, business_id, label, color, is_open, sort_order, is_system, created_at')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })

  if (error) {
    logger.error('getStatusesForBusiness failed', { businessId, error })
    throw new Error('Failed to load message statuses.')
  }

  // SAFETY: This query selects the exact StatusRow shape declared above.
  return ((data ?? []) as StatusRow[]).map(mapStatusRow)
}

export async function createStatus(
  businessId: string,
  input: { label: string; color: string; isOpen: boolean }
): Promise<BusinessMessageStatus> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('business_message_statuses')
    .select('sort_order')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = existing ? (existing.sort_order as number) + 1 : 0

  const { data, error } = await supabase
    .from('business_message_statuses')
    .insert({
      business_id: businessId,
      label: input.label.trim(),
      color: input.color,
      is_open: input.isOpen,
      sort_order: nextSortOrder,
      is_system: false,
    })
    .select('id, business_id, label, color, is_open, sort_order, is_system, created_at')
    .single()

  if (error || !data) {
    logger.error('createStatus failed', { businessId, error })
    throw new Error('Failed to create status.')
  }

  return mapStatusRow(data as StatusRow)
}

export async function updateStatus(
  statusId: string,
  businessId: string,
  input: { label?: string; color?: string; isOpen?: boolean; sortOrder?: number }
): Promise<BusinessMessageStatus> {
  const supabase = await createClient()

  const update: Record<string, unknown> = {}
  if (input.label !== undefined) update.label = input.label.trim()
  if (input.color !== undefined) update.color = input.color
  if (input.isOpen !== undefined) update.is_open = input.isOpen
  if (input.sortOrder !== undefined) update.sort_order = input.sortOrder

  const { data, error } = await supabase
    .from('business_message_statuses')
    .update(update)
    .eq('id', statusId)
    .eq('business_id', businessId)
    .select('id, business_id, label, color, is_open, sort_order, is_system, created_at')
    .single()

  if (error || !data) {
    logger.error('updateStatus failed', { statusId, businessId, error })
    throw new Error('Failed to update status.')
  }

  return mapStatusRow(data as StatusRow)
}

export async function deleteStatus(statusId: string, businessId: string): Promise<void> {
  const supabase = await createClient()

  // Guard: cannot delete system statuses
  const { data: existing, error: fetchError } = await supabase
    .from('business_message_statuses')
    .select('is_system')
    .eq('id', statusId)
    .eq('business_id', businessId)
    .single()

  if (fetchError || !existing) {
    throw new Error('Status not found.')
  }

  if ((existing as { is_system: boolean }).is_system) {
    throw new Error('System statuses cannot be deleted.')
  }

  // Guard: cannot delete if messages are currently using this status
  const { count } = await supabase
    .from('call_logs')
    .select('id', { count: 'exact', head: true })
    .eq('workflow_status_id', statusId)
    .eq('business_id', businessId)

  if (count && count > 0) {
    throw new Error(`Cannot delete: ${count} message${count === 1 ? '' : 's'} currently use this status.`)
  }

  const { error } = await supabase
    .from('business_message_statuses')
    .delete()
    .eq('id', statusId)
    .eq('business_id', businessId)
    .eq('is_system', false)

  if (error) {
    logger.error('deleteStatus failed', { statusId, businessId, error })
    throw new Error('Failed to delete status.')
  }
}

export async function setWorkflowStatus(
  callLogId: string,
  businessId: string,
  userId: string,
  statusId: string | null
): Promise<void> {
  const supabase = await createClient()

  // Read current status for the audit log
  const { data: current, error: fetchError } = await supabase
    .from('call_logs')
    .select('workflow_status_id')
    .eq('id', callLogId)
    .eq('business_id', businessId)
    .single()

  if (fetchError || !current) {
    throw new Error('Message not found.')
  }

  const previousStatusId = (current as { workflow_status_id: string | null }).workflow_status_id

  if (previousStatusId === statusId) {
    return
  }

  const { error: updateError } = await supabase
    .from('call_logs')
    .update({ workflow_status_id: statusId })
    .eq('id', callLogId)
    .eq('business_id', businessId)

  if (updateError) {
    logger.error('setWorkflowStatus update failed', { callLogId, businessId, error: updateError })
    throw new Error('Failed to update workflow status.')
  }

  const { error: auditError } = await supabase.from('message_actions').insert({
    call_log_id: callLogId,
    business_id: businessId,
    type: 'workflow_status_changed',
    by_user_id: userId,
    at: new Date().toISOString(),
    from_value: previousStatusId,
    to_value: statusId,
  })

  if (auditError) {
    logger.error('setWorkflowStatus audit insert failed', { callLogId, error: auditError })
    // Workflow status was updated; audit failure is non-fatal but logged
  }
}

export async function assignMessage(
  callLogId: string,
  businessId: string,
  userId: string,
  assignToUserId: string | null
): Promise<void> {
  const supabase = await createClient()

  const { data: current, error: fetchError } = await supabase
    .from('call_logs')
    .select('assigned_to')
    .eq('id', callLogId)
    .eq('business_id', businessId)
    .single()

  if (fetchError || !current) {
    throw new Error('Message not found.')
  }

  const previousAssignee = (current as { assigned_to: string | null }).assigned_to

  if (previousAssignee === assignToUserId) {
    return
  }

  const { error: updateError } = await supabase
    .from('call_logs')
    .update({ assigned_to: assignToUserId })
    .eq('id', callLogId)
    .eq('business_id', businessId)

  if (updateError) {
    logger.error('assignMessage update failed', { callLogId, businessId, error: updateError })
    throw new Error('Failed to assign message.')
  }

  const { error: auditError } = await supabase.from('message_actions').insert({
    call_log_id: callLogId,
    business_id: businessId,
    type: 'assigned',
    by_user_id: userId,
    at: new Date().toISOString(),
    from_value: null,
    to_value: assignToUserId,
  })

  if (auditError) {
    logger.error('assignMessage audit insert failed', { callLogId, error: auditError })
    // Assignment was made; audit failure is non-fatal but logged
  }
}
