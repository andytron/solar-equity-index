'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import mapboxgl from 'mapbox-gl'
import type { PaddingOptions } from 'mapbox-gl'
import TractPanel from '@/components/TractPanel'
import HoverTooltip from '@/components/HoverTooltip'
import Legend, { LegendMobileControl } from '@/components/Legend'
import CityToggle from '@/components/CityToggle'
import SearchBar from '@/components/SearchBar'
import TopTractsDrawer from '@/components/TopTractsDrawer'
import MethodologyModal from '@/components/MethodologyModal'
import type { TractProperties } from '@/types'
import { cityForLngLat, type CityKey } from '@/lib/utils'
import {
  AUTHOR_GITHUB_URL,
  AUTHOR_LINK_TEXT,
  COPYRIGHT_YEAR,
  SITE_TITLE,
} from '@/lib/site'
import { useVisualViewportHeight } from '@/hooks/useVisualViewportHeight'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type HoverState = {
  tract: TractProperties
  point: { x: number; y: number }
}

/** Extra bottom inset on narrow viewports so fitBounds keeps the tract above the docked TractPanel. */
function tractSelectionFitPadding(map: mapboxgl.Map | null): PaddingOptions | number {
  if (typeof window === 'undefined') return 120
  if (!window.matchMedia('(max-width: 767px)').matches) {
    return { top: 120, bottom: 120, left: 120, right: 120 }
  }
  const h = map?.getContainer().clientHeight || window.innerHeight
  const bottom = Math.min(Math.round(h * 0.62), 560)
  const top = Math.min(Math.round(h * 0.12), 140)
  return { top, bottom, left: 16, right: 16 }
}

function extendBoundsWithPolygonGeometry(
  bounds: mapboxgl.LngLatBounds,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon
) {
  if (geom.type === 'Polygon') {
    geom.coordinates[0]?.forEach((c) => bounds.extend(c as [number, number]))
  } else {
    for (const poly of geom.coordinates) {
      poly[0]?.forEach((c) => bounds.extend(c as [number, number]))
    }
  }
}

/**
 * Find a tract in the GeoJSON source by GEOID.
 * Avoids `querySourceFeatures(..., { filter })` — after tight fitBounds / map.stop,
 * filtered queries can spuriously return [] until the view changes.
 */
function findTractSourceFeature(map: mapboxgl.Map, geoid: string) {
  if (!map.getLayer('tracts-fill')) return null
  const want = String(geoid)
  const found = map
    .querySourceFeatures('tracts')
    .find((f) => String((f.properties as TractProperties | undefined)?.geoid) === want)
  if (!found?.geometry) return null
  const g = found.geometry
  if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') return null
  return found
}

/** Fit camera to tract geometry; no React state updates. */
function fitMapToTractGeoid(
  map: mapboxgl.Map,
  geoid: string,
  cached?: ReturnType<typeof findTractSourceFeature>
) {
  const feature = cached ?? findTractSourceFeature(map, geoid)
  if (!feature) return

  const geom = feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon
  const bounds = new mapboxgl.LngLatBounds()
  extendBoundsWithPolygonGeometry(bounds, geom)
  if (bounds.isEmpty()) return

  map.stop()
  map.fitBounds(bounds, {
    padding: tractSelectionFitPadding(map),
    maxZoom: 14,
    duration: 800,
  })
}

const mainChromeStyle = {
  '--app-header-h': 'calc(3.5rem + env(safe-area-inset-top, 0px))',
  '--app-footer-h': 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
  '--app-search-stack-h': '3rem',
  '--app-mobile-bottom-bar-h': '3.25rem',
  '--app-drawer-bottom-reserve-md': '15rem',
} as CSSProperties

export default function Home() {
  const visualViewportHeight = useVisualViewportHeight()
  const [city, setCity] = useState<CityKey>('nyc')
  const [selectedTract, setSelectedTract] = useState<TractProperties | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const placeSearchMarkerRef = useRef<((lng: number, lat: number) => void) | null>(null)
  const clearSearchMarkerRef = useRef<(() => void) | null>(null)
  const clearSearchRef = useRef<(() => void) | null>(null)
  const suppressOverviewFlyRef = useRef(false)
  const pendingSearchLngLatRef = useRef<{ lng: number; lat: number } | null>(null)
  const searchMoveEndCleanupRef = useRef<(() => void) | null>(null)

  const onTractHover = useCallback(
    (props: TractProperties | null, point: { x: number; y: number } | null) => {
      if (props && point) setHover({ tract: props, point })
      else setHover(null)
    },
    []
  )

  const handleCityChange = useCallback((next: CityKey) => {
    pendingSearchLngLatRef.current = null
    setCity(next)
    setSelectedTract(null)
    setHover(null)
    clearSearchMarkerRef.current?.()
    clearSearchRef.current?.()
  }, [])

  const handleTractClick = useCallback((props: TractProperties | null) => {
    if (!props) {
      setSelectedTract(null)
      return
    }
    clearSearchRef.current?.()
    clearSearchMarkerRef.current?.()
    setSelectedTract(props)

    const map = mapInstanceRef.current
    if (!map) return
    const runFrame = () => {
      const feature = findTractSourceFeature(map, props.geoid)
      fitMapToTractGeoid(map, props.geoid, feature)
    }
    if (map.loaded()) runFrame()
    else map.once('idle', runFrame)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTract(null)
    clearSearchRef.current?.()
  }, [])

  const selectTractById = useCallback((geoid: string) => {
    const map = mapInstanceRef.current
    if (!map) return

    const trySelect = () => {
      if (!map.getLayer('tracts-fill')) return
      const feature = findTractSourceFeature(map, geoid)
      if (!feature?.properties) return
      setSelectedTract(feature.properties as TractProperties)
      fitMapToTractGeoid(map, geoid, feature)
    }

    if (map.loaded()) trySelect()
    else map.once('idle', trySelect)
  }, [])

  const flyToSearchResultAndResolve = useCallback(
    (lng: number, lat: number) => {
      const map = mapInstanceRef.current
      if (!map) return

      searchMoveEndCleanupRef.current?.()
      placeSearchMarkerRef.current?.(lng, lat)

      map.flyTo({ center: [lng, lat], zoom: 13, duration: 1000 })

      const onMoveEnd = () => {
        if (!map.getLayer('tracts-fill')) return
        const point = map.project([lng, lat])
        const features = map.queryRenderedFeatures(point, {
          layers: ['tracts-fill'],
        })
        const geoid = features[0]?.properties?.geoid
        if (typeof geoid === 'string') selectTractById(geoid)
      }

      map.once('moveend', onMoveEnd)
      searchMoveEndCleanupRef.current = () => {
        map.off('moveend', onMoveEnd)
        searchMoveEndCleanupRef.current = null
      }
    },
    [selectTractById]
  )

  const handleSearchLocationSelect = useCallback(
    (lng: number, lat: number) => {
      const target = cityForLngLat(lng, lat)
      if (target == null) {
        flyToSearchResultAndResolve(lng, lat)
        return
      }
      if (target !== city) {
        suppressOverviewFlyRef.current = true
        pendingSearchLngLatRef.current = { lng, lat }
        setCity(target)
        return
      }
      flyToSearchResultAndResolve(lng, lat)
    },
    [city, flyToSearchResultAndResolve]
  )

  useEffect(() => {
    const pending = pendingSearchLngLatRef.current
    if (!pending) return
    const map = mapInstanceRef.current
    if (!map) return

    const { lng, lat } = pending
    const finish = () => {
      pendingSearchLngLatRef.current = null
      flyToSearchResultAndResolve(lng, lat)
    }

    map.once('idle', finish)
    return () => {
      map.off('idle', finish)
    }
  }, [city, flyToSearchResultAndResolve])

  return (
    <main
      className={
        visualViewportHeight == null
          ? 'relative min-h-[100dvh] w-screen overflow-hidden bg-base-200'
          : 'relative w-screen overflow-hidden bg-base-200'
      }
      style={
        visualViewportHeight == null
          ? mainChromeStyle
          : { ...mainChromeStyle, height: visualViewportHeight, minHeight: visualViewportHeight }
      }
    >
      <header className="fixed inset-x-0 top-0 z-30 border-b border-base-content/10 bg-base-100/85 pt-[env(safe-area-inset-top)] backdrop-blur-sm">
        <div className="flex h-14 min-w-0 items-center justify-between gap-3 px-4">
          <span className="truncate font-mono text-lg font-semibold tracking-tight text-base-content">
            {SITE_TITLE}
          </span>
          <div className="shrink-0 md:hidden">
            <CityToggle
              city={city}
              onChange={handleCityChange}
              className="self-center shadow-md"
            />
          </div>
        </div>
      </header>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-base-content/10 bg-base-100/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        <div className="flex min-h-10 flex-wrap items-center justify-center gap-x-1 gap-y-0.5 px-4 py-1.5 text-center text-xs leading-tight text-base-content">
          <span>© {COPYRIGHT_YEAR} {SITE_TITLE}</span>
          <span aria-hidden="true">·</span>
          <span>
            Built by{' '}
            <a
              href={AUTHOR_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-hover font-medium text-base-content"
            >
              {AUTHOR_LINK_TEXT}
            </a>
          </span>
        </div>
      </footer>

      <div className="absolute inset-x-0 top-0 bottom-[var(--app-footer-h)] z-0 min-h-0">
        <Map
          city={city}
          selectedGeoid={selectedTract?.geoid ?? null}
          suppressOverviewFlyRef={suppressOverviewFlyRef}
          onTractClick={handleTractClick}
          onTractHover={onTractHover}
          onMapReady={(map, placeSearchMarker, clearSearchMarker) => {
            mapInstanceRef.current = map
            placeSearchMarkerRef.current = placeSearchMarker
            clearSearchMarkerRef.current = clearSearchMarker
          }}
        />
      </div>

      {/* Top tracts drawer: desktop only — mobile scroll/z-index issues + tract sheet priority */}
      <div className="absolute left-4 z-20 hidden flex-col gap-2 md:flex md:top-[calc(var(--app-header-h)+0.75rem)]">
        <CityToggle city={city} onChange={handleCityChange} />
        <TopTractsDrawer
          city={city}
          onTractSelect={selectTractById}
          isOpen={drawerOpen}
          onToggle={() => setDrawerOpen((o) => !o)}
        />
      </div>

      <SearchBar
        onSelectSearchResult={handleSearchLocationSelect}
        onClear={() => clearSearchMarkerRef.current?.()}
        onClearRef={(fn) => {
          clearSearchRef.current = fn
        }}
      />
      <Legend />

      {!selectedTract && (
        <div className="absolute inset-x-3 bottom-[calc(var(--app-footer-h)+0.75rem)] z-20 grid min-h-[var(--app-mobile-bottom-bar-h)] grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,1fr)] items-center gap-x-2 md:hidden">
          <div className="flex min-w-0 justify-start">
            <LegendMobileControl />
          </div>
          <div className="pointer-events-none flex min-w-0 justify-center px-1">
            <span className="inline-block max-w-[min(11rem,calc(100vw-8.5rem))] truncate rounded-full bg-base-100/90 px-4 py-2 text-center text-xs font-medium text-base-content/90 shadow">
              Tap a tract or use search
            </span>
          </div>
          <div className="flex min-w-0 justify-end">
            <button
              type="button"
              className="btn btn-sm btn-circle shrink-0 border border-base-content/10 bg-base-100/90 shadow"
              onClick={() => setMethodologyOpen(true)}
              aria-label="About this index"
            >
              ?
            </button>
          </div>
        </div>
      )}

      {!selectedTract && (
        <div className="pointer-events-none absolute bottom-[calc(var(--app-footer-h)+1rem)] left-1/2 z-10 hidden max-w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-full bg-base-100/90 px-4 py-2 text-center text-xs font-medium text-base-content/90 shadow md:block">
          Click any tract to explore · Search for an address
        </div>
      )}
      <MethodologyModal
        isOpen={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
      <button
        type="button"
        className="btn btn-sm btn-circle absolute bottom-[calc(var(--app-footer-h)+1rem)] right-4 z-20 hidden border border-base-content/10 bg-base-100/90 shadow md:inline-flex"
        onClick={() => setMethodologyOpen(true)}
        aria-label="About this index"
      >
        ?
      </button>

      {hover && !selectedTract && (
        <HoverTooltip tract={hover.tract} point={hover.point} />
      )}
      {selectedTract && (
        <TractPanel
          tract={selectedTract}
          onClose={clearSelection}
          mobileDockAboveChromeBar={false}
        />
      )}
    </main>
  )
}
