import { NextResponse } from 'next/server'

import { getAdapterForOperator, getIntegrationConfigForOperator } from '@/lib/integrations/adapterFactory'
import type { IngestSource } from '@/lib/integrations/types'
import { ingestCalls } from '@/lib/services/operator/callIngestService'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { isAuthorizedCronRequest } from '@/lib/utils/cronAuth'
import { logger } from '@/lib/utils/logger'

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRole = createServiceRoleClient()
  const { data: operatorOrgs } = await serviceRole
    .from('operator_orgs')
    .select('id')
    .eq('status', 'active')

  let processed = 0
  let orgsProcessed = 0
  const errors: string[] = []

  for (const org of operatorOrgs ?? []) {
    if (typeof org.id !== 'string') {
      continue
    }

    const config = await getIntegrationConfigForOperator(org.id)
    const hasNativeAdapter = Boolean(config.startel || config.amtelco)
    if (!hasNativeAdapter) {
      continue
    }

    orgsProcessed += 1

    try {
      const adapter = await getAdapterForOperator(org.id)
      const { data: lastCallRows } = await serviceRole
        .from('call_logs')
        .select('timestamp')
        .eq('operator_org_id', org.id)
        .order('timestamp', { ascending: false })
        .limit(1)

      const since = Array.isArray(lastCallRows) && typeof lastCallRows[0]?.timestamp === 'string'
        ? new Date(lastCallRows[0].timestamp)
        : new Date(Date.now() - 24 * 3_600_000)

      const rows = await adapter.fetchNewCalls(since)
      if (rows.length === 0) {
        continue
      }

      // Fetch businesses with external client ID columns for businessId resolution.
      // Pull-based adapters (StarTel, Amtelco) set externalClientId on each record
      // instead of businessId. We resolve via businesses.startel_client_id /
      // amtelco_client_id here. See: ingest-assumption-audit.md §6, option (c).
      const { data: businesses } = await serviceRole
        .from('businesses')
        .select('id, startel_client_id, amtelco_client_id')
        .eq('operator_org_id', org.id)

      const allowedBusinessIds = (businesses ?? [])
        .flatMap((b) => (typeof b.id === 'string' ? [b.id] : []))

      // Build externalClientId → internal UUID map for pull-based adapters.
      const externalClientIdMap = new Map<string, string>()
      for (const b of businesses ?? []) {
        if (typeof b.id !== 'string') continue
        const externalId = adapter.name === 'startel' ? b.startel_client_id
          : adapter.name === 'amtelco' ? b.amtelco_client_id
          : null
        if (typeof externalId === 'string' && externalId) {
          externalClientIdMap.set(externalId, b.id)
        }
      }

      // Resolve externalClientId → businessId for records from pull-based adapters.
      // Records with already-set businessId (push-based) pass through unchanged.
      const resolvedRows = rows.flatMap((row) => {
        if (row.businessId) return [row]
        if (!row.externalClientId) {
          logger.warn('Cron ingest: record missing both businessId and externalClientId', {
            operatorOrgId: org.id,
          })
          return []
        }
        const businessId = externalClientIdMap.get(row.externalClientId)
        if (!businessId) {
          logger.warn('Cron ingest: no business mapped for externalClientId', {
            operatorOrgId: org.id,
            externalClientId: row.externalClientId,
          })
          return []
        }
        return [{ ...row, businessId }]
      })

      const results = await ingestCalls(resolvedRows, org.id, allowedBusinessIds, toIngestSource(adapter.name))
      processed += results.filter((result) => result.status === 'inserted').length
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown ingest error.'
      errors.push(`${org.id}: ${message}`)
      logger.error('Cron ingest failed', { operatorOrgId: org.id, error })
    }
  }

  return NextResponse.json({
    processed,
    orgs: orgsProcessed,
    errors,
  })
}

function toIngestSource(name: 'startel' | 'amtelco' | 'api_push' | 'zapier'): IngestSource {
  if (name === 'startel' || name === 'amtelco' || name === 'zapier') {
    return name
  }

  return 'api'
}
