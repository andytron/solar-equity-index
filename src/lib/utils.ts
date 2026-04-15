import type { SeiTier } from '@/lib/tierColors'

export const TIER_COLORS: Record<SeiTier, string> = {
  Critical: '#d73027',
  High:     '#fc8d59',
  Moderate: '#fee08b',
  Low:      '#1a9850',
}

/** [west, south, east, north] — generous bounds around each dataset for search / geocoding checks */
export const CITY_CONFIG = {
  nyc: {
    label:    'New York City',
    center:   [-74.006, 40.7128] as [number, number],
    zoom:     9.5,
    geojson:  '/data/sei_tracts_nyc_frontend.geojson',
    topTracts: '/data/nyc-top-tracts.json',
    coverageBbox: [-74.35, 40.42, -73.55, 41.05] as [number, number, number, number],
  },
  la: {
    label:    'Los Angeles',
    center:   [-118.2437, 34.0522] as [number, number],
    zoom:     9,
    geojson:  '/data/sei_tracts_la_frontend.geojson',
    topTracts: '/data/la-top-tracts.json',
    coverageBbox: [-119.05, 33.62, -117.55, 34.9] as [number, number, number, number],
  },
} as const

export type CityKey = keyof typeof CITY_CONFIG

export function lngLatInBbox(
  lng: number,
  lat: number,
  bbox: readonly [number, number, number, number]
): boolean {
  const [w, s, e, n] = bbox
  return lng >= w && lng <= e && lat >= s && lat <= n
}

/** Which choropleth dataset contains this point, if any (NYC and LA coverage do not overlap). */
export function cityForLngLat(lng: number, lat: number): CityKey | null {
  const inNyc = lngLatInBbox(lng, lat, CITY_CONFIG.nyc.coverageBbox)
  const inLa = lngLatInBbox(lng, lat, CITY_CONFIG.la.coverageBbox)
  if (inNyc) return 'nyc'
  if (inLa) return 'la'
  return null
}

export const fmt = {
  currency: (n: number) =>
    `$${Math.round(n).toLocaleString()}`,
  pct: (n: number) =>
    `${n.toFixed(1)}%`,
  score: (n: number) =>
    `${(n * 100).toFixed(0)}`,
  percentile: (n: number) =>
    `${(n * 100).toFixed(0)}th`,
}

export const TIER_LABELS: Record<SeiTier, string> = {
  Critical: 'Critical opportunity (high solar potential, high burden, low adoption)',
  High:     'High opportunity (strong case for solar intervention)',
  Moderate: 'Moderate opportunity (some barriers present)',
  Low:      'Lower relative opportunity within this city',
}