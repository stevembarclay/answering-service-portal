'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { HealthScoreBadge } from '@/components/operator/HealthScoreBadge'
import { cardVariants } from '@/lib/design/card-system'
import { bodyStyles } from '@/lib/design/typography-system'
import { cn } from '@/lib/utils/cn'
import type { ClientRow } from '@/types/operator'

type Segment = 'all' | 'at_risk' | 'inactive'
type SortKey = 'health_asc' | 'health_desc' | 'name' | 'last_login' | 'calls'

export function ClientTable({ clients }: { clients: ClientRow[] }) {
  const [segment, setSegment] = useState<Segment>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('health_asc')

  const now = new Date()

  const filtered = clients
    .filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (segment === 'at_risk' && c.healthScore >= 50) return false
      if (segment === 'inactive') {
        if (!c.lastLoginAt) return true
        const daysSince = (now.getTime() - new Date(c.lastLoginAt).getTime()) / 86_400_000
        if (daysSince <= 30) return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'health_asc': return a.healthScore - b.healthScore
        case 'health_desc': return b.healthScore - a.healthScore
        case 'name': return a.name.localeCompare(b.name)
        case 'last_login': return (b.lastLoginAt ?? '').localeCompare(a.lastLoginAt ?? '')
        case 'calls': return b.callsPerWeek - a.callsPerWeek
        default: return 0
      }
    })

  return (
    <div className="space-y-4">
      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            'rounded-lg border border-border bg-card px-3 py-2',
            bodyStyles.small,
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'shadow-institutional transition-shadow focus:shadow-institutional-hover'
          )}
        />
        <div className="flex rounded-lg border border-border bg-muted overflow-hidden">
          {(['all', 'at_risk', 'inactive'] as Segment[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={cn(
                'px-3 py-2 transition-colors',
                bodyStyles.caption,
                segment === s
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-border/50'
              )}
            >
              {s === 'all' ? 'All' : s === 'at_risk' ? 'At risk' : 'Inactive'}
            </button>
          ))}
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className={cn(
            'rounded-lg border border-border bg-card px-3 py-2',
            bodyStyles.small,
            'text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            'shadow-institutional'
          )}
        >
          <option value="health_asc">Health: low → high</option>
          <option value="health_desc">Health: high → low</option>
          <option value="name">Name A–Z</option>
          <option value="last_login">Most recently active</option>
          <option value="calls">Most calls/wk</option>
        </select>
      </div>

      {/* Table */}
      <div className={cn(cardVariants.tableWrapper, 'overflow-hidden rounded-lg')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className={cn(bodyStyles.micro, 'px-5 py-3 text-left text-muted-foreground tracking-widest font-medium')}>
                  Client
                </th>
                <th className={cn(bodyStyles.micro, 'px-5 py-3 text-left text-muted-foreground tracking-widest font-medium')}>
                  Health
                </th>
                <th className={cn(bodyStyles.micro, 'px-5 py-3 text-left text-muted-foreground tracking-widest font-medium')}>
                  Last login
                </th>
                <th className={cn(bodyStyles.micro, 'px-5 py-3 text-left text-muted-foreground tracking-widest font-medium')}>
                  Calls/wk
                </th>
                <th className={cn(bodyStyles.micro, 'px-5 py-3 text-left text-muted-foreground tracking-widest font-medium')}>
                  Billing
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="group bg-card hover:bg-muted/30 transition-colors"
                >
                  <td className={cn('px-5 py-3.5', bodyStyles.small, 'font-semibold text-foreground')}>
                    {client.name}
                  </td>
                  <td className="px-5 py-3.5">
                    <HealthScoreBadge score={client.healthScore} isOverride={client.isHealthScoreOverride} />
                  </td>
                  <td className={cn('px-5 py-3.5', bodyStyles.small, 'text-muted-foreground')}>
                    {client.lastLoginAt
                      ? formatDistanceToNow(new Date(client.lastLoginAt), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td className={cn('px-5 py-3.5', bodyStyles.small, 'tabular-nums text-foreground')}>
                    {client.callsPerWeek}
                  </td>
                  <td className={cn('px-5 py-3.5', bodyStyles.small)}>
                    {client.billingPercent !== null ? (
                      <span className="tabular-nums text-foreground">{client.billingPercent}%</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/operator/clients/${client.id}`}
                      className={cn(
                        bodyStyles.caption,
                        'font-medium text-muted-foreground hover:text-foreground transition-colors',
                        'group-hover:text-primary'
                      )}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={cn('px-5 py-12 text-center', bodyStyles.small, 'text-muted-foreground')}
                  >
                    No clients match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
