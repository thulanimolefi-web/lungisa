import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../lib/auth-server'
import { audit, db, findOrCreateProperty, orgIdsFor, propertyAccess } from '../../lib/jobrecord-server'
import { isPackId } from '../../lib/packs'

// B17: list and create job records.
// GET  -> records where I am the tradesperson, the creator, or a member of the managing organisation
// POST -> create a record for my own customer (tradesperson) or for a managed property (landlord/agency)
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const me = auth.user.id
  const orgs = await orgIdsFor(me)
  const filters = [`tradesperson_id.eq.${me}`, `created_by.eq.${me}`]
  if (orgs.length) filters.push(`org_id.in.(${orgs.join(',')})`)
  const { data, error } = await db().from('job_records')
    .select('id, ref, title, status, source, urgency, invoice_status, customer_name, property_id, tradesperson_id, org_id, created_at, updated_at, work_done_at, properties(address_line, unit, suburb)')
    .or(filters.join(',')).order('updated_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: 'Could not load records' }, { status: 500 })
  return NextResponse.json({ records: data || [], role: auth.role })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const me = auth.user.id
  const b = await req.json().catch(() => ({}))
  const title = String(b.title || '').trim()
  if (!title) return NextResponse.json({ error: 'Give the job a title' }, { status: 400 })
  const pack = isPackId(b.trade_pack) ? b.trade_pack : null
  const urgency = b.urgency === 'urgent' ? 'urgent' : 'routine'

  let propertyId: string
  let orgId: string | null = null
  let source: 'own' | 'agent' = 'own'
  let tradespersonId: string | null = null

  if (b.property_id) {
    // Manager (landlord or agency) logging a job on a managed property
    const access = await propertyAccess(me, b.property_id)
    if (access !== 'manager' && access !== 'creator') return NextResponse.json({ error: 'Not your property' }, { status: 403 })
    const { data: p } = await db().from('properties').select('org_id').eq('id', b.property_id).maybeSingle()
    propertyId = b.property_id
    orgId = (p as any)?.org_id ?? null
    source = 'agent'
  } else {
    // Tradesperson creating a job for their own customer (BR-1.1)
    if (auth.role !== 'tradesperson') return NextResponse.json({ error: 'Only tradespeople create own-customer jobs. Landlords and agencies add a property first.' }, { status: 403 })
    if (!String(b.customer_name || '').trim() || !String(b.customer_phone || '').trim()) {
      return NextResponse.json({ error: 'Customer name and phone are needed' }, { status: 400 })
    }
    try {
      propertyId = await findOrCreateProperty({ address_line: String(b.address_line || ''), unit: b.unit, suburb: b.suburb, city: b.city }, me, null)
    } catch { return NextResponse.json({ error: 'Address is needed' }, { status: 400 }) }
    tradespersonId = me
  }

  const { data, error } = await db().from('job_records').insert({
    source, property_id: propertyId, org_id: orgId, tradesperson_id: tradespersonId, created_by: me,
    customer_name: String(b.customer_name || '').trim() || null,
    customer_phone: String(b.customer_phone || '').trim() || null,
    customer_email: String(b.customer_email || '').trim().toLowerCase() || null,
    title, scope: String(b.scope || '').trim() || null, trade_pack: pack, urgency,
    status: tradespersonId ? 'draft' : 'unassigned', commission_flag: false,
  }).select('id, ref').single()
  if (error) return NextResponse.json({ error: 'Could not create the job' }, { status: 500 })
  await audit(me, 'record_created', 'job_records', (data as any).id, { source, details_typed_by_creator: true })
  return NextResponse.json({ id: (data as any).id, ref: (data as any).ref })
}
