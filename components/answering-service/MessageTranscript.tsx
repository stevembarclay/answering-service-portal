'use client'

import { Headphones } from '@phosphor-icons/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface MessageTranscriptProps {
  transcript?: unknown
  callTimestamp?: string
  isLoading?: boolean
  phiHidden?: boolean
}

export function MessageTranscript({ isLoading = false }: MessageTranscriptProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transcript unavailable</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-8 text-center text-muted-foreground">
          <Headphones className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Transcript support has been removed from the current portal build.</p>
        </div>
      </CardContent>
    </Card>
  )
}
