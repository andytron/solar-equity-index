import type { TractProperties } from '@/types'
import { colorForSeiTier } from '@/lib/tierColors'

interface Props {
  tract: TractProperties
  onClose: () => void
}

const fmt = {
  currency: (n: number) => `$${Math.round(n).toLocaleString()}`,
  pct: (n: number) => `${n.toFixed(1)}%`,
  percentileLabel: (fraction: number) => {
    const n = Math.round(fraction * 100)
    const j = n % 10
    const k = n % 100
    const suffix =
      j === 1 && k !== 11
        ? 'st'
        : j === 2 && k !== 12
          ? 'nd'
          : j === 3 && k !== 13
            ? 'rd'
            : 'th'
    return `${n}${suffix} percentile`
  },
}

const SCORE_ROWS: {
  label: string
  color: string
  getValue: (t: TractProperties) => number
}[] = [
  {
    label: 'Solar Potential',
    color: '#EECA3B',
    getValue: (t) => t.solar_potential_pctl,
  },
  {
    label: 'Energy Burden',
    color: '#E45756',
    getValue: (t) => t.energy_burden_pctl,
  },
  {
    label: 'Adoption Gap',
    color: '#4C78A8',
    getValue: (t) => t.low_adoption_pctl,
  },
]

function statRowsFor(tract: TractProperties) {
  return [
    { label: 'Median Income', value: fmt.currency(tract.median_hh_income) },
    { label: 'Energy Burden', value: fmt.pct(tract.energy_burden_pct) },
    { label: 'Solar Adoption', value: fmt.pct(tract.adoption_rate_pct) },
    {
      label: 'Rooftop Capacity',
      value: `${tract.rooftop_kw_per_hu.toFixed(1)} kW/unit`,
    },
  ] as const
}

export default function TractPanel({ tract, onClose }: Props) {
  const tierColor = colorForSeiTier(tract.sei_tier)
  const statRows = statRowsFor(tract)

  return (
    <div
      data-theme="dark"
      className="card card-border w-80 shadow-2xl absolute top-4 right-4 z-20 overflow-hidden"
    >
      <div className="card-body gap-0 p-0">
        {/* SEI Score */}
        <div
          className="relative px-4 pt-4 pb-3"
          style={{ borderLeft: `4px solid ${tierColor}` }}
        >
          {/* Close button — anchored top-right */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 btn btn-xs btn-circle btn-ghost"
            aria-label="Close panel"
          >
            ✕
          </button>

          {/* District label */}
          <div className="text-xs text-base-content/50 uppercase tracking-wide">
            {tract.district}
          </div>

          {/* SEI score + tier badge on same line */}
          <div className="flex items-end gap-2 mt-0.5">
            <span className="text-3xl font-bold font-mono tabular-nums">
              {tract.sei.toFixed(2)}
            </span>
            <span className="text-sm text-base-content/50 mb-1">/ 1.00</span>
            <span
              className="badge badge-sm font-medium border-0 mb-1 ml-1"
              style={{ backgroundColor: tierColor + '33', color: tierColor }}
            >
              {tract.sei_tier}
            </span>
          </div>

          {/* Percentile */}
          <div className="text-xs text-base-content/50 mt-0.5">
            {fmt.percentileLabel(tract.sei_percentile)} in {tract.district}
          </div>
        </div>

        <div className="divider my-0" />

        <div className="px-4 py-3 space-y-3">
          <div className="text-xs text-base-content/60 uppercase tracking-wide">
            Score Components
          </div>
          {SCORE_ROWS.map(({ label, color, getValue }) => {
            const value = getValue(tract)
            return (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-base-content/80">{label}</span>
                  <span className="text-base-content/60">
                    {fmt.percentileLabel(value)}
                  </span>
                </div>
                <div className="h-1.5 bg-base-content/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.round(value * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="divider my-0" />

        <div className="px-4 py-3 grid grid-cols-2 gap-3">
          {statRows.map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-base-content/60">{label}</div>
              <div className="text-sm font-mono font-medium mt-0.5">{value}</div>
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-base-content/10">
          <div className="text-xs text-base-content/50 font-mono">
            {tract.district} · Tract {tract.geoid.slice(-6)} · GEOID {tract.geoid}
          </div>
        </div>
      </div>
    </div>
  )
}
