'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, User } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import type { BusinessMessageStatus, BusinessUser, MessageAction } from '@/types/answeringService'

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

// ─── Status Dropdown ──────────────────────────────────────────────────────────

interface StatusDropdownProps {
  messageId: string
  current: BusinessMessageStatus | null | undefined
  statuses: BusinessMessageStatus[]
  onChanged: (status: BusinessMessageStatus | null) => void
}

export function StatusDropdown({ messageId, current, statuses, onChanged }: StatusDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function select(status: BusinessMessageStatus | null) {
    setOpen(false)
    if (status?.id === current?.id) return
    const previous = current ?? null
    setLoading(true)
    onChanged(status)
    try {
      await apiPatch(`/api/answering-service/messages/${messageId}/status`, {
        workflowStatusId: status?.id ?? null,
      })
    } catch {
      onChanged(previous)
      toast.error('Failed to update status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current ? (
          <>
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: current.color }}
              aria-hidden="true"
            />
            <span>{current.label}</span>
          </>
        ) : (
          <span className="text-muted-foreground">No status</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 ml-1 text-muted-foreground shrink-0" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
        >
          <button
            type="button"
            role="option"
            aria-selected={!current}
            onClick={() => void select(null)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
            No status
          </button>
          {statuses.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={current?.id === s.id}
              onClick={() => void select(s)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors',
                current?.id === s.id ? 'bg-muted' : ''
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ─── Assign Dropdown ──────────────────────────────────────────────────────────

interface AssignDropdownProps {
  messageId: string
  currentAssigneeId: string | null | undefined
  currentAssigneeEmail: string | null | undefined
  businessUsers: BusinessUser[]
  onChanged: (userId: string | null, email: string | null) => void
}

export function AssignDropdown({
  messageId,
  currentAssigneeId,
  currentAssigneeEmail,
  businessUsers,
  onChanged,
}: AssignDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function select(user: BusinessUser | null) {
    setOpen(false)
    if (user?.userId === currentAssigneeId) return
    const previousId = currentAssigneeId
    const previousEmail = currentAssigneeEmail
    setLoading(true)
    onChanged(user?.userId ?? null, user?.email ?? null)
    try {
      await apiPatch(`/api/answering-service/messages/${messageId}/assign`, {
        assignToUserId: user?.userId ?? null,
      })
    } catch {
      onChanged(previousId ?? null, previousEmail ?? null)
      toast.error('Failed to assign message.')
    } finally {
      setLoading(false)
    }
  }

  const displayName = currentAssigneeEmail
    ? currentAssigneeEmail.split('@')[0]
    : currentAssigneeId
    ? '...'
    : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {displayName ? (
          <span>{displayName}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
        <ChevronDown className="h-3.5 w-3.5 ml-1 text-muted-foreground shrink-0" />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-border bg-card shadow-lg overflow-hidden"
        >
          <button
            type="button"
            role="option"
            aria-selected={!currentAssigneeId}
            onClick={() => void select(null)}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            <User className="h-3.5 w-3.5 shrink-0" />
            Unassigned
          </button>
          {businessUsers.map((u) => (
            <button
              key={u.userId}
              type="button"
              role="option"
              aria-selected={currentAssigneeId === u.userId}
              onClick={() => void select(u)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted transition-colors',
                currentAssigneeId === u.userId ? 'bg-muted' : ''
              )}
            >
              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {u.email.split('@')[0]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

// ─── Activity Label ───────────────────────────────────────────────────────────

interface ActivityLabelProps {
  action: MessageAction
  statuses: BusinessMessageStatus[]
  businessUsers: BusinessUser[]
}

export function ActivityLabel({ action, statuses, businessUsers }: ActivityLabelProps) {
  function statusLabel(id: string | null) {
    if (!id) return 'None'
    return statuses.find((s) => s.id === id)?.label ?? 'Unknown status'
  }

  function userLabel(id: string | null) {
    if (!id) return 'no one'
    return businessUsers.find((u) => u.userId === id)?.email.split('@')[0] ?? id.slice(0, 8)
  }

  if (action.type === 'workflow_status_changed') {
    return (
      <>
        Status changed to <span className="font-semibold">{statusLabel(action.to)}</span>
      </>
    )
  }

  if (action.type === 'assigned') {
    if (!action.to) return <>Unassigned</>
    return (
      <>
        Assigned to <span className="font-semibold">{userLabel(action.to)}</span>
      </>
    )
  }

  if (action.type === 'priority_updated') {
    return (
      <>
        Priority changed to <span className="font-semibold capitalize">{action.to}</span>
      </>
    )
  }

  if (action.type === 'status_changed') {
    return (
      <>
        Portal status → <span className="font-semibold">{action.to.replace(/_/g, ' ')}</span>
      </>
    )
  }

  return <>Flagged for QA</>
}
