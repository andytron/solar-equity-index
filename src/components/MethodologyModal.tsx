import { SITE_TITLE } from '@/lib/site'
import { accentBadgeStyle } from '@/lib/tierColors'
interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function MethodologyModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-3xl max-h-[80vh] overflow-y-auto">
        <button
          className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5">
          <h3 className="font-mono font-bold text-lg">{SITE_TITLE}</h3>
          <p className="text-sm text-base-content/50 mt-0.5">
            Methodology and data sources
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-2 gap-6 text-sm">

          {/* Left column */}
          <div className="space-y-4">
            <section>
              <h4 className="font-semibold mb-1">What it measures</h4>
              <p className="text-base-content/70 leading-relaxed text-xs">
                The Solar Equity Index (SEI) identifies census tracts where
                the opportunity for solar intervention is greatest — where
                rooftop solar potential is high, low-to-moderate income
                households carry a disproportionate energy burden, and solar
                adoption has not yet taken hold.
              </p>
            </section>

            <section>
              <h4 className="font-semibold mb-1">Tiers</h4>
              <p className="text-base-content/70 leading-relaxed text-xs">
                Tracts are ranked within each city and divided into quartiles.{' '}
                <strong>Critical</strong> tracts are in the top 25% — the
                highest combined opportunity for solar equity intervention.
                Rankings are city-relative: a Critical tract in NYC is
                critical compared to other NYC tracts, not to LA.
              </p>
            </section>

            <section>
              <h4 className="font-semibold mb-1">Limitations</h4>
              <p className="text-base-content/70 leading-relaxed text-xs">
                Solar potential uses county-level irradiance averaged across
                sample points — tract-level shading and rooftop geometry are
                not captured. Adoption rates are estimated from zip-code level
                data allocated to tracts via residential population weights.
                Energy burden reflects 0–80% AMI households only. All data
                reflects the most recent available vintage (2022–2024).
              </p>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <section>
              <h4 className="font-semibold mb-3">Score components</h4>
              <div className="space-y-3">
                {[
                  {
                    label: 'Solar Potential',
                    weight: '40%',
                    color: '#EECA3B',
                    desc: 'Estimated rooftop PV capacity per housing unit from building structure type (Census B25024) and irradiance (NREL PVWatts v8).',
                  },
                  {
                    label: 'Energy Burden',
                    weight: '40%',
                    color: '#E45756',
                    desc: 'Average energy cost as % of income for 0–80% AMI households. Source: DOE LEAD Tool 2022, calibrated to EIA utility data.',
                  },
                  {
                    label: 'Adoption Gap',
                    weight: '20%',
                    color: '#4C78A8',
                    desc: 'Inverse of solar PV adoption rate — tracts with less existing solar score higher. Source: LBNL Tracking the Sun 2024 via HUD zip-to-tract crosswalk.',
                  },
                ].map(({ label, weight, color, desc }) => (
                  <div key={label} className="flex gap-3">
                    <div
                      className="w-1 rounded-full flex-shrink-0 mt-0.5 self-stretch"
                      style={{ backgroundColor: color }}
                    />
                    <div>
                      <div className="font-medium text-xs flex items-center gap-1.5">
                        {label}
                        <span
                          className="badge badge-xs border-0"
                          style={accentBadgeStyle(color)}
                        >
                          {weight}
                        </span>
                      </div>
                      <p className="text-base-content/60 text-xs leading-relaxed mt-0.5">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Data sources */}
            <section className="pt-3 border-t border-base-content/10">
              <h4 className="font-semibold mb-2 text-xs">Data sources</h4>
              <ul className="text-xs text-base-content/50 space-y-1">
                {[
                  'NREL PVWatts API v8',
                  'DOE LEAD Tool 2022 (ACS 5-yr 2018–2022)',
                  'LBNL Tracking the Sun 2024',
                  'Census ACS 2022 (B25024, B02001, B03003, B25070)',
                  'HUD USPS Zip-Tract Crosswalk Q4 2025',
                  'Census TIGER 2022 tract boundaries',
                ].map((src) => (
                  <li key={src} className="flex items-start gap-1.5">
                    <span className="opacity-50 mt-0.5">·</span>
                    {src}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  )
}
