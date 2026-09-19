import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import {
  updateNote,
  deleteNote,
} from '@/lib/services/answering-service/messageNoteService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string; noteId: string }>
}

const PatchNoteSchema = z.object({
  body: z.string().min(1).max(5000),
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

    const reqBody: unknown = await request.json()
    const parsed = PatchNoteSchema.safeParse(reqBody)

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

    const { noteId } = await params
    // userId scoping is enforced in the service layer (and by RLS)
    const note = await updateNote(noteId, context.userId, parsed.data.body)
    return NextResponse.json({ data: note })
  } catch (error: unknown) {
    logger.error('PATCH /api/answering-service/messages/[id]/notes/[noteId] failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const context = await getBusinessContext()

    if (!context) {
      return NextResponse.json(
        { error: { message: 'You must be signed in to access this.', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    await checkModuleAccessOrThrow('answering_service')

    const { noteId } = await params
    // userId scoping is enforced in the service layer (and by RLS)
    await deleteNote(noteId, context.userId)
    return NextResponse.json({ data: { success: true } })
  } catch (error: unknown) {
    logger.error('DELETE /api/answering-service/messages/[id]/notes/[noteId] failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
