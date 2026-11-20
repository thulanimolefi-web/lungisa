import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../lib/auth-server'
import { audit, createLink, db, findOrCreateProperty, ilikeExact, orgIdsFor } from '../../lib/jobrecord-server'

// B35/B40/B41: thin view for private landlords and agencies.
// One level only: organisation -> properties (with mandate) -> job records. No portfolios, no hierarchy.
const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })
const cents = (v: any) => Math.max(0, Math.round(Number(v || 0) * 100))
const ROUTINE_DAYS = 14   // Rental Housing Act expectation as summarised by law firms (assumption, BRD)

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const orgIds = await orgIdsFor(auth.user.id)
  if (!orgIds.length) return NextResponse.json({ orgs: [], properties: [], records: [], reports: [], overdue: [] })
  const [orgs, props, mandates, records] = await Promise.all([
    db().from('organisations').select('id, name, kind').in('id', orgIds),
    db().from('properties').select('id, address_line, unit, suburb, city, org_id, created_at').in('org_id', orgIds).order('address_line'),
    db().from('mandates').select('*').in('org_id', orgIds),
    db().from('job_records').select('id, ref, title, status, urgency, property_id, tradesperson_id, created_at, updated_at, invoice_status')
      .in('org_id', orgIds).order('created_at', { ascending: false }).limit(300),
  ])
  const reports = await db().from('tenant_reports').select('id, property_id, description, urgency, reporter_name, record_id, created_at')
    .in('property_id', (props.data || []).map((p: any) => p.id).concat(['00000000-0000-0000-0000-000000000000']))
    .is('record_id', null).order('created_at', { ascending: false }).limit(100)
  const propIds = new Set((props.data || []).map((p: any) => p.id))
  const open = (records.data || []).filter((r: any) => !['completed', 'closed_without_signoff', 'cancelled'].includes(r.status))
  const now = Date.now()
  const reasonFor = (s: string) => ({
    unassigned: 'No tradesperson assigned or no-show', draft: 'Waiting for a quote', quoted: 'Quote declined or not approved',
    awaiting_approval: 'Owner or approver waiting', approved: 'Approved, work not started', in_progress: 'Work in progress',
    awaiting_signoff: 'Waiting for sign-off', disputed: 'Problem reported',
  } as Record<string, string>)[s] || s
  const overdue = open.map((r: any) => {
    const days = Math.floor((now - new Date(r.created_at).getTime()) / 86400000)
    const limit = r.urgency === 'urgent' ? 1 : ROUTINE_DAYS
    return { ...r, days_open: days, limit_days: limit, overdue: days > limit, reason: reasonFor(r.status) }
  }).sort((a: any, b: any) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || b.days_open - a.days_open)
  return NextResponse.json({
    orgs: orgs.data || [],
    properties: (props.data || []).map((p: any) => ({ ...p, mandate: (mandates.data || []).find((m: any) => m.property_id === p.id) || null })),
    records: records.data || [],
    reports: (reports.data || []).filter((r: any) => propIds.has(r.property_id)),
    overdue,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const me = auth.user.id
  const b = await req.json().catch(() => ({}))
  const orgIds = await orgIdsFor(me)
  const ownsProperty = async (pid: string) => {
    const { data } = await db().from('properties').select('id, org_id').eq('id', pid).maybeSingle()
    return data && orgIds.includes((data as any).org_id) ? (data as any) : null
  }

  switch (b.action) {
    case 'create_org': {
      const kind = b.kind === 'agency' ? 'agency' : 'landlord'
      const name = String(b.name || '').trim()
      if (!name) return err('Name required')
      if (orgIds.length >= 3) return err('Limit of 3 organisations per account in this version')
      const { data, error } = await db().from('organisations').insert({ name: name.slice(0, 120), kind, created_by: me }).select('id').single()
      if (error) return err('Could not create', 500)
      await db().from('memberships').insert({ org_id: (data as any).id, user_id: me, role: 'principal' })
      await audit(me, 'org_created', 'organisations', (data as any).id, { kind })
      return NextResponse.json({ ok: true, id: (data as any).id })
    }
    case 'add_member': {
      if (!orgIds.includes(b.org_id)) return err('Not your organisation', 403)
      const { data: m } = await db().from('memberships').select('role').eq('org_id', b.org_id).eq('user_id', me).maybeSingle()
      if ((m as any)?.role !== 'principal') return err('Only the principal adds members', 403)
      const { data: u } = await db().from('profiles').select('id').ilike('email', ilikeExact(String(b.email || ''))).maybeSingle()
      if (!u) return err('That person needs a Lungiza account first')
      await db().from('memberships').upsert({ org_id: b.org_id, user_id: (u as any).id, role: 'manager' }, { onConflict: 'org_id,user_id', ignoreDuplicates: true })
      await audit(me, 'member_added', 'organisations', b.org_id, { user_id: (u as any).id })
      return NextResponse.json({ ok: true })
    }
    case 'add_property': {
      if (!orgIds.includes(b.org_id)) return err('Not your organisation', 403)
      if (!String(b.owner_name || '').trim()) return err('Owner name is needed for the mandate')
      let pid: string
      try { pid = await findOrCreateProperty({ address_line: String(b.address_line || ''), unit: b.unit, suburb: b.suburb, city: b.city }, me, b.org_id) }
      catch { return err('Address required') }
      const { error } = await db().from('mandates').upsert({ property_id: pid, org_id: b.org_id, owner_name: String(b.owner_name).slice(0, 120),
        owner_phone: b.owner_phone || null, owner_email: String(b.owner_email || '').toLowerCase() || null,
        approval_cap_cents: cents(b.approval_cap), emergency_cap_cents: cents(b.emergency_cap),
        require_receiver_confirmed_above_cap: b.require_receiver_confirmed !== false,
        backup_name: b.backup_name || null, backup_phone: b.backup_phone || null, backup_email: b.backup_email || null }, { onConflict: 'property_id' })
      if (error) return err('Could not save the mandate', 500)
      await audit(me, 'mandate_set', 'properties', pid, { approval_cap_cents: cents(b.approval_cap), emergency_cap_cents: cents(b.emergency_cap) })
      return NextResponse.json({ ok: true, id: pid })
    }
    case 'update_mandate': {
      const p = await ownsProperty(b.property_id)
      if (!p) return err('Not your property', 403)
      const fields: Record<string, unknown> = {}
      if (b.approval_cap != null) fields.approval_cap_cents = cents(b.approval_cap)
      if (b.emergency_cap != null) fields.emergency_cap_cents = cents(b.emergency_cap)
      for (const k of ['owner_name', 'owner_phone', 'owner_email', 'backup_name', 'backup_phone', 'backup_email']) if (b[k] != null) fields[k] = String(b[k]).slice(0, 120)
      if (b.require_receiver_confirmed != null) fields.require_receiver_confirmed_above_cap = !!b.require_receiver_confirmed
      await db().from('mandates').update(fields).eq('property_id', p.id)
      await audit(me, 'mandate_updated', 'properties', p.id, fields)
      return NextResponse.json({ ok: true })
    }
    case 'tenant_link': {
      const p = await ownsProperty(b.property_id)
      if (!p) return err('Not your property', 403)
      const link = await createLink(me, { scope: 'tenant', property_id: p.id, recipient_name: b.tenant_name, recipient_phone: b.tenant_phone, days: 365 })
      await audit(me, 'tenant_link_created', 'properties', p.id, { link_id: link.id })
      return NextResponse.json({ ok: true, token: link.token })
    }
    case 'convert_report': {
      const { data: r } = await db().from('tenant_reports').select('*').eq('id', b.report_id).maybeSingle()
      if (!r) return err('Report not found')
      const p = await ownsProperty((r as any).property_id)
      if (!p) return err('Not your property', 403)
      const { data: rec, error } = await db().from('job_records').insert({ source: 'agent', property_id: p.id, org_id: p.org_id, created_by: me,
        customer_name: (r as any).reporter_name, customer_phone: (r as any).reporter_phone, title: String((r as any).description).slice(0, 80),
        scope: (r as any).description, urgency: (r as any).urgency, status: 'unassigned' }).select('id').single()
      if (error) return err('Could not create the job', 500)
      await db().from('tenant_reports').update({ record_id: (rec as any).id }).eq('id', (r as any).id)
      await audit(me, 'record_created_from_tenant_report', 'job_records', (rec as any).id, { report_id: (r as any).id })
      return NextResponse.json({ ok: true, id: (rec as any).id })
    }
    case 'owner_link': {
      // Approval link for the property owner on a record above the mandate cap (R3, R5)
      const { data: rec } = await db().from('job_records').select('id, property_id, org_id').eq('id', b.record_id).maybeSingle()
      if (!rec || !orgIds.includes((rec as any).org_id)) return err('Not your job', 403)
      const { data: m } = await db().from('mandates').select('*').eq('property_id', (rec as any).property_id).maybeSingle()
      const who = b.to === 'backup'
        ? { name: (m as any)?.backup_name, phone: (m as any)?.backup_phone, email: (m as any)?.backup_email }
        : { name: (m as any)?.owner_name, phone: (m as any)?.owner_phone, email: (m as any)?.owner_email }
      const link = await createLink(me, { scope: 'approver', record_id: (rec as any).id, recipient_name: who.name, recipient_phone: who.phone, recipient_email: who.email, days: 30 })
      await audit(me, 'owner_link_created', 'job_records', (rec as any).id, { to: b.to === 'backup' ? 'backup' : 'owner' })
      return NextResponse.json({ ok: true, token: link.token, recipient: who })
    }
    default:
      return err('Unknown action')
  }
}
