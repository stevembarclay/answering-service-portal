export interface ShiftRow {
  id: string
  name: string
  days_of_week: number[]   // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string       // "HH:MM:SS"
  end_time: string         // "HH:MM:SS"
  escalation_steps: Array<{ contactId: string; waitMinutes: number | null }>
  active: boolean
}

export interface ContactRow {
  id: string
  name: string
  phone: string
  role: string | null
  notes: string | null
}

export interface ResolvedShift {
  shiftId: string
  shiftName: string
  shiftEndsAt: Date
  escalationSteps: Array<{
    step: number
    name: string
    phone: string
    role: string | null
    notes: string | null
    waitMinutes: number | null
  }>
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function getLocalComponents(now: Date, timezone: string): {
  dayOfWeek: number
  minutesSinceMidnight: number
  localDateStr: string
} {
  // 'sv' locale gives ISO-like "YYYY-MM-DD HH:MM:SS"
  const localStr = now.toLocaleString('sv', { timeZone: timezone })
  const [datePart, timePart] = localStr.split(' ')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay()
  return {
    dayOfWeek,
    minutesSinceMidnight: hours * 60 + minutes,
    localDateStr: datePart,
  }
}

function addOneDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function localTimeToUtc(localDateStr: string, timeStr: string, timezone: string): Date {
  const hhmm = timeStr.slice(0, 5)
  const naiveUtc = new Date(`${localDateStr}T${hhmm}:00Z`)
  const localRepr = new Date(
    new Date(naiveUtc.toLocaleString('sv', { timeZone: timezone }).replace(' ', 'T') + 'Z')
  )
  const offsetMs = naiveUtc.getTime() - localRepr.getTime()
  return new Date(naiveUtc.getTime() + offsetMs)
}

export function resolveActiveShift(
  now: Date,
  timezone: string,
  shifts: ShiftRow[],
  contacts: Map<string, ContactRow>
): ResolvedShift | null {
  const { dayOfWeek, minutesSinceMidnight, localDateStr } = getLocalComponents(now, timezone)
  const previousDay = (dayOfWeek + 6) % 7

  for (const shift of shifts) {
    if (!shift.active) continue

    const startMin = timeToMinutes(shift.start_time)
    const endMin = timeToMinutes(shift.end_time)
    const days = shift.days_of_week

    let matched = false
    let endsDateStr = localDateStr

    if (startMin < endMin) {
      // Same-day shift
      if (days.includes(dayOfWeek) && minutesSinceMidnight >= startMin && minutesSinceMidnight < endMin) {
        matched = true
      }
    } else {
      // Overnight shift (start > end, e.g. 22:00–06:00)
      if (days.includes(dayOfWeek) && minutesSinceMidnight >= startMin) {
        // First half: current day after startMin
        matched = true
        endsDateStr = addOneDay(localDateStr)
      } else if (days.includes(previousDay) && minutesSinceMidnight < endMin) {
        // Second half: carry-over from previous day
        matched = true
        endsDateStr = localDateStr
      }
    }

    if (matched) {
      const shiftEndsAt = localTimeToUtc(endsDateStr, shift.end_time, timezone)
      const escalationSteps = shift.escalation_steps.map((step, i) => {
        const contact = contacts.get(step.contactId)
        return {
          step: i + 1,
          name: contact?.name ?? 'Unknown',
          phone: contact?.phone ?? '',
          role: contact?.role ?? null,
          notes: contact?.notes ?? null,
          waitMinutes: step.waitMinutes,
        }
      })

      return {
        shiftId: shift.id,
        shiftName: shift.name,
        shiftEndsAt,
        escalationSteps,
      }
    }
  }

  return null
}

/**
 * Returns true if the candidate shift does NOT overlap with any shift in existingShifts.
 *
 * Two shifts overlap if they share at least one day whose coverage windows intersect.
 * For overnight shifts the window wraps midnight: it is split into two sub-windows
 * so that the intersection test stays simple (both same-day arithmetic).
 */
export function validateNoOverlap(
  candidate: ShiftRow,
  existingShifts: ShiftRow[]
): boolean {
  // Expand a shift into (day, startMin, endMin) tuples, handling overnight wrapping
  function expand(shift: ShiftRow): Array<{ day: number; start: number; end: number }> {
    const start = timeToMinutes(shift.start_time)
    const end = timeToMinutes(shift.end_time)
    const result: Array<{ day: number; start: number; end: number }> = []

    for (const day of shift.days_of_week) {
      if (start < end) {
        // Same-day: [start, end)
        result.push({ day, start, end })
      } else {
        // Overnight: first half [start, 1440) on 'day', second half [0, end) on next day
        result.push({ day, start, end: 1440 })
        const nextDay = (day + 1) % 7
        result.push({ day: nextDay, start: 0, end })
      }
    }
    return result
  }

  const candidateWindows = expand(candidate)

  for (const existing of existingShifts) {
    if (!existing.active) continue
    const existingWindows = expand(existing)

    for (const cw of candidateWindows) {
      for (const ew of existingWindows) {
        if (cw.day !== ew.day) continue
        // Overlap: [cw.start, cw.end) intersects [ew.start, ew.end)
        if (cw.start < ew.end && ew.start < cw.end) {
          return false // overlap found
        }
      }
    }
  }

  return true // no overlap
}
