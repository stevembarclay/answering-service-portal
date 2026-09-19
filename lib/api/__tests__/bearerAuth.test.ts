jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { checkIpAllowlist, checkScope, hashApiKey } from '@/lib/api/bearerAuth'

describe('hashApiKey', () => {
  it('produces consistent SHA-256 hash', () => {
    const hash = hashApiKey('test-key')

    expect(hash).toBe(hashApiKey('test-key'))
    expect(hash).toHaveLength(64)
    expect(hash).not.toBe('test-key')
  })
})

describe('checkScope', () => {
  it('passes when required scope is present', () => {
    expect(checkScope(['calls:read', 'billing:read'], 'calls:read')).toBe(true)
  })

  it('fails when required scope is absent', () => {
    expect(checkScope(['billing:read'], 'calls:read')).toBe(false)
  })

  it('passes for usage:write on operator key', () => {
    expect(checkScope(['usage:write', 'calls:read'], 'usage:write')).toBe(true)
  })
})

describe('checkIpAllowlist', () => {
  it('passes when allowedIps is null (unrestricted)', () => {
    expect(checkIpAllowlist(null, '1.2.3.4')).toBe(true)
  })

  it('passes when IP exactly matches', () => {
    expect(checkIpAllowlist(['192.168.1.1/32'], '192.168.1.1')).toBe(true)
  })

  it('fails when IP not in allowlist', () => {
    expect(checkIpAllowlist(['10.0.0.0/8'], '192.168.1.1')).toBe(false)
  })
})
