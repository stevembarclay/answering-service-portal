'use client'

import { useState, useEffect, useRef } from 'react'
import { Smartphone, X } from 'lucide-react'

const DISMISSED_KEY = 'pwa-install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already dismissed or on iOS (no beforeinstallprompt)
    if (localStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt.current) return
    await deferredPrompt.current.prompt()
    const { outcome } = await deferredPrompt.current.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISSED_KEY, '1')
    }
    setShow(false)
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 mx-4 mb-2 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-lg md:hidden">
      <div className="flex items-center gap-3">
        <Smartphone className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-[13px] text-foreground">
          Add to your home screen for quick access
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground"
        >
          Install
        </button>
        <button onClick={handleDismiss} className="p-1 text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
