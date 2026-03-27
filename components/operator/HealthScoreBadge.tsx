export function HealthScoreBadge({
  score,
  isOverride = false,
}: {
  score: number
  isOverride?: boolean
}) {
  const color =
    score >= 70 ? 'bg-green-500'
    : score >= 50 ? 'bg-yellow-500'
    : 'bg-red-500'

  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      <span className="tabular-nums text-sm font-medium">{score}</span>
      {isOverride && (
        <span className="text-slate-400" title="Score manually overridden">📌</span>
      )}
    </span>
  )
}
