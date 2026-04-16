'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { TractProperties } from '@/types'
import { STANDARD_BASEMAP } from '@/lib/mapBasemap'
import { DEFAULT_TIER_COLOR, TIER_COLORS } from '@/lib/tierColors'
import { CITY_CONFIG, type CityKey } from '@/lib/utils'

interface MapProps {
  city: CityKey
  /** Selected tract GEOID from app state (drawer, search, etc.) — keeps map highlight in sync with map clicks. */
  selectedGeoid: string | null
  /** When true on the next city apply, only swap tract GeoJSON — skip default overview fly (e.g. search-driven city switch). */
  suppressOverviewFlyRef?: MutableRefObject<boolean>
  onTractClick: (props: TractProperties | null) => void
  onTractHover: (
    props: TractProperties | null,
    point: { x: number; y: number } | null
  ) => void
  onMapReady: (
    map: mapboxgl.Map,
    placeSearchMarker: (lng: number, lat: number) => void,
    clearSearchMarker: () => void
  ) => void
}

export default function Map({
  city,
  selectedGeoid,
  suppressOverviewFlyRef,
  onTractClick,
  onTractHover,
  onMapReady,
}: MapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const appliedHighlightGeoidRef = useRef<string | null>(null)
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const searchMarkerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTractClickRef = useRef(onTractClick)
  const onTractHoverRef = useRef(onTractHover)
  const [tilesLoading, setTilesLoading] = useState(true)

  useEffect(() => {
    onTractClickRef.current = onTractClick
    onTractHoverRef.current = onTractHover
  })

  // Initialize map once
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return

    mapboxgl.accessToken = token
    const cfg = CITY_CONFIG[city]

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/standard',
      config: {
        basemap: STANDARD_BASEMAP,
      },
      attributionControl: false,
      center: cfg.center,
      zoom: cfg.zoom,
    })

    let alive = true

    map.on('load', () => {
      if (!alive) return

      map.addSource('tracts', {
        type: 'geojson',
        data: cfg.geojson,
        promoteId: 'geoid',
      })

      map.addLayer({
        id: 'tracts-fill',
        type: 'fill',
        source: 'tracts',
        paint: {
          'fill-color': [
            'match',
            ['get', 'sei_tier'],
            'Critical', TIER_COLORS.Critical,
            'High',     TIER_COLORS.High,
            'Moderate', TIER_COLORS.Moderate,
            'Low',      TIER_COLORS.Low,
            DEFAULT_TIER_COLOR,
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 0.95,
            ['boolean', ['feature-state', 'hovered'], false],  0.85,
            0.65,
          ],
        },
      })

      map.addLayer({
        id: 'tracts-outline',
        type: 'line',
        source: 'tracts',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#ffffff',
            'rgba(255,255,255,0.15)',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], 2,
            0.5,
          ],
        },
      })

      map.on('sourcedata', (e) => {
        if (e.sourceId === 'tracts' && e.isSourceLoaded) {
          setTilesLoading(false)
        }
      })

      const placeSearchMarker = (lng: number, lat: number) => {
        // Clear existing marker and any pending timeout
        if (searchMarkerRef.current) {
          searchMarkerRef.current.remove()
          searchMarkerRef.current = null
        }
        if (searchMarkerTimeoutRef.current) {
          clearTimeout(searchMarkerTimeoutRef.current)
          searchMarkerTimeoutRef.current = null
        }
      
        const el = document.createElement('div')
        el.style.cssText = `
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          border: 3px solid var(--color-primary);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-primary) 28%, transparent), 0 2px 8px rgba(0,0,0,0.4);
          transition: opacity 0.5s ease;
        `

        searchMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map)
      
        // Auto-clear after 3 seconds with a fade
        searchMarkerTimeoutRef.current = setTimeout(() => {
          if (searchMarkerRef.current) {
            el.style.opacity = '0'
            setTimeout(() => {
              searchMarkerRef.current?.remove()
              searchMarkerRef.current = null
            }, 500) // matches transition duration
          }
        }, 3000)
      }

      const clearSearchMarker = () => {
        if (searchMarkerTimeoutRef.current) {
          clearTimeout(searchMarkerTimeoutRef.current)
          searchMarkerTimeoutRef.current = null
        }
        if (searchMarkerRef.current) {
          searchMarkerRef.current.remove()
          searchMarkerRef.current = null
        }
      }

      onMapReady(map, placeSearchMarker, clearSearchMarker)
    })

    let hoveredId: string | null = null

    map.on('mousemove', 'tracts-fill', (e) => {
      if (!e.features?.length) return
      map.getCanvas().style.cursor = 'pointer'

      const feature = e.features[0]
      const props = feature.properties as TractProperties

      if (hoveredId && hoveredId !== props.geoid) {
        map.setFeatureState({ source: 'tracts', id: hoveredId }, { hovered: false })
      }
      hoveredId = props.geoid
      map.setFeatureState({ source: 'tracts', id: props.geoid }, { hovered: true })
      onTractHoverRef.current(props, { x: e.point.x, y: e.point.y })
    })

    map.on('mouseleave', 'tracts-fill', () => {
      map.getCanvas().style.cursor = ''
      if (hoveredId) {
        map.setFeatureState({ source: 'tracts', id: hoveredId }, { hovered: false })
        hoveredId = null
      }
      onTractHoverRef.current(null, null)
    })

    // Single handler: layer-specific + global map clicks both fire; a second handler
    // calling onTractClick(null) when queryRenderedFeatures misses the tract clears selection.
    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['tracts-fill'] })
      if (features.length > 0) {
        onTractClickRef.current(features[0].properties as TractProperties)
      } else {
        onTractClickRef.current(null)
      }
    })

    mapRef.current = map

    const container = containerRef.current
    const resizeObserver =
      container &&
      new ResizeObserver(() => {
        map.resize()
      })
    if (container && resizeObserver) {
      resizeObserver.observe(container)
      requestAnimationFrame(() => map.resize())
    }

    return () => {
      alive = false
      resizeObserver?.disconnect()
      if (searchMarkerTimeoutRef.current) clearTimeout(searchMarkerTimeoutRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [token]) // intentionally omit city — handled in separate effect below

  // Respond to city changes without reinitializing the map
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
  
    const cfg = CITY_CONFIG[city]
  
    const applyCity = () => {
      const source = map.getSource('tracts') as mapboxgl.GeoJSONSource | undefined
      if (source) source.setData(cfg.geojson)
      if (suppressOverviewFlyRef?.current) {
        suppressOverviewFlyRef.current = false
        return
      }
      map.flyTo({ center: cfg.center, zoom: cfg.zoom, duration: 1200 })
    }
  
    if (map.isStyleLoaded()) {
      applyCity()
    } else {
      map.once('style.load', applyCity)
    }
  }, [city, suppressOverviewFlyRef])

  useEffect(() => {
    appliedHighlightGeoidRef.current = null
  }, [city])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const sync = () => {
      if (!map.isStyleLoaded() || !map.getLayer('tracts-fill')) return
      const prev = appliedHighlightGeoidRef.current
      if (prev === selectedGeoid) return
      if (prev) {
        map.setFeatureState({ source: 'tracts', id: prev }, { selected: false })
      }
      if (selectedGeoid) {
        map.setFeatureState({ source: 'tracts', id: selectedGeoid }, { selected: true })
      }
      appliedHighlightGeoidRef.current = selectedGeoid
    }

    if (map.isStyleLoaded() && map.getLayer('tracts-fill')) {
      sync()
    } else {
      map.once('idle', sync)
      return () => {
        map.off('idle', sync)
      }
    }
  }, [selectedGeoid, city])

  if (!token) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-base-200 text-base-content p-6 text-center text-sm">
        <p>
          Set{' '}
          <code className="text-xs bg-base-300 px-1 rounded">
            NEXT_PUBLIC_MAPBOX_TOKEN
          </code>{' '}
          in{' '}
          <code className="text-xs bg-base-300 px-1 rounded">.env.local</code>{' '}
          to load the map.
        </p>
      </div>
    )
  }

  return (
    <div className="relative z-0 h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="application"
        aria-label="Solar Equity Index map"
      />
      {tilesLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-200/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="loading loading-spinner loading-lg" />
            <span className="text-sm text-base-content/60">Loading map data...</span>
          </div>
        </div>
      )}
    </div>
  )
}
