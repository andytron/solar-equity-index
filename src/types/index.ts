import type { SeiTier } from '@/lib/tierColors'

/** Census tract properties from SEI GeoJSON features. */
export interface TractProperties {
  geoid: string
  district: string
  sei: number
  sei_tier: SeiTier
  sei_percentile: number
  solar_potential_pctl: number
  energy_burden_pctl: number
  low_adoption_pctl: number
  median_hh_income: number
  energy_burden_pct: number
  adoption_rate_pct: number
  rooftop_kw_per_hu: number
  pct_nonwhite: number
  majority_minority: number
}
