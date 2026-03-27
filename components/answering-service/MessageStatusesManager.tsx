'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Lock, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { BusinessMessageStatus } from '@/types/answeringService'

interface MessageStatusesManagerProps {
  initialStatuses: BusinessMessageStatus[]
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  const payload = (await res.json()) as { data?: T; error?: { message?: string } }
  if (!res.ok) {
    throw new Error(payload.error?.message ?? 'Request failed.')
  }
  if (payload.data === undefined) {
    throw new Error('Unexpected response.')
  }
  return payload.data
}

const HEX_PRESETS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#94a3b8', // slate
]

function isValidHex(val: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(val)
}

export function MessageStatusesManager({ initialStatuses }: MessageStatusesManagerProps) {
  const [statuses, setStatuses] = useState<BusinessMessageStatus[]>(initialStatuses)

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [newIsOpen, setNewIsOpen] = useState(true)
  const [adding, setAdding] = useState(false)

  // Edit state: statusId → pending label
  const [editLabels, setEditLabels] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!newLabel.trim() || !isValidHex(newColor)) return
    setAdding(true)
    try {
      const created = await apiFetch<BusinessMessageStatus>('/api/answering-service/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim(), color: newColor, isOpen: newIsOpen }),
      })
      setStatuses((prev) => [...prev, created])
      setNewLabel('')
      setNewColor('#3b82f6')
      setNewIsOpen(true)
      setShowAddForm(false)
      toast.success('Status added.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add status.')
    } finally {
      setAdding(false)
    }
  }

  async function handleSaveLabel(status: BusinessMessageStatus) {
    const label = editLabels[status.id]
    if (!label || label === status.label) {
      setEditLabels((prev) => {
        const next = { ...prev }
        delete next[status.id]
        return next
      })
      return
    }
    setSavingId(status.id)
    try {
      const updated = await apiFetch<BusinessMessageStatus>(
        `/api/answering-service/statuses/${status.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label }),
        }
      )
      setStatuses((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      setEditLabels((prev) => {
        const next = { ...prev }
        delete next[status.id]
        return next
      })
      toast.success('Status updated.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.')
    } finally {
      setSavingId(null)
    }
  }

  async function handleMove(status: BusinessMessageStatus, direction: 'up' | 'down') {
    const idx = statuses.findIndex((s) => s.id === status.id)
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= statuses.length) return

    const reordered = [...statuses]
    const temp = reordered[idx]
    reordered[idx] = reordered[targetIdx]
    reordered[targetIdx] = temp

    // Optimistic update
    setStatuses(reordered)

    // Persist the new sort_order for both affected statuses
    const a = reordered[idx]
    const b = reordered[targetIdx]

    try {
      await Promise.all([
        apiFetch(`/api/answering-service/statuses/${a.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: idx }),
        }),
        apiFetch(`/api/answering-service/statuses/${b.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: targetIdx }),
        }),
      ])
    } catch {
      // Revert on failure
      setStatuses(statuses)
      toast.error('Failed to reorder.')
    }
  }

  async function handleDelete(status: BusinessMessageStatus) {
    setDeletingId(status.id)
    try {
      await apiFetch(`/api/answering-service/statuses/${status.id}`, { method: 'DELETE' })
      setStatuses((prev) => prev.filter((s) => s.id !== status.id))
      toast.success('Status deleted.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete status.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex h-[52px] items-center justify-between border-b border-border px-5">
        <span className="text-sm font-semibold text-foreground">Message Statuses</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 text-[13px]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add status
        </Button>
      </div>

      {/* Add form */}
      {showAddForm ? (
        <div className="border-b border-border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[12px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                Label
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Escalated"
                maxLength={50}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                Color
              </label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  {HEX_PRESETS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setNewColor(hex)}
                      className={`h-6 w-6 rounded-full transition-transform ${
                        newColor === hex ? 'ring-2 ring-offset-1 ring-primary scale-110' : ''
                      }`}
                      style={{ backgroundColor: hex }}
                      aria-label={hex}
                      title={hex}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  placeholder="#3b82f6"
                  maxLength={7}
                  className="w-[88px] rounded-lg border border-border bg-card px-2 py-1 text-[12px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                State
              </label>
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNewIsOpen(true)}
                  className={`px-3 py-2 text-[12px] font-medium transition-colors ${
                    newIsOpen ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => setNewIsOpen(false)}
                  className={`px-3 py-2 text-[12px] font-medium transition-colors ${
                    !newIsOpen ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Closed
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={adding || !newLabel.trim() || !isValidHex(newColor)}
              onClick={() => void handleAdd()}
            >
              {adding ? 'Adding…' : 'Add status'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAddForm(false)
                setNewLabel('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {/* Status list */}
      <div className="divide-y divide-border">
        {statuses.length === 0 ? (
          <p className="p-5 text-[13px] text-muted-foreground">No statuses yet. Add one above.</p>
        ) : (
          statuses.map((status, idx) => {
            const isEditing = status.id in editLabels
            const pendingLabel = editLabels[status.id] ?? status.label

            return (
              <div key={status.id} className="flex items-center gap-3 px-4 py-3">
                {/* Reorder arrows */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => void handleMove(status, 'up')}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors min-h-[22px] min-w-[22px] flex items-center justify-center"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === statuses.length - 1}
                    onClick={() => void handleMove(status, 'down')}
                    className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors min-h-[22px] min-w-[22px] flex items-center justify-center"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Color dot */}
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: status.color }}
                  aria-hidden="true"
                />

                {/* Label — inline editable */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={pendingLabel}
                      onChange={(e) =>
                        setEditLabels((prev) => ({ ...prev, [status.id]: e.target.value }))
                      }
                      onBlur={() => void handleSaveLabel(status)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleSaveLabel(status)
                        if (e.key === 'Escape') {
                          setEditLabels((prev) => {
                            const next = { ...prev }
                            delete next[status.id]
                            return next
                          })
                        }
                      }}
                      maxLength={50}
                      autoFocus
                      className="w-full rounded border border-primary bg-card px-2 py-0.5 text-[13px] text-foreground focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setEditLabels((prev) => ({ ...prev, [status.id]: status.label }))
                      }
                      className="text-[13px] font-medium text-foreground hover:text-primary transition-colors text-left"
                      title="Click to rename"
                    >
                      {status.label}
                    </button>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                      status.isOpen
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {status.isOpen ? 'Open' : 'Closed'}
                  </span>

                  {status.isSystem ? (
                    <span
                      className="flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                      title="System status — cannot be deleted"
                    >
                      <Lock className="h-2.5 w-2.5" />
                      System
                    </span>
                  ) : null}
                </div>

                {/* Save indicator or delete button */}
                {savingId === status.id ? (
                  <span className="text-[12px] text-muted-foreground shrink-0">Saving…</span>
                ) : !status.isSystem ? (
                  <button
                    type="button"
                    disabled={deletingId === status.id}
                    onClick={() => void handleDelete(status)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center disabled:opacity-50"
                    aria-label={`Delete ${status.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <div className="w-9 shrink-0" /> /* spacer to align rows */
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
