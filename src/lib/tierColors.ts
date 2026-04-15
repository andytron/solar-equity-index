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

/** Dark label on light yellow fills so small tier badges stay readable. */
const MODERATE_BADGE_FG = '#453810'

export function tierBadgeStyle(tier: string): { backgroundColor: string; color: string } {
  const fill = colorForSeiTier(tier)
  return {
    backgroundColor: fill + '33',
    color: tier === 'Moderate' ? MODERATE_BADGE_FG : fill,
  }
}

const LIGHT_BADGE_ACCENTS = new Set(['#eeca3b', '#fee08b'])

/** Weight / accent chips on light gold (methodology, etc.). */
export function accentBadgeStyle(accentHex: string): { backgroundColor: string; color: string } {
  const color = LIGHT_BADGE_ACCENTS.has(accentHex.trim().toLowerCase())
    ? MODERATE_BADGE_FG
    : accentHex
  return {
    backgroundColor: accentHex + '22',
    color,
  }
}
