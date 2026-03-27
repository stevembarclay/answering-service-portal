'use client'

import { Volume2 } from 'lucide-react'
import { cardVariants } from '@/lib/design/card-system'
import { bodyStyles, headingStyles } from '@/lib/design/typography-system'

interface RecordingPlayerProps {
  recordingUrl?: string
}

export function RecordingPlayer({ recordingUrl }: RecordingPlayerProps) {
  if (!recordingUrl) {
    return (
      <div className={`${cardVariants.static} flex items-center gap-3 p-4`}>
        <Volume2 className="h-5 w-5 text-slate-400" aria-hidden="true" />
        <div className="space-y-1">
          <p className={headingStyles.h4.base}>No recording available</p>
          <p className={`${bodyStyles.small} text-slate-500`}>
            Most calls do not include an audio recording.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${cardVariants.static} space-y-3 p-4`}>
      <div>
        <p className={headingStyles.h4.base}>Recording</p>
        <p className={`${bodyStyles.small} text-slate-500`}>Play the original call audio.</p>
      </div>
      <audio controls className="w-full" src={recordingUrl}>
        Your browser does not support audio playback.
      </audio>
    </div>
  )
}
