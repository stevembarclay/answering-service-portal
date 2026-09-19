'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MessageNote } from '@/types/answeringService'

type SaveState = 'idle' | 'saving' | 'saved'

function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: T) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

interface MessageNoteInputProps {
  messageId: string
  onNoteAdded: (note: MessageNote) => void
}

export function MessageNoteInput({ messageId, onNoteAdded }: MessageNoteInputProps) {
  const [body, setBody] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  const doSave = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      setSaveState('saving')
      try {
        const res = await fetch(`/api/answering-service/messages/${messageId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text.trim() }),
        })
        if (!res.ok) throw new Error('Failed.')
        const payload = (await res.json()) as { data: MessageNote }
        onNoteAdded(payload.data)
        setBody('')
        setSaveState('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('idle')
      }
    },
    [messageId, onNoteAdded]
  )

  // Debounced save — fires 800ms after last keystroke
  const debouncedSave = useMemo(
    () => debounce((text: string) => void doSave(text), 800),
    [doSave]
  )

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value
    setBody(value)
    if (value.trim()) debouncedSave(value)
  }

  function handleBlur() {
    if (body.trim()) void doSave(body)
  }

  return (
    <div className="space-y-1">
      <textarea
        value={body}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add a private note…"
        rows={3}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
      />
      <div className="h-4 flex items-center">
        {saveState === 'saving' ? (
          <span className="text-[11px] text-muted-foreground">Saving…</span>
        ) : saveState === 'saved' ? (
          <span className="text-[11px] text-emerald-600">Saved</span>
        ) : null}
      </div>
    </div>
  )
}
