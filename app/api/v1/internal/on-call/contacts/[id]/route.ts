import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { updateContact, deleteContact, listContacts } from '@/lib/services/answering-service/onCallService'
import { pushCurrentOnCall } from '@/lib/services/answering-service/onCallPushService'
import { logger } from '@/lib/utils/logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getBusinessContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  if (body.name !== undefined && (!body.name?.trim() || body.name.length > 100)) {
    return NextResponse.json({ error: 'name must be ≤ 100 characters' }, { status: 400 })
  }
  if (body.phone !== undefined && (!body.phone?.trim() || body.phone.length > 50)) {
    return NextResponse.json({ error: 'phone must be ≤ 50 characters' }, { status: 400 })
  }

  await updateContact(id, context.businessId, body)

  // Fire-and-forget: push updated on-call assignment to platform adapter.
  pushCurrentOnCall(context.businessId).catch((err) =>
    logger.error('on-call push failed after contact update', { businessId: context.businessId, error: err })
  )

  // Re-fetch the updated contact so the client can update its local state
  const contacts = await listContacts(context.businessId)
  const updated = contacts.find((c) => c.id === id) ?? null
  return NextResponse.json({ data: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getBusinessContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await deleteContact(id, context.businessId)

  // Fire-and-forget: push updated on-call state after contact deletion.
  pushCurrentOnCall(context.businessId).catch((err) =>
    logger.error('on-call push failed after contact delete', { businessId: context.businessId, error: err })
  )

  return NextResponse.json({ ok: true })
}
