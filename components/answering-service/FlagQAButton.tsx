'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { PortalStatus } from '@/types/answeringService'

interface FlagQAButtonProps {
  callId: string
  initialStatus: PortalStatus
  onFlagged?: () => void
}

export function FlagQAButton({ callId, initialStatus, onFlagged }: FlagQAButtonProps) {
  const [status, setStatus] = useState<PortalStatus>(initialStatus)
  const [isFlagging, setIsFlagging] = useState(false)

  const isFlagged = status === 'flagged_qa'

  async function handleFlag() {
    if (isFlagged || isFlagging) {
      return
    }

    const previousStatus = status
    setStatus('flagged_qa')
    setIsFlagging(true)

    try {
      const response = await fetch(`/api/answering-service/messages/${callId}/flag-qa`, {
        method: 'POST',
      })

      if (response.ok) {
        onFlagged?.()
      } else {
        setStatus(previousStatus)
        toast.error('Failed to flag message.')
      }
    } catch {
      setStatus(previousStatus)
      toast.error('Failed to flag message.')
    } finally {
      setIsFlagging(false)
    }
  }

  return (
    <Button type="button" variant="ghost" className="text-slate-600 hover:text-slate-900" disabled={isFlagged || isFlagging} onClick={handleFlag}>
      {isFlagged ? 'Flagged' : isFlagging ? 'Flagging...' : 'Flag QA'}
    </Button>
  )
}
