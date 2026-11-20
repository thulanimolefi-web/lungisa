// Trade packs: a checklist of photos and details shown on the job record, one per type of work.
// `cert` names the compliance certificate that work of this type normally needs (null: none).

export const PACK_IDS = [
  'plumbing', 'geyser', 'electrical', 'solar', 'gas', 'roofing', 'waterproofing',
  'painting', 'tiling', 'carpentry', 'welding', 'garden', 'cleaning', 'general',
] as const
export type PackId = typeof PACK_IDS[number]

export function isPackId(v: unknown): v is PackId {
  return typeof v === 'string' && (PACK_IDS as readonly string[]).includes(v)
}

export interface PackItem { id: string; label: string; kind: 'photo' | 'field'; required: boolean }
export interface Pack { name: string; cert: 'pirb_coc' | 'ecoc' | 'gas_coc' | null; certNote?: string; items: PackItem[] }

const f = (id: string, label: string, required = true): PackItem => ({ id, label, kind: 'field', required })
const p = (id: string, label: string, required = true): PackItem => ({ id, label: 'Photo: ' + label, kind: 'photo', required })

export const PACKS: Record<PackId, Pack> = {
  plumbing: {
    name: 'Plumbing (leaks, pipes, taps, drains)',
    cert: 'pirb_coc',
    certNote: 'New installations and alterations need a PIRB Certificate of Compliance from a registered plumber.',
    items: [f('fault', 'Problem found'), f('pipe', 'Pipe material and size', false), p('fault_before', 'fault before repair'),
      p('repair_after', 'repair after'), f('pressure_test', 'Pressure or leak test done', false)],
  },
  geyser: {
    name: 'Geyser installation or replacement',
    cert: 'pirb_coc',
    certNote: 'A geyser installation or replacement needs a PIRB Certificate of Compliance.',
    items: [f('make', 'Geyser make'), f('capacity', 'Capacity (litres)'), f('serial', 'Serial number'), f('install_date', 'Install date'),
      p('pressure_valve', 'pressure control valve'), p('vacuum_breakers', 'vacuum breakers'), p('drip_tray', 'drip tray'),
      p('overflow', 'overflow pipe outlet'), p('thermostat', 'thermostat and element'), f('non_compliance', 'Non-compliances found', false)],
  },
  electrical: {
    name: 'Electrical',
    cert: 'ecoc',
    certNote: 'Electrical installation work needs an Electrical Certificate of Compliance (CoC) from a registered electrician.',
    items: [f('scope', 'Scope (full installation or alteration)'), p('db_before', 'distribution board before'),
      p('db_after', 'distribution board after'), p('earth_leakage', 'earth leakage unit'), p('surge', 'surge protection', false),
      f('test_report', 'Test report attached')],
  },
  solar: {
    name: 'Solar and backup power',
    cert: 'ecoc',
    certNote: 'Solar and inverter installations need an Electrical CoC. Grid-tied systems may also need municipal registration.',
    items: [f('system_type', 'System type (grid-tied, hybrid or off-grid)'), f('inverter', 'Inverter make and model'),
      f('battery', 'Battery make and capacity', false), f('panels', 'Number of panels and watts', false),
      p('inverter_isolators', 'inverter and isolators'), p('db_changeover', 'distribution board with surge and change-over'),
      p('panel_mounting', 'panel mounting', false), f('municipal_ref', 'Municipal registration reference', false)],
  },
  gas: {
    name: 'Gas installation',
    cert: 'gas_coc',
    certNote: 'Gas installations need a Certificate of Conformity from a SAQCC Gas registered installer.',
    items: [f('appliances', 'Gas appliances connected'), f('cylinder', 'Cylinder size and location'),
      p('cylinder_regulator', 'cylinder and regulator'), p('appliance_connection', 'appliance connection'), f('leak_test', 'Leak test done')],
  },
  roofing: {
    name: 'Roofing',
    cert: null,
    items: [f('roof_type', 'Roof type'), f('fault', 'Problem found'), p('damage_before', 'damage before'),
      p('repair_after', 'repair after'), f('area', 'Area repaired (m²)', false)],
  },
  waterproofing: {
    name: 'Waterproofing',
    cert: null,
    items: [f('area', 'Area and surface'), f('product', 'Product used'), f('coats', 'Number of coats', false),
      p('prepared', 'surface prepared'), p('finished', 'finished surface'), f('guarantee', 'Guarantee period', false)],
  },
  painting: {
    name: 'Painting',
    cert: null,
    items: [f('areas', 'Rooms or areas painted'), f('paint', 'Paint brand and colour codes'), f('coats', 'Number of coats', false),
      p('before', 'before'), p('after', 'after')],
  },
  tiling: {
    name: 'Tiling',
    cert: null,
    items: [f('area', 'Area and size (m²)'), f('tiles', 'Tile type and size'), f('adhesive', 'Adhesive and grout used', false),
      p('substrate', 'surface before tiling'), p('finished', 'finished tiling')],
  },
  carpentry: {
    name: 'Carpentry, doors and cupboards',
    cert: null,
    items: [f('item', 'What was made or fixed'), f('material', 'Material', false), p('before', 'before'), p('after', 'after')],
  },
  welding: {
    name: 'Welding, gates and burglar bars',
    cert: null,
    items: [f('item', 'What was made or fixed'), f('material', 'Material and finish', false), f('gate_motor', 'Gate motor make and model', false),
      p('before', 'site before'), p('after', 'installed')],
  },
  garden: {
    name: 'Garden and outdoor',
    cert: null,
    items: [f('work', 'Work done'), f('waste', 'Garden waste removed', false), p('before', 'before'), p('after', 'after')],
  },
  cleaning: {
    name: 'Cleaning',
    cert: null,
    items: [f('areas', 'Areas cleaned'), f('products', 'Products used', false), p('before', 'before'), p('after', 'after')],
  },
  general: {
    name: 'Handyman and general',
    cert: null,
    items: [f('work', 'Work done'), p('before', 'before'), p('after', 'after')],
  },
}

export function packCompleteness(pack: PackId, fields: Record<string, string>, photoItems: string[]) {
  const pk = PACKS[pack]
  const missing = pk.items.filter(i => i.required && (i.kind === 'photo' ? !photoItems.includes(i.id) : !fields[i.id]?.trim()))
  return { done: pk.items.filter(i => i.required).length - missing.length, total: pk.items.filter(i => i.required).length, missing }
}
