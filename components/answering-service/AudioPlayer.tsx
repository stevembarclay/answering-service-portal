'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const WAVEFORM_BARS = 80

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface AudioPlayerProps {
  src: string
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const [bars, setBars] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)   // 0–1
  const [duration, setDuration] = useState(0)    // seconds
  const [currentTime, setCurrentTime] = useState(0)
  const [fallback, setFallback] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)
  const rafRef = useRef<number | null>(null)

  // Fetch + decode audio for waveform
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const res = await fetch(src)
        if (!res.ok) throw new Error('Fetch failed')
        const arrayBuffer = await res.arrayBuffer()
        if (cancelled) return

        // Store as blob URL for the audio element (blob URLs don't expire)
        const blob = new Blob([arrayBuffer], { type: res.headers.get('Content-Type') ?? 'audio/mpeg' })
        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl

        if (audioRef.current) {
          audioRef.current.src = blobUrl
        }

        // Decode for waveform
        const ctx = new AudioContext()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
        if (cancelled) { void ctx.close(); return }

        const channelData = audioBuffer.getChannelData(0)
        const blockSize = Math.floor(channelData.length / WAVEFORM_BARS)
        const computed: number[] = []
        for (let i = 0; i < WAVEFORM_BARS; i++) {
          let sum = 0
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(channelData[i * blockSize + j] ?? 0)
          }
          computed.push(sum / blockSize)
        }
        // Normalize to 0–1
        const max = Math.max(...computed, 0.001)
        setBars(computed.map((v) => v / max))

        void ctx.close()
        setIsLoading(false)
      } catch {
        if (!cancelled) setFallback(true)
      }
    }

    void init()
    return () => {
      cancelled = true
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [src])

  // Draw waveform on canvas
  useEffect(() => {
    if (bars.length === 0 || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio ?? 1
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const barWidth = w / WAVEFORM_BARS
    const gap = Math.max(1, barWidth * 0.2)
    const bw = barWidth - gap
    const progressX = progress * w

    for (let i = 0; i < bars.length; i++) {
      const x = i * barWidth + gap / 2
      const barH = Math.max(2, (bars[i] ?? 0) * (h - 4))
      const y = (h - barH) / 2
      ctx.fillStyle = x <= progressX ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'
      ctx.beginPath()
      ctx.roundRect(x, y, bw, barH, 1)
      ctx.fill()
    }
  }, [bars, progress])

  // Playback progress loop
  function startRaf() {
    function tick() {
      const audio = audioRef.current
      if (!audio) return
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function stopRaf() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      void audio.play()
    }
  }

  function handleScrub(e: React.MouseEvent<HTMLCanvasElement>) {
    const audio = audioRef.current
    if (!audio || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audio.currentTime = ratio * audio.duration
    setProgress(ratio)
  }

  if (fallback) {
    return (
      <audio controls className="w-full" src={src}>
        Your browser does not support audio playback.
      </audio>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-8 w-full animate-pulse rounded bg-muted" />
          <div className="flex justify-between">
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
            <div className="h-3 w-8 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onPlay={() => { setIsPlaying(true); startRaf() }}
        onPause={() => { setIsPlaying(false); stopRaf() }}
        onEnded={() => { setIsPlaying(false); stopRaf(); setProgress(0); setCurrentTime(0) }}
        onLoadedMetadata={() => { setDuration(audioRef.current?.duration ?? 0) }}
        className="hidden"
      />

      {/* Play/pause button */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 translate-x-px" />
        )}
      </button>

      {/* Waveform + timestamps */}
      <div className="flex-1 space-y-1">
        <canvas
          ref={canvasRef}
          onClick={handleScrub}
          className="h-10 w-full cursor-pointer"
          aria-label="Audio waveform — click to seek"
        />
        <div className="flex justify-between">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatDuration(currentTime)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface RecordingCardProps {
  recordingUrl?: string
}

export function RecordingCard({ recordingUrl }: RecordingCardProps) {
  if (!recordingUrl) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
        <Volume2 className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">No recording available</p>
          <p className="text-[13px] text-muted-foreground">
            Most calls do not include an audio recording.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden')}>
      <div className="flex h-[52px] items-center border-b border-border px-5">
        <span className="text-sm font-semibold text-foreground">Recording</span>
      </div>
      <div className="p-5">
        <AudioPlayer src={recordingUrl} />
      </div>
    </div>
  )
}
