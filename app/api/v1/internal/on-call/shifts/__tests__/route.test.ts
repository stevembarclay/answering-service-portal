jest.mock('@/lib/auth/server', () => ({
  getBusinessContext: jest.fn(),
}))
jest.mock('@/lib/services/answering-service/onCallService', () => ({
  createShift: jest.fn(),
  listShifts: jest.fn(),
}))
jest.mock('@/lib/services/answering-service/onCallScheduler', () => ({
  validateNoOverlap: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { getBusinessContext } from '@/lib/auth/server'
import { createShift, listShifts } from '@/lib/services/answering-service/onCallService'
import { validateNoOverlap } from '@/lib/services/answering-service/onCallScheduler'

const mockContext = getBusinessContext as jest.Mock
const mockListShifts = listShifts as jest.Mock
const mockCreateShift = createShift as jest.Mock
const mockValidateNoOverlap = validateNoOverlap as jest.Mock

const VALID_BODY = {
  name: 'Weeknight',
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: '17:00',
  endTime: '09:00',
  escalationSteps: [{ contactId: 'contact-1', waitMinutes: null }],
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/internal/on-call/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/internal/on-call/shifts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockContext.mockResolvedValue({ businessId: 'biz-1' })
    mockListShifts.mockResolvedValue([])
    mockValidateNoOverlap.mockReturnValue(true)
    mockCreateShift.mockResolvedValue({ id: 'shift-1', ...VALID_BODY, active: true, createdAt: '' })
  })

  it('returns 401 when not authenticated', async () => {
    mockContext.mockResolvedValue(null)
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid daysOfWeek (out of range)', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, daysOfWeek: [0, 7] }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/daysOfWeek/)
  })

  it('returns 400 for malformed startTime', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, startTime: '9:00' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/startTime/)
  })

  it('returns 400 for empty escalationSteps', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, escalationSteps: [] }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/escalationSteps/)
  })

  it('returns 422 when new shift overlaps an existing active shift', async () => {
    mockValidateNoOverlap.mockReturnValue(false)
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/overlaps/)
  })

  it('creates and returns the shift when valid and no overlap', async () => {
    const res = await POST(makeRequest(VALID_BODY))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.id).toBe('shift-1')
  })
})
