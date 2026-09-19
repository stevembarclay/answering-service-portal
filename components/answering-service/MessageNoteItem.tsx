'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { MessageNote } from '@/types/answeringService'

interface MessageNoteItemProps {
  note: MessageNote
  currentUserId: string
  messageId: string
  onUpdated: (updated: MessageNote) => void
  onDeleted: (noteId: string) => void
}

export function MessageNoteItem({
  note,
  currentUserId,
  messageId,
  onUpdated,
  onDeleted,
}: MessageNoteItemProps) {
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState(note.body)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isOwn = note.userId === currentUserId

  async function saveEdit() {
    if (!editBody.trim()) return
    setSaving(true)
    try {
      const res = await fetch(
        `/api/answering-service/messages/${messageId}/notes/${note.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: editBody.trim() }),
        }
      )
      if (!res.ok) throw new Error('Save failed')
      const payload = (await res.json()) as { data: MessageNote }
      onUpdated(payload.data)
      setEditing(false)
    } catch {
      toast.error('Failed to save note.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/answering-service/messages/${messageId}/notes/${note.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Delete failed')
      onDeleted(note.id)
    } catch {
      toast.error('Failed to delete note.')
      setDeleting(false)
    }
  }

  return (
    <div className="group rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      {editing ? (
        <>
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={saving || !editBody.trim()}
              onClick={() => void saveEdit()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false)
                setEditBody(note.body)
              }}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[13px] text-foreground whitespace-pre-wrap">{note.body}</p>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-muted-foreground">
              {format(new Date(note.createdAt), 'MMM d · h:mma')}
              {note.updatedAt !== note.createdAt ? ' · edited' : ''}
            </span>
            {isOwn ? (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  aria-label="Edit note"
                  onClick={() => setEditing(true)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete note"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  className="rounded p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
