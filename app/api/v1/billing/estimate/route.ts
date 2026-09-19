import { NextRequest, NextResponse } from 'next/server'

import { validateBearerToken } from '@/lib/api/bearerAuth'
import { rateLimitAsync, createRateLimitResponse } from '@/lib/middleware/rateLimit'
import { getCurrentEstimate } from '@/lib/services/answering-service/billingService'
import { createClient } from '@/lib/supabase/server'
import { sanitizeErrorMessage } from '@/lib/utils/errorSanitizer'

export async function GET(request: NextRequest) {
  const auth = await validateBearerToken(
    request.headers.get('authorization'),
    'billing:read',
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
  )
  if (!auth.valid) {
    return NextResponse.json({ error: { message: auth.message, code: 'UNAUTHORIZED' } }, { status: auth.status })
  }

  const rateLimitResult = await rateLimitAsync(auth.keyId)
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult)
  }

  try {
    const businessId = auth.businessId ?? new URL(request.url).searchParams.get('business_id')
    if (!businessId) {
      return NextResponse.json(
        { error: { message: 'business_id required for operator keys', code: 'BAD_REQUEST' } },
        { status: 400 }
      )
    }

    if (auth.operatorOrgId) {
      const supabase = await createClient()
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

    const estimate = await getCurrentEstimate(businessId)
    return NextResponse.json({ data: estimate })
  } catch (error) {
    return NextResponse.json({ error: { message: sanitizeErrorMessage(error), code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
