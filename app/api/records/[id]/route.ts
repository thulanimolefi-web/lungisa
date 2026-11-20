import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth-server'
import {
  audit, createLink, currentQuote, db, ilikeExact, loadRecord, mandateFor, notifyUser, quoteTotal, recordAccess, recordDetail, uploadUrl,
} from '../../../lib/jobrecord-server'
import { CertType } from '../../../lib/certificate-rules'

type Ctx = { params: { id: string } }
const cents = (v: any) => Math.max(0, Math.round(Number(v || 0) * 100))   // inputs are in Rand
const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

export async function GET(req: NextRequest, { params }: Ctx) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const record = await loadRecord(params.id)
  const access = await recordAccess(auth.user.id, record)
  if (!access) return err('Not found', 404)
  const forTransfer = req.nextUrl.searchParams.get('transfer') === '1'
  return NextResponse.json(await recordDetail(record, access, { forTransfer }))
}

/** Sum of approved extras (approved by link, under mandate, creator-recorded, or emergency inside the cap). */
async function approvedExtrasCents(recordId: string) {
  const { data } = await db().from('variations').select('amount_cents, status').eq('record_id', recordId)
  return (data || []).filter((v: any) => v.status === 'approved' || v.status === 'emergency_within_cap')
    .reduce((s: number, v: any) => s + v.amount_cents, 0)
}

async function hasLiveQuoteApproval(recordId: string, version: number) {
  const { data } = await db().from('approvals').select('id').eq('record_id', recordId).eq('subject', 'quote')
    .eq('quote_version', version).eq('decision', 'approved').is('void_at', null).limit(1)
  return !!(data && data.length)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const me = auth.user.id
  const record = await loadRecord(params.id)
  const access = await recordAccess(me, record)
  if (!access) return err('Not found', 404)
  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')
  const isTrade = access === 'trade'
  const isManager = access === 'manager' || (access === 'creator' && record.source === 'agent')
  const canEdit = isTrade || isManager
  const set = async (fields: Record<string, unknown>) => {
    const { error } = await db().from('job_records').update(fields).eq('id', record.id)
    if (error) throw new Error(error.message)
  }
  const locked = ['completed', 'closed_without_signoff', 'cancelled'].includes(record.status)

  try {
    switch (action) {
      // ---------------------------------------------------------------- quote versions (BR-1.6, R6)
      case 'quote': {
        if (!isTrade) return err('Only the tradesperson quotes', 403)
        if (locked) return err('This job is closed')
        const prev = await currentQuote(record.id)
        const version = (prev?.version || 0) + 1
        const lines = Array.isArray(b.lines) ? b.lines.slice(0, 40).map((l: any) => ({ text: String(l.text || '').slice(0, 200), amount_cents: cents(l.amount) })) : []
        const { error } = await db().from('record_quotes').insert({
          record_id: record.id, version, call_out_cents: cents(b.call_out), labour_cents: cents(b.labour), materials_cents: cents(b.materials),
          lines, notes: String(b.notes || '').slice(0, 2000) || null, sent_at: new Date().toISOString(), created_by: me,
        })
        if (error) return err('Could not save quote', 500)
        if (prev) {
          await db().from('record_quotes').update({ superseded_at: new Date().toISOString() }).eq('id', prev.id)
          // R6: approval tied to the old version no longer counts
          await db().from('approvals').update({ void_at: new Date().toISOString() }).eq('record_id', record.id).eq('subject', 'quote').is('void_at', null)
        }
        await set({ status: 'awaiting_approval' })
        await audit(me, 'quote_sent', 'job_records', record.id, { version, total_cents: cents(b.call_out) + cents(b.labour) + cents(b.materials) })
        return NextResponse.json({ ok: true, version })
      }

      // ---------------------------------------------------------------- share links (B20/B39)
      case 'link': {
        if (!canEdit) return err('Not allowed', 403)
        const scope = b.scope === 'viewer' ? 'viewer' : 'approver'
        const link = await createLink(me, { scope, record_id: record.id, recipient_name: b.recipient_name, recipient_phone: b.recipient_phone,
          recipient_email: b.recipient_email, days: 60 })
        await audit(me, 'link_created', 'job_records', record.id, { scope, link_id: link.id })
        return NextResponse.json({ ok: true, token: link.token, expires_at: link.expires_at })
      }
      case 'revoke_link': {
        if (!canEdit) return err('Not allowed', 403)
        await db().from('share_links').update({ revoked_at: new Date().toISOString() }).eq('id', b.link_id).eq('record_id', record.id)
        await audit(me, 'link_revoked', 'job_records', record.id, { link_id: b.link_id })
        return NextResponse.json({ ok: true })
      }

      // ---------------------------------------------------------------- approvals recorded by the creator (R4, R5)
      case 'record_approval': {
        if (!canEdit) return err('Not allowed', 403)
        const subject = b.subject === 'variation' ? 'variation' : 'quote'
        const decision = b.decision === 'declined' ? 'declined' : 'approved'
        const q = await currentQuote(record.id)
        if (subject === 'quote' && !q) return err('Send a quote first')
        let amount = quoteTotal(q)
        if (subject === 'variation') {
          const { data: v } = await db().from('variations').select('*').eq('id', b.subject_id).eq('record_id', record.id).maybeSingle()
          if (!v) return err('Extra not found')
          amount = (v as any).amount_cents
        }
        const mandate = await mandateFor(record.property_id)
        let approvalType: 'creator_recorded' | 'under_mandate' = 'creator_recorded'
        let basis = String(b.note || 'Recorded by the creator. Not confirmed by the receiver.')
        if (b.under_mandate) {
          if (!isManager || !mandate) return err('Only a manager with a mandate can approve under mandate', 403)
          if (amount > mandate.approval_cap_cents) return err('Above the mandate approval cap: the owner must approve by link')
          approvalType = 'under_mandate'
          basis = `Approved under mandate. Cap R${Math.round(mandate.approval_cap_cents / 100)} set ${String(mandate.updated_at).slice(0, 10)}`
        } else if (mandate && mandate.require_receiver_confirmed_above_cap && amount > mandate.approval_cap_cents && decision === 'approved') {
          return err('This mandate needs the owner to confirm amounts above the cap themselves. Send the owner an approval link.')
        }
        await db().from('approvals').insert({ record_id: record.id, subject, subject_id: subject === 'variation' ? b.subject_id : null,
          quote_version: subject === 'quote' ? q.version : null, decision, approval_type: approvalType,
          approver_name: String(b.approver_name || '').slice(0, 120) || null, authority_basis: basis, created_by: me })
        if (subject === 'variation') await db().from('variations').update({ status: decision === 'approved' ? 'approved' : 'declined' }).eq('id', b.subject_id)
        else await set({ status: decision === 'approved' ? 'approved' : 'quoted' })
        await audit(me, `approval_${approvalType}`, 'job_records', record.id, { subject, decision, amount_cents: amount })
        return NextResponse.json({ ok: true })
      }

      // ---------------------------------------------------------------- start work: needs an approval (R1)
      case 'start': {
        if (!isTrade) return err('Only the tradesperson starts work', 403)
        const q = await currentQuote(record.id)
        if (!q) return err('Send a quote first')
        if (!(await hasLiveQuoteApproval(record.id, q.version))) return err('The current quote is not approved. Silence is not approval.')
        await set({ status: 'in_progress' })
        await audit(me, 'work_started', 'job_records', record.id, { quote_version: q.version })
        return NextResponse.json({ ok: true })
      }

      // ---------------------------------------------------------------- extras (R2, R3)
      case 'variation': {
        if (!isTrade) return err('Only the tradesperson adds extras', 403)
        if (locked) return err('This job is closed')
        const desc = String(b.description || '').trim()
        if (!desc) return err('Describe the extra work')
        const amount = cents(b.amount)
        let status = 'requested'
        let note = ''
        if (b.is_emergency) {
          const mandate = await mandateFor(record.property_id)
          const cap = mandate?.emergency_cap_cents || 0
          const { data: prior } = await db().from('variations').select('amount_cents').eq('record_id', record.id).eq('status', 'emergency_within_cap')
          const used = (prior || []).reduce((s: number, v: any) => s + v.amount_cents, 0)
          if (!String(b.emergency_reason || '').trim()) return err('Give the emergency reason')
          if (used + amount <= cap && cap > 0) status = 'emergency_within_cap'
          else note = cap > 0 ? `Above the emergency cap (R${Math.round(cap / 100)}). Make safe only and wait for approval.`
                              : 'No emergency cap is set for this property. Make safe only and wait for approval.'
        }
        const { data: v, error } = await db().from('variations').insert({ record_id: record.id, description: desc.slice(0, 500), amount_cents: amount,
          is_emergency: !!b.is_emergency, emergency_reason: b.is_emergency ? String(b.emergency_reason).slice(0, 500) : null, status, created_by: me })
          .select('id').single()
        if (error) return err('Could not save the extra', 500)
        await audit(me, 'variation_added', 'job_records', record.id, { variation_id: (v as any).id, amount_cents: amount, status })
        if (record.org_id) {
          const { data: members } = await db().from('memberships').select('user_id').eq('org_id', record.org_id)
          for (const m of members || []) await notifyUser((m as any).user_id, 'Extra needs approval', `${record.title}: ${desc}`, `/records/${record.id}`)
        }
        return NextResponse.json({ ok: true, status, note })
      }

      // ---------------------------------------------------------------- work done -> receiver signs off (R1: no auto-accept)
      case 'work_done': {
        if (!isTrade) return err('Only the tradesperson marks work done', 403)
        if (record.status !== 'in_progress') return err('Start the job first')
        await set({ status: 'awaiting_signoff', work_done_at: new Date().toISOString() })
        await audit(me, 'work_done', 'job_records', record.id)
        return NextResponse.json({ ok: true })
      }
      case 'close_without_signoff': {
        if (!isTrade) return err('Not allowed', 403)
        if (record.status !== 'awaiting_signoff' || !record.work_done_at) return err('Only a job awaiting sign-off can be closed this way')
        if (Date.now() - new Date(record.work_done_at).getTime() < 72 * 3600 * 1000) return err('Wait at least 72 hours for the customer to sign off')
        await set({ status: 'closed_without_signoff', closed_at: new Date().toISOString() })
        await audit(me, 'closed_without_signoff', 'job_records', record.id, { label: 'creator-recorded, no receiver sign-off' })
        return NextResponse.json({ ok: true })
      }

      // ---------------------------------------------------------------- invoice status (BR-1.7): recorded, never collected
      case 'invoice': {
        if (!isTrade) return err('Only the tradesperson records invoice status', 403)
        const allowed = ['none', 'sent', 'paid', 'part_paid', 'overdue']
        if (!allowed.includes(b.invoice_status)) return err('Unknown invoice status')
        const q = await currentQuote(record.id)
        const approvedTotal = quoteTotal(q) + (await approvedExtrasCents(record.id))
        const amount = b.amount != null && b.amount !== '' ? cents(b.amount) : approvedTotal
        await set({ invoice_status: b.invoice_status, invoice_amount_cents: amount,
          payment_details: b.payment_details != null ? String(b.payment_details).slice(0, 500) : record.payment_details })
        await audit(me, 'invoice_status', 'job_records', record.id, { invoice_status: b.invoice_status, amount_cents: amount, approved_total_cents: approvedTotal })
        // Marketplace commission: due only when paid and not disputed (8% of call-out plus labour, materials excluded)
        if (b.invoice_status === 'paid' && record.commission_flag && !record.amount_disputed && q) {
          const commission = Math.round(((q.call_out_cents || 0) + (q.labour_cents || 0)) * 0.08)
          await audit(me, 'commission_due', 'job_records', record.id, { commission_cents: commission, basis: 'call-out plus labour, quote v' + q.version })
        }
        return NextResponse.json({ ok: true, mismatch: amount > approvedTotal, approved_total_cents: approvedTotal })
      }

      // ---------------------------------------------------------------- evidence
      case 'upload_url': {
        if (!canEdit) return err('Not allowed', 403)
        return NextResponse.json(await uploadUrl(`records/${record.id}`, String(b.filename || 'photo.jpg')))
      }
      case 'photo': {
        if (!canEdit) return err('Not allowed', 403)
        const path = String(b.path || '')
        if (!path.startsWith(`records/${record.id}/`)) return err('Bad path')
        const kind = ['before', 'after', 'variation', 'problem', 'pack'].includes(b.kind) ? b.kind : 'after'
        await db().from('record_photos').insert({ record_id: record.id, kind, pack_item: b.pack_item || null, path, created_by: me })
        await audit(me, 'photo_added', 'job_records', record.id, { kind, pack_item: b.pack_item || null })
        return NextResponse.json({ ok: true })
      }
      case 'certificate': {
        if (!canEdit) return err('Not allowed', 403)
        const types: CertType[] = ['ecoc', 'pirb_coc', 'gas_coc', 'fence', 'other']
        if (!types.includes(b.cert_type)) return err('Unknown certificate type')
        if (b.file_path && !String(b.file_path).startsWith(`records/${record.id}/`)) return err('Bad path')
        const { data: c, error } = await db().from('certificates').insert({ property_id: record.property_id, record_id: record.id, cert_type: b.cert_type,
          number: String(b.number || '').slice(0, 80) || null, issue_date: b.issue_date || null, issuer_name: String(b.issuer_name || '').slice(0, 120) || null,
          issuer_reg_no: String(b.issuer_reg_no || '').slice(0, 80) || null, scope_note: String(b.scope_note || '').slice(0, 300) || null,
          file_path: b.file_path || null, created_by: me }).select('id').single()
        if (error) return err('Could not save certificate', 500)
        await audit(me, 'certificate_added', 'job_records', record.id, { certificate_id: (c as any).id, cert_type: b.cert_type })
        return NextResponse.json({ ok: true })
      }
      case 'pack_fields': {
        if (!isTrade) return err('Not allowed', 403)
        const fields: Record<string, string> = {}
        for (const [k, v] of Object.entries(b.fields || {})) if (/^[a-z_]{1,30}$/.test(k)) fields[k] = String(v).slice(0, 300)
        await set({ pack_fields: fields })
        return NextResponse.json({ ok: true })
      }
      case 'note': {
        if (!isTrade) return err('Only the tradesperson keeps private notes', 403)
        const body = String(b.body || '').trim()
        if (!body) return err('Empty note')
        await db().from('trade_notes').insert({ record_id: record.id, author_id: me, body: body.slice(0, 4000) })
        return NextResponse.json({ ok: true })
      }

      // ---------------------------------------------------------------- managers: assign, reassign after no-show, cancel
      case 'assign_trade': {
        if (!isManager) return err('Only the managing landlord or agency assigns', 403)
        const email = String(b.trade_email || '').trim().toLowerCase()
        const { data: t } = await db().from('profiles').select('id, role, full_name').ilike('email', ilikeExact(email)).maybeSingle()
        if (!t || (t as any).role !== 'tradesperson') return err('No Lungiza tradesperson with that email. Invite them to join, or post the job on the marketplace.')
        await set({ tradesperson_id: (t as any).id, status: 'draft' })
        await notifyUser((t as any).id, 'New job assigned', record.title, `/records/${record.id}`)
        await audit(me, 'trade_assigned', 'job_records', record.id, { tradesperson_id: (t as any).id })
        return NextResponse.json({ ok: true, name: (t as any).full_name })
      }
      case 'cancel': {
        if (!canEdit) return err('Not allowed', 403)
        if (locked) return err('Already closed')
        await set({ status: 'cancelled', closed_at: new Date().toISOString() })
        await audit(me, 'cancelled', 'job_records', record.id, { reason: String(b.reason || '').slice(0, 300) })
        return NextResponse.json({ ok: true })
      }
      default:
        return err('Unknown action')
    }
  } catch (e) {
    console.error('records action failed:', action, (e as Error).message)
    return err('Something went wrong', 500)
  }
}
