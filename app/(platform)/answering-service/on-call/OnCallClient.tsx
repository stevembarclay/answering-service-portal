'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import type { OnCallContact, OnCallShift } from '@/lib/services/answering-service/onCallService'
import { ShiftBuilder } from './ShiftBuilder'
import { ContactsTab } from './ContactsTab'

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
]

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CurrentStatus {
  shiftId: string
  shiftName: string
  shiftEndsAt: string
  escalationSteps: Array<{
    step: number
    name: string
    phone: string
    role: string | null
    notes: string | null
    waitMinutes: number | null
  }>
}

interface OnCallClientProps {
  businessId: string
  initialContacts: OnCallContact[]
  initialShifts: OnCallShift[]
  initialTimezone: string
  currentStatus: CurrentStatus | null
}

// Shift colors — cycle through these for visual distinction
const SHIFT_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-violet-100 text-violet-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-pink-100 text-pink-800',
]

interface WeekGridProps {
  shifts: OnCallShift[]
  contacts: OnCallContact[]
}

function WeekGrid({ shifts, contacts }: WeekGridProps) {
  // Display Mon(1)→Sun(0), i.e. day indices [1,2,3,4,5,6,0]
  const displayDays: Array<{ index: number; label: string }> = [
    { index: 1, label: 'Mon' },
    { index: 2, label: 'Tue' },
    { index: 3, label: 'Wed' },
    { index: 4, label: 'Thu' },
    { index: 5, label: 'Fri' },
    { index: 6, label: 'Sat' },
    { index: 0, label: 'Sun' },
  ]

  const activeShifts = shifts.filter((s) => s.active)

  function getCoverageForDay(dayIndex: number): Array<{ shiftName: string; primaryContact: string; colorClass: string }> {
    return activeShifts.flatMap((shift, shiftIdx) => {
      const directlyCovered = shift.daysOfWeek.includes(dayIndex)
      // Overnight carry-over: shift is overnight (start > end) and the previous day is in days_of_week
      const isOvernight = shift.startTime > shift.endTime
      const prevDay = (dayIndex + 6) % 7
      const carryOver = isOvernight && shift.daysOfWeek.includes(prevDay)

      if (!directlyCovered && !carryOver) return []

      const firstStep = shift.escalationSteps[0]
      const contact = firstStep ? contacts.find((c) => c.id === firstStep.contactId) : undefined
      return [{
        shiftName: shift.name,
        primaryContact: contact?.name ?? '—',
        colorClass: SHIFT_COLORS[shiftIdx % SHIFT_COLORS.length],
      }]
    })
  }

  return (
    <>
      <div className="space-y-1 sm:hidden">
        {displayDays.map(({ index, label }) => {
          const coverage = getCoverageForDay(index)
          return (
            <div
              key={index}
              className="flex items-start gap-3 border-b border-border py-1.5 last:border-0"
            >
              <span className="w-8 shrink-0 text-xs font-medium text-muted-foreground">
                {label}
              </span>
              {coverage.length === 0 ? (
                <span className="text-xs text-muted-foreground">No coverage</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {coverage.map((item, i) => (
                    <span key={i} className={`rounded px-1.5 py-0.5 text-xs ${item.colorClass}`}>
                      {item.primaryContact}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="hidden space-y-2 sm:block">
        <div className="grid grid-cols-7 gap-1">
        {displayDays.map(({ index, label }) => (
          <div key={index} className="text-center text-xs font-medium text-slate-500 pb-1">
            {label}
          </div>
        ))}
        {displayDays.map(({ index }) => {
          const coverage = getCoverageForDay(index)
          return (
            <div
              key={index}
              className="min-h-[60px] rounded-md border border-slate-100 p-1 space-y-1"
            >
              {coverage.length === 0 ? (
                <div className="rounded px-1.5 py-1 bg-slate-50 text-xs text-slate-300 text-center">
                  —
                </div>
              ) : (
                coverage.map((item, i) => (
                  <div
                    key={i}
                    title={`${item.shiftName}: ${item.primaryContact}`}
                    className={`rounded px-1.5 py-1 text-xs truncate ${item.colorClass}`}
                  >
                    {item.primaryContact}
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
        <p className="text-xs text-slate-400">
          Overnight shifts extend into the following morning — hover a shift for the exact coverage window.
        </p>
      </div>
    </>
  )
}

export function OnCallClient({
  businessId,
  initialContacts,
  initialShifts,
  initialTimezone,
  currentStatus,
}: OnCallClientProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState(initialContacts)
  const [shifts, setShifts] = useState(initialShifts)
  const [timezone, setTimezone] = useState(initialTimezone)
  const [editingShift, setEditingShift] = useState<OnCallShift | null>(null)
  const [showShiftBuilder, setShowShiftBuilder] = useState(false)
  const [savingTz, setSavingTz] = useState(false)

  async function handleTimezoneChange(tz: string) {
    setTimezone(tz)
    setSavingTz(true)
    try {
      await fetch('/api/v1/internal/on-call/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, timezone: tz }),
      })
      router.refresh()
    } finally {
      setSavingTz(false)
    }
  }

  function formatShiftTime(shift: OnCallShift): string {
    const days = shift.daysOfWeek.map((d) => DAY_ABBRS[d]).join(', ')
    const start = shift.startTime.slice(0, 5)
    const end = shift.endTime.slice(0, 5)
    const overnight = shift.startTime > shift.endTime
    return `${days} · ${start}–${end}${overnight ? ' (overnight)' : ''}`
  }

  function formatEscalationInline(shift: OnCallShift): string {
    return shift.escalationSteps
      .map((step, i) => {
        const contact = contacts.find((c) => c.id === step.contactId)
        const name = contact?.name ?? 'Unknown'
        return i < shift.escalationSteps.length - 1
          ? `${name} (${step.waitMinutes ?? '?'} min)`
          : name
      })
      .join(' → ')
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Current Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStatus ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-sm">{currentStatus.shiftName}</span>
                <Badge variant="secondary">Active</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Ends{' '}
                {new Date(currentStatus.shiftEndsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </p>
              <div className="mt-2 space-y-1">
                {currentStatus.escalationSteps.map((step) => (
                  <div key={step.step} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-400 w-4">{step.step}.</span>
                    <span className="font-medium">{step.name}</span>
                    {step.role && <span className="text-slate-500 text-xs">· {step.role}</span>}
                    {step.waitMinutes && (
                      <span className="text-slate-400 text-xs">· wait {step.waitMinutes}m</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="text-sm">No coverage scheduled right now</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timezone selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700 shrink-0">Schedule timezone:</label>
        <Select value={timezone} onValueChange={handleTimezoneChange} disabled={savingTz}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMMON_TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {savingTz && <span className="text-xs text-slate-400">Saving…</span>}
      </div>

      {/* Week grid — visual schedule overview */}
      <WeekGrid shifts={shifts} contacts={contacts} />

      <Tabs defaultValue="shifts">
        <TabsList>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-3 pt-4">
          {shifts.length === 0 ? (
            <div className="py-8 text-center">
              <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
                No shifts yet
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add your first shift to start managing on-call coverage.
              </p>
            </div>
          ) : (
            shifts.map((shift) => (
              <Card key={shift.id} className={shift.active ? '' : 'opacity-50'}>
                <CardContent className="py-3 px-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{shift.name}</span>
                      {!shift.active && (
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{formatShiftTime(shift)}</p>
                    <p className="text-xs text-slate-400 mt-1 truncate">{formatEscalationInline(shift)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingShift(shift)
                      setShowShiftBuilder(true)
                    }}
                  >
                    Edit
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEditingShift(null)
              setShowShiftBuilder(true)
            }}
          >
            + Add shift
          </Button>
        </TabsContent>

        <TabsContent value="contacts" className="pt-4">
          <ContactsTab
            businessId={businessId}
            contacts={contacts}
            onContactsChange={setContacts}
          />
        </TabsContent>
      </Tabs>

      {showShiftBuilder && (
        <ShiftBuilder
          businessId={businessId}
          contacts={contacts}
          shift={editingShift}
          timezone={timezone}
          onClose={() => {
            setShowShiftBuilder(false)
            setEditingShift(null)
          }}
          onSaved={(savedShift: OnCallShift) => {
            setShifts((prev) =>
              editingShift
                ? prev.map((s) => (s.id === savedShift.id ? savedShift : s))
                : [...prev, savedShift]
            )
            setShowShiftBuilder(false)
            setEditingShift(null)
          }}
          onDeleted={(shiftId: string) => {
            setShifts((prev) => prev.filter((s) => s.id !== shiftId))
            setShowShiftBuilder(false)
            setEditingShift(null)
          }}
        />
      )}
    </div>
  )
}
