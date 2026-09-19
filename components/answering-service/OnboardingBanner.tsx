'use client'
import { useState } from 'react'
import { X, Clock, Calendar, CheckCircle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
type BannerStatus = 'pending_build' | 'in_review' | 'ready' | 'call_scheduled'
interface OnboardingBannerProps {
  status: BannerStatus
  submittedAt?: string
  callDate?: string
  onDismiss?: () => void
}
export function OnboardingBanner({ status, submittedAt, callDate, onDismiss }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || status === 'ready') return null
  const handleDismiss = () => {
    setDismissed(true)
    onDismiss?.()
  }
  const content = {
    pending_build: {
      icon: Clock,
      title: 'Your account is being configured',
      description: `Your setup was submitted${submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString()}` : ''}. You'll receive an email when your account is ready to use.`,
    },
    in_review: {
      icon: Clock,
      title: 'Your account is being reviewed',
      description: 'An Answering Service team member is reviewing your configuration. Almost there!',
    },
    call_scheduled: {
      icon: Calendar,
      title: 'Review call scheduled',
      description: `Your setup call is scheduled for ${callDate || 'soon'}. We'll walk through everything together.`,
    },
  }[status] || { icon: Clock, title: '', description: '' }
  const Icon = content.icon
  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-blue-600" />
          <div>
            <span className="font-medium text-blue-900">{content.title}</span>
            <span className="text-blue-700 ml-2">{content.description}</span>
            {status === 'pending_build' && (
              <Link href="/answering-service/setup" className="text-blue-600 underline ml-2">
                Schedule a call
              </Link>
            )}
          </div>
        </div>
        <button 
          onClick={handleDismiss} 
          className="text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
