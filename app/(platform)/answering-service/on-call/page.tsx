import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
import { getBusinessContext } from '@/lib/auth/server'
import { PageHeader } from '@/components/ui/page-header'
import {
  listContacts,
  listShifts,
  getBusinessTimezone,
} from '@/lib/services/answering-service/onCallService'
import {
  resolveActiveShift,
  type ShiftRow,
  type ContactRow,
} from '@/lib/services/answering-service/onCallScheduler'
import { createClient } from '@/lib/supabase/server'
import { OnCallClient } from './OnCallClient'

export const dynamic = 'force-dynamic'

export default async function OnCallPage() {
  const context = await getBusinessContext()
  if (!context) redirect('/login')

  const [contacts, shifts, storedTimezone] = await Promise.all([
    listContacts(context.businessId),
    listShifts(context.businessId),
    getBusinessTimezone(context.businessId),
  ])

  let effectiveTimezone = storedTimezone
  if (!effectiveTimezone) {
    const supabase = await createClient()
    const { data: session } = await supabase
      .from('wizard_sessions')
      .select('wizard_data')
      .eq('business_id', context.businessId)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    effectiveTimezone =
      (session?.wizard_data as { businessHours?: { timezone?: string } } | null)
        ?.businessHours?.timezone ?? 'America/New_York'
  }

  const now = new Date()
  const contactMap = new Map<string, ContactRow>(
    contacts.map((c) => [
      c.id,
      { id: c.id, name: c.name, phone: c.phone, role: c.role, notes: c.notes },
    ])
  )
  const schedulerShifts: ShiftRow[] = shifts.map((s) => ({
    id: s.id,
    name: s.name,
    days_of_week: s.daysOfWeek,
    start_time: s.startTime,
    end_time: s.endTime,
    escalation_steps: s.escalationSteps,
    active: s.active,
  }))
  let current = null
  try {
    current = resolveActiveShift(now, effectiveTimezone, schedulerShifts, contactMap)
  } catch {
    // Invalid stored timezone: degrade gracefully
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="On-Call Schedule"
        subtitle="Manage escalation shifts and on-call contacts"
        actions={
          <div className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5">
            <Plus className="h-3.5 w-3.5 text-primary-foreground" />
            <span className="text-[13px] font-semibold text-primary-foreground">Add Shift</span>
          </div>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <OnCallClient
          businessId={context.businessId}
          initialContacts={contacts}
          initialShifts={shifts}
          initialTimezone={effectiveTimezone}
          currentStatus={
            current
              ? {
                  shiftId: current.shiftId,
                  shiftName: current.shiftName,
                  shiftEndsAt: current.shiftEndsAt.toISOString(),
                  escalationSteps: current.escalationSteps,
                }
              : null
          }
        />
      </div>
    </div>
  )
}
