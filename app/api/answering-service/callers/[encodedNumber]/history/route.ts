import { NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { getCallerHistory } from '@/lib/services/answering-service/callerHistoryService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ encodedNumber: string }> }
) {
  try {
    const context = await getBusinessContext()

    if (!context) {
      return NextResponse.json(
        { error: { message: 'You must be signed in to access this.', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    await checkModuleAccessOrThrow('answering_service')

    const { encodedNumber } = await params
    const callerNumber = Buffer.from(encodedNumber, 'base64').toString('utf-8')

    if (!callerNumber) {
      return NextResponse.json(
        { error: { message: 'Invalid caller number.', code: 'BAD_REQUEST' } },
        { status: 400 }
      )
    }

    const history = await getCallerHistory(context.businessId, callerNumber)

    if (!history) {
      return NextResponse.json(
        { error: { message: 'No history found.', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: history })
  } catch (error: unknown) {
    logger.error('GET /api/answering-service/callers/[encodedNumber]/history failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
