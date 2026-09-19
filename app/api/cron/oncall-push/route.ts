import { NextResponse } from 'next/server'

import { pushAllConfiguredBusinesses } from '@/lib/services/answering-service/onCallPushService'
import { isAuthorizedCronRequest } from '@/lib/utils/cronAuth'
import { logger } from '@/lib/utils/logger'

/**
 * Cron: push current on-call assignments to StarTel CMC / Amtelco IS.
 *
 * Runs every 30 minutes as a safety net — corrects any assignments missed
 * by the immediate post-save push (e.g. failed network call, deploy gap).
 *
 * Only fires for businesses that have a startel_client_id or
 * amtelco_client_id configured. Skips businesses with no active shift.
 *
 * Both adapter implementations are currently stubs pending API documentation
 * from StarTel and Amtelco. The cron is intentionally wired up now so that
 * filling in the adapter is the only step required to go live.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await pushAllConfiguredBusinesses()

    logger.info('cron/oncall-push complete', result)

    return NextResponse.json(result)
  } catch (error) {
    logger.error('cron/oncall-push failed', { error })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
