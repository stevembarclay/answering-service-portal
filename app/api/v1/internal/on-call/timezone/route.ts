import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { setBusinessTimezone } from '@/lib/services/answering-service/onCallService'

export async function POST(request: NextRequest) {
  const context = await getBusinessContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { timezone } = await request.json()
  if (!timezone) return NextResponse.json({ error: 'timezone required' }, { status: 400 })

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
  } catch {
    return NextResponse.json({ error: 'Invalid timezone identifier' }, { status: 400 })
  }

  await setBusinessTimezone(context.businessId, timezone)
  return NextResponse.json({ ok: true })
}
