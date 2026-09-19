import { NextRequest, NextResponse } from 'next/server'
import { getOperatorContext } from '@/lib/auth/server'
import { batchClosePeriods } from '@/lib/services/operator/monthCloseService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { createModuleLogger } from '@/lib/utils/logger'

const logger = createModuleLogger('monthCloseRoute')

const MAX_BATCH_SIZE = 200

/**
 * POST /api/operator/month-close/batch-close
 *
 * Batch-closes a list of billing period IDs.
 * Already-closed periods are treated as idempotent successes.
 * Errors are collected per-period — a failure on one doesn't abort the others.
 *
 * Body:
 *   { periodIds: string[] }   — required, max 200
 *
 * Response 200:
 *   { succeeded: string[], failed: Array<{ id: string, error: string }> }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await getOperatorContext()
  if (!ctx) {
    return NextResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { message: 'Request body must be valid JSON.' } },
      { status: 400 }
    )
  }

  const { periodIds } = body as { periodIds?: unknown }

  if (!Array.isArray(periodIds) || periodIds.length === 0) {
    return NextResponse.json(
      { error: { message: 'periodIds must be a non-empty array.' } },
      { status: 400 }
    )
  }

  if (!periodIds.every((id): id is string => typeof id === 'string')) {
    return NextResponse.json(
      { error: { message: 'All entries in periodIds must be strings.' } },
      { status: 400 }
    )
  }

  if (periodIds.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: { message: `Batch size must not exceed ${MAX_BATCH_SIZE} periods.` } },
      { status: 400 }
    )
  }

  try {
    const result = await batchClosePeriods(periodIds, ctx.operatorOrgId, ctx.userId)
    return NextResponse.json(result)
  } catch (err) {
    logger.error({ err, operatorOrgId: ctx.operatorOrgId }, 'POST /month-close/batch-close failed')
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    )
  }
}
