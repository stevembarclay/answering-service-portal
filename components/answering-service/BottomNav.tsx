'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mail, Phone, Receipt, Settings } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface BottomNavProps {
  hasUnreadMessages: boolean
}

const ITEMS = [
  { href: '/answering-service/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/answering-service/messages', label: 'Messages', icon: Mail },
  { href: '/answering-service/on-call', label: 'On-Call', icon: Phone },
  { href: '/answering-service/billing', label: 'Billing', icon: Receipt },
  { href: '/answering-service/settings', label: 'Settings', icon: Settings },
] as const

export function BottomNav({ hasUnreadMessages }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile navigation"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 py-2 text-center',
                'touch-manipulation',
                isActive
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              )}
              style={isActive ? { color: 'var(--portal-brand-color, var(--color-foreground))' } : undefined}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {item.href === '/answering-service/messages' && hasUnreadMessages ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" aria-hidden="true" />
                ) : null}
              </span>
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
