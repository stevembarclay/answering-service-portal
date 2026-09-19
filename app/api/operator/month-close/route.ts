import { NextRequest, NextResponse } from 'next/server'
import { getOperatorContext } from '@/lib/auth/server'
import { getMonthClose } from '@/lib/services/operator/monthCloseService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { createModuleLogger } from '@/lib/utils/logger'

const logger = createModuleLogger('monthCloseRoute')

/**
 * GET /api/operator/month-close?month=YYYY-MM
 *
 * Returns all billing period rows for the operator's clients in the given calendar
 * month, with live estimates for open periods and stored totals for closed/paid ones.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const ctx = await getOperatorContext()
  if (!ctx) {
    return NextResponse.json({ error: { message: 'Unauthorized.' } }, { status: 401 })
  }

  const month = req.nextUrl.searchParams.get('month')
  if (!month) {
    return NextResponse.json(
      { error: { message: 'month query parameter is required (YYYY-MM).' } },
      { status: 400 }
    )
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: { message: 'month must be in YYYY-MM format.' } },
      { status: 400 }
    )
  }

  // Basic sanity-check: reject months outside a plausible business range.
  const [year, monthNum] = month.split('-').map(Number)
  if (monthNum < 1 || monthNum > 12 || year < 2020 || year > 2100) {
    return NextResponse.json(
      { error: { message: 'month value is out of range.' } },
      { status: 400 }
    )
  }

  try {
    const data = await getMonthClose(ctx.operatorOrgId, month)
    return NextResponse.json(data)
  } catch (err) {
    logger.error({ err, operatorOrgId: ctx.operatorOrgId, month }, 'GET /month-close failed')
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(err) } },
      { status: 500 }
    )
  }
}
