import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('webhook-signature') || ''

    // ── Verify webhook signature ─────────────────────────────────
    const secret = process.env.YOCO_WEBHOOK_SECRET
    if(secret) {
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')

      if(hmac !== signature) {
        console.error('Webhook signature mismatch')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body)
    console.log('Yoco webhook event:', event.type, event.id)

    // ── Handle payment.succeeded ─────────────────────────────────
    if(event.type === 'payment.succeeded') {
      const checkout  = event.payload
      const metadata  = checkout.metadata || {}
      const jobId     = metadata.jobId
      const homeownerId    = metadata.homeownerId
      const tradespersonId = metadata.tradespersonId
      const amount    = checkout.amount / 100 // convert cents to rands

      if(!jobId) {
        console.log('No jobId in metadata — ignoring')
        return NextResponse.json({ received: true })
      }

      // 1. Update job status to in_progress
      await supabase
        .from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId)

      // 2. Update payment record to confirmed
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('yoco_charge_id', checkout.id)
        .single()

      if(existingPayment) {
        await supabase
          .from('payments')
          .update({ status: 'held', updated_at: new Date().toISOString() })
          .eq('id', existingPayment.id)
      } else {
        // Create payment record if it doesn't exist
        await supabase.from('payments').insert({
          job_id:          jobId,
          homeowner_id:    homeownerId,
          tradesperson_id: tradespersonId,
          amount,
          net_amount:      Math.round(amount * 0.95 * 100) / 100,
          currency:        checkout.currency || 'ZAR',
          yoco_charge_id:  checkout.id,
          status:          'held',
        })
      }

      // 3. Send confirmation emails
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lungiza.co.za'
      await fetch(`${appUrl}/api/send-email`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:           'payment_confirmed',
          jobId,
          amount,
          homeownerId,
          tradespersonId,
        }),
      }).catch(e => console.log('Email error:', e))

      // 4. In-app notification to homeowner
      if(homeownerId) {
        await supabase.from('notifications').insert({
          user_id:  homeownerId,
          type:     'payment_confirmed',
          title:    'Payment confirmed',
          message:  `R${amount.toLocaleString()} is held in escrow. The tradesperson has been notified.`,
          link:     '/home',
          read:     false,
        })
      }

      // 5. In-app notification to tradesperson
      if(tradespersonId) {
        await supabase.from('notifications').insert({
          user_id:  tradespersonId,
          type:     'payment_confirmed',
          title:    'Payment in escrow',
          message:  `R${Math.round(amount * 0.95).toLocaleString()} will be released when you complete the job.`,
          link:     '/dashboard',
          read:     false,
        })
      }

      console.log('Payment succeeded processed for job:', jobId)
    }

    // ── Handle payment.failed ────────────────────────────────────
    if(event.type === 'payment.failed') {
      const checkout = event.payload
      const jobId    = checkout.metadata?.jobId

      if(jobId) {
        // Revert job status back to accepted
        await supabase
          .from('jobs')
          .update({ status: 'accepted' })
          .eq('id', jobId)

        const homeownerId = checkout.metadata?.homeownerId
        if(homeownerId) {
          await supabase.from('notifications').insert({
            user_id:  homeownerId,
            type:     'payment_failed',
            title:    'Payment failed',
            message:  'Your payment did not go through. Please try again.',
            link:     '/home',
            read:     false,
          })
        }
      }

      console.log('Payment failed for job:', jobId)
    }

    return NextResponse.json({ received: true })

  } catch(error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}