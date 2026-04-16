'use client'

import { useLayoutEffect, useState } from 'react'

/**
 * Tracks `visualViewport.height` (falls back to `innerHeight`) so full-screen shells
 * match the visible viewport on iOS Safari, where `100vh` / layout viewport often disagree.
 */
export function useVisualViewportHeight() {
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const update = () => {
      const vv = window.visualViewport
      setHeight(vv ? vv.height : window.innerHeight)
    }
    update()
    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', update)
      vv.addEventListener('scroll', update)
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      if (vv) {
        vv.removeEventListener('resize', update)
        vv.removeEventListener('scroll', update)
      }
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return height
}
