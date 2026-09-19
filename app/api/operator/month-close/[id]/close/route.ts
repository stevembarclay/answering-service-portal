import { NextRequest, NextResponse } from 'next/server'
import { getOperatorContext } from '@/lib/auth/server'
import { closePeriod } from '@/lib/services/operator/monthCloseService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { createModuleLogger } from '@/lib/utils/logger'

const logger = createModuleLogger('monthCloseRoute')

/**
 * POST /api/operator/month-close/[id]/close
 *
 * Closes a single billing period:
 * - Verifies operator ownership
 * - Recomputes total from billing rules + usage (no trusting the stored estimate)
 * - Persists adjustment_cents / adjustment_note / closed_by / closed_at
 *
 * Body (all optional):
 *   { adjustmentCents?: number, adjustmentNote?: string }
 *
 * Responses:
 *   200  MonthCloseRow  — successfully closed
 *   404                 — period not found / not owned by this operator
 *   409                 — period already closed or paid
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const ctx = await getOperatorContext()
  if (!ctx) {
    return NextResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 })
  }

  const { id: periodId } = await params

  // Parse optional body — an empty body is acceptable.
  let adjustmentCents = 0
  let adjustmentNote: string | undefined
  try {
    const body = await req.json() as Record<string, unknown>
    if (typeof body.adjustmentCents === 'number') {
      adjustmentCents = Math.trunc(body.adjustmentCents)
    }
    if (typeof body.adjustmentNote === 'string' && body.adjustmentNote.trim()) {
      adjustmentNote = body.adjustmentNote.trim()
    }
  } catch {
    // Empty body or non-JSON — use defaults
  }

  try {
    const row = await closePeriod(periodId, ctx.operatorOrgId, {
      adjustmentCents,
      adjustmentNote,
      closedByUserId: ctx.userId,
    })
    return NextResponse.json(row)
  } catch (err) {
    const code = (err as Error & { code?: string }).code
    if (code === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { message: 'Billing period not found or not accessible.' } },
        { status: 404 }
      )
    }
    if (code === 'ALREADY_CLOSED') {
      return NextResponse.json(
        { error: { message: 'Billing period is already closed.' } },
        { status: 409 }
      )
    }
    logger.error({ err, periodId, operatorOrgId: ctx.operatorOrgId }, 'POST /month-close/[id]/close failed')
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    )
  }
}
