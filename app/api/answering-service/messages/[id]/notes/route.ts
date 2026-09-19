import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import {
  getNotesForMessage,
  addNote,
} from '@/lib/services/answering-service/messageNoteService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const AddNoteSchema = z.object({
  body: z.string().min(1).max(5000),
})

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
    const notes = await getNotesForMessage(id, context.businessId)
    return NextResponse.json({ data: notes })
  } catch (error: unknown) {
    logger.error('GET /api/answering-service/messages/[id]/notes failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
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
    const parsed = AddNoteSchema.safeParse(body)

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
    const note = await addNote(id, context.businessId, context.userId, parsed.data.body)
    return NextResponse.json({ data: note }, { status: 201 })
  } catch (error: unknown) {
    logger.error('POST /api/answering-service/messages/[id]/notes failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
