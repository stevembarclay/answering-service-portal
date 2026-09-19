'use client'
import { Info } from '@phosphor-icons/react'
export function DemoModeBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium text-amber-900">Demo Mode</p>
          <p className="text-sm text-amber-700">
            You're viewing sample data. Your real call history, messages, and billing 
            information will appear here once your account is fully configured.
          </p>
        </div>
      </div>
    </div>
  )
}
