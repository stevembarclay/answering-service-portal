'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface OperatorHoursChartProps {
  data: Array<{ hour: number; count: number }>
}

function formatHour(hour: number): string {
  if (hour === 0) return '12a'
  if (hour < 12) return `${hour}a`
  if (hour === 12) return '12p'
  return `${hour - 12}p`
}

export function OperatorHoursChart({ data }: OperatorHoursChartProps) {
  const chartData = data.map((entry) => ({ ...entry, label: formatHour(entry.hour) }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} barSize={8}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval={5}
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={25}
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
