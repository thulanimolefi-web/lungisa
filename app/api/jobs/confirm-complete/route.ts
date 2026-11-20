import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireUser } from '../../../lib/auth-server'
import { splitCommission } from '../../../lib/commission'

// Security-only change: the homeowner's "confirm job done" used to update the payments row and
// insert the tradesperson's notification straight from the browser. Browsers can no longer write
// payments or notify other users, so the same two writes happen here, after checking the caller
// owns the job. Behaviour and wording are unchanged.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { jobId } = await req.json().catch(() => ({}))
  if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  const db = adminClient()

  const { data: job } = await db.from('jobs').select('id, homeowner_id, status, accepted_bid_id').eq('id', jobId).maybeSingle()
  if (!job || (job as any).homeowner_id !== auth.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['completed', 'completion_submitted', 'in_progress'].includes((job as any).status)) {
    return NextResponse.json({ error: 'Job is not ready to confirm' }, { status: 409 })
  }

  const { data: bid } = await db.from('bids').select('id, tradesperson_id, call_out_fee, labour_amount, materials_amount, amount, final_amount')
    .eq('job_id', jobId).eq('status', 'accepted').limit(1).maybeSingle()
  const { data: payment } = await db.from('payments').select('id, gross_amount, amount, status').eq('job_id', jobId)
    .limit(1).maybeSingle()

  let netAmountCents = 0
  if (payment) {
    const gross = (payment as any).gross_amount || (payment as any).amount || 0
    netAmountCents = splitCommission(gross, bid as any).netAmountCents
    if ((payment as any).status !== 'released') {
      const { error } = await db.from('payments').update({
        status: 'released', released_at: new Date().toISOString(), payout_status: 'pending', net_amount: netAmountCents,
      }).eq('job_id', jobId)
      if (error) return NextResponse.json({ error: 'Could not update payment' }, { status: 500 })
    }
  }

  if ((bid as any)?.tradesperson_id) {
    await db.from('notifications').insert({
      user_id: (bid as any).tradesperson_id,
      type: 'payment_processing',
      title: 'Payment being processed',
      message: `Homeowner confirmed the job done. R${Math.round(netAmountCents / 100).toLocaleString()} will be paid to your bank account within 24 hours.`,
      link: '/dashboard',
      read: false,
    })
  }
  return NextResponse.json({ ok: true, netAmountCents })
}
