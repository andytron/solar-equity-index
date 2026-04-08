'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import TractPanel from '@/components/TractPanel'
import HoverTooltip from '@/components/HoverTooltip'
import Legend from '@/components/Legend'
import type { TractProperties } from '@/types'

// Mapbox must be client-only — no SSR
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type HoverState = {
  tract: TractProperties
  point: { x: number; y: number }
}

export default function Home() {
  const [selectedTract, setSelectedTract] = useState<TractProperties | null>(
    null
  )
  const [hover, setHover] = useState<HoverState | null>(null)

  const onTractHover = useCallback(
    (props: TractProperties | null, point: { x: number; y: number } | null) => {
      if (props && point) setHover({ tract: props, point })
      else setHover(null)
    },
    []
  )

  const clearSelection = useCallback(() => {
    setSelectedTract(null)
  }, [])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-base-200">
      <Map onTractClick={setSelectedTract} onTractHover={onTractHover} />
      <Legend />
      {hover && !selectedTract && (
        <HoverTooltip tract={hover.tract} point={hover.point} />
      )}
      {selectedTract && (
        <TractPanel tract={selectedTract} onClose={clearSelection} />
      )}
    </main>
  )
}
