'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, Users, BarChart2, FileText, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const ITEMS = [
  { href: '/operator/activity', label: 'Activity', icon: Activity },
  { href: '/operator/clients', label: 'Clients', icon: Users },
  { href: '/operator/usage', label: 'Usage', icon: BarChart2 },
  { href: '/operator/billing-templates', label: 'Templates', icon: FileText },
  { href: '/operator/settings', label: 'Settings', icon: Settings },
] as const

export function OperatorBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Operator mobile navigation"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 py-2 text-center',
                'touch-manipulation',
                isActive
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
