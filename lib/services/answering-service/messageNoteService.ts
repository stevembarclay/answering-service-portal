import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import type { MessageNote } from '@/types/answeringService'

interface NoteRow {
  id: string
  call_log_id: string
  business_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

function mapNoteRow(row: NoteRow): MessageNote {
  return {
    id: row.id,
    callLogId: row.call_log_id,
    userId: row.user_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getNotesForMessage(
  callLogId: string,
  businessId: string
): Promise<MessageNote[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('message_notes')
    .select('id, call_log_id, business_id, user_id, body, created_at, updated_at')
    .eq('call_log_id', callLogId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  if (error) {
    logger.error('getNotesForMessage failed', { callLogId, businessId, error })
    throw new Error('Failed to load notes.')
  }

  // SAFETY: This query selects the exact NoteRow shape declared above.
  return ((data ?? []) as NoteRow[]).map(mapNoteRow)
}

export async function addNote(
  callLogId: string,
  businessId: string,
  userId: string,
  body: string
): Promise<MessageNote> {
  const supabase = await createClient()

  const trimmedBody = body.trim()
  if (!trimmedBody) {
    throw new Error('Note body cannot be empty.')
  }

  const { data, error } = await supabase
    .from('message_notes')
    .insert({
      call_log_id: callLogId,
      business_id: businessId,
      user_id: userId,
      body: trimmedBody,
    })
    .select('id, call_log_id, business_id, user_id, body, created_at, updated_at')
    .single()

  if (error || !data) {
    logger.error('addNote failed', { callLogId, businessId, error })
    throw new Error('Failed to add note.')
  }

  return mapNoteRow(data as NoteRow)
}

export async function updateNote(
  noteId: string,
  userId: string,
  body: string
): Promise<MessageNote> {
  const supabase = await createClient()

  const trimmedBody = body.trim()
  if (!trimmedBody) {
    throw new Error('Note body cannot be empty.')
  }

  const { data, error } = await supabase
    .from('message_notes')
    .update({ body: trimmedBody, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .eq('user_id', userId)
    .select('id, call_log_id, business_id, user_id, body, created_at, updated_at')
    .single()

  if (error || !data) {
    logger.error('updateNote failed', { noteId, error })
    throw new Error('Failed to update note.')
  }

  return mapNoteRow(data as NoteRow)
}

export async function deleteNote(noteId: string, userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('message_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId)

  if (error) {
    logger.error('deleteNote failed', { noteId, error })
    throw new Error('Failed to delete note.')
  }
}
