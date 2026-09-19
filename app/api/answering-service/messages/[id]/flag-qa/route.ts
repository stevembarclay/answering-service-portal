import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { flagQA } from '@/lib/services/answering-service/messageService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
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
    await flagQA(id, context.businessId, context.userId)

    return NextResponse.json({ data: { success: true } })
  } catch (error: unknown) {
    logger.error('POST /api/answering-service/messages/[id]/flag-qa failed', { error })
    return NextResponse.json(
      {
        error: {
          message: sanitizeErrorMessage(error),
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}
