// B26: certificate validity rules. Pure functions, no I/O, shared by server and pages.
// Lungiza stores and checks certificates. It never issues CoC forms or numbers (BR-3.3).
// Rules (BRD M3, from the 19 Nov research; legal wording to be confirmed by the owner):
//  - ECOC older than 2 years at transfer: needs a new one (Electrical Installation Regulations 2009, reg 7)
//  - Gas CoC: needed on every transfer where gas is installed
//  - Electric fence certificate: needed if the fence was altered or on transfer when a fence exists
//  - PIRB plumbing CoC: the plumber logs it within 5 working days; we remind, we do not verify logging
//  - Issuer registration number missing or not checked by admin: "self-declared"

export type CertType = 'ecoc' | 'pirb_coc' | 'gas_coc' | 'fence' | 'other'
export type Level = 'green' | 'amber' | 'red'

export interface CertInput {
  cert_type: CertType
  number?: string | null
  issue_date?: string | null       // ISO date
  issuer_name?: string | null
  issuer_reg_no?: string | null
  issuer_checked_at?: string | null
  file_path?: string | null
}

export interface RuleResult { level: Level; reasons: string[]; label: string }

export const CERT_LABELS: Record<CertType, string> = {
  ecoc: 'Electrical CoC (ECOC)',
  pirb_coc: 'Plumbing CoC (PIRB)',
  gas_coc: 'Gas CoC',
  fence: 'Electric fence certificate',
  other: 'Other certificate',
}

function addWorkingDays(d: Date, n: number): Date {
  const r = new Date(d)
  let added = 0
  while (added < n) {
    r.setDate(r.getDate() + 1)
    const day = r.getDay()
    if (day !== 0 && day !== 6) added++   // public holidays not counted (assumption)
  }
  return r
}

function yearsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (365.25 * 24 * 3600 * 1000)
}

/** Evaluate one certificate. `forTransfer` = being used for a property sale. */
export function evaluateCertificate(c: CertInput, opts: { forTransfer?: boolean; now?: Date } = {}): RuleResult {
  const now = opts.now ?? new Date()
  const reasons: string[] = []
  let level: Level = 'green'
  const worse = (l: Level) => { if (l === 'red' || (l === 'amber' && level === 'green')) level = l }

  if (!c.file_path) { worse('red'); reasons.push('No certificate file attached') }
  if (!c.number) { worse('amber'); reasons.push('Certificate number missing') }
  if (!c.issue_date) { worse('amber'); reasons.push('Issue date missing') }
  if (!c.issuer_reg_no) { worse('amber'); reasons.push('Issuer registration number missing') }
  if (c.issue_date && new Date(c.issue_date) > now) { worse('red'); reasons.push('Issue date is in the future') }

  if (c.issue_date) {
    const issued = new Date(c.issue_date)
    if (c.cert_type === 'ecoc' && opts.forTransfer && yearsBetween(issued, now) > 2) {
      worse('red'); reasons.push('ECOC is older than 2 years: a new one is needed for transfer')
    }
    if (c.cert_type === 'pirb_coc') {
      const due = addWorkingDays(issued, 5)
      if (now <= due) { worse('amber'); reasons.push(`Plumber must log this CoC with PIRB by ${due.toISOString().slice(0, 10)}`) }
    }
  }

  const label = c.issuer_checked_at ? 'Issuer checked by Lungiza admin' : 'Self-declared'
  if (!c.issuer_checked_at && level === 'green') reasons.push('Self-declared: issuer not yet checked')
  return { level, reasons, label }
}

export type ListingItem = 'ecoc' | 'gas_coc' | 'fence' | 'solar_in_ecoc' | 'other'
export const LISTING_DEFAULTS: { item: ListingItem; label: string; required: boolean; question?: string }[] = [
  { item: 'ecoc', label: 'Electrical CoC, not older than 2 years at transfer', required: true },
  { item: 'gas_coc', label: 'Gas CoC (if gas is installed)', required: false, question: 'Is gas installed?' },
  { item: 'fence', label: 'Electric fence certificate (if a fence exists)', required: false, question: 'Is there an electric fence?' },
  { item: 'solar_in_ecoc', label: 'Solar or inverter covered on the ECOC (if installed)', required: false, question: 'Is solar or an inverter installed?' },
]

const ITEM_TO_CERT: Record<ListingItem, CertType> = { ecoc: 'ecoc', gas_coc: 'gas_coc', fence: 'fence', solar_in_ecoc: 'ecoc', other: 'other' }

/** Status of a sales checklist item (B42). applies=null means the agent has not answered yet. */
export function evaluateListingItem(item: ListingItem, applies: boolean | null, required: boolean, cert: CertInput | null, now?: Date): RuleResult {
  const needed = required || applies === true
  if (!needed) {
    if (applies === false) return { level: 'green', reasons: ['Not applicable'], label: 'Not applicable' }
    return { level: 'amber', reasons: ['Answer whether this applies'], label: 'Question open' }
  }
  if (!cert) return { level: 'red', reasons: ['No certificate on file'], label: 'Missing' }
  if (cert.cert_type !== ITEM_TO_CERT[item]) return { level: 'red', reasons: ['Wrong certificate type'], label: 'Wrong type' }
  return evaluateCertificate(cert, { forTransfer: true, now })
}
