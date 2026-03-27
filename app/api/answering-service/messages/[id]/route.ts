import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import { markRead, getMessage, updatePriority } from '@/lib/services/answering-service/messageService'
import { PatchMessageSchema } from '@/schemas/answeringServiceMessages'
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
    const message = await getMessage(id, context.businessId, context.userId)

    if (!message) {
      return NextResponse.json(
        { error: { message: 'Message not found.', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: message })
  } catch (error: unknown) {
    logger.error('GET /api/answering-service/messages/[id] failed', { error })
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
    const parsed = PatchMessageSchema.safeParse(body)

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

    if (parsed.data.priority) {
      await updatePriority(id, context.businessId, context.userId, parsed.data.priority)
    }

    if (parsed.data.portalStatus === 'read') {
      await markRead(id, context.businessId)
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error: unknown) {
    logger.error('PATCH /api/answering-service/messages/[id] failed', { error })
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
