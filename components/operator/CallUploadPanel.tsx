'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface UploadResult {
  inserted: number
  errors: number
  results: Array<{ businessId: string; status: string; callId?: string; issue?: string }>
}

export function CallUploadPanel() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/v1/calls', { method: 'POST', body: formData })
      const json = await res.json() as { data?: UploadResult; error?: { message: string } }

      // Use && (not ||): 207 partial-success is not-ok but always carries data — treat it as success with errors shown in results
      if (!res.ok && !json.data) {
        setError(json.error?.message ?? 'Upload failed.')
        return
      }
      if (json.data) setResult(json.data)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Upload a CSV of call records. Required columns:{' '}
        <code className="rounded bg-slate-100 px-1 text-xs">
          timestamp, business_id, call_type, direction, duration_seconds, telephony_status, message
        </code>
        . Optional:{' '}
        <code className="rounded bg-slate-100 px-1 text-xs">
          caller_name, caller_number, callback_number
        </code>
        .
      </p>

      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <Button onClick={handleUpload} disabled={!file || uploading} size="sm">
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm">
          <p className="font-medium text-slate-800">
            {result.inserted} inserted
            {result.errors > 0 && (
              <span className="ml-2 text-red-600">{result.errors} errors</span>
            )}
          </p>
          {result.errors > 0 && (
            <ul className="mt-2 space-y-1">
              {result.results
                .filter((r) => r.status === 'error')
                .map((r, i) => (
                  <li key={i} className="text-red-600">
                    {r.businessId}: {r.issue}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
