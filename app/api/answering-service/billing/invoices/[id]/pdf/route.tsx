import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { getInvoiceDetail } from '@/lib/services/answering-service/billingService'
import { createClient } from '@/lib/supabase/server'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'

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

    // Fetch business name
    const supabase = await createClient()
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', context.businessId)
      .single()

    const businessName = (business?.name as string | undefined) ?? 'Your Business'
    const periodLabel = new Date(invoice.periodStart).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })

    // SAFETY: @react-pdf/renderer's renderToBuffer types require DocumentProps at the root,
    // but InvoicePDF renders a Document internally. The cast is safe because the function
    // only needs a renderable React element, not a specific element type.
    const element = <InvoicePDF invoice={invoice} businessName={businessName} />
    const pdfBuffer = await renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Invoice-${periodLabel.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (error: unknown) {
    logger.error('GET /api/answering-service/billing/invoices/[id]/pdf failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
