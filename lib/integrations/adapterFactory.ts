// StarTel and Amtelco native adapters are available in the managed platform.
import { createServiceRoleClient } from '@/lib/supabase/service'

import { ApiPushAdapter } from './apiPushAdapter'
import type { ICallSourceAdapter, IntegrationConfig } from './types'

interface OperatorSettingsRow {
  settings: unknown
}

export async function getAdapterForOperator(
  operatorOrgId: string
): Promise<ICallSourceAdapter> {
  // StarTel and Amtelco native adapters are available in the managed platform.
  // Community edition always uses the API push path.
  return new ApiPushAdapter(operatorOrgId)
}

export async function getIntegrationConfigForOperator(
  operatorOrgId: string
): Promise<IntegrationConfig> {
  const serviceRole = createServiceRoleClient()
  const { data } = await serviceRole
    .from('operator_orgs')
    .select('settings')
    .eq('id', operatorOrgId)
    .maybeSingle()

  return extractIntegrationConfig(data)
}

function extractIntegrationConfig(row: OperatorSettingsRow | null): IntegrationConfig {
  if (!row || !isRecord(row.settings)) {
    return {}
  }

  const rawConfig = row.settings.integration_config
  if (!isRecord(rawConfig)) {
    return {}
  }

  const config: IntegrationConfig = {}

  if (typeof rawConfig.data_freshness_alert_hours === 'number') {
    config.data_freshness_alert_hours = rawConfig.data_freshness_alert_hours
  }

  return config
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
