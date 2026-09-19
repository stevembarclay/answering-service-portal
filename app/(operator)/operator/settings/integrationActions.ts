'use server'

import { revalidatePath } from 'next/cache'

import { checkOperatorAccessOrThrow } from '@/lib/auth/server'
import { getAdapterForOperator, getIntegrationConfigForOperator } from '@/lib/integrations/adapterFactory'
import { saveIntegrationConfig } from '@/lib/services/operator/operatorService'

export type IntegrationConfigState = { success?: boolean; error?: string } | null
export type TestConnectionState = { ok?: boolean; message?: string; latencyMs?: number; error?: string } | null

type IntegrationPlatform = 'startel' | 'amtelco' | 'none'

export async function saveIntegrationConfigAction(
  _prevState: IntegrationConfigState,
  formData: FormData
): Promise<IntegrationConfigState> {
  const context = await checkOperatorAccessOrThrow()
  const platform = readPlatform(formData.get('platform'))
  const baseUrl = readTrimmedString(formData, 'base_url')
  const apiKey = readTrimmedString(formData, 'api_key')
  const username = readTrimmedString(formData, 'username')
  const password = readTrimmedString(formData, 'password')
  const freshnessHours = readOptionalInteger(formData, 'data_freshness_alert_hours')

  if (platform !== 'none' && !baseUrl) {
    return { error: 'Base URL is required.' }
  }

  if (baseUrl && !isValidHttpUrl(baseUrl)) {
    return { error: 'Base URL must be a valid http:// or https:// URL.' }
  }

  if (freshnessHours !== null && freshnessHours < 0) {
    return { error: 'Freshness alert hours must be 0 or greater.' }
  }

  const currentConfig = await getIntegrationConfigForOperator(context.operatorOrgId)

  if (platform === 'startel' && !apiKey && !currentConfig.startel?.api_key) {
    return { error: 'API key is required for StarTel.' }
  }

  if (platform === 'amtelco') {
    if (!username && !currentConfig.amtelco?.username) {
      return { error: 'Username is required for Amtelco.' }
    }
    if (!password && !currentConfig.amtelco?.password) {
      return { error: 'Password is required for Amtelco.' }
    }
  }

  const nextIntegrationConfig: Record<string, unknown> = {
    data_freshness_alert_hours: freshnessHours ?? currentConfig.data_freshness_alert_hours ?? 24,
  }

  if (platform === 'startel' && baseUrl) {
    nextIntegrationConfig.startel = {
      base_url: baseUrl,
      // SECURITY: plaintext in JSONB; Phase 5 adds app-level encryption.
      api_key: apiKey || currentConfig.startel?.api_key || '',
      poll_interval_minutes: currentConfig.startel?.poll_interval_minutes ?? 5,
    }
  }

  if (platform === 'amtelco' && baseUrl) {
    nextIntegrationConfig.amtelco = {
      base_url: baseUrl,
      username: username || currentConfig.amtelco?.username || '',
      // SECURITY: plaintext in JSONB; Phase 5 adds app-level encryption.
      password: password || currentConfig.amtelco?.password || '',
      poll_interval_minutes: currentConfig.amtelco?.poll_interval_minutes ?? 5,
    }
  }

  try {
    await saveIntegrationConfig(context.operatorOrgId, nextIntegrationConfig)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save.'
    return { error: message }
  }

  revalidatePath('/operator/settings')
  revalidatePath('/operator/integrations')

  return { success: true }
}

export async function testConnectionAction(
  _prevState: TestConnectionState,
  _formData: FormData
): Promise<TestConnectionState> {
  const context = await checkOperatorAccessOrThrow()
  const adapter = await getAdapterForOperator(context.operatorOrgId)
  const result = await adapter.testConnection()

  return {
    ok: result.ok,
    message: result.message,
    latencyMs: result.latencyMs,
  }
}

function readPlatform(value: FormDataEntryValue | null): IntegrationPlatform {
  if (value === 'startel' || value === 'amtelco' || value === 'none') {
    return value
  }
  return 'none'
}

function readTrimmedString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function readOptionalInteger(formData: FormData, key: string): number | null {
  const value = readTrimmedString(formData, key)
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? -1 : parsed
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

