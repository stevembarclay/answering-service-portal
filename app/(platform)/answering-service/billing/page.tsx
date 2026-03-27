import { redirect } from 'next/navigation'
import { getBusinessContext } from '@/lib/auth/server'
import BillingClient from './BillingClient'

export const dynamic = 'force-dynamic'

export default async function BillingPage() {
  const context = await getBusinessContext()

  if (!context) {
    redirect('/login')
  }

  return <BillingClient />
}
