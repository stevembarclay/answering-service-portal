import { NextRequest, NextResponse } from 'next/server'
import { getBusinessContext } from '@/lib/auth/server'
import { createContact } from '@/lib/services/answering-service/onCallService'

export async function POST(request: NextRequest) {
  const context = await getBusinessContext()
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  if (!body.name?.trim() || body.name.length > 100) {
    return NextResponse.json({ error: 'name is required and must be ≤ 100 characters' }, { status: 400 })
  }
  if (!body.phone?.trim() || body.phone.length > 50) {
    return NextResponse.json({ error: 'phone is required and must be ≤ 50 characters' }, { status: 400 })
  }

  const contact = await createContact({ ...body, businessId: context.businessId })
  return NextResponse.json({ data: contact })
}
