import { CITY_CONFIG, type CityKey } from '@/lib/utils'

interface Props {
  city: CityKey
  onChange: (city: CityKey) => void
  /** Merged onto the join wrapper (e.g. shrink-0 in header). */
  className?: string
}

export default function CityToggle({ city, onChange, className }: Props) {
  return (
    <div className={['join shadow-lg self-start', className].filter(Boolean).join(' ')}>
      {(Object.keys(CITY_CONFIG) as CityKey[]).map((key) => (
        <button
          key={key}
          className={`join-item btn btn-sm ${
            city === key
              ? 'border-transparent bg-base-content text-base-100 hover:bg-base-content/90'
              : 'btn-ghost bg-base-100/90'
          }`}
          onClick={() => onChange(key)}
        >
          {key.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
