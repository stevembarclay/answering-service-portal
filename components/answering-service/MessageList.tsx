'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { MessageSquareMore } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageCard } from '@/components/answering-service/MessageCard'
import { cardVariants } from '@/lib/design/card-system'
import { bodyStyles } from '@/lib/design/typography-system'
import type { BusinessMessageStatus, CallLog } from '@/types/answeringService'

interface MessageListProps {
  messages: CallLog[]
  statuses: BusinessMessageStatus[]
  onSelectMessage: (id: string) => void
  onFlagged: (id: string) => Promise<void>
  onStatusChanged?: (messageId: string, status: BusinessMessageStatus | null) => void
}

export function MessageList({
  messages,
  statuses,
  onSelectMessage,
  onFlagged,
  onStatusChanged,
}: MessageListProps) {
  const [expandedEarlier, setExpandedEarlier] = useState(false)
  const [flaggingIds, setFlaggingIds] = useState<string[]>([])

  const newMessages = messages.filter((message) => message.isNew)
  const earlierMessages = messages.filter((message) => !message.isNew)

  async function handleFlag(id: string) {
    setFlaggingIds((current) => [...current, id])
    try {
      await onFlagged(id)
    } finally {
      setFlaggingIds((current) => current.filter((item) => item !== id))
    }
  }

  if (messages.length === 0) {
    return (
      <div className={`${cardVariants.static} flex flex-col items-center gap-3 p-8 text-center`}>
        <MessageSquareMore className="h-8 w-8 text-slate-400" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">No messages yet</p>
          <p className={`${bodyStyles.small} text-slate-500`}>
            Messages from your answering service will appear here.
          </p>
        </div>
      </div>
    )
  }

  const latestEarlier = earlierMessages[0]?.timestamp

  return (
    <div className="space-y-6">
      {newMessages.length > 0 ? (
        <section className="space-y-3" aria-label="Since last visit">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <p className={`${bodyStyles.micro} text-slate-500`}>Since last visit</p>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-3">
            {newMessages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                statuses={statuses}
                onFlagQA={handleFlag}
                onView={onSelectMessage}
                isFlaggingQA={flaggingIds.includes(message.id)}
                onStatusChanged={onStatusChanged}
              />
            ))}
          </div>
        </section>
      ) : null}

      {earlierMessages.length > 0 ? (
        <section className="space-y-3" aria-label="Earlier">
          {!expandedEarlier ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between rounded-xl border border-slate-200 bg-white px-4 py-6 text-left"
              onClick={() => setExpandedEarlier(true)}
            >
              <span className={`${bodyStyles.small} text-slate-600`}>
                {earlierMessages.length} previous message{earlierMessages.length === 1 ? '' : 's'}
                {latestEarlier ? ` · Last: ${format(new Date(latestEarlier), 'EEEE h:mma')}` : ''}
              </span>
              <span aria-hidden="true">▾</span>
            </Button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <p className={`${bodyStyles.micro} text-slate-500`}>Earlier</p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="space-y-3">
                {earlierMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    statuses={statuses}
                    onFlagQA={handleFlag}
                    onView={onSelectMessage}
                    isFlaggingQA={flaggingIds.includes(message.id)}
                    onStatusChanged={onStatusChanged}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
