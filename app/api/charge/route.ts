import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const {
      token,
      amountInCents,
      currency = 'ZAR',
      jobId,
      jobTitle,
      homeownerId,
      tradespersonId,
    } = await req.json()

    if(!token || !amountInCents || !jobId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const secretKey = process.env.YOCO_SECRET_KEY
    if(!secretKey) {
      return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 })
    }

    // ── Charge the card via Yoco API ────────────────────────────────
    const chargeRes = await fetch('https://online.yoco.com/v1/charges/', {
      method:  'POST',
      headers: {
        'X-Auth-Secret-Key': secretKey,
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency,
        metadata: { jobId, jobTitle, homeownerId, tradespersonId },
      }),
    })

    const charge = await chargeRes.json()

    // Handle Yoco error response
    if(!chargeRes.ok || charge.error || charge.status === 'failed') {
      console.error('Yoco charge failed:', charge)
      return NextResponse.json({
        error: charge.displayMessage || charge.message || 'Payment failed — please try again'
      }, { status: 400 })
    }

    // ── Payment succeeded — update DB ────────────────────────────────
    // Update job to in_progress
    await supabase
      .from('jobs')
      .update({ status: 'in_progress' })
      .eq('id', jobId)

    // Record payment in payments table
    const netAmount = Math.round(amountInCents * 0.95)
    try {
      await supabase.from('payments').insert({
        job_id:          jobId,
        homeowner_id:    homeownerId,
        tradesperson_id: tradespersonId,
        amount:          amountInCents / 100,
        net_amount:      netAmount / 100,
        currency,
        yoco_charge_id:  charge.id,
        status:          'held',
      })
    } catch(e) { console.log('Payment record error:', e) }

    // Send confirmation emails
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://lungiza.co.za'}/api/send-email`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        type:           'payment_confirmed',
        jobId,
        amount:         amountInCents / 100,
        homeownerId,
        tradespersonId,
      }),
    }).catch(e => console.log('Email error:', e))

    return NextResponse.json({
      success:  true,
      chargeId: charge.id,
      amount:   amountInCents / 100,
    })

  } catch(error) {
    console.error('Charge route error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}