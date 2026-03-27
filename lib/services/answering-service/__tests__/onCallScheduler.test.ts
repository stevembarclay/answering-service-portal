import {
  resolveActiveShift,
  validateNoOverlap,
  type ShiftRow,
  type ContactRow,
} from '../onCallScheduler'

// Test timezone: America/New_York
// UTC-5 in winter (EST), UTC-4 in DST (EDT)
// March 2026 is DST → UTC-4

function makeContact(id: string): ContactRow {
  return { id, name: `Contact ${id}`, phone: '555-0100', role: 'Physician', notes: null }
}

function makeShift(overrides: Partial<ShiftRow>): ShiftRow {
  return {
    id: 'shift-1',
    name: 'Test Shift',
    days_of_week: [1, 2, 3, 4, 5], // Mon–Fri
    start_time: '09:00:00',
    end_time: '17:00:00',
    escalation_steps: [{ contactId: 'c1', waitMinutes: 5 }, { contactId: 'c2', waitMinutes: null }],
    active: true,
    ...overrides,
  }
}

const contacts = new Map([
  ['c1', makeContact('c1')],
  ['c2', makeContact('c2')],
])

describe('resolveActiveShift', () => {
  describe('same-day shift', () => {
    const shift = makeShift({})

    it('returns null when no shifts', () => {
      const now = new Date('2026-03-10T14:00:00Z') // Tuesday 10:00 EST
      expect(resolveActiveShift(now, 'America/New_York', [], contacts)).toBeNull()
    })

    it('matches a weekday within the shift window', () => {
      // Tuesday 2026-03-10 14:00 UTC = 10:00 EST (UTC-4 in March DST)
      const now = new Date('2026-03-10T14:00:00Z')
      const result = resolveActiveShift(now, 'America/New_York', [shift], contacts)
      expect(result).not.toBeNull()
      expect(result!.shiftId).toBe('shift-1')
      expect(result!.shiftName).toBe('Test Shift')
      expect(result!.escalationSteps).toHaveLength(2)
      expect(result!.escalationSteps[0].name).toBe('Contact c1')
      expect(result!.escalationSteps[0].waitMinutes).toBe(5)
      expect(result!.escalationSteps[1].waitMinutes).toBeNull()
    })

    it('does not match before start time', () => {
      // Tuesday 2026-03-10 12:00 UTC = 08:00 EST — before 09:00
      const now = new Date('2026-03-10T12:00:00Z')
      expect(resolveActiveShift(now, 'America/New_York', [shift], contacts)).toBeNull()
    })

    it('does not match at or after end time', () => {
      // Tuesday 2026-03-10 21:00 UTC = 17:00 EST — exactly at end (exclusive)
      const now = new Date('2026-03-10T21:00:00Z')
      expect(resolveActiveShift(now, 'America/New_York', [shift], contacts)).toBeNull()
    })

    it('does not match on a weekend', () => {
      // Saturday 2026-03-14 14:00 UTC = 10:00 EST
      const now = new Date('2026-03-14T14:00:00Z')
      expect(resolveActiveShift(now, 'America/New_York', [shift], contacts)).toBeNull()
    })

    it('returns correct shiftEndsAt for same-day shift', () => {
      // Tuesday 2026-03-10 14:00 UTC = 10:00 EST → shift ends 17:00 EST = 21:00 UTC
      const now = new Date('2026-03-10T14:00:00Z')
      const result = resolveActiveShift(now, 'America/New_York', [shift], contacts)
      expect(result!.shiftEndsAt.toISOString()).toBe('2026-03-10T21:00:00.000Z')
    })

    it('ignores inactive shifts', () => {
      const inactive = makeShift({ active: false })
      const now = new Date('2026-03-10T14:00:00Z')
      expect(resolveActiveShift(now, 'America/New_York', [inactive], contacts)).toBeNull()
    })
  })

  describe('overnight shift', () => {
    // Shift: Mon–Fri 22:00–06:00 (overnight)
    const overnightShift = makeShift({
      id: 'overnight-1',
      name: 'Overnight Coverage',
      days_of_week: [1, 2, 3, 4, 5],
      start_time: '22:00:00',
      end_time: '06:00:00',
    })

    it('matches in the first half (after 22:00 on the listed day)', () => {
      // Monday 2026-03-09 23:00 EST = 03:00 UTC Tuesday
      const now = new Date('2026-03-10T03:00:00Z') // 23:00 EST Monday
      const result = resolveActiveShift(now, 'America/New_York', [overnightShift], contacts)
      expect(result).not.toBeNull()
      expect(result!.shiftId).toBe('overnight-1')
    })

    it('matches in the second half (before 06:00 on the carry-over day)', () => {
      // Tuesday 2026-03-10 02:00 EST = 06:00 UTC Tuesday
      const now = new Date('2026-03-10T06:00:00Z') // 02:00 EST Tuesday
      const result = resolveActiveShift(now, 'America/New_York', [overnightShift], contacts)
      expect(result).not.toBeNull()
      expect(result!.shiftId).toBe('overnight-1')
    })

    it('does not match during the gap (06:00–22:00)', () => {
      // Tuesday 2026-03-10 14:00 EST = 18:00 UTC Tuesday
      const now = new Date('2026-03-10T18:00:00Z') // 14:00 EST Tuesday — gap
      expect(resolveActiveShift(now, 'America/New_York', [overnightShift], contacts)).toBeNull()
    })

    it('does not match Saturday carry-over when Friday not in days_of_week', () => {
      // shift days=[1,2,3,4,5] (Mon-Fri). Saturday 03:00 EST would be a carry-over from Friday.
      // Friday IS in [1,2,3,4,5] → should match.
      // But Sunday 03:00 EST is carry-over from Saturday which is NOT in days → no match.
      const now = new Date('2026-03-15T07:00:00Z') // Sunday 03:00 EST
      expect(resolveActiveShift(now, 'America/New_York', [overnightShift], contacts)).toBeNull()
    })

    it('shiftEndsAt is tomorrow-at-end for first-half match', () => {
      // Monday 23:00 EST (first half) → ends Tuesday 06:00 EST = 10:00 UTC
      const now = new Date('2026-03-10T03:00:00Z') // 23:00 EST Monday (UTC is next day)
      const result = resolveActiveShift(now, 'America/New_York', [overnightShift], contacts)
      expect(result!.shiftEndsAt.toISOString()).toBe('2026-03-10T10:00:00.000Z') // Tuesday 06:00 EST = 10:00 UTC
    })

    it('shiftEndsAt is today-at-end for second-half match', () => {
      // Tuesday 02:00 EST (second half) → ends Tuesday 06:00 EST = 10:00 UTC
      const now = new Date('2026-03-10T06:00:00Z') // 02:00 EST Tuesday
      const result = resolveActiveShift(now, 'America/New_York', [overnightShift], contacts)
      expect(result!.shiftEndsAt.toISOString()).toBe('2026-03-10T10:00:00.000Z')
    })
  })

  describe('Tokyo timezone (UTC+9)', () => {
    const tokyoShift = makeShift({
      days_of_week: [1], // Monday only
      start_time: '09:00:00',
      end_time: '17:00:00',
    })

    it('matches Monday Tokyo time correctly', () => {
      // Monday 2026-03-09 02:00 UTC = Monday 11:00 Tokyo
      const now = new Date('2026-03-09T02:00:00Z')
      const result = resolveActiveShift(now, 'Asia/Tokyo', [tokyoShift], contacts)
      expect(result).not.toBeNull()
    })

    it('shiftEndsAt is correct for Tokyo UTC+9', () => {
      // Monday 11:00 Tokyo → ends Monday 17:00 Tokyo = 08:00 UTC
      const now = new Date('2026-03-09T02:00:00Z')
      const result = resolveActiveShift(now, 'Asia/Tokyo', [tokyoShift], contacts)
      expect(result!.shiftEndsAt.toISOString()).toBe('2026-03-09T08:00:00.000Z')
    })
  })
})

describe('validateNoOverlap', () => {
  it('returns true when no existing shifts', () => {
    const shift = makeShift({})
    expect(validateNoOverlap(shift, [])).toBe(true)
  })

  it('returns false when same-day shifts overlap', () => {
    const a = makeShift({ id: 'a', days_of_week: [1], start_time: '08:00:00', end_time: '14:00:00' })
    const b = makeShift({ id: 'b', days_of_week: [1], start_time: '13:00:00', end_time: '18:00:00' })
    expect(validateNoOverlap(b, [a])).toBe(false)
  })

  it('returns true when same-day shifts are adjacent (no gap required)', () => {
    const a = makeShift({ id: 'a', days_of_week: [1], start_time: '08:00:00', end_time: '14:00:00' })
    const b = makeShift({ id: 'b', days_of_week: [1], start_time: '14:00:00', end_time: '18:00:00' })
    expect(validateNoOverlap(b, [a])).toBe(true) // [8,14) and [14,18) do not overlap
  })

  it('returns true when shifts cover different days', () => {
    const a = makeShift({ id: 'a', days_of_week: [1], start_time: '09:00:00', end_time: '17:00:00' })
    const b = makeShift({ id: 'b', days_of_week: [2], start_time: '09:00:00', end_time: '17:00:00' })
    expect(validateNoOverlap(b, [a])).toBe(true)
  })

  it('returns false when overnight shift overlaps with next-day shift', () => {
    // Overnight Mon–Fri 22:00–06:00 carries into next day 00:00–06:00
    const overnight = makeShift({
      id: 'on',
      days_of_week: [1],
      start_time: '22:00:00',
      end_time: '06:00:00',
    })
    // Tuesday 04:00–08:00 — overlaps with overnight carry-over [0,360) on Tuesday
    const early = makeShift({
      id: 'early',
      days_of_week: [2],
      start_time: '04:00:00',
      end_time: '08:00:00',
    })
    expect(validateNoOverlap(early, [overnight])).toBe(false)
  })

  it('returns true when inactive existing shifts are ignored', () => {
    const a = makeShift({ id: 'a', days_of_week: [1], start_time: '09:00:00', end_time: '17:00:00', active: false })
    const b = makeShift({ id: 'b', days_of_week: [1], start_time: '10:00:00', end_time: '16:00:00' })
    expect(validateNoOverlap(b, [a])).toBe(true) // a is inactive
  })
})
