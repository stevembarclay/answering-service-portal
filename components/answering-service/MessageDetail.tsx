'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Lock, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageNoteItem } from '@/components/answering-service/MessageNoteItem'
import {
  ActivityLabel,
  AssignDropdown,
  StatusDropdown,
} from '@/components/answering-service/MessageWorkflowPickers'
import { badgeVariants } from '@/lib/design/color-system'
import { bodyStyles, headingStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'
import type {
  BusinessMessageStatus,
  BusinessUser,
  CallLog,
  MessageNote,
} from '@/types/answeringService'

interface MessageDetailProps {
  message: CallLog
  statuses: BusinessMessageStatus[]
  businessUsers: BusinessUser[]
  currentUserId: string
  onRefresh?: () => Promise<void>
}

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#94a3b8' } as const
const PRIORITY_LABELS = { high: 'Urgent', medium: 'Medium', low: 'Low' } as const

function priorityBadgeClass(priority: CallLog['priority']) {
  if (priority === 'high') return badgeVariants.error
  if (priority === 'medium') return badgeVariants.warning
  return badgeVariants.default
}

async function apiPatch(url: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
    throw new Error(payload.error?.message ?? 'Request failed.')
  }
}

export function MessageDetail({
  message,
  statuses,
  businessUsers,
  currentUserId,
  onRefresh,
}: MessageDetailProps) {
  const [workflowStatus, setWorkflowStatus] = useState<BusinessMessageStatus | null>(
    message.workflowStatus ?? null
  )
  const [assigneeId, setAssigneeId] = useState<string | null>(message.assignedTo ?? null)
  const [assigneeEmail, setAssigneeEmail] = useState<string | null>(
    message.assignedToEmail ?? null
  )
  const [notes, setNotes] = useState<MessageNote[]>(message.notes ?? [])
  const [noteBody, setNoteBody] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [handledState, setHandledState] = useState<'idle' | 'loading' | 'done'>('idle')

  // Mark as read on open
  useEffect(() => {
    if (message.portalStatus !== 'new') return
    void fetch(`/api/answering-service/messages/${message.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portalStatus: 'read' }),
    })
      .then(async (res) => {
        if (res.ok) await onRefresh?.()
      })
      .catch(() => undefined)
  }, [message.id, message.portalStatus, onRefresh])

  // "Mark as Handled" — sets the first closed status
  const closedStatus = statuses.find((s) => !s.isOpen)

  async function handleMarkHandled() {
    if (!closedStatus) return
    const previousStatus = workflowStatus
    setHandledState('loading')
    setWorkflowStatus(closedStatus)
    try {
      await apiPatch(`/api/answering-service/messages/${message.id}/status`, {
        workflowStatusId: closedStatus.id,
      })
      setHandledState('done')
      await onRefresh?.()
    } catch {
      setWorkflowStatus(previousStatus)
      toast.error('Failed to mark as handled.')
      setHandledState('idle')
    }
  }

  async function submitNote() {
    if (!noteBody.trim()) return
    setSavingNote(true)
    try {
      const res = await fetch(`/api/answering-service/messages/${message.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: noteBody.trim() }),
      })
      if (!res.ok) throw new Error('Failed to save note.')
      const payload = (await res.json()) as { data: MessageNote }
      setNotes((prev) => [...prev, payload.data])
      setNoteBody('')
    } catch {
      toast.error('Failed to add note.')
    } finally {
      setSavingNote(false)
    }
  }

  const isHandled = !workflowStatus?.isOpen && workflowStatus !== null

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-8">
      {/* ── Hero: caller + call-back button ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={priorityBadgeClass(message.priority)}>
              <span
                className="mr-1.5 h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: PRIORITY_COLORS[message.priority] }}
                aria-hidden="true"
              />
              {PRIORITY_LABELS[message.priority]}
            </Badge>
            <span className={`${bodyStyles.caption} text-muted-foreground capitalize`}>
              {message.callType.replace(/-/g, ' ')}
            </span>
            <span className={`${bodyStyles.caption} text-muted-foreground`}>·</span>
            <span className={`${bodyStyles.caption} text-muted-foreground`}>
              {format(new Date(message.timestamp), 'MMM d, h:mma')}
            </span>
          </div>

          <h2 className={`${headingStyles.h3.base} text-foreground`}>
            {message.callerName ?? 'Unknown caller'}
          </h2>

          {message.callbackNumber ? (
            <a
              href={`tel:${message.callbackNumber}`}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
            >
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              Call back {message.callbackNumber}
            </a>
          ) : null}
        </div>
      </div>

      {/* ── Message body ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Message</span>
        </div>
        <div className="p-5">
          <p className={`${bodyStyles.base} text-foreground leading-relaxed`}>{message.message}</p>
        </div>
      </div>

      {/* ── Recording ── */}
      {message.recordingUrl ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex h-[52px] items-center border-b border-border px-5">
            <span className="text-sm font-semibold text-foreground">Recording</span>
          </div>
          <div className="p-5">
            <audio controls className="w-full" src={message.recordingUrl}>
              Your browser does not support audio playback.
            </audio>
          </div>
        </div>
      ) : null}

      {/* ── Status + assign + handled ── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex h-[52px] items-center border-b border-border px-5 rounded-t-xl overflow-hidden">
          <span className="text-sm font-semibold text-foreground">Actions</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </label>
              <StatusDropdown
                messageId={message.id}
                current={workflowStatus}
                statuses={statuses}
                onChanged={setWorkflowStatus}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide">
                Assigned to
              </label>
              <AssignDropdown
                messageId={message.id}
                currentAssigneeId={assigneeId}
                currentAssigneeEmail={assigneeEmail}
                businessUsers={businessUsers}
                onChanged={(uid, email) => {
                  setAssigneeId(uid)
                  setAssigneeEmail(email)
                }}
              />
            </div>
          </div>

          {closedStatus ? (
            <button
              type="button"
              disabled={handledState !== 'idle' || isHandled}
              onClick={() => void handleMarkHandled()}
              className={cn(
                'flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
                isHandled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]',
                handledState === 'loading' ? 'opacity-70' : ''
              )}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {isHandled
                ? `Marked as ${closedStatus.label}`
                : handledState === 'loading'
                ? 'Marking…'
                : `Mark as ${closedStatus.label}`}
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Private notes ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center justify-between border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Notes</span>
          <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Private — only visible to your team
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Add a private note…"
              rows={3}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={savingNote || !noteBody.trim()}
                onClick={() => void submitNote()}
              >
                {savingNote ? 'Saving…' : 'Save note'}
              </Button>
            </div>
          </div>

          {notes.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-border" />
                <span className="text-[12px] text-muted-foreground shrink-0">
                  {notes.length} note{notes.length === 1 ? '' : 's'}
                </span>
                <div className="flex-1 border-t border-border" />
              </div>
              {notes.map((note) => (
                <MessageNoteItem
                  key={note.id}
                  note={note}
                  currentUserId={currentUserId}
                  messageId={message.id}
                  onUpdated={(updated) =>
                    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)))
                  }
                  onDeleted={(noteId) => setNotes((prev) => prev.filter((n) => n.id !== noteId))}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Activity log ── */}
      {message.actions.length > 0 ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex h-[52px] items-center border-b border-border px-5">
            <span className="text-sm font-semibold text-foreground">Activity</span>
          </div>
          <div className="p-5">
            <ol className="space-y-3">
              <li className="flex items-start gap-3 text-[13px]">
                <span className="mt-1 h-2 w-2 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
                <div>
                  <span className="text-foreground font-medium">Received</span>
                  <span className="ml-2 text-muted-foreground">
                    {format(new Date(message.timestamp), 'MMM d · h:mma')}
                  </span>
                </div>
              </li>
              {[...message.actions]
                .sort((a, b) => a.at.localeCompare(b.at))
                .map((action) => (
                  <li key={action.id} className="flex items-start gap-3 text-[13px]">
                    <span
                      className={cn(
                        'mt-1 h-2 w-2 rounded-full shrink-0',
                        action.type === 'workflow_status_changed'
                          ? 'bg-blue-400'
                          : action.type === 'assigned'
                          ? 'bg-purple-400'
                          : action.type === 'flagged_qa'
                          ? 'bg-amber-400'
                          : 'bg-slate-300'
                      )}
                      aria-hidden="true"
                    />
                    <div>
                      <span className="text-foreground font-medium">
                        <ActivityLabel
                          action={action}
                          statuses={statuses}
                          businessUsers={businessUsers}
                        />
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {format(new Date(action.at), 'MMM d · h:mma')}
                      </span>
                    </div>
                  </li>
                ))}
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  )
}
