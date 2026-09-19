'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ClientAnalyticsData } from '@/types/operator'

interface ClientAnalyticsSectionProps {
  analytics: ClientAnalyticsData
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export function ClientAnalyticsSection({ analytics }: ClientAnalyticsSectionProps) {
  return (
    <div className="space-y-6 pt-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Missed Rate (30d)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{analytics.missedCallRate}%</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Avg Response Time</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {analytics.avgResponseTimeMinutes !== null
              ? analytics.avgResponseTimeMinutes < 60
                ? `${analytics.avgResponseTimeMinutes}m`
                : `${Math.round(analytics.avgResponseTimeMinutes / 60)}h`
              : '—'}
          </p>
        </div>
        <div className="col-span-2 rounded-xl border border-border bg-card p-4 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Call Types (30d)</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {analytics.callTypeBreakdown.length}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">
          Call Type Breakdown (last 30 days)
        </p>
        {analytics.callTypeBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No calls in the last 30 days.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 pb-1 text-xs font-medium text-muted-foreground">
              <span>Type</span>
              <span className="text-right">Calls</span>
              <span className="text-right">Avg Duration</span>
            </div>
            {analytics.callTypeBreakdown.map(({ callType, count, avgDurationSeconds }) => (
              <div key={callType} className="grid grid-cols-3 text-sm">
                <span className="capitalize text-foreground">{callType.replace(/-/g, ' ')}</span>
                <span className="text-right text-foreground">{count}</span>
                <span className="text-right text-muted-foreground">
                  {formatDuration(avgDurationSeconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-4 text-sm font-semibold text-foreground">
          Monthly Call Volume (last 6 months)
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={analytics.callsByMonth} barSize={24}>
            <XAxis
              dataKey="month"
              tickFormatter={(month: string) => {
                const [, monthIndex] = month.split('-')
                const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                return names[Number.parseInt(monthIndex, 10) - 1] ?? month
              }}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 6 }}
              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
            />
            <Bar dataKey="count" name="Calls" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
