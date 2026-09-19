'use client'

import { MessageRow } from '@/components/answering-service/MessageRow'
import type { BusinessMessageStatus, CallLog } from '@/types/answeringService'

interface MessageListProps {
  messages: CallLog[]
  statuses: BusinessMessageStatus[]
  selectedMessageId?: string | null
  onSelectMessage: (id: string) => void
  onMessageHandled?: (id: string) => void
}

export function MessageList({
  messages,
  statuses,
  selectedMessageId,
  onSelectMessage,
  onMessageHandled,
}: MessageListProps) {
  return (
    <div>
      {messages.map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          statuses={statuses}
          isSelected={selectedMessageId === message.id}
          onSelect={onSelectMessage}
          onHandled={onMessageHandled}
        />
      ))}
    </div>
  )
}
