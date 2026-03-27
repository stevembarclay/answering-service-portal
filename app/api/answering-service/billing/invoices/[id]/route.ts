import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { getInvoiceDetail } from '@/lib/services/answering-service/billingService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const context = await getBusinessContext()

    if (!context) {
      return NextResponse.json(
        { error: { message: 'You must be signed in to access this.', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    await checkModuleAccessOrThrow('answering_service')
    const { id } = await params
    const invoice = await getInvoiceDetail(id, context.businessId)

    if (!invoice) {
      return NextResponse.json(
        { error: { message: 'Invoice not found.', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: invoice })
  } catch (error: unknown) {
    logger.error('GET /api/answering-service/billing/invoices/[id] failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
