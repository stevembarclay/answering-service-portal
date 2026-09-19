'use client'
import { cn } from '@/lib/utils/cn'
import { Check } from '@phosphor-icons/react'
interface WizardProgressProps {
  steps: string[]
  currentStep: number
}
export function WizardProgress({ steps, currentStep }: WizardProgressProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep
          const isCurrent = index === currentStep
          const isPending = index > currentStep
          return (
            <div key={index} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    {
                      'bg-slate-600 border-slate-600 text-white': isCompleted,
                      'bg-slate-600 border-slate-600 text-white ring-4 ring-slate-400/20': isCurrent,
                      'border-slate-300 text-slate-400 bg-transparent': isPending,
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn('mt-2 text-xs text-center max-w-[100px]', {
                    'text-slate-700 font-medium': isCurrent,
                    'text-slate-400': isPending || isCompleted,
                  })}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn('h-0.5 flex-1 mx-2 transition-colors', {
                    'bg-slate-400': isCompleted,
                    'bg-slate-200': !isCompleted,
                  })}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
