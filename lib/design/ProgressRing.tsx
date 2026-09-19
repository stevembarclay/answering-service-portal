'use client'

import { cn } from '@/lib/utils/cn'

interface ProgressRingProps {
  /** Progress value 0-100 */
  value: number
  /** Size in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Label below the number */
  label?: string
  /** Color based on value thresholds */
  autoColor?: boolean
  className?: string
}

function getColor(value: number): string {
  if (value >= 80) return '#10b981' // emerald-500
  if (value >= 50) return '#f59e0b' // amber-500
  return '#ef4444' // red-500
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  label,
  autoColor = true,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(value, 100) / 100)
  const center = size / 2
  // TODO: replace fallback hex with your primaryDark brand color
  const color = autoColor ? getColor(value) : '#1a2b3c'

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          aria-hidden
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-bold tabular-nums text-slate-900">
            {Math.round(value)}
          </span>
          {label && (
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
