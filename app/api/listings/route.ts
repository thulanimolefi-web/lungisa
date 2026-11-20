import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../lib/auth-server'
import { audit, createLink, db, findOrCreateProperty, listingView, uploadUrl } from '../../lib/jobrecord-server'
import { LISTING_DEFAULTS, CertType } from '../../lib/certificate-rules'

// B37/B42: sales agent transfer checklist, routed certificate job, handover link.
const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

async function myListing(me: string, id: string) {
  const { data } = await db().from('listings').select('*').eq('id', id).eq('agent_id', me).maybeSingle()
  return data as any
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    if (!(await myListing(auth.user.id, id))) return err('Not found', 404)
    return NextResponse.json(await listingView(id))
  }
  const { data } = await db().from('listings').select('id, status, seller_name, created_at, properties(address_line, unit, suburb)')
    .eq('agent_id', auth.user.id).order('created_at', { ascending: false })
  return NextResponse.json({ listings: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const me = auth.user.id
  const b = await req.json().catch(() => ({}))

  if (b.action === 'create') {
    let pid: string
    try { pid = await findOrCreateProperty({ address_line: String(b.address_line || ''), unit: b.unit, suburb: b.suburb, city: b.city }, me, null) }
    catch { return err('Address required') }
    const { data: l, error } = await db().from('listings').insert({ property_id: pid, agent_id: me, seller_name: b.seller_name || null,
      seller_phone: b.seller_phone || null, seller_email: String(b.seller_email || '').toLowerCase() || null }).select('id').single()
    if (error) return err('Could not create listing', 500)
    await db().from('listing_items').insert(LISTING_DEFAULTS.map(d => ({ listing_id: (l as any).id, item: d.item, required: d.required, applies: d.required ? true : null })))
    await audit(me, 'listing_created', 'listings', (l as any).id)
    return NextResponse.json({ ok: true, id: (l as any).id })
  }

  const listing = await myListing(me, b.listing_id)
  if (!listing) return err('Not found', 404)

  switch (b.action) {
    case 'answer': {
      await db().from('listing_items').update({ applies: b.applies === true ? true : b.applies === false ? false : null })
        .eq('listing_id', listing.id).eq('item', b.item)
      return NextResponse.json({ ok: true })
    }
    case 'upload_url':
      return NextResponse.json(await uploadUrl(`listings/${listing.id}`, String(b.filename || 'certificate.pdf')))
    case 'attach_certificate': {
      const types: CertType[] = ['ecoc', 'pirb_coc', 'gas_coc', 'fence', 'other']
      if (!types.includes(b.cert_type)) return err('Unknown certificate type')
      if (b.file_path && !String(b.file_path).startsWith(`listings/${listing.id}/`)) return err('Bad path')
      const { data: c, error } = await db().from('certificates').insert({ property_id: listing.property_id, cert_type: b.cert_type,
        number: b.number || null, issue_date: b.issue_date || null, issuer_name: b.issuer_name || null, issuer_reg_no: b.issuer_reg_no || null,
        file_path: b.file_path || null, created_by: me }).select('id').single()
      if (error) return err('Could not save', 500)
      await db().from('listing_items').update({ certificate_id: (c as any).id }).eq('listing_id', listing.id).eq('item', b.item)
      await audit(me, 'listing_certificate_attached', 'listings', listing.id, { item: b.item })
      return NextResponse.json({ ok: true })
    }
    case 'request_job': {
      // Routed certificate job through the existing marketplace (BR-6.2): posted as a normal job by the agent
      const { data: p } = await db().from('properties').select('address_line, suburb, city').eq('id', listing.property_id).maybeSingle()
      const what = b.item === 'gas_coc' ? 'Gas certificate of compliance' : b.item === 'fence' ? 'Electric fence certificate' : 'Electrical certificate of compliance (ECOC)'
      const { data: job, error } = await db().from('jobs').insert({ homeowner_id: me, title: `${what} for property transfer`,
        description: `${what} needed for a property sale. Please quote including any remedial work as separate items. Requested through a Lungiza sales checklist.`,
        category: b.item === 'gas_coc' ? 'gas' : 'electrical', urgency: 'this_week', area: (p as any)?.suburb || 'Johannesburg',
        street_address: (p as any)?.address_line || null, city: (p as any)?.city || 'Johannesburg', status: 'open' }).select('id').single()
      if (error) return err('Could not post the job. Check the category list on staging.', 500)
      await audit(me, 'certificate_job_requested', 'listings', listing.id, { item: b.item, job_id: (job as any).id })
      return NextResponse.json({ ok: true, job_id: (job as any).id })
    }
    case 'handover_link': {
      const link = await createLink(me, { scope: 'handover', listing_id: listing.id, recipient_name: b.buyer_name, recipient_email: b.buyer_email, days: 180 })
      await audit(me, 'handover_link_created', 'listings', listing.id)
      return NextResponse.json({ ok: true, token: link.token })
    }
    default:
      return err('Unknown action')
  }
}
