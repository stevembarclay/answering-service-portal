import { redirect } from 'next/navigation'
import { getOperatorContext } from '@/lib/auth/server'
import { getMonthClose } from '@/lib/services/operator/monthCloseService'
import { MonthCloseClient } from '@/components/operator/MonthCloseClient'

export const dynamic = 'force-dynamic'

interface MonthClosePageProps {
  searchParams?: Promise<{ month?: string }>
}

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function MonthClosePage({ searchParams }: MonthClosePageProps) {
  const ctx = await getOperatorContext()
  if (!ctx) redirect('/login')

  const resolved = (await searchParams) ?? {}
  const month = /^\d{4}-\d{2}$/.test(resolved.month ?? '')
    ? (resolved.month as string)
    : currentYearMonth()

  const data = await getMonthClose(ctx.operatorOrgId, month)

  // key={month} ensures MonthCloseClient re-mounts with fresh initialData when the month changes
  return <MonthCloseClient initialData={data} month={month} key={month} />
}
