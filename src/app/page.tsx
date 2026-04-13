'use client'

import { useCallback, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import mapboxgl from 'mapbox-gl'
import TractPanel from '@/components/TractPanel'
import HoverTooltip from '@/components/HoverTooltip'
import Legend from '@/components/Legend'
import CityToggle from '@/components/CityToggle'
import SearchBar from '@/components/SearchBar'
import TopTractsDrawer from '@/components/TopTractsDrawer'
import MethodologyModal from '@/components/MethodologyModal'
import type { TractProperties } from '@/types'
import { type CityKey } from '@/lib/utils'

const Map = dynamic(() => import('@/components/Map'), { ssr: false })

type HoverState = {
  tract: TractProperties
  point: { x: number; y: number }
}

export default function Home() {
  const [city, setCity] = useState<CityKey>('nyc')
  const [selectedTract, setSelectedTract] = useState<TractProperties | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [methodologyOpen, setMethodologyOpen] = useState(false)
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null)
  const placeSearchMarkerRef = useRef<((lng: number, lat: number) => void) | null>(null)
  const clearSearchMarkerRef = useRef<(() => void) | null>(null)
  const clearSearchRef = useRef<(() => void) | null>(null)

  const onTractHover = useCallback(
    (props: TractProperties | null, point: { x: number; y: number } | null) => {
      if (props && point) setHover({ tract: props, point })
      else setHover(null)
    },
    []
  )

  // 1. City toggle
  const handleCityChange = useCallback((next: CityKey) => {
    setCity(next)
    setSelectedTract(null)
    setHover(null)
    clearSearchMarkerRef.current?.()
    clearSearchRef.current?.()        // clear search bar
  }, [])

  // 2. Clicking a tract directly on the map (not via search)
  // In setSelectedTract call from onTractClick, also clear search
  // Wrap the setter:
  const handleTractClick = useCallback((props: TractProperties | null) => {
    setSelectedTract(props)
    if (props) {
      clearSearchRef.current?.()      // clear search when user clicks map directly
      clearSearchMarkerRef.current?.()
    }
  }, [])

  // 3. Closing the panel
  const clearSelection = useCallback(() => {
    setSelectedTract(null)
    // don't clear search here — user might want to re-select
  }, [])

  const selectTractById = useCallback((geoid: string) => {
    const map = mapInstanceRef.current
    if (!map) return
  
    const trySelect = () => {
      // Guard: layer must exist before querying
      if (!map.getLayer('tracts-fill')) return

      const features = map.querySourceFeatures('tracts', {
        filter: ['==', ['get', 'geoid'], geoid],
      })
      
      if (features.length > 0) {
        setSelectedTract(features[0].properties as TractProperties)
        const geom = features[0].geometry as GeoJSON.Polygon
        if (geom?.coordinates?.[0]) {
          const bounds = new mapboxgl.LngLatBounds()
          geom.coordinates[0].forEach((c) => bounds.extend(c as [number, number]))
          map.fitBounds(bounds, { padding: 120, maxZoom: 14, duration: 800 })
        }
      }
    }
  
    // If tiles are loaded try immediately, otherwise wait for idle
    if (map.loaded()) {
      trySelect()
    } else {
      map.once('idle', trySelect)
    }
  }, [])

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-base-200">
      <Map
        city={city}
        onTractClick={handleTractClick}
        onTractHover={onTractHover}
        onMapReady={(map, placeSearchMarker, clearSearchMarker) => {
          mapInstanceRef.current = map
          placeSearchMarkerRef.current = placeSearchMarker
          clearSearchMarkerRef.current = clearSearchMarker
        }}
      />

      <CityToggle city={city} onChange={handleCityChange} />
      <SearchBar
        mapRef={mapInstanceRef}
        onTractFound={selectTractById}
        onSearchResult={(lng, lat) => placeSearchMarkerRef.current?.(lng, lat)}
        onClear={() => clearSearchMarkerRef.current?.()}
        onClearRef={(fn) => { clearSearchRef.current = fn }}
      />
      <TopTractsDrawer
        city={city}
        onTractSelect={selectTractById}
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen((o) => !o)}
      />
      <Legend />
      <MethodologyModal
        isOpen={methodologyOpen}
        onClose={() => setMethodologyOpen(false)}
      />
      <button
        className="absolute bottom-8 right-4 z-20 btn btn-sm btn-circle bg-base-100/90 border border-base-content/10 shadow"
        onClick={() => setMethodologyOpen(true)}
        aria-label="About this index"
      >
        ?
      </button>

      {hover && !selectedTract && (
        <HoverTooltip tract={hover.tract} point={hover.point} />
      )}
      {selectedTract && (
        <TractPanel tract={selectedTract} onClose={clearSelection} />
      )}
    </main>
  )
}
