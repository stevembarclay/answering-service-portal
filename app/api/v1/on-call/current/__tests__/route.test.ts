jest.mock('@/lib/api/bearerAuth', () => ({
  validateBearerToken: jest.fn(),
}))
jest.mock('@/lib/services/answering-service/onCallService', () => ({
  getBusinessTimezone: jest.fn(),
  loadSchedulerData: jest.fn(),
}))
jest.mock('@/lib/services/answering-service/onCallScheduler', () => ({
  resolveActiveShift: jest.fn(),
}))
jest.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: jest.fn(),
}))

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { validateBearerToken } from '@/lib/api/bearerAuth'
import { getBusinessTimezone, loadSchedulerData } from '@/lib/services/answering-service/onCallService'
import { resolveActiveShift } from '@/lib/services/answering-service/onCallScheduler'
import { createServiceRoleClient } from '@/lib/supabase/service'

const mockValidate = validateBearerToken as jest.Mock
const mockTimezone = getBusinessTimezone as jest.Mock
const mockLoad = loadSchedulerData as jest.Mock
const mockResolve = resolveActiveShift as jest.Mock
const mockServiceRole = createServiceRoleClient as jest.Mock

function makeRequest(businessId?: string) {
  const url = businessId
    ? `http://localhost/api/v1/on-call/current?business_id=${businessId}`
    : 'http://localhost/api/v1/on-call/current'
  return new NextRequest(url, {
    headers: { authorization: 'Bearer test-key' },
  })
}

function makeMockSupabase(businessRow: { id: string } | null) {
  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: businessRow }),
    }),
  }
}

describe('GET /api/v1/on-call/current', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when auth fails', async () => {
    mockValidate.mockResolvedValue({ valid: false, status: 401, message: 'Invalid API key.' })
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 400 when business_id missing for operator key', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      keyId: 'k1',
      businessId: null,
      operatorOrgId: 'org-1',
      scopes: ['on_call:read'],
    })
    const res = await GET(makeRequest()) // no business_id param
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('BAD_REQUEST')
  })

  it('returns current on-call status when shift is active', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      keyId: 'k1',
      businessId: 'biz-1',
      operatorOrgId: null,
      scopes: ['on_call:read'],
    })
    mockTimezone.mockResolvedValue('America/New_York')
    mockLoad.mockResolvedValue({ shifts: [], contacts: new Map() })
    mockResolve.mockReturnValue({
      shiftId: 'shift-1',
      shiftName: 'Weeknight',
      shiftEndsAt: new Date('2026-03-10T10:00:00Z'),
      escalationSteps: [
        { step: 1, name: 'Dr. Smith', phone: '555-0100', role: 'Physician', notes: null, waitMinutes: 5 },
      ],
    })

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.shiftId).toBe('shift-1')
    expect(body.data.shiftName).toBe('Weeknight')
    expect(body.data.escalationSteps).toHaveLength(1)
    expect(body.data.shiftEndsAt).toBe('2026-03-10T10:00:00.000Z')
    expect(body.data.businessId).toBe('biz-1')
  })

  it('returns empty escalation when no shift is active', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      keyId: 'k1',
      businessId: 'biz-1',
      operatorOrgId: null,
      scopes: ['on_call:read'],
    })
    mockTimezone.mockResolvedValue('America/New_York')
    mockLoad.mockResolvedValue({ shifts: [], contacts: new Map() })
    mockResolve.mockReturnValue(null)

    const res = await GET(makeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.shiftId).toBeNull()
    expect(body.data.shiftEndsAt).toBeNull()
    expect(body.data.escalationSteps).toEqual([])
  })

  it('returns 404 when operator key business_id does not belong to their org', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      keyId: 'k1',
      businessId: null,
      operatorOrgId: 'org-1',
      scopes: ['on_call:read'],
    })
    // DB says business doesn't exist in this org
    mockServiceRole.mockReturnValue(makeMockSupabase(null))

    const res = await GET(makeRequest('biz-other-org'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('allows operator key when business_id belongs to their org', async () => {
    mockValidate.mockResolvedValue({
      valid: true,
      keyId: 'k1',
      businessId: null,
      operatorOrgId: 'org-1',
      scopes: ['on_call:read'],
    })
    mockServiceRole.mockReturnValue(makeMockSupabase({ id: 'biz-1' }))
    mockTimezone.mockResolvedValue('America/New_York')
    mockLoad.mockResolvedValue({ shifts: [], contacts: new Map() })
    mockResolve.mockReturnValue(null)

    const res = await GET(makeRequest('biz-1'))
    expect(res.status).toBe(200)
  })
})
