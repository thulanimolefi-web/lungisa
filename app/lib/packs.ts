// B27/B28: trade packs. A pack is a checklist of photos and fields shown on the job record.
export type PackId = 'geyser' | 'electrical'

export interface PackItem { id: string; label: string; kind: 'photo' | 'field'; required: boolean }

export const PACKS: Record<PackId, { name: string; cert: 'pirb_coc' | 'ecoc'; items: PackItem[] }> = {
  geyser: {
    name: 'Geyser and plumbing',
    cert: 'pirb_coc',
    items: [
      { id: 'make', label: 'Geyser make', kind: 'field', required: true },
      { id: 'capacity', label: 'Capacity (litres)', kind: 'field', required: true },
      { id: 'serial', label: 'Serial number', kind: 'field', required: true },
      { id: 'install_date', label: 'Install date', kind: 'field', required: true },
      { id: 'pressure_valve', label: 'Photo: pressure control valve', kind: 'photo', required: true },
      { id: 'vacuum_breakers', label: 'Photo: vacuum breakers', kind: 'photo', required: true },
      { id: 'drip_tray', label: 'Photo: drip tray', kind: 'photo', required: true },
      { id: 'overflow', label: 'Photo: overflow pipe outlet', kind: 'photo', required: true },
      { id: 'thermostat', label: 'Photo: thermostat and element', kind: 'photo', required: true },
      { id: 'non_compliance', label: 'Non-compliances found', kind: 'field', required: false },
    ],
  },
  electrical: {
    name: 'Electrical',
    cert: 'ecoc',
    items: [
      { id: 'scope', label: 'Scope (full installation or alteration)', kind: 'field', required: true },
      { id: 'db_before', label: 'Photo: distribution board before', kind: 'photo', required: true },
      { id: 'db_after', label: 'Photo: distribution board after', kind: 'photo', required: true },
      { id: 'earth_leakage', label: 'Photo: earth leakage unit', kind: 'photo', required: true },
      { id: 'surge', label: 'Photo: surge protection', kind: 'photo', required: false },
      { id: 'test_report', label: 'Test report attached', kind: 'field', required: true },
    ],
  },
}

export function packCompleteness(pack: PackId, fields: Record<string, string>, photoItems: string[]) {
  const p = PACKS[pack]
  const missing = p.items.filter(i => i.required && (i.kind === 'photo' ? !photoItems.includes(i.id) : !fields[i.id]?.trim()))
  return { done: p.items.filter(i => i.required).length - missing.length, total: p.items.filter(i => i.required).length, missing }
}
