export const TIER_COLORS = {
  Critical: '#d73027',
  High: '#fc8d59',
  Moderate: '#fee08b',
  Low: '#1a9850',
} as const

export type SeiTier = keyof typeof TIER_COLORS

/** Legend / summary order (highest attention first). */
export const TIER_ORDER = [
  'Critical',
  'High',
  'Moderate',
  'Low',
] as const satisfies readonly SeiTier[]

export const TIER_LEGEND_ITEMS = TIER_ORDER.map((label) => ({
  label,
  color: TIER_COLORS[label],
}))

/** Default fill when `sei_tier` is missing or unexpected (matches map fallback). */
export const DEFAULT_TIER_COLOR = '#cccccc'

export function colorForSeiTier(tier: string): string {
  return tier in TIER_COLORS ? TIER_COLORS[tier as SeiTier] : DEFAULT_TIER_COLOR
}
