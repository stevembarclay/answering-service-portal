import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { assignMessage } from '@/lib/services/answering-service/messageStatusService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const AssignSchema = z.object({
  assignToUserId: z.string().uuid().nullable(),
})

export async function PATCH(request: NextRequest, { params }: RouteContext) {
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
    const parsed = AssignSchema.safeParse(body)

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

    const { id } = await params
    await assignMessage(id, context.businessId, context.userId, parsed.data.assignToUserId)
    return NextResponse.json({ data: { success: true } })
  } catch (error: unknown) {
    logger.error('PATCH /api/answering-service/messages/[id]/assign failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
