export interface AdapterTestResult {
  ok: boolean
  message: string
  latencyMs?: number
}

export type AdapterName = 'startel' | 'amtelco' | 'api_push' | 'zapier'
export type IngestSource = 'api' | 'csv' | 'startel' | 'amtelco' | 'zapier'

export interface IntegrationConfig {
  startel?: {
    base_url: string
    api_key: string
    poll_interval_minutes?: number
  }
  amtelco?: {
    base_url: string
    username: string
    password: string
    poll_interval_minutes?: number
  }
  data_freshness_alert_hours?: number
}

/**
 * Contract for any call source adapter.
 *
 * Push-based adapters (Zapier, direct API): the source calls our /api/v1/calls endpoint.
 * The ApiPushAdapter wraps the existing ingest path and implements this interface for
 * uniformity — callers treat all adapters the same.
 *
 * Pull-based adapters (StarTel native, Amtelco native): we call the source on a schedule.
 * fetchNewCalls() is the primary method; it is called by the cron ingest job.
 */
export interface ICallSourceAdapter {
  readonly name: AdapterName
  readonly operatorOrgId: string

  fetchNewCalls(
    since: Date
  ): Promise<import('@/lib/services/operator/callIngestService').RawCallInput[]>

  testConnection(): Promise<AdapterTestResult>

  configSummary(): string
}
