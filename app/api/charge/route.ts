import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
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

    const secretKey = process.env.YOCO_SECRET_KEY
    if(!secretKey) {
      return NextResponse.json({ error: 'Payment not configured — contact support' }, { status: 500 })
    }

    // ── Create Yoco hosted checkout ───────────────────────────────
    console.log('Creating Yoco checkout:', { amountInCents, currency, jobId })
    console.log('Key prefix:', secretKey.substring(0, 12) + '...')

    const idempotencyKey = `lungisa-${jobId}-${Date.now()}`

    const payload = {
      amount:     amountInCents,
      currency,
      successUrl: successUrl || 'https://lungiza.co.za/home?payment=success',
      cancelUrl:  cancelUrl  || 'https://lungiza.co.za/home?payment=cancelled',
      metadata:   { jobId, jobTitle, homeownerId, tradespersonId },
    }

    console.log('Yoco payload:', JSON.stringify(payload))

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
    console.log('Yoco full response:', JSON.stringify(checkout))

    if(!yocoRes.ok) {
      console.error('Yoco error detail:', JSON.stringify(checkout))
      // Surface the actual Yoco error message to frontend
      const errMsg = checkout?.displayMessage
        || checkout?.message
        || checkout?.error?.message
        || checkout?.errors?.[0]?.message
        || JSON.stringify(checkout)
      return NextResponse.json({ error: errMsg }, { status: 400 })
    }

    // ── Update job status ─────────────────────────────────────────
    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', jobId)

    // ── Record payment ────────────────────────────────────────────
    try {
      await supabase.from('payments').insert({
        job_id:          jobId,
        homeowner_id:    homeownerId,
        tradesperson_id: tradespersonId,
        gross_amount:       amountInCents,
        commission_amount:  Math.round(amountInCents * 0.05),
        net_amount:         Math.round(amountInCents * 0.95),
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
      headers: { 'Content-Type': 'application/json' },
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