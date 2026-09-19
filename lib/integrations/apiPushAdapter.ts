import type { RawCallInput } from '@/lib/services/operator/callIngestService'

import type { AdapterTestResult, ICallSourceAdapter } from './types'

export class ApiPushAdapter implements ICallSourceAdapter {
  readonly name = 'api_push' as const

  constructor(readonly operatorOrgId: string) {}

  async fetchNewCalls(_since: Date): Promise<RawCallInput[]> {
    return []
  }

  async testConnection(): Promise<AdapterTestResult> {
    return { ok: true, message: 'Push-based: data arrives via API/Zapier.' }
  }

  configSummary(): string {
    return 'Receiving calls via POST /api/v1/calls'
  }
}
