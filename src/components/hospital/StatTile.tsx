const TINT = {
  navy: { bg: '#ccd9e6', fg: '#003366' },
  red: { bg: '#f5cccc', fg: '#cc3333' },
  emerald: { bg: '#cce9dd', fg: '#0b7a5a' },
} as const

export const HOSPITAL_CARD =
  'rounded-3xl bg-white shadow-[0_8px_30px_rgba(0,51,102,0.05)]'

/**
 * A KPI tile for the dashboard home (US-002). Matches the StatCard shape the
 * admin dashboard already uses, so the two products look like one system.
 */
export function StatTile({
  label,
  value,
  hint,
  tint = 'navy',
  loading = false,
}: {
  label: string
  value: number
  hint?: string
  tint?: keyof typeof TINT
  loading?: boolean
}) {
  const { bg, fg } = TINT[tint]
  return (
    <div className={`${HOSPITAL_CARD} p-6`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-500">{label}</p>
          <p className="mt-2 text-4xl font-semibold tabular-nums" style={{ color: fg }}>
            {loading ? '—' : value.toLocaleString('en-IN')}
          </p>
          {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
        </div>
        <span
          aria-hidden
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: bg }}
        >
          {tint === 'red' ? '❤️' : tint === 'emerald' ? '🏥' : '👥'}
        </span>
      </div>
    </div>
  )
}
