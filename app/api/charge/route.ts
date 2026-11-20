import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { splitCommission } from '../../lib/commission'
import { requireUser } from '../../lib/auth-server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  try {
    const {
      amountInCents,
      currency = 'ZAR',
      jobId,
      jobTitle,
      homeownerId,
      tradespersonId,
      successUrl,
      cancelUrl,
    } = await req.json()

    if(!amountInCents || !jobId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    // Only the job's homeowner can start a checkout for it
    const { data: own } = await supabase.from('jobs').select('homeowner_id').eq('id', jobId).maybeSingle()
    if (!own || (own as any).homeowner_id !== auth.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const secretKey = process.env.YOCO_SECRET_KEY
    if(!secretKey) {
      return NextResponse.json({ error: 'Payment not configured — contact support' }, { status: 500 })
    }

    // ── Create Yoco hosted checkout ───────────────────────────────
    console.log('Creating Yoco checkout:', { amountInCents, currency, jobId })

    const idempotencyKey = `lungisa-${jobId}-${Date.now()}`

    const payload = {
      amount:     amountInCents,
      currency,
      successUrl: successUrl || 'https://lungiza.co.za/home?payment=success',
      cancelUrl:  cancelUrl  || 'https://lungiza.co.za/home?payment=cancelled',
      metadata:   { jobId, jobTitle, homeownerId, tradespersonId },
    }


    const yocoRes = await fetch('https://payments.yoco.com/api/checkouts', {
      method:  'POST',
      headers: {
        'Authorization':   `Bearer ${secretKey}`,
        'Content-Type':    'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    })

    const checkout = await yocoRes.json()
    console.log('Yoco status:', yocoRes.status)

    if(!yocoRes.ok) {
      // Surface the actual Yoco error message to frontend
      const errMsg = checkout?.displayMessage
        || checkout?.message
        || checkout?.error?.message
        || checkout?.errors?.[0]?.message
        || 'Payment failed'
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // ── Update job status ─────────────────────────────────────────
    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)

    // ── Record payment ────────────────────────────────────────────
    // This is a preliminary record — the Yoco webhook (app/api/route.ts)
    // upserts the authoritative version once payment actually completes.
    try {
      let bidBreakdown = null
      const { data: jobRow } = await supabase.from('jobs').select('accepted_bid_id').eq('id', jobId).single()
      if(jobRow?.accepted_bid_id) {
        const { data: bidRow } = await supabase.from('bids')
          .select('call_out_fee,labour_amount,materials_amount,amount')
          .eq('id', jobRow.accepted_bid_id).single()
        bidBreakdown = bidRow
      }
      const { commissionAmountCents, netAmountCents } = splitCommission(amountInCents, bidBreakdown)

      await supabase.from('payments').insert({
        job_id:          jobId,
        homeowner_id:    auth.user.id,
        tradesperson_id: tradespersonId,
        gross_amount:       amountInCents,
        commission_amount:  commissionAmountCents,
        net_amount:         netAmountCents,
        payment_method:     'card',
        currency,
        yoco_charge_id:  checkout.id,
        status:          'held',
      })
    } catch(e) { console.log('Payment record error (non-fatal):', e) }

    // ── Send payment confirmation email ───────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lungiza.co.za'
    fetch(`${appUrl}/api/send-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: req.headers.get('authorization') || '' },
      body:    JSON.stringify({
        type: 'payment_confirmed', jobId,
        amount: amountInCents / 100,
        homeownerId, tradespersonId,
      }),
    }).catch(e => console.log('Email error:', e))

    return NextResponse.json({
      success:     true,
      redirectUrl: checkout.redirectUrl,
      checkoutId:  checkout.id,
    })

  } catch(error) {
    console.error('Charge route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}