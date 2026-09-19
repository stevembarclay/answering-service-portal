import { redirect } from 'next/navigation'
import { getBusinessContext } from '@/lib/auth/server'
import MessagesClient from './MessagesClient'

export const dynamic = 'force-dynamic'

export default async function MessagesPage() {
  const context = await getBusinessContext()

  if (!context) {
    redirect('/login')
  }

  return <MessagesClient businessId={context.businessId} currentUserId={context.userId} />
}
