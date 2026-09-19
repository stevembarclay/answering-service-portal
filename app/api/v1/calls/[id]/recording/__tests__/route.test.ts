import { POST } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/api/bearerAuth', () => ({ validateBearerToken: jest.fn() }))
jest.mock('@/lib/auth/server', () => ({ getOperatorContext: jest.fn() }))

const mockFrom = jest.fn((table: string): any => {
  if (table === 'call_logs') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => ({
            data: { id: 'call-1', business_id: 'biz-1' },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) })),
    }
  }
  if (table === 'businesses') {
    return {
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(() => ({ data: { id: 'biz-1' }, error: null })),
          })),
        })),
      })),
    }
  }
  return {
    update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) })),
  }
})

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => ({ error: null })),
      })),
    },
  })),
}))

jest.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => ({ error: null })),
      })),
    },
  })),
}))

const { validateBearerToken } = require('@/lib/api/bearerAuth') as { validateBearerToken: jest.Mock }
const { getOperatorContext } = require('@/lib/auth/server') as { getOperatorContext: jest.Mock }

describe('POST /api/v1/calls/[id]/recording', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when no auth provided', async () => {
    validateBearerToken.mockResolvedValue({ valid: false, status: 401, message: 'Missing auth' })
    getOperatorContext.mockResolvedValue(null)

    const formData = new FormData()
    formData.append('file', new Blob(['audio'], { type: 'audio/mpeg' }), 'test.mp3')
    const req = new NextRequest('http://localhost/api/v1/calls/call-1/recording', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'call-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when call not found in org', async () => {
    validateBearerToken.mockResolvedValue({ valid: false, status: 401, message: 'no auth' })
    getOperatorContext.mockResolvedValue({ operatorOrgId: 'org-1', role: 'admin', userId: 'u-1' })

    // Override mockFrom so call_logs returns null (call not found)
    mockFrom.mockImplementation((table: string): any => {
      if (table === 'call_logs') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => ({ data: null, error: null })),
            })),
          })),
        }
      }
      return {
        update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) })),
      }
    })

    const formData = new FormData()
    formData.append('file', new Blob(['audio'], { type: 'audio/mpeg' }), 'test.mp3')
    const req = new NextRequest('http://localhost/api/v1/calls/call-1/recording', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'call-1' }) })
    expect(res.status).toBe(404)
  })

  it('returns 403 when call exists but business does not belong to org', async () => {
    validateBearerToken.mockResolvedValue({ valid: false, status: 401, message: 'no auth' })
    getOperatorContext.mockResolvedValue({ operatorOrgId: 'org-1', role: 'admin', userId: 'u-1' })

    // call_logs returns a call row, but businesses returns null (not in org)
    mockFrom.mockImplementation((table: string): any => {
      if (table === 'call_logs') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => ({
                data: { id: 'call-1', business_id: 'biz-1' },
                error: null,
              })),
            })),
          })),
        }
      }
      if (table === 'businesses') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                maybeSingle: jest.fn(() => ({ data: null, error: null })),
              })),
            })),
          })),
        }
      }
      return {
        update: jest.fn(() => ({ eq: jest.fn(() => ({ eq: jest.fn(() => ({ error: null })) })) })),
      }
    })

    const formData = new FormData()
    formData.append('file', new Blob(['audio'], { type: 'audio/mpeg' }), 'test.mp3')
    const req = new NextRequest('http://localhost/api/v1/calls/call-1/recording', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'call-1' }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('FORBIDDEN')
  })
})
