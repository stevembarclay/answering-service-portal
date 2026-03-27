'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { useToast } from '@/components/ui/use-toast'
import type { OnCallContact, OnCallShift } from '@/lib/services/answering-service/onCallService'

const DAY_LABELS = [
  { value: 0, label: 'Su' },
  { value: 1, label: 'M' },
  { value: 2, label: 'Tu' },
  { value: 3, label: 'W' },
  { value: 4, label: 'Th' },
  { value: 5, label: 'F' },
  { value: 6, label: 'Sa' },
]

interface ShiftBuilderProps {
  businessId: string
  contacts: OnCallContact[]
  shift: OnCallShift | null  // null = new shift
  timezone: string
  onClose: () => void
  onSaved: (shift: OnCallShift) => void
  onDeleted: (shiftId: string) => void
}

interface EscalationRow {
  contactId: string
  waitMinutes: number | null
}

export function ShiftBuilder({
  businessId,
  contacts,
  shift,
  timezone,
  onClose,
  onSaved,
  onDeleted,
}: ShiftBuilderProps) {
  const { toast } = useToast()
  const [name, setName] = useState(shift?.name ?? '')
  const [days, setDays] = useState<number[]>(shift?.daysOfWeek ?? [])
  const [startTime, setStartTime] = useState(shift?.startTime?.slice(0, 5) ?? '09:00')
  const [endTime, setEndTime] = useState(shift?.endTime?.slice(0, 5) ?? '17:00')
  const [steps, setSteps] = useState<EscalationRow[]>(
    shift?.escalationSteps?.length
      ? shift.escalationSteps
      : [{ contactId: '', waitMinutes: 5 }]
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOvernight = startTime >= endTime && startTime !== endTime

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  function addStep() {
    setSteps((prev) => [...prev, { contactId: '', waitMinutes: 5 }])
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!name.trim() || days.length === 0 || steps.some((s) => !s.contactId)) {
      toast({ title: 'Please fill in all required fields.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        businessId,
        name: name.trim(),
        daysOfWeek: days.sort(),
        startTime,
        endTime,
        escalationSteps: steps.map((s, i) => ({
          contactId: s.contactId,
          waitMinutes: i === steps.length - 1 ? null : s.waitMinutes,
        })),
      }

      const url = shift
        ? `/api/v1/internal/on-call/shifts/${shift.id}`
        : '/api/v1/internal/on-call/shifts'
      const method = shift ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        throw new Error('Failed to save shift.')
      }

      const { data } = await res.json()
      onSaved(data)
      toast({ title: shift ? 'Shift updated.' : 'Shift added.' })
    } catch {
      toast({ title: 'Failed to save shift.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!shift) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/internal/on-call/shifts/${shift.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      if (!res.ok) throw new Error('Failed to remove shift.')
      onDeleted(shift.id)
      toast({ title: 'Shift removed.' })
    } catch {
      toast({ title: 'Failed to remove shift.', variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{shift ? 'Edit Shift' : 'Add Shift'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-5 py-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Shift name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weeknight Coverage"
            />
          </div>

          {/* Days */}
          <div className="space-y-1.5">
            <Label>Days</Label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleDay(value)}
                  className={`h-9 w-9 rounded-lg text-xs font-medium transition-colors ${
                    days.includes(value)
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          {isOvernight && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-md px-3 py-2">
              This shift crosses midnight — it will cover into the following morning.
            </p>
          )}

          {/* Timezone note */}
          <p className="text-xs text-slate-400">
            Times are in <span className="font-medium">{timezone}</span>. Change timezone at the top of the page.
          </p>

          {/* Who to call chain */}
          <div className="space-y-2">
            <Label>Who to call</Label>
            {contacts.length === 0 ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                No contacts yet. Go to the <span className="font-medium">Contacts</span> tab first to add people who can be paged.
              </p>
            ) : null}
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}.</span>
                <Select
                  value={step.contactId}
                  onValueChange={(v) =>
                    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, contactId: v } : s)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select contact…" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.role ? ` · ${c.role}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {i < steps.length - 1 && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={step.waitMinutes ?? ''}
                      onChange={(e) =>
                        setSteps((prev) =>
                          prev.map((s, idx) =>
                            idx === i ? { ...s, waitMinutes: parseInt(e.target.value, 10) || null } : s
                          )
                        )
                      }
                      className="w-16 text-center"
                    />
                    <span className="text-xs text-slate-400 shrink-0">min</span>
                  </div>
                )}
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-slate-400 hover:text-red-500 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addStep} className="mt-1">
              + Add contact to chain
            </Button>
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-row">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? 'Saving…' : shift ? 'Save changes' : 'Add shift'}
          </Button>
          {shift && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700"
            >
              {deleting ? 'Removing…' : 'Remove'}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
