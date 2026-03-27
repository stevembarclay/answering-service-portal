import { NextRequest, NextResponse } from 'next/server'

import { validateBearerToken } from '@/lib/api/bearerAuth'
import {
  getBusinessTimezone,
  loadSchedulerData,
} from '@/lib/services/answering-service/onCallService'
import { resolveActiveShift } from '@/lib/services/answering-service/onCallScheduler'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const auth = await validateBearerToken(
    request.headers.get('authorization'),
    'on_call:read',
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  )
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.message, code: 'UNAUTHORIZED' } },
      { status: auth.status }
    )
  }

  try {
    const businessId = auth.businessId ?? new URL(request.url).searchParams.get('business_id')
    if (!businessId) {
      return NextResponse.json(
        { error: { message: 'business_id required for operator keys', code: 'BAD_REQUEST' } },
        { status: 400 }
      )
    }

    // Operator keys: verify the business belongs to the key's org
    if (auth.operatorOrgId) {
      const supabase = createServiceRoleClient()
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .eq('operator_org_id', auth.operatorOrgId)
        .maybeSingle()

      if (!business) {
        return NextResponse.json(
          { error: { message: 'Business not found or not in your org.', code: 'NOT_FOUND' } },
          { status: 404 }
        )
      }
    }

    const now = new Date()
    const timezone = (await getBusinessTimezone(businessId)) ?? 'America/New_York'
    const { shifts, contacts } = await loadSchedulerData(businessId)
    const resolved = resolveActiveShift(now, timezone, shifts, contacts)

    return NextResponse.json({
      data: {
        businessId,
        asOf: now.toISOString(),
        shiftId: resolved?.shiftId ?? null,
        shiftName: resolved?.shiftName ?? null,
        shiftEndsAt: resolved?.shiftEndsAt?.toISOString() ?? null,
        escalationSteps: resolved?.escalationSteps ?? [],
      },
    })
  } catch (error) {
    logger.error('GET /api/v1/on-call/current failed', { error })
    return NextResponse.json(
      { error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
