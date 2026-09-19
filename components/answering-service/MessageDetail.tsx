'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Lock, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { AudioPlayer } from '@/components/answering-service/AudioPlayer'
import { CallerHistorySection } from '@/components/answering-service/CallerHistorySection'
import { MessageNoteInput } from '@/components/answering-service/MessageNoteInput'
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
  onHandled?: (messageId: string) => void
}

const PRIORITY_LABELS = { high: 'Urgent', medium: 'Medium', low: 'Low' } as const

function priorityDotClass(priority: CallLog['priority']) {
  if (priority === 'high') return 'bg-rose-500'
  if (priority === 'medium') return 'bg-amber-500'
  return 'bg-slate-400'
}

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

function parseMessageFields(text: string): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = []
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Za-z][A-Za-z\s]{1,20}):\s*(.+)$/)
    if (m?.[1] && m?.[2]) {
      fields.push({ label: m[1].trim(), value: m[2].trim() })
    }
  }
  return fields
}

function getUnstructuredRemainder(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.match(/^([A-Za-z][A-Za-z\s]{1,20}):\s*(.+)$/))
    .join('\n')
    .trim()
}

export function MessageDetail({
  message,
  statuses,
  businessUsers,
  currentUserId,
  onRefresh,
  onHandled,
}: MessageDetailProps) {
  const [workflowStatus, setWorkflowStatus] = useState<BusinessMessageStatus | null>(
    message.workflowStatus ?? null
  )
  const [assigneeId, setAssigneeId] = useState<string | null>(message.assignedTo ?? null)
  const [assigneeEmail, setAssigneeEmail] = useState<string | null>(
    message.assignedToEmail ?? null
  )
  const [notes, setNotes] = useState<MessageNote[]>(message.notes ?? [])
  const [handledState, setHandledState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [undoAvailable, setUndoAvailable] = useState(false)
  const [previousStatusSnapshot, setPreviousStatusSnapshot] =
    useState<BusinessMessageStatus | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

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

  const closedStatus = statuses.find((s) => !s.isOpen)
  const isHandled = !workflowStatus?.isOpen && workflowStatus !== null

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
      setPreviousStatusSnapshot(previousStatus)
      setUndoAvailable(true)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = setTimeout(() => setUndoAvailable(false), 5000)
      onHandled?.(message.id)
      await onRefresh?.()
    } catch {
      setWorkflowStatus(previousStatus)
      toast.error('Failed to mark as handled.')
      setHandledState('idle')
    }
  }

  async function handleUndo() {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoAvailable(false)
    setHandledState('idle')
    const restoreStatus = previousStatusSnapshot
    setWorkflowStatus(restoreStatus)
    try {
      await apiPatch(`/api/answering-service/messages/${message.id}/status`, {
        workflowStatusId: restoreStatus?.id ?? null,
      })
      await onRefresh?.()
    } catch {
      toast.error('Failed to undo.')
    }
  }

  const structuredFields = parseMessageFields(message.message)
  const remainder = structuredFields.length > 0 ? getUnstructuredRemainder(message.message) : ''

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-24 md:pb-8">
      {/* ── Hero: caller info + primary actions ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 space-y-3">
          {/* Meta row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={priorityBadgeClass(message.priority)}>
              <span
                className={`mr-1.5 h-1.5 w-1.5 rounded-full ${priorityDotClass(message.priority)}`}
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

          {/* Handled done state */}
          {handledState === 'done' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Marked as {closedStatus?.label ?? 'Handled'}
                </span>
                {undoAvailable ? (
                  <button
                    type="button"
                    onClick={() => void handleUndo()}
                    className="text-xs text-emerald-600 underline hover:text-emerald-800"
                  >
                    Undo
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-emerald-600">
                {message.callerName ?? 'Caller'}
                {message.callbackNumber ? ` · ${message.callbackNumber}` : ''}
              </p>
            </div>
          ) : (
            <>
              <h2 className={`${headingStyles.h3.base} text-foreground`}>
                {message.callerName ?? 'Unknown caller'}
              </h2>

              {/* Primary actions — callback + handled, same weight */}
              <div className="space-y-2">
                {message.callbackNumber ? (
                  <a
                    href={`tel:${message.callbackNumber}`}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/80 transition-colors"
                  >
                    <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Call back {message.callbackNumber}
                  </a>
                ) : null}

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
            </>
          )}
        </div>
      </div>

      {/* ── Message body ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex h-[52px] items-center border-b border-border px-5">
          <span className="text-sm font-semibold text-foreground">Message</span>
        </div>
        <div className="p-5">
          {structuredFields.length > 0 ? (
            <div className="space-y-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                {structuredFields.map(({ label, value }) => (
                  <>
                    <dt
                      key={`${label}-dt`}
                      className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                    >
                      {label}
                    </dt>
                    <dd key={`${label}-dd`} className="text-[13px] text-foreground">
                      {value}
                    </dd>
                  </>
                ))}
              </dl>
              {remainder ? (
                <p className={`${bodyStyles.base} text-foreground leading-relaxed border-t border-border pt-3 mt-3`}>
                  {remainder}
                </p>
              ) : null}
            </div>
          ) : (
            <p className={`${bodyStyles.base} text-foreground leading-relaxed`}>{message.message}</p>
          )}
        </div>
      </div>

      {/* ── Recording ── */}
      {message.recordingUrl ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex h-[52px] items-center border-b border-border px-5">
            <span className="text-sm font-semibold text-foreground">Recording</span>
          </div>
          <div className="p-5">
            <AudioPlayer src={message.recordingUrl} />
          </div>
        </div>
      ) : null}

      {/* ── Status + assign ── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex h-[52px] items-center border-b border-border px-5 rounded-t-xl overflow-hidden">
          <span className="text-sm font-semibold text-foreground">Actions</span>
        </div>
        <div className="p-5">
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
        </div>
      </div>

      {/* ── Caller history ── */}
      {message.callerNumber ? (
        <CallerHistorySection
          callerNumber={message.callerNumber}
          currentMessageId={message.id}
        />
      ) : null}

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
          <MessageNoteInput
            messageId={message.id}
            onNoteAdded={(note) => setNotes((prev) => [...prev, note])}
          />

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
                <span className="mt-1 h-2 w-2 rounded-full bg-border shrink-0" aria-hidden="true" />
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
                          : 'bg-border'
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

      {/* ── Mobile sticky callback CTA ── */}
      {message.callbackNumber ? (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border md:hidden">
          <a
            href={`tel:${message.callbackNumber}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground"
          >
            <Phone className="h-4 w-4" />
            Call back {message.callbackNumber}
          </a>
        </div>
      ) : null}
    </div>
  )
}
