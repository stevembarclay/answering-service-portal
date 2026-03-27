'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Activity,
  BarChart2,
  DollarSign,
  FileText,
  LineChart,
  Webhook,
  Plug,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { signOutAction } from '@/lib/auth/actions'
import { ThemeToggle } from '@/components/answering-service/ThemeToggle'

interface OperatorNavProps {
  userEmail?: string
  orgName?: string | null
  logoUrl?: string | null
}

const ITEMS = [
  { href: '/operator/activity', label: 'Activity', icon: Activity },
  { href: '/operator/clients', label: 'Clients', icon: Users },
  { href: '/operator/analytics', label: 'Analytics', icon: LineChart },
  { href: '/operator/usage', label: 'Usage', icon: BarChart2 },
  { href: '/operator/billing', label: 'Billing', icon: DollarSign },
  { href: '/operator/billing-templates', label: 'Billing Templates', icon: FileText },
  { href: '/operator/api-webhooks', label: 'API & Webhooks', icon: Webhook },
  { href: '/operator/integrations', label: 'Integrations', icon: Plug },
  { href: '/operator/settings', label: 'Settings', icon: Settings },
] as const

function getInitials(email: string) {
  const [local] = email.split('@')
  const parts = local.split(/[._-]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

function getOrgInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function OperatorNav({ userEmail, orgName, logoUrl }: OperatorNavProps) {
  const pathname = usePathname()
  const initials = userEmail ? getInitials(userEmail) : '??'
  const orgInitials = orgName ? getOrgInitials(orgName) : 'OP'
  const displayName = orgName ?? 'Operator Admin'

  return (
    <nav
      className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:justify-between md:bg-[#0f172a]"
      aria-label="Operator navigation"
    >
      {/* Top */}
      <div className="flex flex-col">
        {/* Brand */}
        <div
          className="flex h-16 items-center gap-3 px-5"
          style={{ borderBottom: '1px solid #ffffff18' }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-8 w-8 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white bg-[#7c3aed]">
              {orgInitials}
            </div>
          )}
          <span className="text-[13px] font-semibold text-white">{displayName}</span>
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-0.5 p-2">
          {ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors overflow-hidden',
                  isActive
                    ? 'bg-[#1e293b] font-semibold text-white'
                    : 'font-medium text-[#94a3b8] hover:bg-[#1e293b]/50 hover:text-white'
                )}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-white/50"
                    aria-hidden="true"
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Bottom — user + sign out */}
      <div
        className="flex h-14 items-center gap-2.5 px-4"
        style={{ borderTop: '1px solid #ffffff18' }}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e293b]">
          <span className="text-[11px] font-bold text-[#94a3b8]">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-white">
            {userEmail ?? 'Operator'}
          </p>
        </div>
        <ThemeToggle />
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            className="text-[#94a3b8] transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </nav>
  )
}
