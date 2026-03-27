import { redirect } from 'next/navigation'
import { getBusinessContext } from '@/lib/auth/server'
import AnsweringServiceDashboardClient from './AnsweringServiceDashboardClient'

export const dynamic = 'force-dynamic'

export default async function AnsweringServiceDashboardPage() {
  const context = await getBusinessContext()

  if (!context) {
    redirect('/login')
  }

  return <AnsweringServiceDashboardClient businessId={context.businessId} />
}
