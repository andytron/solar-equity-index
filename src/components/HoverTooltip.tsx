'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import type { TractProperties } from '@/types'
import { colorForSeiTier } from '@/lib/tierColors'

interface Props {
  tract: TractProperties
  point: { x: number; y: number }
}

const PAD = 8
const OFFSET = 12

export default function HoverTooltip({ tract, point }: Props) {
  const elRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(() => ({
    left: point.x + OFFSET,
    top: point.y - OFFSET,
  }))

  useLayoutEffect(() => {
    const el = elRef.current
    if (!el) return

    const place = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const { width, height } = el.getBoundingClientRect()

      let left = point.x + OFFSET
      let top = point.y - OFFSET

      if (left + width > vw - PAD) {
        left = point.x - width - OFFSET
      }
      left = Math.max(PAD, Math.min(left, vw - width - PAD))

      if (top + height > vh - PAD) {
        top = point.y - height - OFFSET
      }
      top = Math.max(PAD, Math.min(top, vh - height - PAD))

      setPosition({ left, top })
    }

    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [point.x, point.y, tract.geoid])

  return (
    <div
      ref={elRef}
      data-theme="dark"
      className="card card-sm card-border shadow-lg pointer-events-none absolute z-10 text-sm"
      style={{ left: position.left, top: position.top }}
    >
      <div className="card-body gap-1 py-2 px-3">
        <div className="font-medium">{tract.district}</div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: colorForSeiTier(tract.sei_tier) }}
          />
          <span>{tract.sei_tier} Priority</span>
        </div>
        <div className="text-base-content/60 text-xs">
         <span className="font-mono">SEI: {tract.sei.toFixed(2)}</span> (Click for details)
        </div>
      </div>
    </div>
  )
}
