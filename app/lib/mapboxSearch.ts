// Thin client for Mapbox's Search Box API — used for the street-address
// autocomplete on the job-posting flow. No SDK dependency; just two fetch
// calls (suggest → retrieve), which is all the Search Box API needs.
//
// Setup: create a free Mapbox account at https://account.mapbox.com/,
// grab a public (pk.*) access token, and set it as NEXT_PUBLIC_MAPBOX_TOKEN
// in your environment. Until that's set, MAPBOX_ENABLED is false and every
// address field in the app falls back to the plain suburb dropdown — no
// broken UI, just the old picklist experience.
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
export const MAPBOX_ENABLED = MAPBOX_TOKEN.length > 0

// Rough centre of Gauteng (Johannesburg CBD) — used to bias results
// towards our actual service area rather than the rest of South Africa.
const GAUTENG_PROXIMITY = '28.0473,-26.2041'

export function newSessionToken(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export type AddressSuggestion = {
  mapboxId: string
  name: string
  fullAddress: string
}

export async function suggestAddress(query: string, sessionToken: string): Promise<AddressSuggestion[]> {
  if (!MAPBOX_ENABLED || query.trim().length < 3) return []
  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken,
    country: 'za',
    language: 'en',
    limit: '5',
    proximity: GAUTENG_PROXIMITY,
    types: 'address,street,place,locality,neighborhood',
  })
  try {
    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.suggestions || []).map((s: any) => ({
      mapboxId:    s.mapbox_id,
      name:        s.name,
      fullAddress: s.full_address || s.place_formatted || s.name,
    }))
  } catch {
    return []
  }
}

export type ResolvedAddress = {
  streetAddress: string
  area: string | null
  lat: number
  lng: number
}

export async function retrieveAddress(mapboxId: string, sessionToken: string): Promise<ResolvedAddress | null> {
  if (!MAPBOX_ENABLED) return null
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    session_token: sessionToken,
  })
  try {
    const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null
    const props = feature.properties || {}
    const context = props.context || {}
    const [lng, lat] = feature.geometry?.coordinates || []
    // Prefer the most specific place-like field a South African address
    // typically has, from suburb-level down to city-level.
    const placeGuess =
      context.neighborhood?.name ||
      context.locality?.name ||
      context.place?.name ||
      props.place_formatted?.split(',')?.[0] ||
      null
    return {
      streetAddress: props.full_address || props.place_formatted || props.name || '',
      area: placeGuess,
      lat: typeof lat === 'number' ? lat : NaN,
      lng: typeof lng === 'number' ? lng : NaN,
    }
  } catch {
    return null
  }
}
