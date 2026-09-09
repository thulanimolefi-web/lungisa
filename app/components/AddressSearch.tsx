'use client'

import { useState, useEffect, useRef } from 'react'
import { AREAS, matchAreaFromPlace } from '../lib/areas'
import { MAPBOX_ENABLED, newSessionToken, suggestAddress, retrieveAddress, AddressSuggestion } from '../lib/mapboxSearch'

export type ResolvedLocation = {
  area: string
  streetAddress?: string
  lat?: number
  lng?: number
}

type Props = {
  theme: 'light' | 'dark'
  /** Current area value (e.g. loaded from a draft) — shown in the manual fallback picker. */
  value: string
  onChange: (result: ResolvedLocation) => void
  inputStyle?: React.CSSProperties
  labelStyle?: React.CSSProperties
  placeholder?: string
}

export default function AddressSearch({ theme, value, onChange, inputStyle, labelStyle, placeholder }: Props) {
  // If no Mapbox token is configured, skip the search UI entirely and
  // behave exactly like the old suburb dropdown — no broken states.
  const [mode, setMode] = useState<'search' | 'manual'>(MAPBOX_ENABLED ? 'search' : 'manual')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [unmatchedNotice, setUnmatchedNotice] = useState(false)
  const sessionToken = useRef(newSessionToken())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (mode !== 'search') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 3) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const results = await suggestAddress(query, sessionToken.current)
      setSuggestions(results)
      setLoading(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, mode])

  async function pickSuggestion(s: AddressSuggestion) {
    setSuggestions([])
    setQuery(s.fullAddress)
    const resolved = await retrieveAddress(s.mapboxId, sessionToken.current)
    sessionToken.current = newSessionToken() // start a fresh billing session for the next search
    if (!resolved || isNaN(resolved.lat) || isNaN(resolved.lng)) {
      setUnmatchedNotice(true)
      setMode('manual')
      return
    }
    const matchedArea = matchAreaFromPlace(resolved.area)
    if (!matchedArea) {
      // We have a real address but couldn't confidently map it to one of
      // our service areas — ask the person to confirm the suburb so job
      // matching against tradesperson service areas still works.
      setUnmatchedNotice(true)
      setMode('manual')
      return
    }
    setUnmatchedNotice(false)
    onChange({ area: matchedArea, streetAddress: resolved.streetAddress, lat: resolved.lat, lng: resolved.lng })
  }

  const dark = theme === 'dark'
  const baseInput: React.CSSProperties = inputStyle || {
    width: '100%', padding: '12px 16px', borderRadius: 8, fontSize: 15, outline: 'none', marginBottom: 6,
    background: dark ? 'rgba(255,255,255,.05)' : '#fff',
    border: dark ? '1.5px solid rgba(255,255,255,.1)' : '1.5px solid #E5DFD3',
    color: dark ? '#F5F0E8' : '#2C2C28',
  }
  const dropdownStyle: React.CSSProperties = {
    background: dark ? '#2A2A27' : '#fff',
    border: dark ? '1px solid rgba(255,255,255,.12)' : '1px solid #E5DFD3',
    borderRadius: 8, marginTop: -2, marginBottom: 10, overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(0,0,0,.15)',
  }
  const itemStyle: React.CSSProperties = {
    padding: '10px 14px', fontSize: 13.5, cursor: 'pointer',
    color: dark ? 'rgba(245,240,232,.85)' : '#2C2C28',
    borderBottom: dark ? '1px solid rgba(255,255,255,.06)' : '1px solid #F0EBE0',
  }
  const linkStyle: React.CSSProperties = {
    fontSize: 12.5, color: dark ? 'rgba(224,122,95,.9)' : '#C4593A', cursor: 'pointer',
    textDecoration: 'underline', marginBottom: 14, display: 'inline-block',
  }

  if (mode === 'manual') {
    return (
      <div>
        {unmatchedNotice && (
          <div style={{ fontSize: 12.5, marginBottom: 8, color: dark ? '#E8A020' : '#B4780A', lineHeight: 1.5 }}>
            We couldn&apos;t match that address to one of our service areas — please pick your suburb below instead.
          </div>
        )}
        <select
          style={{ ...baseInput, marginBottom: 6 }}
          value={value}
          onChange={e => onChange({ area: e.target.value })}
        >
          <option value="">Select area</option>
          {AREAS.map(a => <option key={a}>{a}</option>)}
        </select>
        {MAPBOX_ENABLED && (
          <span style={linkStyle} onClick={() => { setMode('search'); setUnmatchedNotice(false) }}>
            ← Search by street address instead
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={baseInput}
        type="text"
        value={query}
        placeholder={placeholder || 'Start typing your street address...'}
        onChange={e => setQuery(e.target.value)}
      />
      {loading && <div style={{ fontSize: 12, color: dark ? 'rgba(245,240,232,.4)' : '#8A8578', marginBottom: 8 }}>Searching...</div>}
      {suggestions.length > 0 && (
        <div style={dropdownStyle}>
          {suggestions.map(s => (
            <div key={s.mapboxId} style={itemStyle} onClick={() => pickSuggestion(s)}>
              {s.fullAddress}
            </div>
          ))}
        </div>
      )}
      <div>
        <span style={linkStyle} onClick={() => { setMode('manual'); setSuggestions([]) }}>
          Can&apos;t find your address? Choose your suburb instead
        </span>
      </div>
    </div>
  )
}
