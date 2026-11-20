import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '../../../lib/auth-server'
import { audit } from '../../../lib/jobrecord-server'

// Admin only: card payments on job records that Lungiza has to pay out to the tradesperson by EFT.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const db = adminClient()
  const { data } = await db.from('record_payments')
    .select('id, record_id, amount_cents, commission_cents, net_cents, status, payout_status, payout_reference, payout_at, paid_at, created_at, job_records(ref, title, status, tradesperson_id)')
    .in('status', ['paid', 'review']).order('created_at', { ascending: false }).limit(200)
  const rows = await Promise.all((data || []).map(async (p: any) => {
    const tradeId = p.job_records?.tradesperson_id
    const [{ data: trade }, { data: bank }] = await Promise.all([
      tradeId ? db.from('profiles').select('full_name, email, phone').eq('id', tradeId).maybeSingle() : Promise.resolve({ data: null }),
      tradeId ? db.from('banking_details').select('bank_name, account_holder, account_number, account_type, branch_code').eq('tradesperson_id', tradeId).maybeSingle() : Promise.resolve({ data: null }),
    ])
    return { ...p, trade, banking: bank }
  }))
  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const { id, reference } = await req.json().catch(() => ({}))
  if (!id || !String(reference || '').trim()) return NextResponse.json({ error: 'Payment and EFT reference required' }, { status: 400 })
  const db = adminClient()
  const { data: p } = await db.from('record_payments').select('id, record_id, status, payout_status').eq('id', id).maybeSingle()
  if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if ((p as any).status !== 'paid') return NextResponse.json({ error: 'Only a confirmed card payment can be paid out' }, { status: 409 })
  if ((p as any).payout_status === 'paid') return NextResponse.json({ error: 'Already paid out' }, { status: 409 })
  const { error } = await db.from('record_payments').update({
    payout_status: 'paid', payout_reference: String(reference).trim().slice(0, 120), payout_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  await audit(auth.user.id, 'record_payout_paid', 'job_records', (p as any).record_id, { payment_id: id, was: (p as any).payout_status })
  return NextResponse.json({ ok: true })
}
