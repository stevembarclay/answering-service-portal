'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { MessagePriority } from '@/types/answeringService'

const OPTIONS: Array<{ label: string; value: MessagePriority; background: string }> = [
  { label: 'H', value: 'high', background: '#ef4444' },
  { label: 'M', value: 'medium', background: '#f59e0b' },
  { label: 'L', value: 'low', background: '#94a3b8' },
]

interface PrioritySelectorProps {
  callId: string
  initialPriority: MessagePriority
  onPriorityChange?: (priority: MessagePriority) => void
}

export function PrioritySelector({
  callId,
  initialPriority,
  onPriorityChange,
}: PrioritySelectorProps) {
  const [priority, setPriority] = useState<MessagePriority>(initialPriority)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSelect(nextPriority: MessagePriority) {
    if (nextPriority === priority || isSaving) {
      return
    }

    const previous = priority
    setPriority(nextPriority)
    onPriorityChange?.(nextPriority)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/answering-service/messages/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: nextPriority }),
      })

      if (!response.ok) {
        setPriority(previous)
        onPriorityChange?.(previous)
      }
    } catch {
      setPriority(previous)
      onPriorityChange?.(previous)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white" role="radiogroup" aria-label="Message priority">
      {OPTIONS.map((option) => {
        const isActive = option.value === priority
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={isSaving}
            onClick={() => handleSelect(option.value)}
            className={cn(
              'min-h-[44px] min-w-[44px] px-4 text-sm font-semibold transition-colors',
              !isActive && 'bg-white text-slate-600'
            )}
            style={isActive ? { backgroundColor: option.background, color: '#ffffff' } : undefined}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
