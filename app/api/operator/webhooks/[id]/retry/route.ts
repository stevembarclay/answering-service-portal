import { NextResponse } from 'next/server'

import { getOperatorContext } from '@/lib/auth/server'
import { retryWebhookDelivery } from '@/lib/services/operator/webhookService'

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const operatorContext = await getOperatorContext()
  if (!operatorContext || operatorContext.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await context.params
  await retryWebhookDelivery(id, operatorContext.operatorOrgId)
  return NextResponse.json({ ok: true })
}
