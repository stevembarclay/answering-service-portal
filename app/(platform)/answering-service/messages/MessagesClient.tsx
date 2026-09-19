'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Mail, Phone, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { MessageDetail } from '@/components/answering-service/MessageDetail'
import { MessageList } from '@/components/answering-service/MessageList'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { useUnreadMessages } from '@/lib/context/unread-messages-context'
import { cn } from '@/lib/utils/cn'
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
    <div
      className="flex flex-col divide-y divide-border"
      aria-hidden="true"
    >
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-3 h-16 px-4">
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

function relativeTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(diff / 86400000)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

interface MessageListEmptyStateProps {
  hasAnyMessages: boolean
  search: string
  tab: 'all' | 'unread' | 'priority'
  lastMessageTimestamp?: string
  onClearSearch: () => void
}

function MessageListEmptyState({
  hasAnyMessages,
  search,
  tab,
  lastMessageTimestamp,
  onClearSearch,
}: MessageListEmptyStateProps) {
  // 1. Never had any data
  if (!hasAnyMessages) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <Phone className="h-8 w-8 text-muted-foreground opacity-40" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">No messages yet</p>
          <p className="text-sm text-muted-foreground">
            Calls from your answering service will appear here as they come in.
          </p>
        </div>
      </div>
    )
  }

  // 2. Search returned nothing
  if (search) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <Search className="h-8 w-8 text-muted-foreground opacity-40" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            No messages match &ldquo;{search}&rdquo;
          </p>
        </div>
        <button
          type="button"
          onClick={onClearSearch}
          className="text-sm text-primary hover:underline"
        >
          Clear search →
        </button>
      </div>
    )
  }

  // 3. Tab filter shows nothing
  if (tab === 'unread' || tab === 'priority') {
    const text =
      tab === 'unread' ? 'No unread messages right now.' : 'No priority messages right now.'
    return (
      <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">All clear</p>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    )
  }

  // 4. All caught up (has messages but none shown on 'all' tab — e.g. all handled or call type filtered)
  return (
    <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
      <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">You&apos;re all caught up</p>
        {lastMessageTimestamp ? (
          <p className="text-sm text-muted-foreground">
            Last message received {relativeTimeAgo(lastMessageTimestamp)}.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function NoMessageSelected() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <Mail className="h-10 w-10 text-muted-foreground opacity-40" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">Select a message to view details</p>
      </div>
    </div>
  )
}

interface MessagesClientProps {
  businessId: string
  currentUserId: string
}

export default function MessagesClient({ businessId, currentUserId }: MessagesClientProps) {
  // searchParams must come before callTypeFilter state initializer
  const searchParams = useSearchParams()

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
  const [callTypeFilter, setCallTypeFilter] = useState<string | null>(
    () => searchParams.get('callType')
  )
  const [hasNewRealtime, setHasNewRealtime] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const { markUnread } = useUnreadMessages()
  const didAutoOpen = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)

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

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [businessId, markUnread])

  const unreadCount = messages.filter((m) => m.portalStatus === 'new').length

  const filteredMessages = messages.filter((m) => {
    if (tab === 'unread' && m.portalStatus !== 'new') return false
    if (tab === 'priority' && m.priority !== 'high') return false
    if (callTypeFilter && m.callType !== callTypeFilter) return false
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

  // Keyboard shortcuts — must be after filteredMessages and statuses are defined
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return

      if (e.key === 'j' || e.key === 'k') {
        const idx = filteredMessages.findIndex((m) => m.id === selectedMessageId)
        if (e.key === 'j') {
          const next = filteredMessages[idx + 1]
          if (next) void loadMessage(next.id)
        } else {
          const prev = filteredMessages[Math.max(0, idx - 1)]
          if (prev) void loadMessage(prev.id)
        }
      }

      if (e.key === 'e' && selectedMessageId) {
        const closedStatus = statuses.find((s) => !s.isOpen)
        if (!closedStatus) return
        void fetch(`/api/answering-service/messages/${selectedMessageId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflowStatusId: closedStatus.id }),
        }).then(() => {
          setMessages((current) =>
            current.map((m) =>
              m.id === selectedMessageId
                ? { ...m, workflowStatus: closedStatus, workflowStatusId: closedStatus.id }
                : m
            )
          )
          const next = filteredMessages.find(
            (m) =>
              m.id !== selectedMessageId &&
              (!m.workflowStatus || m.workflowStatus.isOpen !== false)
          )
          if (next) void loadMessage(next.id)
        })
      }

      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }

      if (e.key === 'Escape' && selectedMessageId) {
        setSelectedMessageId(null)
        setSelectedMessage(null)
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selectedMessageId, filteredMessages, statuses])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar — full width */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex items-center gap-2">
          {/* Mobile back button — only shown when detail is open on mobile */}
          {selectedMessageId ? (
            <button
              type="button"
              onClick={async () => {
                setSelectedMessageId(null)
                setSelectedMessage(null)
                await loadMessages(1)
              }}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : null}
          <h1
            className={cn(
              'text-2xl font-bold text-foreground',
              selectedMessageId && 'hidden md:block'
            )}
          >
            Messages
          </h1>
          {hasNewRealtime && !selectedMessageId ? (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
              New
            </span>
          ) : null}
        </div>

        {/* Search — always on desktop, hidden on mobile when detail open */}
        <div
          className={cn(
            'flex h-9 w-[200px] sm:w-[280px] items-center gap-2 rounded-lg bg-muted px-3',
            selectedMessageId && 'hidden md:flex'
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane: tabs + list */}
        <div
          className={cn(
            'flex flex-col border-r border-border',
            selectedMessageId
              ? 'hidden md:flex md:w-[380px] lg:w-[440px] shrink-0'
              : 'flex w-full md:w-[380px] lg:w-[440px] shrink-0'
          )}
        >
          {/* Error banner */}
          {error ? (
            <div className="flex items-center justify-between border-b border-rose-200 bg-rose-50 px-4 py-3">
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

          {/* Tabs header */}
          <div className="shrink-0 border-b border-border">
            {/* Call type filter banner */}
            {callTypeFilter ? (
              <div className="flex items-center gap-2 border-b border-primary/20 bg-primary/5 px-4 py-2">
                <span className="text-[13px] text-foreground">
                  Showing:{' '}
                  <span className="font-medium capitalize">
                    {callTypeFilter.replace(/-/g, ' ')}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setCallTypeFilter(null)}
                  className="ml-auto flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>
            ) : null}

            {/* Tab row */}
            <div className="flex items-center justify-between pr-4">
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
                  Med
                </span>
              </div>
            </div>

            {tab === 'priority' ? (
              <div className="border-t border-border bg-muted/30 px-4 py-2">
                <p className="text-[12px] text-muted-foreground">
                  High-priority calls are flagged automatically by your answering service.
                </p>
              </div>
            ) : null}
          </div>

          {/* Scrollable list area */}
          <div className="flex-1 overflow-y-auto">
            {isListLoading ? (
              <MessageListSkeleton />
            ) : filteredMessages.length === 0 ? (
              <MessageListEmptyState
                hasAnyMessages={messages.length > 0}
                search={search}
                tab={tab}
                lastMessageTimestamp={messages[0]?.timestamp}
                onClearSearch={() => setSearch('')}
              />
            ) : (
              <MessageList
                messages={filteredMessages}
                statuses={statuses}
                selectedMessageId={selectedMessageId}
                onSelectMessage={(id) => {
                  void loadMessage(id)
                }}
                onMessageHandled={(id) => {
                  const closedStatus = statuses.find((s) => !s.isOpen)
                  if (!closedStatus) return
                  setMessages((current) =>
                    current.map((m) =>
                      m.id === id
                        ? { ...m, workflowStatus: closedStatus, workflowStatusId: closedStatus.id }
                        : m
                    )
                  )
                }}
              />
            )}

            {/* Load more */}
            {hasMore && !isListLoading ? (
              <button
                type="button"
                onClick={() => void loadMessages(currentPage + 1)}
                disabled={isLoadingMore}
                className="w-full border-t border-border py-3 text-sm text-muted-foreground hover:bg-muted disabled:opacity-60 transition-colors"
              >
                {isLoadingMore ? 'Loading…' : 'Load older messages'}
              </button>
            ) : null}

            {/* Keyboard shortcut hint bar */}
            <div className="border-t border-border px-4 py-2">
              <p className="text-[11px] text-muted-foreground opacity-50 select-none">
                j/k navigate · e handle · / search
              </p>
            </div>
          </div>
        </div>

        {/* Right pane: detail */}
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            selectedMessageId
              ? 'block'
              : 'hidden md:flex md:items-center md:justify-center'
          )}
        >
          {selectedMessageId ? (
            isDetailLoading || !selectedMessage ? (
              <div className="p-6">
                <MessageListSkeleton />
              </div>
            ) : (
              <div className="p-4 md:p-6 lg:p-8">
                <MessageDetail
                  message={selectedMessage}
                  statuses={statuses}
                  businessUsers={businessUsers}
                  currentUserId={currentUserId}
                  onRefresh={async () => {
                    await Promise.all([loadMessages(1), loadMessage(selectedMessage.id)])
                  }}
                  onHandled={(handledId) => {
                    // Optimistically update the list
                    const closedStatus = statuses.find((s) => !s.isOpen)
                    if (closedStatus) {
                      setMessages((current) =>
                        current.map((m) =>
                          m.id === handledId
                            ? { ...m, workflowStatus: closedStatus, workflowStatusId: closedStatus.id }
                            : m
                        )
                      )
                    }
                    // Auto-advance to next unhandled message
                    const nextUnhandled = messages.find(
                      (m) =>
                        m.id !== handledId &&
                        (!m.workflowStatus || m.workflowStatus.isOpen !== false)
                    )
                    if (nextUnhandled) void loadMessage(nextUnhandled.id)
                  }}
                />
              </div>
            )
          ) : (
            <NoMessageSelected />
          )}
        </div>
      </div>
    </div>
  )
}
