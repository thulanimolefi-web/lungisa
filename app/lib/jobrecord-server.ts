// Server-only core of the shared job record (BRD revision 2).
// All MVP tables are deny-by-default for browser roles; every access check lives here.
import crypto from 'crypto'
import { adminClient } from './auth-server'
import { evaluateCertificate } from './certificate-rules'

export const db = () => adminClient()

// ---------------------------------------------------------------- tokens
export function newToken(): string { return crypto.randomBytes(24).toString('base64url') }
export function hashToken(t: string): string { return crypto.createHash('sha256').update(t).digest('hex') }

// ---------------------------------------------------------------- audit + notify
export async function audit(actorId: string | null, action: string, entity: string, entityId: string, data: Record<string, unknown> = {}, actorLabel?: string) {
  const { error } = await db().from('audit_events').insert({ actor_id: actorId, actor_label: actorLabel ?? null, action, entity, entity_id: entityId, data })
  if (error) console.error('audit insert failed:', error.message)
}

export async function notifyUser(userId: string | null | undefined, title: string, message: string, link: string) {
  if (!userId) return
  await db().from('notifications').insert({ user_id: userId, type: 'job_record', title, message, link, read: false })
}

// ---------------------------------------------------------------- access
export type Access = 'trade' | 'creator' | 'manager' | 'owner' | null

export async function orgIdsFor(userId: string): Promise<string[]> {
  const { data } = await db().from('memberships').select('org_id').eq('user_id', userId)
  return (data || []).map((m: any) => m.org_id)
}

export async function propertyAccess(userId: string, propertyId: string): Promise<'manager' | 'owner' | 'creator' | null> {
  const { data: p } = await db().from('properties').select('id, org_id, created_by').eq('id', propertyId).maybeSingle()
  if (!p) return null
  if ((p as any).org_id && (await orgIdsFor(userId)).includes((p as any).org_id)) return 'manager'
  const { data: g } = await db().from('property_grants').select('grant_role').eq('property_id', propertyId).eq('user_id', userId).is('revoked_at', null).maybeSingle()
  if (g && (g as any).grant_role === 'owner') return 'owner'
  if ((p as any).created_by === userId) return 'creator'
  return null
}

export async function recordAccess(userId: string, record: any): Promise<Access> {
  if (!record) return null
  if (record.tradesperson_id === userId) return 'trade'
  if (record.org_id && (await orgIdsFor(userId)).includes(record.org_id)) return 'manager'
  if (record.created_by === userId) return 'creator'
  const pa = await propertyAccess(userId, record.property_id)
  if (pa === 'manager') return 'manager'
  if (pa === 'owner') return 'owner'
  return null
}

export async function loadRecord(id: string) {
  const { data } = await db().from('job_records').select('*').eq('id', id).maybeSingle()
  return data as any
}

// ---------------------------------------------------------------- properties
export async function findOrCreateProperty(addr: { address_line: string; unit?: string | null; suburb?: string | null; city?: string | null },
                                           createdBy: string, orgId: string | null): Promise<string> {
  const line = addr.address_line.trim()
  if (!line) throw new Error('Address required')
  // Re-use only a property this user or their organisation already holds (never another person's)
  let q = db().from('properties').select('id').ilike('address_line', ilikeExact(line))
  q = addr.unit ? q.ilike('unit', ilikeExact(addr.unit)) : q.is('unit', null)
  q = orgId ? q.eq('org_id', orgId) : q.eq('created_by', createdBy).is('org_id', null)
  const { data: found } = await q.limit(1)
  if (found && found.length) return (found[0] as any).id
  const { data, error } = await db().from('properties').insert({
    address_line: line, unit: addr.unit?.trim() || null, suburb: addr.suburb?.trim() || null,
    city: addr.city?.trim() || 'Johannesburg', org_id: orgId, created_by: createdBy,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return (data as any).id
}

export async function mandateFor(propertyId: string) {
  const { data } = await db().from('mandates').select('*').eq('property_id', propertyId).maybeSingle()
  return data as any
}

// ---------------------------------------------------------------- quotes
export async function currentQuote(recordId: string) {
  const { data } = await db().from('record_quotes').select('*').eq('record_id', recordId).is('superseded_at', null)
    .order('version', { ascending: false }).limit(1)
  return (data && data[0]) as any || null
}

export function quoteTotal(q: any): number {
  if (!q) return 0
  return (q.call_out_cents || 0) + (q.labour_cents || 0) + (q.materials_cents || 0)
}

// ---------------------------------------------------------------- marketplace bridge (B30)
export async function ensureJobRecordForMarketplace(jobId: string, actorId: string): Promise<string | null> {
  const { data: existing } = await db().from('job_records').select('id').eq('marketplace_job_id', jobId).maybeSingle()
  if (existing) return (existing as any).id
  const { data: job } = await db().from('jobs').select('id, title, description, street_address, area, city, homeowner_id').eq('id', jobId).maybeSingle()
  if (!job) return null
  const { data: bid } = await db().from('bids').select('tradesperson_id, call_out_fee, labour_amount, materials_amount, final_amount, amount')
    .eq('job_id', jobId).eq('status', 'accepted').maybeSingle()
  const j: any = job
  const { data: owner } = await db().from('profiles').select('full_name, phone, email').eq('id', j.homeowner_id).maybeSingle()
  const propertyId = await findOrCreateProperty({ address_line: j.street_address || j.area || 'Address not given', city: j.city }, j.homeowner_id, null)
  await db().from('property_grants').upsert({ property_id: propertyId, user_id: j.homeowner_id, grant_role: 'owner',
    consent_text: 'Created from my marketplace job on Lungiza' }, { onConflict: 'property_id,user_id', ignoreDuplicates: true })
  const { data: rec, error } = await db().from('job_records').insert({
    source: 'marketplace', marketplace_job_id: jobId, property_id: propertyId, tradesperson_id: (bid as any)?.tradesperson_id ?? null,
    created_by: j.homeowner_id, customer_name: (owner as any)?.full_name ?? null, customer_phone: (owner as any)?.phone ?? null,
    customer_email: (owner as any)?.email ?? null, title: j.title || 'Marketplace job', scope: j.description,
    status: 'in_progress', commission_flag: true,
  }).select('id').single()
  if (error) { console.error('ensureJobRecordForMarketplace:', error.message); return null }
  const b: any = bid
  if (b) {
    // bids: breakdown in whole Rand, amount/final_amount in cents (see app/lib/commission.ts). Verify on staging.
    const callOut = (b.call_out_fee || 0) * 100, labour = (b.labour_amount || 0) * 100, materials = (b.materials_amount || 0) * 100
    const fallbackLabour = callOut + labour + materials === 0 ? (b.final_amount || b.amount || 0) : labour
    await db().from('record_quotes').insert({ record_id: (rec as any).id, version: 1, call_out_cents: callOut, labour_cents: fallbackLabour,
      materials_cents: materials, notes: 'Accepted marketplace bid', sent_at: new Date().toISOString(), created_by: b.tradesperson_id || actorId })
    // The accepted bid is the homeowner's own approval on their account: receiver-confirmed
    await db().from('approvals').insert({ record_id: (rec as any).id, subject: 'quote', quote_version: 1, decision: 'approved',
      approval_type: 'receiver_confirmed', approver_name: (owner as any)?.full_name ?? null, authority_basis: 'Accepted bid while signed in',
      created_by: j.homeowner_id })
  }
  await audit(actorId, 'record_created_from_marketplace', 'job_records', (rec as any).id, { job_id: jobId })
  return (rec as any).id
}

// ---------------------------------------------------------------- views
async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const clean = paths.filter(Boolean)
  if (!clean.length) return out
  const { data } = await db().storage.from('job-records').createSignedUrls(clean, 600)
  for (const d of data || []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl
  return out
}

/** Full record for a signed-in party. Private notes only for the tradesperson. */
export async function recordDetail(record: any, access: Access, opts: { forTransfer?: boolean } = {}) {
  const id = record.id
  const [quotes, variations, approvals, photos, certs, links, notes, property, mandate, trade, payments] = await Promise.all([
    db().from('record_quotes').select('*').eq('record_id', id).order('version'),
    db().from('variations').select('*').eq('record_id', id).order('created_at'),
    db().from('approvals').select('*').eq('record_id', id).order('created_at'),
    db().from('record_photos').select('*').eq('record_id', id).order('created_at'),
    db().from('certificates').select('*').eq('record_id', id).order('created_at'),
    access ? db().from('share_links').select('id, scope, recipient_name, recipient_phone, expires_at, revoked_at, created_at').eq('record_id', id) : Promise.resolve({ data: [] }),
    access === 'trade' ? db().from('trade_notes').select('*').eq('record_id', id).order('created_at') : Promise.resolve({ data: [] }),
    db().from('properties').select('id, address_line, unit, suburb, city').eq('id', record.property_id).maybeSingle(),
    mandateFor(record.property_id),
    record.tradesperson_id ? db().from('profiles').select('full_name').eq('id', record.tradesperson_id).maybeSingle() : Promise.resolve({ data: null }),
    access ? db().from('record_payments').select('id, amount_cents, commission_cents, net_cents, status, payout_status, paid_at, created_at').eq('record_id', id).order('created_at') : Promise.resolve({ data: [] }),
  ])
  const urls = await signedUrls([...(photos.data || []).map((p: any) => p.path), ...(certs.data || []).map((c: any) => c.file_path)])
  return {
    record,
    access,
    property: property.data,
    mandate: access === 'manager' || access === 'owner' ? mandate : mandate ? { approval_cap_cents: mandate.approval_cap_cents, emergency_cap_cents: mandate.emergency_cap_cents } : null,
    tradeName: (trade as any).data?.full_name ?? null,
    quotes: quotes.data || [],
    variations: variations.data || [],
    approvals: approvals.data || [],
    photos: (photos.data || []).map((p: any) => ({ ...p, url: urls[p.path] || null })),
    certificates: (certs.data || []).map((c: any) => ({ ...c, url: c.file_path ? urls[c.file_path] || null : null, rule: evaluateCertificate(c, opts) })),
    links: links.data || [],
    notes: notes.data || [],
    payments: (payments as any).data || [],
  }
}

/** What a link holder may see. Never includes trade notes, links or other parties' contact details. */
export async function linkView(link: any) {
  if (link.record_id) {
    const record = await loadRecord(link.record_id)
    if (!record) return null
    const d = await recordDetail(record, null)
    const r = d.record
    return {
      kind: 'record' as const,
      scope: link.scope,
      record: {
        id: r.id, ref: r.ref, title: r.title, scope: r.scope, status: r.status, source: r.source, urgency: r.urgency,
        trade_pack: r.trade_pack, invoice_status: r.invoice_status, invoice_amount_cents: r.invoice_amount_cents,
        payment_details: link.scope === 'approver' ? r.payment_details : null, amount_disputed: r.amount_disputed,
        customer_name: r.customer_name, work_done_at: r.work_done_at, created_at: r.created_at, commission_flag: r.commission_flag,
      },
      tradeName: d.tradeName,
      property: d.property,
      mandate: d.mandate,
      quotes: d.quotes.filter((q: any) => q.sent_at),
      variations: d.variations,
      approvals: d.approvals.map((a: any) => ({ id: a.id, subject: a.subject, subject_id: a.subject_id, quote_version: a.quote_version,
        decision: a.decision, approval_type: a.approval_type, approver_name: a.approver_name, note: a.note, void_at: a.void_at, created_at: a.created_at })),
      photos: d.photos.map((p: any) => ({ id: p.id, kind: p.kind, pack_item: p.pack_item, url: p.url, created_at: p.created_at })),
      certificates: d.certificates.map((c: any) => ({ id: c.id, cert_type: c.cert_type, number: c.number, issue_date: c.issue_date,
        issuer_name: c.issuer_name, issuer_reg_no: c.issuer_reg_no, url: c.url, rule: c.rule })),
    }
  }
  if (link.property_id && link.scope === 'tenant') {
    const { data: p } = await db().from('properties').select('id, address_line, unit, suburb').eq('id', link.property_id).maybeSingle()
    return { kind: 'tenant' as const, scope: link.scope, property: p }
  }
  if (link.listing_id) return { kind: 'handover' as const, scope: link.scope, ...(await listingView(link.listing_id)) }
  return null
}

export async function listingView(listingId: string) {
  const { evaluateListingItem, LISTING_DEFAULTS } = await import('./certificate-rules')
  const { data: l } = await db().from('listings').select('*').eq('id', listingId).maybeSingle()
  if (!l) return { listing: null, items: [], property: null }
  const { data: items } = await db().from('listing_items').select('*').eq('listing_id', listingId)
  const certIds = (items || []).map((i: any) => i.certificate_id).filter(Boolean)
  const { data: certs } = certIds.length ? await db().from('certificates').select('*').in('id', certIds) : { data: [] as any[] }
  const urls = await signedUrls((certs || []).map((c: any) => c.file_path).filter(Boolean))
  const { data: p } = await db().from('properties').select('id, address_line, unit, suburb, city').eq('id', (l as any).property_id).maybeSingle()
  const out = (items || []).map((i: any) => {
    const cert = (certs || []).find((c: any) => c.id === i.certificate_id) || null
    const def = LISTING_DEFAULTS.find(d => d.item === i.item)
    return { ...i, label: def?.label || i.item, question: def?.question || null,
      certificate: cert ? { ...cert, url: cert.file_path ? urls[cert.file_path] || null : null } : null,
      rule: evaluateListingItem(i.item, i.applies, i.required, cert) }
  })
  return { listing: l, items: out, property: p }
}

// ---------------------------------------------------------------- links
export async function resolveLink(token: string) {
  if (!token || token.length < 20) return null
  const { data } = await db().from('share_links').select('*').eq('token_hash', hashToken(token)).maybeSingle()
  const l: any = data
  if (!l || l.revoked_at) return null
  if (l.expires_at && new Date(l.expires_at) < new Date()) return null
  return l
}

export async function createLink(createdBy: string, fields: { scope: string; record_id?: string; property_id?: string; listing_id?: string;
  recipient_name?: string; recipient_phone?: string; recipient_email?: string; days?: number }) {
  const token = newToken()
  const expires = new Date(Date.now() + (fields.days ?? 60) * 24 * 3600 * 1000).toISOString()
  const { data, error } = await db().from('share_links').insert({
    token_hash: hashToken(token), scope: fields.scope, record_id: fields.record_id ?? null, property_id: fields.property_id ?? null,
    listing_id: fields.listing_id ?? null, recipient_name: fields.recipient_name ?? null, recipient_phone: fields.recipient_phone ?? null,
    recipient_email: fields.recipient_email ?? null, expires_at: expires, created_by: createdBy,
  }).select('id').single()
  if (error) throw new Error(error.message)
  return { id: (data as any).id, token, expires_at: expires }
}

// ---------------------------------------------------------------- photos and files
export async function uploadUrl(prefix: string, filename: string) {
  const ext = (filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'jpg'
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`
  const { data, error } = await db().storage.from('job-records').createSignedUploadUrl(path)
  if (error) throw new Error(error.message)
  return { path, token: (data as any).token, signedUrl: (data as any).signedUrl }
}

/** Exact, case-insensitive match for ilike: escapes the wildcard characters. */
export function ilikeExact(v: string): string { return v.trim().replace(/[\\%_]/g, c => '\\' + c) }

export function rands(cents: number | null | undefined): string {
  return 'R' + Math.round((cents || 0) / 100).toLocaleString('en-ZA')
}
