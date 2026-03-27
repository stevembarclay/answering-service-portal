'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'
import { toast } from 'sonner'
import { MessageDetail } from '@/components/answering-service/MessageDetail'
import { MessageList } from '@/components/answering-service/MessageList'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { useUnreadMessages } from '@/lib/context/unread-messages-context'
import type { BusinessMessageStatus, BusinessUser, CallLog } from '@/types/answeringService'

async function parseJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as { data?: T; error?: { message?: string } }

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Request failed.')
  }

  return payload.data
}

async function parseListResponse<T>(
  response: Response
): Promise<{ data: T; meta?: { page?: number; hasMore?: boolean } }> {
  const payload = (await response.json()) as {
    data?: T
    meta?: { page?: number; hasMore?: boolean }
    error?: { message?: string }
  }

  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message ?? 'Request failed.')
  }

  return { data: payload.data, meta: payload.meta }
}

type TabId = 'all' | 'unread' | 'priority'

function MessageListSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-3 h-16 px-5">
          <Skeleton className="h-2 w-2 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

interface MessagesClientProps {
  businessId: string
  currentUserId: string
}

export default function MessagesClient({ businessId, currentUserId }: MessagesClientProps) {
  const [messages, setMessages] = useState<CallLog[]>([])
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<CallLog | null>(null)
  const [statuses, setStatuses] = useState<BusinessMessageStatus[]>([])
  const [businessUsers, setBusinessUsers] = useState<BusinessUser[]>([])
  const [isListLoading, setIsListLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('all')
  const [search, setSearch] = useState('')
  const [hasNewRealtime, setHasNewRealtime] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const { markUnread } = useUnreadMessages()
  const searchParams = useSearchParams()
  const didAutoOpen = useRef(false)

  async function loadMessages(page: number) {
    if (page === 1) {
      setIsListLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    setError(null)

    try {
      const { data, meta } = await parseListResponse<CallLog[]>(
        await fetch(`/api/answering-service/messages?page=${page}`, { cache: 'no-store' })
      )

      setMessages((current) => (page === 1 ? data : [...current, ...data]))
      setCurrentPage(meta?.page ?? page)
      setHasMore(meta?.hasMore ?? false)
    } catch (fetchError) {
      if (page === 1) {
        setMessages([])
        setCurrentPage(1)
        setHasMore(false)
      }
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load messages.')
    } finally {
      if (page === 1) {
        setIsListLoading(false)
      } else {
        setIsLoadingMore(false)
      }
    }
  }

  async function loadStatuses() {
    try {
      const data = await parseJson<BusinessMessageStatus[]>(
        await fetch('/api/answering-service/statuses', { cache: 'no-store' })
      )
      setStatuses(data)
    } catch {
      // Non-fatal — status picker will be empty but UX still works
    }
  }

  async function loadBusinessUsers() {
    try {
      const data = await parseJson<BusinessUser[]>(
        await fetch('/api/answering-service/team', { cache: 'no-store' })
      )
      setBusinessUsers(data)
    } catch {
      // Non-fatal — assign picker will be empty but UX still works
    }
  }

  async function loadMessage(id: string) {
    setSelectedMessageId(id)
    setHasNewRealtime(false)
    setIsDetailLoading(true)
    setError(null)

    try {
      const data = await parseJson<CallLog>(
        await fetch(`/api/answering-service/messages/${id}`, { cache: 'no-store' })
      )
      setSelectedMessage(data)
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : 'Failed to load message details.'
      )
    } finally {
      setIsDetailLoading(false)
    }
  }

  useEffect(() => {
    void Promise.all([loadMessages(1), loadStatuses(), loadBusinessUsers()])
    const id = searchParams.get('id')
    if (id && !didAutoOpen.current) {
      didAutoOpen.current = true
      void loadMessage(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Supabase Realtime — requires postgres_changes enabled on call_logs
  // in Supabase dashboard (Realtime → Tables → call_logs)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages_calls_${businessId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_logs',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          const newMsg: CallLog = {
            id: row.id as string,
            businessId: row.business_id as string,
            timestamp: row.timestamp as string,
            callerName: row.caller_name as string | undefined,
            callerNumber: row.caller_number as string | undefined,
            callbackNumber: row.callback_number as string | undefined,
            callType: row.call_type as string,
            direction: row.direction as CallLog['direction'],
            durationSeconds: row.duration_seconds as number,
            telephonyStatus: row.telephony_status as CallLog['telephonyStatus'],
            message: row.message as string,
            priority: row.priority as CallLog['priority'],
            portalStatus: row.portal_status as CallLog['portalStatus'],
            actions: [],
            isNew: true,
            notes: [],
          }
          setMessages((prev) => [newMsg, ...prev])
          setCurrentPage((prev) => Math.max(prev, 1))
          setHasNewRealtime(true)
          if (row.priority === 'high') {
            markUnread()
            toast('New urgent message', {
              description: newMsg.callerName ?? newMsg.callerNumber ?? 'Unknown caller',
            })
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [businessId, markUnread])

  const unreadCount = messages.filter((m) => m.portalStatus === 'new').length

  const filteredMessages = messages.filter((m) => {
    if (tab === 'unread' && m.portalStatus !== 'new') return false
    if (tab === 'priority' && m.priority !== 'high') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.message.toLowerCase().includes(q) ||
        (m.callerNumber ?? '').toLowerCase().includes(q) ||
        (m.callerName ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const tabs: { id: TabId; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'priority', label: 'Priority' },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-8">
        {selectedMessageId ? (
          <button
            type="button"
            onClick={async () => {
              setSelectedMessageId(null)
              setSelectedMessage(null)
              await loadMessages(1)
            }}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to messages
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Messages</h1>
            {hasNewRealtime ? (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                New
              </span>
            ) : null}
          </div>
        )}

        {!selectedMessageId ? (
          <div className="flex h-9 w-[200px] sm:w-[280px] items-center gap-2 rounded-lg bg-muted px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {error ? (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-5 py-4">
            <p className="text-sm text-rose-700">{error}</p>
            <button
              type="button"
              onClick={() => void loadMessages(1)}
              className="ml-4 text-sm font-medium text-rose-700 underline"
            >
              Try again
            </button>
          </div>
        ) : null}

        {selectedMessageId ? (
          isDetailLoading || !selectedMessage ? (
            <MessageListSkeleton />
          ) : (
            <MessageDetail
              message={selectedMessage}
              statuses={statuses}
              businessUsers={businessUsers}
              currentUserId={currentUserId}
              onRefresh={async () => {
                await Promise.all([loadMessages(1), loadMessage(selectedMessage.id)])
              }}
            />
          )
        ) : (
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-border pr-4">
                <div className="flex">
                  {tabs.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setTab(id)
                        setHasNewRealtime(false)
                      }}
                      className={`flex h-10 items-center px-4 text-[13px] transition-colors ${
                        tab === id
                          ? 'border-b-2 border-primary font-semibold text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {/* Priority dot legend */}
                <div className="hidden sm:flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                    High
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                    Medium
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
                    Low
                  </span>
                </div>
              </div>

              {/* Priority tab explanation */}
              {tab === 'priority' ? (
                <div className="border-b border-border bg-muted/30 px-4 py-2">
                  <p className="text-[12px] text-muted-foreground">
                    High-priority calls are flagged automatically by your answering service based on call type.
                  </p>
                </div>
              ) : null}

              {/* Message list */}
              {isListLoading ? (
                <MessageListSkeleton />
              ) : filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-foreground">
                    No messages found
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try adjusting your search or filter.
                  </p>
                </div>
              ) : (
                <MessageList
                  messages={filteredMessages}
                  statuses={statuses}
                  onSelectMessage={(id) => {
                    void loadMessage(id)
                  }}
                  onFlagged={async (id) => {
                    setMessages((current) =>
                      current.map((message) =>
                        message.id === id
                          ? { ...message, portalStatus: 'flagged_qa' }
                          : message
                        )
                    )

                    try {
                      const response = await fetch(
                        `/api/answering-service/messages/${id}/flag-qa`,
                        { method: 'POST' }
                      )

                      if (!response.ok) {
                        throw new Error('Failed to flag message.')
                      }
                    } catch {
                      setMessages((current) =>
                        current.map((message) =>
                          message.id === id
                            ? { ...message, portalStatus: 'new' }
                            : message
                        )
                      )
                      throw new Error('Failed to flag message.')
                    }
                  }}
                  onStatusChanged={(id, status) => {
                    setMessages((current) =>
                      current.map((m) =>
                        m.id === id
                          ? { ...m, workflowStatusId: status?.id ?? null, workflowStatus: status }
                          : m
                      )
                    )
                  }}
                />
              )}
            </div>
            {hasMore && !isListLoading ? (
              <button
                type="button"
                onClick={() => void loadMessages(currentPage + 1)}
                disabled={isLoadingMore}
                className="w-full rounded-xl border border-border bg-card py-3 text-sm text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                {isLoadingMore ? 'Loading older messages…' : 'Load older messages'}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
