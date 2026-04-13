import type { SeiTier } from '@/types'

export const TIER_COLORS: Record<SeiTier, string> = {
  Critical: '#d73027',
  High:     '#fc8d59',
  Moderate: '#fee08b',
  Low:      '#1a9850',
}

export const CITY_CONFIG = {
  nyc: {
    label:    'New York City',
    center:   [-74.006, 40.7128] as [number, number],
    zoom:     9.5,
    geojson:  '/data/sei_tracts_nyc_frontend.geojson',
    topTracts: '/data/nyc-top-tracts.json',
  },
  la: {
    label:    'Los Angeles',
    center:   [-118.2437, 34.0522] as [number, number],
    zoom:     9,
    geojson:  '/data/sei_tracts_la_frontend.geojson',
    topTracts: '/data/la-top-tracts.json',
  },
} as const

export type CityKey = keyof typeof CITY_CONFIG

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