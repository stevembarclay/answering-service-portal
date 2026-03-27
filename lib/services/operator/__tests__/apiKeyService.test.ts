jest.mock('@/lib/api/bearerAuth', () => ({
  generateRawApiKey: jest.fn(() => 'raw-key-abc'),
  hashApiKey: jest.fn(() => 'hashed-key-abc'),
}))
jest.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: jest.fn(),
}))

import { createApiKey } from '../apiKeyService'
import { createServiceRoleClient } from '@/lib/supabase/service'

const mockServiceRole = createServiceRoleClient as jest.Mock

function makeMockSupabase() {
  const chain = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { id: 'key-id-1' }, error: null }),
  }
  return { from: jest.fn().mockReturnValue(chain) }
}

const BASE_INPUT = {
  label: 'Test key',
  scopes: ['calls:read'],
  createdBy: 'user-1',
}

describe('createApiKey scope guards', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rejects on_call:read scope on business-scoped keys', async () => {
    await expect(
      createApiKey({ ...BASE_INPUT, scopes: ['on_call:read'], businessId: 'biz-1' })
    ).rejects.toThrow('on_call:read scope cannot be issued to a business-scoped API key.')
  })

  it('rejects usage:write scope on business-scoped keys', async () => {
    await expect(
      createApiKey({ ...BASE_INPUT, scopes: ['usage:write'], businessId: 'biz-1' })
    ).rejects.toThrow('usage:write scope cannot be issued to a business-scoped API key.')
  })

  it('allows on_call:read scope on operator-org-scoped keys', async () => {
    mockServiceRole.mockReturnValue(makeMockSupabase())
    const result = await createApiKey({
      ...BASE_INPUT,
      scopes: ['calls:read', 'on_call:read'],
      operatorOrgId: 'org-1',
    })
    expect(result.keyId).toBe('key-id-1')
  })

  it('allows standard scopes on business-scoped keys', async () => {
    mockServiceRole.mockReturnValue(makeMockSupabase())
    const result = await createApiKey({
      ...BASE_INPUT,
      scopes: ['calls:read', 'billing:read'],
      businessId: 'biz-1',
    })
    expect(result.keyId).toBe('key-id-1')
  })
})
