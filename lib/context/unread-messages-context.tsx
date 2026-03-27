'use client'
import { createContext, useContext, useState } from 'react'
import type React from 'react'

interface UnreadCtx {
  hasUnread: boolean
  markUnread: () => void
}

const UnreadContext = createContext<UnreadCtx>({
  hasUnread: false,
  markUnread: () => {},
})

export function UnreadMessagesProvider({
  children,
  initialHasUnread,
}: {
  children: React.ReactNode
  initialHasUnread: boolean
}) {
  const [hasUnread, setHasUnread] = useState(initialHasUnread)
  return (
    <UnreadContext.Provider value={{ hasUnread, markUnread: () => setHasUnread(true) }}>
      {children}
    </UnreadContext.Provider>
  )
}

export const useUnreadMessages = () => useContext(UnreadContext)
