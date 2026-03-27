import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { createShift, listShifts } from '@/lib/services/answering-service/onCallService'
import { validateNoOverlap } from '@/lib/services/answering-service/onCallScheduler'

const TIME_RE = /^\d{2}:\d{2}$/

function validateShiftBody(body: Record<string, unknown>): string | null {
  if (!body.name || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 100) {
    return 'name is required and must be ≤ 100 characters'
  }
  if (
    !Array.isArray(body.daysOfWeek) ||
    body.daysOfWeek.length === 0 ||
    body.daysOfWeek.some((d) => !Number.isInteger(d) || d < 0 || d > 6)
  ) {
    return 'daysOfWeek must be a non-empty array of integers 0–6'
  }
  if (typeof body.startTime !== 'string' || !TIME_RE.test(body.startTime)) {
    return 'startTime must be in HH:MM format'
  }
  if (typeof body.endTime !== 'string' || !TIME_RE.test(body.endTime)) {
    return 'endTime must be in HH:MM format'
  }
  if (!Array.isArray(body.escalationSteps) || body.escalationSteps.length === 0) {
    return 'escalationSteps must be a non-empty array'
  }
  for (const step of body.escalationSteps as Array<Record<string, unknown>>) {
    if (typeof step.contactId !== 'string' || !step.contactId.trim()) {
      return 'each escalationStep must have a non-empty contactId'
    }
    if (step.waitMinutes !== null && step.waitMinutes !== undefined) {
      if (!Number.isInteger(step.waitMinutes) || (step.waitMinutes as number) < 1) {
        return 'waitMinutes must be a positive integer or null'
      }
    }
  }
  return null
}

export async function POST(request: NextRequest) {
  const context = await getBusinessContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const validationError = validateShiftBody(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // Overlap validation: load existing active shifts
  const existing = await listShifts(context.businessId)
  const activeShifts = existing.filter((s) => s.active)
  const candidate = {
    id: 'new',
    name: body.name,
    days_of_week: body.daysOfWeek,
    start_time: body.startTime,
    end_time: body.endTime,
    escalation_steps: body.escalationSteps ?? [],
    active: true,
  }
  const schedulerShifts = activeShifts.map((s) => ({
    id: s.id, name: s.name, days_of_week: s.daysOfWeek,
    start_time: s.startTime, end_time: s.endTime,
    escalation_steps: s.escalationSteps, active: true,
  }))
  if (!validateNoOverlap(candidate, schedulerShifts)) {
    return NextResponse.json(
      { error: 'This shift overlaps with an existing active shift.' },
      { status: 422 }
    )
  }

  const shift = await createShift({ ...body, businessId: context.businessId })
  return NextResponse.json({ data: shift })
}
