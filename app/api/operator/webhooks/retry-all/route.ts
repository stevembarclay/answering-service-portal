import { NextResponse } from 'next/server'

import { getOperatorContext } from '@/lib/auth/server'
import { processRetryQueue } from '@/lib/services/operator/webhookService'

export async function POST() {
  const context = await getOperatorContext()
  if (!context || context.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await processRetryQueue()
  return NextResponse.json({ ok: true })
}
