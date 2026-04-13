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
    <div className="absolute top-16 left-4 z-20 flex items-start">
      {/* Drawer panel */}
      <div
        className={`transition-all duration-300 overflow-hidden ${isOpen ? 'w-72' : 'w-0'}`}
      >
        <div
          ref={listScrollRef}
          className="w-72 bg-base-100/95 shadow-lg border-r border-base-content/10 h-fit max-h-[calc(100vh-17rem)] overflow-y-auto"
        >
          <div className="px-3 py-2 border-b border-base-content/10">
            <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Top Opportunity Tracts
            </div>
            <div className="text-xs opacity-50 mt-0.5">
              Highest SEI · {CITY_CONFIG[city].label}
            </div>
          </div>
          <ul className="divide-y divide-base-content/5">
            {tracts.map((tract, i) => (
              <li key={tract.geoid}>
                <button
                  className="w-full text-left px-3 py-2 hover:bg-base-content/5 transition-colors flex items-start gap-2"
                  onClick={() => onTractSelect(tract.geoid)}
                >
                  <span className="text-xs opacity-50 w-4 flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: TIER_COLORS[tract.sei_tier] }}
                      />
                      <span className="text-sm font-medium truncate">
                        {tract.display_name}
                      </span>
                    </div>
                    <div className="font-mono text-xs opacity-50 mt-0.5 flex gap-2">
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

      {/* Toggle tab — attached to right edge of drawer */}
      <button
        onClick={onToggle}
        className="flex flex-col items-center justify-center gap-1 bg-base-100/95 border border-l-0 border-base-content/10 shadow px-1.5 py-3 rounded-r-lg hover:bg-base-200/95 transition-colors min-h-[51px]"
        title={isOpen ? 'Hide top tracts' : 'Show top tracts'}
        aria-label={isOpen ? 'Hide top tracts' : 'Show top tracts'}
      >
        {/* Chevron icon that flips direction */}
        <svg
          className={`w-3 h-3 opacity-50 transition-transform duration-300 ${isOpen ? 'rotate-0' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>

        {/* Vertical label */}
        {isOpen
        ? null : (
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
