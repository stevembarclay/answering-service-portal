'use client'

import { cn } from '@/lib/utils/cn'
import type { IconComponent } from '@/lib/design/icons'

interface DualToneIconProps {
  icon: IconComponent
  size?: number
  className?: string
}

export function DualToneIcon({ icon: IconComponent, size = 24, className }: DualToneIconProps) {
  return (
    <div className={cn('relative inline-flex', className)} style={{ width: size, height: size }}>
      {/* Background layer — lighter, offset */}
      <IconComponent
        size={size}
        className="absolute text-slate-200"
        style={{ top: 1, left: 1 }}
        strokeWidth={1.5}
      />
      {/* Foreground layer — darker, primary position */}
      <IconComponent
        size={size}
        className="relative text-slate-700"
        strokeWidth={1.5}
      />
    </div>
  )
}
