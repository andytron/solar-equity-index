import { CITY_CONFIG, type CityKey } from '@/lib/utils'

interface Props {
  city: CityKey
  onChange: (city: CityKey) => void
}

export default function CityToggle({ city, onChange }: Props) {
  return (
    <div className="absolute top-4 left-4 z-20 join shadow-lg">
      {(Object.keys(CITY_CONFIG) as CityKey[]).map((key) => (
        <button
          key={key}
          className={`join-item btn btn-sm ${
            city === key ? 'btn-primary' : 'btn-ghost bg-base-100/90'
          }`}
          onClick={() => onChange(key)}
        >
          {key.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
