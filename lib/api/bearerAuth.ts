import { createHash, randomBytes } from 'crypto'

import { createClient } from '@/lib/supabase/server'

export interface AuthResult {
  valid: true
  keyId: string
  businessId: string | null
  operatorOrgId: string | null
  scopes: string[]
}

export interface AuthFailure {
  valid: false
  status: 401 | 403
  message: string
}

export type BearerAuthResult = AuthResult | AuthFailure

type ApiKeyRow = {
  id: string
  business_id: string | null
  operator_org_id: string | null
  scopes: unknown
  allowed_ips: unknown
  revoked_at: string | null
  expires_at: string | null
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}

export function generateRawApiKey(): string {
  return randomBytes(32).toString('hex')
}

export function checkScope(scopes: string[], required: string): boolean {
  return scopes.includes(required)
}

export function checkIpAllowlist(ips: string[] | null, ip: string): boolean {
  if (!ips || ips.length === 0) return true

  return ips.some((cidr) => ipMatchesCidr(ip, cidr))
}

function ipMatchesCidr(ip: string, cidr: string): boolean {
  const [range, prefixPart] = cidr.split('/')
  const prefix = prefixPart === undefined ? 32 : Number.parseInt(prefixPart, 10)

  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return false
  }

  const ipNum = ipToNum(ip)
  const rangeNum = ipToNum(range)

  if (ipNum === null || rangeNum === null) {
    return false
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip: string): number | null {
  const parts = ip.split('.').map((part) => Number.parseInt(part, 10))

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null
  }

  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0
}

export async function validateBearerToken(
  authHeader: string | null,
  requiredScope: string,
  clientIp: string
): Promise<BearerAuthResult> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, status: 401, message: 'Missing or invalid Authorization header.' }
  }

  const rawKey = authHeader.slice(7).trim()
  if (!rawKey) {
    return { valid: false, status: 401, message: 'Empty API key.' }
  }

  const supabase = await createClient()
  const keyHash = hashApiKey(rawKey)

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, business_id, operator_org_id, scopes, allowed_ips, revoked_at, expires_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  const keyRow = data as ApiKeyRow | null

  if (error || !keyRow) {
    return { valid: false, status: 401, message: 'Invalid API key.' }
  }

  if (keyRow.revoked_at) {
    return { valid: false, status: 401, message: 'API key has been revoked.' }
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at).getTime() <= Date.now()) {
    return { valid: false, status: 401, message: 'API key has expired.' }
  }

  const scopes = Array.isArray(keyRow.scopes) ? keyRow.scopes.filter((scope): scope is string => typeof scope === 'string') : []
  const allowedIps = Array.isArray(keyRow.allowed_ips)
    ? keyRow.allowed_ips.filter((allowedIp): allowedIp is string => typeof allowedIp === 'string')
    : null

  if (!checkIpAllowlist(allowedIps, clientIp)) {
    return { valid: false, status: 403, message: 'Request IP is not in the API key allowlist.' }
  }

  if (!checkScope(scopes, requiredScope)) {
    return { valid: false, status: 403, message: `API key missing required scope: ${requiredScope}.` }
  }

  void Promise.resolve(
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id)
  ).catch(() => undefined)

  return {
    valid: true,
    keyId: keyRow.id,
    businessId: keyRow.business_id,
    operatorOrgId: keyRow.operator_org_id,
    scopes,
  }
}
