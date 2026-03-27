import { formatDistanceToNow } from 'date-fns'

interface UsagePeriodRow {
  id: string
  business_id: string
  period_date: string
  total_calls: number
  total_minutes: string
  source: string
  status: string
  error_detail: { issue?: string } | null
  created_at: string
}

export function UsageHistory({ rows }: { rows: UsagePeriodRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 font-medium">Business</th>
            <th className="pb-2 pr-4 font-medium">Calls</th>
            <th className="pb-2 pr-4 font-medium">Minutes</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 font-medium">Uploaded</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="py-2 pr-4 font-mono whitespace-nowrap">{row.period_date}</td>
              <td className="py-2 pr-4 font-mono text-xs">{row.business_id.slice(0, 8)}…</td>
              <td className="py-2 pr-4 tabular-nums">{row.total_calls}</td>
              <td className="py-2 pr-4 tabular-nums">{Number(row.total_minutes).toFixed(1)}</td>
              <td className="py-2 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  row.status === 'processed' ? 'bg-green-100 text-green-800'
                  : row.status === 'error' ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {row.status}
                </span>
                {row.error_detail?.issue && (
                  <span className="ml-2 text-xs text-red-600">{row.error_detail.issue}</span>
                )}
              </td>
              <td className="py-2 text-slate-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-slate-400">No uploads yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
