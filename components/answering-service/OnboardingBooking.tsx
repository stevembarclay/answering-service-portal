'use client'

import { useEffect } from 'react'
import Cal, { getCalApi } from '@calcom/embed-react'
import { logger } from '@/lib/utils/logger'

interface OnboardingBookingProps {
  businessId: string
  onBookingComplete?: () => void
}

export function OnboardingBooking({ businessId, onBookingComplete }: OnboardingBookingProps) {
  useEffect(() => {
    let isMounted = true

    ;(async () => {
      try {
        // Wait for Cal.com API to be ready
        const cal = await getCalApi()

        if (!isMounted) return

        // Configure Cal.com UI
        cal('ui', {
          theme: 'light',
          hideEventTypeDetails: false,
        })

        // Listen for booking success events using Cal.com API
        // Register this BEFORE the Cal component renders to catch events
        if (onBookingComplete) {
          try {
            cal('on', {
              action: 'bookingSuccessful',
              callback: () => {
                if (!isMounted) return
                logger.info('[OnboardingBooking] Booking successful')
                onBookingComplete()
              },
            })
          } catch (error: unknown) {
            logger.error('[OnboardingBooking] Failed to register booking event listener:', error)
          }
        }
      } catch (error: unknown) {
        logger.error('[OnboardingBooking] Error initializing Cal.com embed:', error)
      }
    })()

    return () => {
      isMounted = false
    }
  }, [onBookingComplete])

  // Use React Cal component which handles iframe creation internally
  // This avoids the "iframe doesn't exist" error by letting Cal component manage its own DOM
  return (
    <Cal
      calLink={process.env.NEXT_PUBLIC_CAL_LINK ?? 'your-username/onboarding'}
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
      config={{
        layout: 'month_view',
        metadata: {
          business_id: businessId,
          source: 'wizard_concierge',
        },
      }}
    />
  )
}

