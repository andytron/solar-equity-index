'use client'

import { useEffect, useRef, useState } from 'react'
import { TIER_LEGEND_ITEMS } from '@/lib/tierColors'
import { SITE_TITLE } from '@/lib/site'

/** Shared pill style for mobile “Legend” control. */
export const MOBILE_BOTTOM_BAR_BTN_CLASS =
  'btn btn-sm h-9 min-h-9 shrink-0 rounded-full border border-base-content/10 bg-base-100/95 px-3 text-xs font-medium text-base-content/90 shadow'

function LegendContent() {
  return (
    <>
      <div className="text-xs text-base-content/80 uppercase tracking-wide">
        {SITE_TITLE}
      </div>
      <div className="flex flex-col gap-1.5">
        {TIER_LEGEND_ITEMS.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: color }}
            />
            {label} Priority
          </div>
        ))}
      </div>
    </>
  )
}

export function LegendMobileControl() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current
      if (root && !root.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={MOBILE_BOTTOM_BAR_BTN_CLASS}
        aria-expanded={open}
        aria-controls="map-legend-popover"
        aria-label={open ? 'Close legend' : 'Open map legend'}
      >
        Legend
      </button>

      {open && (
        <div
          id="map-legend-popover"
          className="card card-sm card-border bg-base-100 absolute bottom-full left-0 z-30 mb-2 w-56 shadow-2xl"
        >
          <div className="card-body gap-2 px-3 py-3">
            <LegendContent />
          </div>
        </div>
      )}
    </div>
  )
}

export default function Legend() {
  return (
    <div
      id="map-legend"
      className="bg-base-100 absolute bottom-[calc(var(--app-footer-h)+1rem)] left-4 z-20 hidden md:block"
    >
      <div className="card card-sm card-border w-fit shadow-lg">
        <div className="card-body gap-2 px-3 py-3">
          <LegendContent />
        </div>
      </div>
    </div>
  )
}
