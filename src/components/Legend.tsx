import { TIER_LEGEND_ITEMS } from '@/lib/tierColors'

export default function Legend() {
  return (
    <div
      data-theme="dark"
      className="card card-sm card-border shadow-lg absolute bottom-8 left-4 z-10 w-fit"
    >
      <div className="card-body gap-2 py-3 px-3">
        <div className="text-xs text-base-content/60 uppercase tracking-wide">
          Solar Equity Index
        </div>
        <div className="flex flex-col gap-1.5">
          {TIER_LEGEND_ITEMS.map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              {label} Priority
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
