import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import {
  getStatusesForBusiness,
  createStatus,
} from '@/lib/services/answering-service/messageStatusService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

const CreateStatusSchema = z.object({
  label: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6'),
  isOpen: z.boolean(),
})

export async function GET(_request: NextRequest) {
  try {
    const context = await getBusinessContext()

    if (!context) {
      return NextResponse.json(
        { error: { message: 'You must be signed in to access this.', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    await checkModuleAccessOrThrow('answering_service')

    const statuses = await getStatusesForBusiness(context.businessId)
    return NextResponse.json({ data: statuses })
  } catch (error: unknown) {
    logger.error('GET /api/answering-service/statuses failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getBusinessContext()

    if (!context) {
      return NextResponse.json(
        { error: { message: 'You must be signed in to access this.', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    await checkModuleAccessOrThrow('answering_service')

    const body: unknown = await request.json()
    const parsed = CreateStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            message: parsed.error.issues[0]?.message ?? 'Invalid request.',
            code: 'VALIDATION_ERROR',
          },
        },
        { status: 400 }
      )
    }

    const status = await createStatus(context.businessId, parsed.data)
    return NextResponse.json({ data: status }, { status: 201 })
  } catch (error: unknown) {
    logger.error('POST /api/answering-service/statuses failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
