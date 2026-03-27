'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AnalyticsPeriod } from '@/types/operator'

interface OperatorVolumeChartProps {
  data: Array<{ date: string; count: number }>
  period: AnalyticsPeriod
}

function formatDate(dateStr: string, period: AnalyticsPeriod): string {
  const date = new Date(`${dateStr}T00:00:00Z`)
  if (period === '7d') {
    return date.toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' })
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function tickInterval(period: AnalyticsPeriod): number {
  if (period === '7d') return 0
  if (period === '30d') return 4
  return 9
}

export function OperatorVolumeChart({ data, period }: OperatorVolumeChartProps) {
  const chartData = data.map((entry) => ({ ...entry, label: formatDate(entry.date, period) }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barSize={period === '90d' ? 4 : period === '30d' ? 6 : 16}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={tickInterval(period)}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={30}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />
        <Bar dataKey="count" name="Calls" fill="var(--color-primary)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
