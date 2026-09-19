import { NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { getPastInvoices } from '@/lib/services/answering-service/billingService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'

export async function GET() {
  try {
    const context = await getBusinessContext()

    if (!context) {
      return NextResponse.json(
        { error: { message: 'You must be signed in to access this.', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    await checkModuleAccessOrThrow('answering_service')
    const invoices = await getPastInvoices(context.businessId)
    return NextResponse.json({ data: invoices })
  } catch (error: unknown) {
    logger.error('GET /api/answering-service/billing/invoices failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
