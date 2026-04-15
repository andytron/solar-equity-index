'use client'

import { useEffect, useRef, useState } from 'react'
import { CITY_CONFIG, TIER_COLORS, fmt, type CityKey } from '@/lib/utils'
import type { TopTract } from '@/types'

const DRAWER_CLOSE_SCROLL_DELAY_MS = 300

interface Props {
  city: CityKey
  onTractSelect: (geoid: string) => void
  isOpen: boolean
  onToggle: () => void
}

/** Desktop-only (parent hides on `max-md`). */
export default function TopTractsDrawer({
  city, onTractSelect, isOpen, onToggle
}: Props) {
  const [tracts, setTracts] = useState<TopTract[]>([])
  const listScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      const id = window.setTimeout(() => {
        listScrollRef.current?.scrollTo({ top: 0 })
      }, DRAWER_CLOSE_SCROLL_DELAY_MS)
      return () => window.clearTimeout(id)
    }
  }, [isOpen])

  useEffect(() => {
    let cancelled = false
    fetch(CITY_CONFIG[city].topTracts)
      .then(r => r.json())
      .then((data: TopTract[]) => {
        if (cancelled) return
        setTracts(data)
        queueMicrotask(() => {
          requestAnimationFrame(() => {
            if (!cancelled) listScrollRef.current?.scrollTo({ top: 0 })
          })
        })
      })
    return () => {
      cancelled = true
    }
  }, [city])

  return (
    <div className="flex items-start self-start">
      <div
        className={`transition-[width] duration-300 ease-out ${
          isOpen
            ? 'w-72 overflow-x-hidden'
            : 'w-0 overflow-hidden'
        }`}
      >
        <div
          ref={listScrollRef}
          className="w-72 max-h-[calc(100vh-var(--app-header-h)-var(--app-footer-h)-var(--app-drawer-bottom-reserve-md))] overflow-y-auto bg-base-100/95 shadow-lg border-r border-base-content/10"
        >
          <div className="px-3 py-2 border-b border-base-content/10">
            <div className="text-xs font-semibold uppercase tracking-wide text-base-content/80">
              Top Opportunity Tracts
            </div>
            <div className="text-xs text-base-content/50 mt-0.5">
              Highest SEI · {CITY_CONFIG[city].label}
            </div>
          </div>
          <ul className="divide-y divide-base-content/5">
            {tracts.map((tract, i) => (
              <li key={tract.geoid}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-base-content/5"
                  onClick={() => onTractSelect(tract.geoid)}
                >
                  <span className="mt-0.5 w-4 flex-shrink-0 text-xs text-base-content/50">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: TIER_COLORS[tract.sei_tier] }}
                      />
                      <span className="truncate text-sm font-medium">
                        {tract.display_name}
                      </span>
                    </div>
                    <div className="mt-0.5 flex gap-2 font-mono text-xs text-base-content/50">
                      <span>SEI {tract.sei.toFixed(2)}</span>
                      <span>·</span>
                      <span>{fmt.pct(tract.energy_burden_pct)} burden</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-[51px] flex-col items-center justify-center gap-1 rounded-r-lg border border-l-0 border-base-content/10 bg-base-100/95 px-1.5 py-3 shadow transition-colors hover:bg-base-200/95"
        title={isOpen ? 'Hide top tracts' : 'Show top tracts'}
        aria-label={isOpen ? 'Hide top tracts' : 'Show top tracts'}
      >
        <svg
          className={`h-3 w-3 opacity-50 transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>

        {isOpen ? null : (
          <span
            className="text-xs font-medium tracking-wide"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Top Tracts
          </span>
        )}
      </button>
    </div>
  )
}
