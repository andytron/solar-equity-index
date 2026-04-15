'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  /** Parent handles city switch, map fly, marker, and tract resolution. */
  onSelectSearchResult: (lng: number, lat: number) => void
  onClear?: () => void
  onClearRef?: (clearFn: () => void) => void
}

export default function SearchBar({ onSelectSearchResult, onClear, onClearRef }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    onClear?.()
  }, [onClear])

  const search = async (q: string) => {
    if (q.length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}` +
        `&types=address,neighborhood,place` +
        `&country=US&limit=5`
      )
      const data = await res.json()
      setResults(data.features ?? [])
    } finally {
      setLoading(false)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    if (!q) {
      setResults([])
      onClear?.()
      return
    }
    if (debounceRef.current !== undefined) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  const handleSelect = (feature: any) => {
    const [lng, lat] = feature.center
    setQuery(feature.place_name)
    setResults([])

    onSelectSearchResult(lng, lat)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') clear()
  }

  useEffect(() => {
    onClearRef?.(clear)
  }, [clear, onClearRef])

  return (
    <div className="absolute top-[calc(var(--app-header-h)+0.75rem)] z-20 max-md:left-3 max-md:right-3 max-md:w-auto max-md:translate-x-0 md:left-1/2 md:w-80 md:-translate-x-1/2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Search for an address"
          className="input input-sm w-full bg-base-100/95 shadow-lg border border-base-content/10 pr-14"
        />

        {/* Right-side controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <span className="loading loading-spinner loading-xs opacity-50" />
          )}
          {query && !loading && (
            <button
              type="button"
              onClick={clear}
              className="btn btn-xs btn-circle btn-ghost opacity-50 hover:opacity-100"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <ul className="menu bg-base-100/95 rounded-box shadow-lg mt-1 border border-base-content/10 p-1">
          {results.map((f) => (
            <li key={f.id}>
              <button
                className="text-sm text-left py-1.5"
                onClick={() => handleSelect(f)}
              >
                {f.place_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
