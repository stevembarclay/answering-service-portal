export function BillingUsageBar({
  percent,
  includedMinutes,
  usedMinutes,
  label = 'Usage this period',
}: {
  percent: number
  includedMinutes: number
  usedMinutes: number
  label?: string
}) {
  const capped = Math.min(percent, 100)
  const barColor =
    percent >= 100 ? 'bg-red-500'
    : percent >= 90 ? 'bg-orange-500'
    : percent >= 75 ? 'bg-yellow-500'
    : 'bg-green-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${capped}%` }}
        />
      </div>
      <p className="text-xs text-slate-400">
        {usedMinutes.toFixed(1)} of {includedMinutes} included minutes used
      </p>
    </div>
  )
}
