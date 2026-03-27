import { getOperatorContext } from '@/lib/auth/server'

const mockCreateClient = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient(),
}))

afterEach(() => jest.resetAllMocks())

describe('getOperatorContext', () => {
  it('returns null when unauthenticated (no session user)', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    })
    expect(await getOperatorContext()).toBeNull()
  })

  it('returns null when authenticated but has no operator_users row', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    })
    expect(await getOperatorContext()).toBeNull()
  })

  it('returns context with correct role — no fallback default applied', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { operator_org_id: 'org-1', role: 'admin' },
          error: null,
        }),
      }),
    })
    const ctx = await getOperatorContext()
    expect(ctx).not.toBeNull()
    expect(ctx!.role).toBe('admin')
    expect(ctx!.operatorOrgId).toBe('org-1')
  })

  it('returns null for an unrecognized role value (defensive — no fallback to "member")', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { operator_org_id: 'org-1', role: 'superadmin' },
          error: null,
        }),
      }),
    })
    expect(await getOperatorContext()).toBeNull()
  })
})
