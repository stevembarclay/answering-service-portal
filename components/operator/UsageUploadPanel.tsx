'use client'

import { useRef, useState } from 'react'

interface RowResult {
  businessId: string
  date: string
  status: 'processed' | 'error'
  issue?: string
}

export function UsageUploadPanel() {
  const [results, setResults] = useState<RowResult[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setError(null)
    setResults(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/usage', { method: 'POST', body: formData })
      const json = await res.json() as { data?: { results: RowResult[] }; error?: { message: string } }
      if (!res.ok || !json.data) {
        setError(json.error?.message ?? 'Upload failed.')
      } else {
        setResults(json.data.results)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-8 text-center hover:border-slate-400"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
      >
        <p className="text-sm text-slate-500">
          {uploading ? 'Processing…' : 'Drop a CSV here or click to select'}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-xs font-mono text-slate-500">
        Expected format:<br />
        date,business_id,total_calls,total_minutes[,&#123;type&#125;_calls,&#123;type&#125;_minutes,...]<br />
        2026-03-10,uuid-here,47,134.5,urgent_calls,3,urgent_minutes,12.0
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results && (
        <ul className="space-y-1">
          {results.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span>{r.status === 'processed' ? '✓' : '✗'}</span>
              <span>{r.businessId}</span>
              <span className="text-slate-400">{r.date}</span>
              {r.issue && <span className="text-red-600">{r.issue}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
