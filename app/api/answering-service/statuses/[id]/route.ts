import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { checkModuleAccessOrThrow } from '@/lib/middleware/requireModule'
import {
  updateStatus,
  deleteStatus,
} from '@/lib/services/answering-service/messageStatusService'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const PatchStatusSchema = z
  .object({
    label: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #3b82f6')
      .optional(),
    isOpen: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.label !== undefined ||
      d.color !== undefined ||
      d.isOpen !== undefined ||
      d.sortOrder !== undefined,
    { message: 'At least one field must be provided.' }
  )

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
    const parsed = PatchStatusSchema.safeParse(body)

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
    const updated = await updateStatus(id, context.businessId, parsed.data)
    return NextResponse.json({ data: updated })
  } catch (error: unknown) {
    logger.error('PATCH /api/answering-service/statuses/[id] failed', { error })
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

    const { id } = await params
    await deleteStatus(id, context.businessId)
    return NextResponse.json({ data: { success: true } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete status.'
    // Surface user-facing errors (in-use guard, system status guard) as 400
    const isUserError =
      message.includes('cannot be deleted') || message.includes('currently use this status')
    logger.error('DELETE /api/answering-service/statuses/[id] failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'VALIDATION_ERROR' } },
      { status: isUserError ? 400 : 500 }
    )
  }
}
