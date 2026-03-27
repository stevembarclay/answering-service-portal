'use client'

import { useState, useTransition } from 'react'

interface Key {
  id: string
  label: string
  scopes: string[]
  createdAt: string
  revokedAt: string | null
}

interface CreateKeySuccess {
  rawKey: string
}

interface CreateKeyFailure {
  error: string
}

export function ApiKeyManager({
  keys,
  onCreateKey,
  onRevokeKey,
  isAdmin,
  availableScopes = ['calls:read', 'billing:read'],
}: {
  keys: Key[]
  onCreateKey: (label: string, scopes: string[]) => Promise<CreateKeySuccess | CreateKeyFailure>
  onRevokeKey: (id: string) => Promise<void>
  isAdmin: boolean
  availableScopes?: string[]
}) {
  const SCOPE_DESCRIPTIONS: Record<string, string> = {
    'calls:read': 'read call logs and messages',
    'billing:read': 'read billing rules and usage summaries',
    'calls:write': '⚠ ingest calls from an integration — use only for trusted keys',
    'usage:write': 'upload usage data from an integration (opt-in)',
    'on_call:read': 'access current on-call escalation chain (opt-in)',
  }

  const [newLabel, setNewLabel] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(
    availableScopes.filter((s) => s !== 'on_call:read' && s !== 'usage:write')
  )
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const activeKeys = keys.filter((key) => !key.revokedAt)
  // Show scope checkboxes only when there are opt-in scopes beyond the standard pair
  const BASE_SCOPES = ['calls:read', 'billing:read']
  const hasOptInScopes = availableScopes.some((s) => !BASE_SCOPES.includes(s))

  function handleCreate() {
    if (!newLabel.trim()) return

    startTransition(async () => {
      setError(null)
      const result = await onCreateKey(newLabel.trim(), selectedScopes)

      if ('error' in result) {
        setError(result.error)
        return
      }

      setCreatedKey(result.rawKey)
      setNewLabel('')
    })
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      setError(null)
      try {
        await onRevokeKey(id)
      } catch (revokeError) {
        setError(revokeError instanceof Error ? revokeError.message : 'Failed to revoke API key.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {createdKey && (
        <div className="rounded-md border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            API key created. Save it now, it will not be shown again.
          </p>
          <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs">{createdKey}</code>
          <button
            type="button"
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-xs text-green-700 hover:underline"
          >
            I&apos;ve saved it
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isAdmin && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Key label"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !newLabel.trim()}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {isPending ? 'Working…' : 'Create key'}
            </button>
          </div>
          {hasOptInScopes && (
            <div className="space-y-1 pl-1">
              <p className="text-xs text-slate-500 font-medium">Scopes</p>
              {availableScopes.map((scope) => (
                <label
                  key={scope}
                  className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={(e) => {
                      setSelectedScopes((prev) =>
                        e.target.checked
                          ? [...prev, scope]
                          : prev.filter((s) => s !== scope)
                      )
                    }}
                    className="rounded mt-0.5 shrink-0"
                  />
                  <span>
                    <span className="font-mono">{scope}</span>
                    {SCOPE_DESCRIPTIONS[scope] && (
                      <span className="ml-1.5 text-slate-500">— {SCOPE_DESCRIPTIONS[scope]}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {activeKeys.map((key) => (
          <li
            key={key.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium">{key.label}</p>
              <p className="text-xs text-slate-400">{key.scopes.join(', ')}</p>
              <p className="text-xs text-slate-400">
                Created {new Date(key.createdAt).toLocaleDateString()}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleRevoke(key.id)}
                disabled={isPending}
                className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>

      {activeKeys.length === 0 && <p className="text-sm text-slate-400">No active API keys.</p>}
    </div>
  )
}
