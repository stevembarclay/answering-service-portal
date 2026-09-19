/**
 * Smoke tests for POST /api/v1/calls.
 * Full integration tests would require a real Supabase instance;
 * these verify auth guard behaviour using mocks.
 */
import { POST } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/api/bearerAuth', () => ({
  validateBearerToken: jest.fn(),
}))
jest.mock('@/lib/auth/server', () => ({
  getOperatorContext: jest.fn(),
}))

const mockEq = jest.fn(() => ({ data: [], error: null }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('@/lib/services/operator/callIngestService', () => ({
  ingestCalls: jest.fn(() => []),
  parseCsvCallRows: jest.fn(() => []),
}))

const { validateBearerToken } = require('@/lib/api/bearerAuth') as { validateBearerToken: jest.Mock }
const { getOperatorContext } = require('@/lib/auth/server') as { getOperatorContext: jest.Mock }

function makeRequest(body: unknown, contentType = 'application/json', authHeader?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': contentType }
  if (authHeader) headers['authorization'] = authHeader
  return new NextRequest('http://localhost/api/v1/calls', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/calls', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no auth provided', async () => {
    validateBearerToken.mockResolvedValue({ valid: false, status: 401, message: 'Missing auth' })
    getOperatorContext.mockResolvedValue(null)
    const res = await POST(makeRequest([]))
    expect(res.status).toBe(401)
  })

  it('returns 403 when bearer token lacks calls:write scope', async () => {
    validateBearerToken.mockResolvedValue({ valid: false, status: 403, message: 'API key missing required scope: calls:write.' })
    const res = await POST(makeRequest([], 'application/json', 'Bearer bad-token'))
    expect(res.status).toBe(403)
  })

  it('returns 400 when body is not an array', async () => {
    validateBearerToken.mockResolvedValue({ valid: false, status: 401, message: 'no auth' })
    getOperatorContext.mockResolvedValue({ operatorOrgId: 'org-1', role: 'admin', userId: 'user-1' })
    mockEq.mockReturnValue({ data: [], error: null })
    const res = await POST(makeRequest({ not: 'an array' }))
    expect(res.status).toBe(400)
  })
})
