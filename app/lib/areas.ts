// Canonical list of Gauteng suburbs Lungisa operates in.
//
// This is the single source of truth for "area" — it is used both for the
// homeowner's job-location fallback picker and for a tradesperson's
// service-area selection. Those two lists MUST stay in sync: job-feed
// matching (see app/dashboard/page.tsx) does an exact string match between
// a job's `area` and a tradesperson's `service_areas`, so if a tradesperson
// is only ever offered a subset of these suburbs to choose from, any job
// posted outside that subset can never reach them.
export const AREAS = [
  // Johannesburg North
  'Sandton','Fourways','Bryanston','Morningside','Rivonia','Sunninghill',
  'Paulshof','Kyalami','Halfway House','Woodmead','Kramerville',
  // Johannesburg Central & South
  'Johannesburg CBD','Parktown','Rosebank','Melrose','Illovo','Hyde Park',
  'Northcliff','Auckland Park','Greenside','Linden','Victory Park',
  'Mayfair','Fordsburg','Newtown','Maboneng',
  // Johannesburg West
  'Randburg','Ferndale','Honeydew','Ruimsig','Florida','Krugersdorp',
  'Roodepoort','Northgate','Weltevredenpark','Constantia Kloof',
  'Strubensvalley','Radiokop','Wilgeheuwel',
  // Johannesburg South & SW
  'Soweto','Lenasia','Ennerdale','Orange Farm','Alberton','Germiston',
  'Meyersdal','Glenvista','Bassonia','Kibler Park','Mulbarton',
  'Winchester Hills','Turffontein','Booysens','Ophirton',
  // East Rand / Ekurhuleni
  'Boksburg','Benoni','Brakpan','Springs','Edenvale','Bedfordview',
  'Kempton Park','Tembisa','Ekurhuleni','Vosloorus','Daveyton',
  'Katlehong','Thokoza','Nigel','Heidelberg','Duduza',
  // Midrand
  'Midrand','Vorna Valley','Waterfall','Jukskei Park',
  'Grand Central','Carlswald',
  // Pretoria / Tshwane
  'Pretoria Central','Centurion','Pretoria East','Pretoria North',
  'Pretoria West','Soshanguve','Mamelodi','Atteridgeville','Hatfield',
  'Menlyn','Lynnwood','Faerie Glen','Moreleta Park','Garsfontein',
  'Queenswood','Arcadia','Muckleneuk','Brooklyn','Groenkloof',
  'Montana','Gezina','Silverton','Eersterust','Watloo',
  'Irene','Rooihuiskraal','Olievenhoutbosch',
  // West Rand
  'Randfontein','Westonaria','Carletonville','Fochville',
  'Magaliesburg','Chamdor',
  // Sedibeng
  'Vereeniging','Vanderbijlpark','Meyerton','Evaton','Sebokeng',
  'Sharpeville','Bophelong','Three Rivers',
]

const NORMALIZED_AREAS = AREAS.map(a => ({ raw: a, norm: a.toLowerCase().trim() }))

/**
 * Resolves a free-text place name (e.g. from a geocoder's suburb/locality
 * field) to one of our canonical AREAS entries, so job.area stays
 * compatible with the exact-match filtering tradespeople rely on.
 * Returns null if nothing reasonably close is found — callers should fall
 * back to asking the user to pick from the list manually in that case.
 */
export function matchAreaFromPlace(placeName: string | null | undefined): string | null {
  if (!placeName) return null
  const norm = placeName.toLowerCase().trim()
  if (!norm) return null

  // Exact match first.
  const exact = NORMALIZED_AREAS.find(a => a.norm === norm)
  if (exact) return exact.raw

  // Then either string contains the other (handles "Fourways" vs
  // "Fourways, Sandton" style geocoder output).
  const contains = NORMALIZED_AREAS.filter(a => norm.includes(a.norm) || a.norm.includes(norm))
  if (contains.length > 0) {
    // Prefer the longest (most specific) match.
    return contains.sort((a, b) => b.norm.length - a.norm.length)[0].raw
  }

  return null
}
