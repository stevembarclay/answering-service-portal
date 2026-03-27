import type { DayCount } from '@/types/answeringService'

interface SparklineProps {
  data: DayCount[]
  width?: number
  height?: number
  color?: string
}

export function Sparkline({
  data,
  width = 120,
  height = 32,
  color = '#3b82f6',
}: SparklineProps) {
  if (data.length < 2) {
    return null
  }

  const maxCount = Math.max(...data.map((item) => item.count), 1)
  const padding = 2
  const points = data
    .map((item, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2)
      const y = height - padding - (item.count / maxCount) * (height - padding * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
