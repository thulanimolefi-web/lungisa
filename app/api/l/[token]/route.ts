import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '../../../lib/auth-server'
import { audit, currentQuote, db, linkView, loadRecord, notifyUser, resolveLink } from '../../../lib/jobrecord-server'
import { checkOtpSession, startOtp, verifyOtp } from '../../../lib/otp'
import { markPayoutsDue, paymentState, startRecordCheckout } from '../../../lib/record-payments'

// B20/B22/B39/B42: everything a link holder can do, without an account.
// Approvals made here are receiver-confirmed only after an OTP check (rule R4).
type Ctx = { params: { token: string } }
const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

export async function GET(_req: NextRequest, { params }: Ctx) {
  const link = await resolveLink(params.token)
  if (!link) return err('This link is no longer available', 404)
  const view = await linkView(link)
  if (!view) return err('This link is no longer available', 404)
  // Card payment state, only for the customer's (approver) link
  let payment = null
  if (link.scope === 'approver' && link.record_id) {
    const rec = await loadRecord(link.record_id)
    if (rec) {
      const st = await paymentState(rec)
      payment = { total_cents: st.total_cents, paid_cents: st.paid_cents, due_cents: st.due_cents, can_pay: st.can_pay, reason: st.reason }
    }
  }
  return NextResponse.json({ ...view, payment, recipient_email_hint: link.recipient_email ? link.recipient_email.replace(/^(.).*(@.*)$/, '$1***$2') : null },
    { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const link = await resolveLink(params.token)
  if (!link) return err('This link is no longer available', 404)
  const b = await req.json().catch(() => ({}))
  const action = String(b.action || '')
  const label = `link:${link.id.slice(0, 8)}`

  // ---------------------------------------------------------------- tenant report (BR-5.3)
  if (link.scope === 'tenant') {
    if (action !== 'tenant_report') return err('Not allowed', 403)
    const desc = String(b.description || '').trim()
    if (desc.length < 5) return err('Describe the problem')
    const since = new Date(Date.now() - 3600 * 1000).toISOString()
    const { count } = await db().from('tenant_reports').select('id', { count: 'exact', head: true }).eq('link_id', link.id).gte('created_at', since)
    if ((count || 0) >= 5) return err('Too many reports from this link in the last hour')
    const { data: r } = await db().from('tenant_reports').insert({ property_id: link.property_id, link_id: link.id, description: desc.slice(0, 2000),
      urgency: b.urgency === 'urgent' ? 'urgent' : 'routine', reporter_name: String(b.name || '').slice(0, 120) || null,
      reporter_phone: String(b.phone || '').slice(0, 40) || null }).select('id').single()
    const { data: p } = await db().from('properties').select('org_id, address_line').eq('id', link.property_id).maybeSingle()
    if ((p as any)?.org_id) {
      const { data: members } = await db().from('memberships').select('user_id').eq('org_id', (p as any).org_id)
      for (const m of members || []) await notifyUser((m as any).user_id, b.urgency === 'urgent' ? 'URGENT tenant report' : 'Tenant report', `${(p as any).address_line}: ${desc.slice(0, 120)}`, '/manage')
    }
    await audit(null, 'tenant_report', 'properties', link.property_id, { report_id: (r as any)?.id }, label)
    return NextResponse.json({ ok: true })
  }

  // ---------------------------------------------------------------- OTP
  if (action === 'otp_send') {
    if (link.scope !== 'approver') return err('This link is view-only', 403)
    // If the creator gave the receiver's email, the code only goes there. Otherwise the receiver types one,
    // and the approval records which address confirmed it.
    const dest = String(link.recipient_email || b.email || '')
    const r = await startOtp(link.id, 'email', dest)
    return r.ok ? NextResponse.json({ ok: true, challengeId: r.challengeId }) : err(r.error || 'Could not send code')
  }
  if (action === 'otp_verify') {
    const r = await verifyOtp(link.id, String(b.challengeId || ''), String(b.code || ''))
    return r.ok ? NextResponse.json({ ok: true, session: r.session }) : err(r.error || 'Wrong code')
  }

  // ---------------------------------------------------------------- home file claim (BR-4.2): needs a signed-in account
  if (action === 'claim') {
    const u = await getUser(req)
    if (!u) return err('Sign in or create a free account to keep this record', 401)
    if (!link.record_id || link.scope !== 'approver') return err('Only the customer link can claim the home file', 403)
    const otp = await checkOtpSession(link.id, b.otp_session)
    if (!otp) return err('Confirm the code first')
    const record = await loadRecord(link.record_id)
    if (!record) return err('Not found', 404)
    const consent = 'I am the owner of this property and I want this job record and future records kept in my Lungiza home file. ' +
      'Lungiza stores the job details, photos and certificates for me and shares them only with people I send a link to.'
    const { error } = await db().from('property_grants').upsert({ property_id: record.property_id, user_id: u.user.id, grant_role: 'owner',
      consent_text: consent, revoked_at: null }, { onConflict: 'property_id,user_id' })
    if (error) return err('Could not save the claim', 500)
    await audit(u.user.id, 'home_file_claimed', 'properties', record.property_id, { record_id: record.id, otp_destination: otp.destination })
    return NextResponse.json({ ok: true })
  }

  // ---------------------------------------------------------------- record actions
  if (!link.record_id) return err('Not allowed', 403)
  const record = await loadRecord(link.record_id)
  if (!record) return err('Not found', 404)
  if (link.scope !== 'approver') return err('This link is view-only', 403)

  // Actions that need receiver confirmation by OTP
  const needsOtp = ['approve_quote', 'decline_quote', 'approve_variation', 'decline_variation', 'sign_off', 'report_problem', 'mark_paid', 'dispute_amount', 'no_show', 'pay_card']
  if (!needsOtp.includes(action)) return err('Unknown action')
  const otp = await checkOtpSession(link.id, b.otp_session)
  if (!otp) return err('Confirm the code we sent you first', 401)
  const name = String(b.name || link.recipient_name || record.customer_name || '').slice(0, 120) || null
  const base = { record_id: record.id, approval_type: 'receiver_confirmed', approver_name: name, approver_phone: link.recipient_phone,
    approver_email: otp.destination, otp_verified_at: otp.verified_at, authority_basis: 'Confirmed by the receiver with a one-time code', note: String(b.note || '').slice(0, 1000) || null }
  const closed = ['completed', 'closed_without_signoff', 'cancelled'].includes(record.status)
  const done = async (auditAction: string, data: Record<string, unknown> = {}, notify?: string) => {
    await audit(null, auditAction, 'job_records', record.id, data, `${label} ${otp.destination}`)
    if (notify) {
      await notifyUser(record.tradesperson_id, notify, record.title, `/records/${record.id}`)
      if (record.org_id) {
        const { data: members } = await db().from('memberships').select('user_id').eq('org_id', record.org_id)
        for (const m of members || []) await notifyUser((m as any).user_id, notify, record.title, `/records/${record.id}`)
      }
    }
    return NextResponse.json({ ok: true })
  }

  switch (action) {
    case 'approve_quote':
    case 'decline_quote': {
      if (closed) return err('This job is closed')
      const q = await currentQuote(record.id)
      if (!q) return err('There is no quote to approve')
      if (Number(b.quote_version) !== q.version) return err('The quote changed. Reload and check the new version.', 409)
      const decision = action === 'approve_quote' ? 'approved' : 'declined'
      await db().from('approvals').insert({ ...base, subject: 'quote', quote_version: q.version, decision })
      await db().from('job_records').update({ status: decision === 'approved' ? 'approved' : 'quoted' }).eq('id', record.id)
      return done(`quote_${decision}`, { version: q.version }, decision === 'approved' ? 'Quote approved' : 'Quote declined')
    }
    case 'approve_variation':
    case 'decline_variation': {
      const { data: v } = await db().from('variations').select('*').eq('id', b.variation_id).eq('record_id', record.id).maybeSingle()
      if (!v) return err('Extra not found')
      const decision = action === 'approve_variation' ? 'approved' : 'declined'
      await db().from('approvals').insert({ ...base, subject: 'variation', subject_id: (v as any).id, decision })
      await db().from('variations').update({ status: decision }).eq('id', (v as any).id)
      return done(`variation_${decision}`, { variation_id: (v as any).id }, decision === 'approved' ? 'Extra approved' : 'Extra declined')
    }
    case 'sign_off': {
      if (record.status !== 'awaiting_signoff') return err('The tradesperson has not marked the work done yet')
      await db().from('approvals').insert({ ...base, subject: 'completion', decision: 'signed_off' })
      await db().from('job_records').update({ status: 'completed', closed_at: new Date().toISOString() }).eq('id', record.id)
      await markPayoutsDue(record.id)
      return done('signed_off', {}, 'Job signed off')
    }
    case 'report_problem': {
      if (closed) return err('This job is closed')
      if (String(b.note || '').trim().length < 5) return err('Say what the problem is')
      await db().from('approvals').insert({ ...base, subject: 'completion', decision: 'problem_reported' })
      await db().from('job_records').update({ status: 'disputed' }).eq('id', record.id)
      return done('problem_reported', {}, 'Problem reported')
    }
    case 'no_show': {
      if (!['approved', 'awaiting_approval', 'quoted', 'draft'].includes(record.status)) return err('Only before work starts')
      await db().from('approvals').insert({ ...base, subject: 'completion', decision: 'trade_no_show' })
      await db().from('job_records').update({ status: record.org_id ? 'unassigned' : record.status }).eq('id', record.id)
      return done('trade_no_show', {}, 'Customer reports the tradesperson did not arrive')
    }
    case 'mark_paid': {
      await db().from('approvals').insert({ ...base, subject: 'payment', decision: 'marked_paid' })
      await db().from('job_records').update({ receiver_marked_paid_at: new Date().toISOString() }).eq('id', record.id)
      return done('receiver_marked_paid', {}, 'Customer says they paid')
    }
    case 'pay_card': {
      const r = await startRecordCheckout(record, link.id, otp.destination || null)
      if (!r.ok) return err(r.error)
      await audit(null, 'pay_card_started', 'job_records', record.id, {}, `${label} ${otp.destination}`)
      return NextResponse.json({ ok: true, redirectUrl: r.redirectUrl })
    }
    case 'dispute_amount': {
      if (String(b.note || '').trim().length < 5) return err('Say what is wrong with the amount')
      await db().from('approvals').insert({ ...base, subject: 'payment', decision: 'amount_disputed' })
      await db().from('job_records').update({ amount_disputed: true }).eq('id', record.id)
      return done('amount_disputed', {}, 'Customer disputes the amount')
    }
  }
  return err('Unknown action')
}
