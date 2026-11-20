// Quote templates: standard lines per type of work. Built-in templates carry no prices:
// the tradesperson's own last-used price for each line is filled in instead.
import type { PackId } from './packs'

export type LineKind = 'call_out' | 'labour' | 'materials'
export interface TemplateLine { text: string; kind: LineKind }
export interface BuiltInTemplate { id: string; name: string; pack: PackId; lines: TemplateLine[] }

export const KIND_LABEL: Record<LineKind, string> = { call_out: 'Call-out', labour: 'Labour', materials: 'Materials' }

const co = (text = 'Call-out fee'): TemplateLine => ({ text, kind: 'call_out' })
const lab = (text: string): TemplateLine => ({ text, kind: 'labour' })
const mat = (text: string): TemplateLine => ({ text, kind: 'materials' })

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  { id: 'geyser-150', pack: 'geyser', name: 'Geyser 150L replacement', lines: [co(), lab('Remove old geyser and install new geyser'), mat('150L geyser'),
    mat('Pressure control valve'), mat('Vacuum breakers (2)'), mat('Drip tray and overflow pipe'), lab('Remove and dispose of old geyser')] },
  { id: 'geyser-element', pack: 'geyser', name: 'Geyser element and thermostat', lines: [co(), lab('Drain geyser, replace element and thermostat'),
    mat('Geyser element'), mat('Thermostat')] },
  { id: 'plumbing-burst', pack: 'plumbing', name: 'Burst pipe repair', lines: [co(), lab('Find and repair burst pipe'), mat('Pipe and fittings')] },
  { id: 'plumbing-drain', pack: 'plumbing', name: 'Blocked drain', lines: [co(), lab('Clear blocked drain'), mat('Drain parts (if needed)')] },
  { id: 'plumbing-tap', pack: 'plumbing', name: 'Tap or mixer replacement', lines: [co(), lab('Remove old tap and fit new tap'), mat('Tap or mixer'), mat('Fittings and seals')] },
  { id: 'electrical-fault', pack: 'electrical', name: 'Fault finding and repair', lines: [co(), lab('Find and repair fault'), mat('Replacement parts')] },
  { id: 'electrical-point', pack: 'electrical', name: 'New plug or light point', lines: [co(), lab('Install plug or light point'), mat('Plug or light fitting'), mat('Cable and conduit')] },
  { id: 'electrical-coc', pack: 'electrical', name: 'Electrical CoC inspection', lines: [co('Inspection call-out'), lab('Inspect and test installation'), lab('Issue Certificate of Compliance')] },
  { id: 'solar-backup', pack: 'solar', name: 'Inverter and battery installation', lines: [co('Site assessment'), lab('Install inverter and battery'), mat('Inverter'),
    mat('Battery'), mat('Isolators and surge protection'), mat('Cabling and mounting')] },
  { id: 'gas-stove', pack: 'gas', name: 'Gas stove or hob installation', lines: [co(), lab('Install and leak test gas appliance'), mat('Regulator and hose'), mat('Cylinder cage')] },
  { id: 'roof-leak', pack: 'roofing', name: 'Roof leak repair', lines: [co(), lab('Find and repair roof leak'), mat('Sealant and flashing'), mat('Replacement tiles or sheets')] },
  { id: 'waterproof-slab', pack: 'waterproofing', name: 'Roof or slab waterproofing', lines: [co('Inspection'), lab('Prepare surface and apply waterproofing'), mat('Membrane and primer')] },
  { id: 'paint-room', pack: 'painting', name: 'Interior room painting', lines: [co('Quote visit'), lab('Prepare and paint walls'), mat('Paint'), mat('Filler, tape and sandpaper')] },
  { id: 'tile-floor', pack: 'tiling', name: 'Floor tiling', lines: [co(), lab('Lay tiles'), mat('Tile adhesive and grout'), mat('Tiles (if supplied by me)')] },
  { id: 'carpentry-door', pack: 'carpentry', name: 'Door hanging or replacement', lines: [co(), lab('Hang door'), mat('Door'), mat('Hinges and lock')] },
  { id: 'welding-gate', pack: 'welding', name: 'Burglar bars or gate', lines: [co('Site visit and measure'), lab('Make and install'), mat('Steel'), mat('Primer and paint')] },
  { id: 'garden-cleanup', pack: 'garden', name: 'Garden clean-up', lines: [co(), lab('Garden clean-up'), lab('Remove garden waste')] },
  { id: 'cleaning-deep', pack: 'cleaning', name: 'Deep clean', lines: [co(), lab('Deep clean'), mat('Cleaning products')] },
  { id: 'general-job', pack: 'general', name: 'Handyman job', lines: [co(), lab('Labour'), mat('Materials')] },
]

export function builtInFor(pack: string | null | undefined): BuiltInTemplate[] {
  const own = BUILT_IN_TEMPLATES.filter(t => t.pack === pack)
  return own.length ? own : BUILT_IN_TEMPLATES.filter(t => t.pack === 'general')
}

/** Normalised key for matching a line to the tradesperson's last-used price. */
export function lineKey(text: string) { return text.trim().toLowerCase().replace(/\s+/g, ' ') }
