'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { TractProperties } from '@/types'
import { DEFAULT_TIER_COLOR, TIER_COLORS } from '@/lib/tierColors'
import { CITY_CONFIG, type CityKey } from '@/lib/utils'

interface MapProps {
  city: CityKey
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

export default function Map({ city, onTractClick, onTractHover, onMapReady }: MapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const searchMarkerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTractClickRef = useRef(onTractClick)
  const onTractHoverRef = useRef(onTractHover)

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
        basemap: {
          lightPreset: 'dawn',
          theme: 'monochrome',
        },
      },
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
          border: 3px solid #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.25), 0 2px 8px rgba(0,0,0,0.4);
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

    let selectedId: string | null = null

    map.on('click', 'tracts-fill', (e) => {
      if (!e.features?.length) return
      const props = e.features[0].properties as TractProperties

      if (selectedId) {
        map.setFeatureState({ source: 'tracts', id: selectedId }, { selected: false })
      }
      selectedId = props.geoid
      map.setFeatureState({ source: 'tracts', id: props.geoid }, { selected: true })
      onTractClickRef.current(props)
    })

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['tracts-fill'] })
      if (!features.length) {
        if (selectedId) {
          map.setFeatureState({ source: 'tracts', id: selectedId }, { selected: false })
          selectedId = null
        }
        onTractClickRef.current(null)
      }
    })

    mapRef.current = map
    return () => {
      alive = false
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
      map.flyTo({ center: cfg.center, zoom: cfg.zoom, duration: 1200 })
    }
  
    if (map.isStyleLoaded()) {
      applyCity()
    } else {
      map.once('style.load', applyCity)
    }
  }, [city])  

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

  return <div ref={containerRef} className="w-full h-full" />
}
