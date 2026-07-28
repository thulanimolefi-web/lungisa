import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const transporter = nodemailer.createTransport({
  host: 'smtp.hmailplus.com', port: 587, secure: false, requireTLS: true,
  auth: { user: 'info@lungiza.co.za', pass: process.env.LUNGISA_EMAIL_PASSWORD },
  tls: { rejectUnauthorized: false },
})

export async function POST(req: NextRequest) {
  try {
    const body      = await req.text()
    const signature = req.headers.get('x-yoco-signature') || ''
    const secret    = process.env.YOCO_WEBHOOK_SECRET || ''

    // ── Verify Yoco signature ─────────────────────────────────────
    if(secret && signature) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')
      if(signature !== expected) {
        console.error('Webhook signature mismatch')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(body)
    console.log('Yoco webhook event:', event.type, JSON.stringify(event).substring(0, 200))

    // ── Handle checkout.complete ──────────────────────────────────
    if(event.type === 'checkout.complete' || event.type === 'payment.succeeded') {
      const checkout  = event.payload || event
      const checkoutId = checkout.id || checkout.checkoutId
      const metadata  = checkout.metadata || {}
      const { jobId, homeownerId, tradespersonId, jobTitle } = metadata
      const amountInCents = checkout.amountInCents || checkout.amount || 0

      if(!jobId) {
        console.log('No jobId in webhook metadata — skipping')
        return NextResponse.json({ received: true })
      }

      // Update job status
      await supabase.from('jobs')
        .update({ status: 'in_progress' })
        .eq('id', jobId)
        .neq('status', 'completed')

      // Upsert payment record
      const { error: pmtErr } = await supabase.from('payments').upsert({
        job_id:           jobId,
        homeowner_id:     homeownerId,
        tradesperson_id:  tradespersonId,
        gross_amount:     amountInCents,
        commission_amount:Math.round(amountInCents * 0.08),
        net_amount:       Math.round(amountInCents * 0.92),
        payment_method:   'card',
        yoco_charge_id:   checkoutId,
        status:           'held',
        payout_status:    'pending',
      }, { onConflict: 'job_id' })

      if(pmtErr) console.error('Payment upsert error:', pmtErr)

      // In-app notifications
      if(homeownerId) {
        try {
          await supabase.from('notifications').insert({
            user_id: homeownerId,
            type:    'payment_confirmed',
            title:   'Payment confirmed 🔒',
            message: `R${(amountInCents/100).toLocaleString()} is now held in escrow for ${jobTitle||'your job'}.`,
            link:    '/home',
            read:    false,
          })
        } catch(e) { console.log('Notif error:', e) }
      }

      if(tradespersonId) {
        try {
          await supabase.from('notifications').insert({
            user_id: tradespersonId,
            type:    'payment_confirmed',
            title:   'Payment in escrow 🔒',
            message: `R${Math.round(amountInCents*0.92/100).toLocaleString()} is secured in escrow for ${jobTitle||'this job'}. Complete the job to release payment.`,
            link:    '/dashboard',
            read:    false,
          })
        } catch(e) { console.log('Notif error:', e) }
      }

      // Email confirmation
      if(homeownerId) {
        const { data: homeowner } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', homeownerId)
          .single()

        if(homeowner?.email) {
          transporter.sendMail({
            from:    '"Lungisa" <info@lungiza.co.za>',
            to:      homeowner.email,
            subject: `Payment confirmed — ${jobTitle||'Your job'}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:0;border-radius:8px;overflow:hidden">
                <div style="background:#2C2C28;padding:20px 28px">
                  <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
                </div>
                <div style="padding:28px">
                  <h2 style="color:#2C2C28;font-size:20px;margin:0 0 12px">Payment confirmed 🔒</h2>
                  <p style="color:#5A5952;font-size:15px;line-height:1.7;margin:0 0 16px">
                    Hey ${homeowner.full_name?.split(' ')[0]||'there'}, your payment of <strong>R${(amountInCents/100).toLocaleString()}</strong> for <strong>${jobTitle||'your job'}</strong> is now held securely in escrow.
                  </p>
                  <div style="background:#fff;border-radius:8px;padding:16px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
                    <div style="font-size:12px;color:#5A5952;margin-bottom:4px">Amount in escrow</div>
                    <div style="font-size:28px;font-weight:700;color:#3DAA6A">R${(amountInCents/100).toLocaleString()}</div>
                    <div style="font-size:12px;color:#5A5952;margin-top:4px">Released only when you confirm the job is done</div>
                  </div>
                  <p style="color:#5A5952;font-size:13px;line-height:1.6;margin:0 0 20px">
                    The tradesperson has been notified and will begin work. Once done, they will submit photos and a report. You'll be notified to confirm and release payment.
                  </p>
                  <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600">
                    Track your job →
                  </a>
                </div>
                <div style="background:#EAE3D6;padding:14px 28px;border-top:1px solid #DDD5C5">
                  <p style="color:#5A5952;font-size:11px;text-align:center;margin:0">© 2026 Lungisa · lungiza.co.za</p>
                </div>
              </div>
            `,
          }).catch(e => console.log('Email error:', e))
        }
      }

      console.log(`✓ Webhook processed: ${event.type} — job ${jobId} — R${amountInCents/100}`)
    }

    // ── Handle payment.failed ─────────────────────────────────────
    if(event.type === 'payment.failed' || event.type === 'checkout.expired') {
      const metadata = event.payload?.metadata || {}
      const { jobId } = metadata
      if(jobId) {
        await supabase.from('jobs')
          .update({ status: 'accepted' })
          .eq('id', jobId)
          .eq('status', 'in_progress')
      }
      console.log(`Payment failed/expired — job ${jobId} reverted`)
    }

    return NextResponse.json({ received: true })

  } catch(error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}