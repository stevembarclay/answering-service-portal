'use client'

import { useState, useTransition } from 'react'

const AVAILABLE_TOPICS = [
  'call.created',
  'call.priority_changed',
  'call.status_changed',
  'billing.threshold_75',
  'billing.threshold_90',
  'billing.threshold_100',
  'usage.upload_processed',
  'usage.upload_failed',
] as const

interface Subscription {
  id: string
  url: string
  topics: string[]
  status: string
  consecutiveFailureCount: number
}

interface CreateSubscriptionSuccess {
  id: string
  secret: string
}

interface CreateSubscriptionFailure {
  error: string
}

export function WebhookManager({
  subscriptions,
  onCreateSub,
  onDeleteSub,
  isAdmin,
}: {
  subscriptions: Subscription[]
  onCreateSub: (url: string, topics: string[]) => Promise<CreateSubscriptionSuccess | CreateSubscriptionFailure>
  onDeleteSub: (id: string) => Promise<void>
  isAdmin: boolean
}) {
  const [url, setUrl] = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleTopic(topic: string, checked: boolean) {
    setSelectedTopics((current) => {
      if (checked) return [...current, topic]
      return current.filter((item) => item !== topic)
    })
  }

  function handleCreate() {
    if (!url.trim() || selectedTopics.length === 0) return

    startTransition(async () => {
      setError(null)
      const result = await onCreateSub(url.trim(), selectedTopics)

      if ('error' in result) {
        setError(result.error)
        return
      }

      setCreatedSecret(result.secret)
      setUrl('')
      setSelectedTopics([])
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      setError(null)
      try {
        await onDeleteSub(id)
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete subscription.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {createdSecret && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">Signing secret. Save it now, it will not be shown again.</p>
          <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs">{createdSecret}</code>
          <button
            type="button"
            onClick={() => setCreatedSecret(null)}
            className="mt-2 text-xs text-green-700 hover:underline"
          >
            I&apos;ve saved it
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isAdmin && (
        <div className="space-y-3 rounded-md border border-slate-200 p-4">
          <input
            type="url"
            placeholder="https://your-endpoint.example.com/webhook"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TOPICS.map((topic) => (
              <label key={topic} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={selectedTopics.includes(topic)}
                  onChange={(event) => toggleTopic(topic, event.target.checked)}
                />
                {topic}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !url.trim() || selectedTopics.length === 0}
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {isPending ? 'Working…' : 'Create subscription'}
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {subscriptions.map((subscription) => (
          <li key={subscription.id} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs">{subscription.url}</p>
                <p className="mt-1 text-xs text-slate-400">{subscription.topics.join(', ')}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    subscription.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : subscription.status === 'failing'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {subscription.status}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(subscription.id)}
                    disabled={isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Consecutive failures: {subscription.consecutiveFailureCount}
            </p>
          </li>
        ))}
      </ul>

      {subscriptions.length === 0 && <p className="text-sm text-slate-400">No subscriptions.</p>}
    </div>
  )
}
