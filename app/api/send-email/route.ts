import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS for notification inserts
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ── Updated to info@lungiza.co.za via HMailPlus SMTP ─────────────────
const transporter = nodemailer.createTransport({
  host:       'smtp.hmailplus.com',
  port:       587,
  secure:     false,   // STARTTLS — not SSL
  requireTLS: true,
  auth: {
    user: 'info@lungiza.co.za',
    pass: process.env.LUNGISA_EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // prevents cert errors on HOSTAFRICA
  },
})

function brandedEmail(content: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:0;border-radius:8px;overflow:hidden">
      <div style="background:#2C2C28;padding:20px 28px;display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;background:#C4593A;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:inline-block"></div>
        <div style="display:inline-block;vertical-align:top;margin-left:10px">
          <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
          <div style="color:rgba(245,240,232,.5);font-size:11px;letter-spacing:1px">Post It. Bid It. Fix It.</div>
        </div>
      </div>
      <div style="padding:28px">
        ${content}
      </div>
      <div style="background:#EAE3D6;padding:16px 28px;border-top:1px solid #DDD5C5">
        <p style="color:#D4C9B4;font-size:11px;text-align:center;margin:0">
          © 2026 Lungisa · A VaultLink Africa product · <a href="https://lungiza.co.za" style="color:#C4593A">lungiza.co.za</a>
        </p>
      </div>
    </div>
  `
}

async function sendEmail(to: string, subject: string, content: string) {
  await transporter.sendMail({
    from: '"Lungisa" <info@lungiza.co.za>',
    to,
    subject,
    html: brandedEmail(content),
  })
}

// ── Write an in-app notification row (server-side, no RLS issues) ─
async function notify(
  userId: string,
  title: string,
  message: string,
  type: string,
  link: string,
  payload: Record<string, any> = {}
) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      message,
      link,
      read:    false,
      payload,
    })
  } catch(e) {
    console.log('Notification insert error:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type } = body

    // ─── 1. NEW BID — notify homeowner ─────────────────────────────
    if(type === 'new_bid' || (!type && body.jobId)) {
      const { jobId, amount, eta, tradespersonId } = body

      const { data: job } = await supabase
        .from('jobs')
        .select('*, profiles!homeowner_id(id, full_name, email)')
        .eq('id', jobId)
        .single()

      if(!job || !(job.profiles as any)?.email) {
        return NextResponse.json({ error: 'No homeowner email' })
      }

      let tradeName = 'A tradesperson'
      if(tradespersonId) {
        const { data: trade } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', tradespersonId)
          .single()
        if(trade) tradeName = trade.full_name
      }

      const homeownerEmail = (job.profiles as any).email
      const homeownerId    = (job.profiles as any).id
      const homeownerName  = (job.profiles as any).full_name?.split(' ')[0] || 'there'

      await notify(
        homeownerId,
        `New bid on "${job.title}"`,
        `${tradeName} bid R${Number(amount).toLocaleString()} · ETA ${eta || 'TBD'}`,
        'new_bid',
        '/home',
        { jobId, amount, tradespersonId }
      )

      await sendEmail(
        homeownerEmail,
        `New bid on your job — ${job.title}`,
        `
          <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Hey ${homeownerName}, new bid! 🔨</h2>
          <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px"><strong>${tradeName}</strong> just bid on your job:</p>
          <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #C4593A;margin-bottom:20px">
            <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Job</div>
            <div style="font-size:17px;font-weight:600;color:#2C2C28;margin-bottom:14px">${job.title}</div>
            <div style="display:flex;gap:24px">
              <div>
                <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Bid amount</div>
                <div style="font-size:28px;font-weight:700;color:#C4593A">R${Number(amount).toLocaleString()}</div>
              </div>
              <div>
                <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">ETA</div>
                <div style="font-size:18px;font-weight:600;color:#2C2C28">${eta || 'TBD'}</div>
              </div>
            </div>
          </div>
          <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:14px">
            View bid &amp; respond →
          </a>
          <p style="color:#5A5952;font-size:12px;line-height:1.6;margin:0">
            Counter-offer or accept on Lungisa. Payment only released when you confirm the job is done.
          </p>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 2. BID ACCEPTED — notify tradesperson ──────────────────────
    if(type === 'bid_accepted') {
      const { bidId, amount, jobTitle, jobId, tradespersonId } = body

      const { data: trade } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', tradespersonId)
        .single()

      if(!trade?.email) return NextResponse.json({ error: 'No tradesperson email' })

      await notify(
        tradespersonId,
        `Bid accepted — ${jobTitle}`,
        `Your bid of R${Number(amount).toLocaleString()} was accepted. Payment is in escrow.`,
        'bid_accepted',
        '/dashboard',
        { bidId, amount, jobId }
      )

      await sendEmail(
        trade.email,
        `Your bid was accepted — ${jobTitle}`,
        `
          <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Your bid was accepted! 🎉</h2>
          <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
            Great news, ${trade.full_name.split(' ')[0]} — the homeowner accepted your bid.
          </p>
          <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
            <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Job</div>
            <div style="font-size:17px;font-weight:600;color:#2C2C28;margin-bottom:14px">${jobTitle}</div>
            <div>
              <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Your earnings</div>
              <div style="font-size:28px;font-weight:700;color:#3DAA6A">R${Math.round(Number(amount) * 0.95).toLocaleString()}</div>
            </div>
            <div style="font-size:11px;color:#5A5952;margin-top:4px">After 5% Lungisa commission</div>
          </div>
          <div style="background:rgba(61,170,106,.08);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#2C2C28;line-height:1.6">
            🔒 Payment is held in escrow. Complete the job and the homeowner will release your payment.
          </div>
          <a href="https://lungiza.co.za/dashboard" style="display:block;background:#3DAA6A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
            Go to my dashboard →
          </a>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 3. COUNTER OFFER — notify the other party ──────────────────
    if(type === 'counter_offer') {
      const { bidId, counterAmount, counterBy, jobTitle, jobId, homeownerId, tradespersonId } = body

      if(counterBy === 'homeowner') {
        const { data: trade } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', tradespersonId)
          .single()
        if(!trade?.email) return NextResponse.json({ error: 'No tradesperson email' })

        await notify(
          tradespersonId,
          `Counter-offer on "${jobTitle}"`,
          `Homeowner offered R${Number(counterAmount).toLocaleString()}. Accept, decline or counter.`,
          'counter_offer',
          '/dashboard',
          { bidId, counterAmount, jobId }
        )

        await sendEmail(
          trade.email,
          `Counter-offer received — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Counter-offer received 💬</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
              The homeowner sent a counter-offer on <strong>${jobTitle}</strong>.
            </p>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #E8A020;margin-bottom:20px">
              <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Their offer</div>
              <div style="font-size:32px;font-weight:700;color:#E8A020">R${Number(counterAmount).toLocaleString()}</div>
            </div>
            <a href="https://lungiza.co.za/dashboard" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:14px">
              Accept, decline or counter →
            </a>
            <p style="color:#5A5952;font-size:12px;line-height:1.6;margin:0">
              Go to My Bids in your dashboard to respond.
            </p>
          `
        )
      } else {
        const { data: homeowner } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', homeownerId)
          .single()
        const { data: trade } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', tradespersonId)
          .single()
        if(!homeowner?.email) return NextResponse.json({ error: 'No homeowner email' })

        await notify(
          homeownerId,
          `Counter-offer on "${jobTitle}"`,
          `${trade?.full_name || 'Tradesperson'} offered R${Number(counterAmount).toLocaleString()}. Accept, decline or counter.`,
          'counter_offer',
          '/home',
          { bidId, counterAmount, jobId }
        )

        await sendEmail(
          homeowner.email,
          `${trade?.full_name || 'Tradesperson'} counter-offered — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Counter-offer received 💬</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
              <strong>${trade?.full_name || 'The tradesperson'}</strong> sent a counter-offer on <strong>${jobTitle}</strong>.
            </p>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #E8A020;margin-bottom:20px">
              <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Their offer</div>
              <div style="font-size:32px;font-weight:700;color:#E8A020">R${Number(counterAmount).toLocaleString()}</div>
            </div>
            <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:14px">
              Accept, decline or counter →
            </a>
          `
        )
      }
      return NextResponse.json({ success: true })
    }

    // ─── 4. PAYMENT CONFIRMED — notify both parties ─────────────────
    if(type === 'payment_confirmed') {
      const { jobId, amount, homeownerId, tradespersonId } = body

      const { data: job }       = await supabase.from('jobs').select('title').eq('id', jobId).single()
      const { data: homeowner } = await supabase.from('profiles').select('full_name, email').eq('id', homeownerId).single()
      const { data: trade }     = await supabase.from('profiles').select('full_name, email').eq('id', tradespersonId).single()

      const jobTitle  = job?.title || 'Home repair job'
      const netAmount = Math.round(Number(amount) * 0.95)

      if(homeownerId) {
        await notify(
          homeownerId,
          `Payment confirmed — ${jobTitle}`,
          `R${Number(amount).toLocaleString()} is held in escrow. Release payment when the job is done.`,
          'payment_confirmed',
          '/home',
          { jobId, amount }
        )
      }
      if(tradespersonId) {
        await notify(
          tradespersonId,
          `Payment in escrow — ${jobTitle}`,
          `R${netAmount.toLocaleString()} will be released to you on job completion.`,
          'payment_confirmed',
          '/dashboard',
          { jobId, amount: netAmount }
        )
      }

      if(homeowner?.email) {
        await sendEmail(
          homeowner.email,
          `Payment confirmed — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Payment confirmed ✓</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
              Your payment of <strong>R${Number(amount).toLocaleString()}</strong> is held in escrow for <strong>${jobTitle}</strong>.
            </p>
            <div style="background:rgba(61,170,106,.08);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#2C2C28;line-height:1.6">
              🔒 Your money is safe. It will only be released to ${trade?.full_name || 'the tradesperson'} once you confirm the job is complete.
            </div>
            <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
              Track your job →
            </a>
          `
        )
      }

      if(trade?.email) {
        await sendEmail(
          trade.email,
          `Payment in escrow — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Payment is in escrow 🔒</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
              The homeowner has paid for <strong>${jobTitle}</strong>. Complete the job and your payment will be released.
            </p>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
              <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Your earnings (on completion)</div>
              <div style="font-size:32px;font-weight:700;color:#3DAA6A">R${netAmount.toLocaleString()}</div>
              <div style="font-size:11px;color:#5A5952;margin-top:4px">After 5% Lungisa commission</div>
            </div>
            <a href="https://lungiza.co.za/dashboard" style="display:block;background:#3DAA6A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
              Go to my dashboard →
            </a>
          `
        )
      }
      return NextResponse.json({ success: true })
    }

    // ─── 5. NEW MESSAGE — notify receiver ───────────────────────────
    if(type === 'new_message') {
      const { jobId, jobTitle, senderId, receiverId, body: messageBody } = body

      const { data: sender }   = await supabase.from('profiles').select('full_name').eq('id', senderId).single()
      const { data: receiver } = await supabase.from('profiles').select('full_name, email').eq('id', receiverId).single()

      if(!receiver?.email) return NextResponse.json({ error: 'No receiver email' })

      const senderName   = sender?.full_name || 'Someone'
      const receiverName = receiver.full_name?.split(' ')[0] || 'there'
      const preview      = (messageBody as string).length > 80
        ? (messageBody as string).substring(0, 80) + '…'
        : messageBody as string

      await notify(
        receiverId,
        `New message from ${senderName.split(' ')[0]}`,
        preview,
        'new_message',
        '/home',
        { jobId, jobTitle, senderId }
      )

      await sendEmail(
        receiver.email,
        `${senderName.split(' ')[0]} sent you a message — ${jobTitle}`,
        `
          <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">
            Hey ${receiverName}, you have a new message 💬
          </h2>
          <p style="color:#5A5952;font-size:14px;margin:0 0 20px">
            From <strong>${senderName}</strong> about <strong>${jobTitle}</strong>
          </p>
          <div style="background:#fff;border-radius:8px;padding:16px 20px;border-left:4px solid #C4593A;margin-bottom:20px;font-size:15px;color:#2C2C28;line-height:1.6">
            "${messageBody}"
          </div>
          <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
            Reply on Lungisa →
          </a>
          <p style="color:#5A5952;font-size:12px;line-height:1.6;margin:16px 0 0">
            You can reply directly in the Messages tab on your Lungisa dashboard.
          </p>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 6. JOB COMPLETION SUBMITTED — notify homeowner ────────────
    if(type === 'job_completion_submitted') {
      const { jobId, jobTitle, homeownerId, tradespersonId, report, completedAt } = body

      const { data: homeowner } = await supabase.from('profiles').select('full_name, email').eq('id', homeownerId).single()
      const { data: trade }     = await supabase.from('profiles').select('full_name').eq('id', tradespersonId).single()

      if(!homeowner?.email) return NextResponse.json({ error: 'No homeowner email' })

      const homeName  = homeowner.full_name?.split(' ')[0] || 'there'
      const tradeName = trade?.full_name || 'Your tradesperson'
      const dateStr   = new Date(completedAt).toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' })

      await notify(homeownerId,
        `${tradeName.split(' ')[0]} marked "${jobTitle}" complete`,
        'Review the work report and confirm to release payment.',
        'job_completion_submitted', '/home', { jobId }
      )

      await sendEmail(homeowner.email,
        `${tradeName.split(' ')[0]} has completed the job — ${jobTitle}`,
        `
          <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Job completed! ✓</h2>
          <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
            <strong>${tradeName}</strong> has marked <strong>${jobTitle}</strong> as complete and submitted a report.
          </p>
          <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
            <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Date completed</div>
            <div style="font-size:15px;color:#2C2C28;font-weight:600;margin-bottom:14px">${dateStr}</div>
            <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">What was done</div>
            <div style="font-size:14px;color:#2C2C28;line-height:1.6">${report}</div>
          </div>
          <div style="background:rgba(232,160,32,.06);border:1px solid rgba(232,160,32,.15);border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#5A5952;line-height:1.6">
            💡 Review the photos and report in your dashboard. If you&apos;re happy with the work, confirm to release payment. If there&apos;s an issue, you can raise a dispute.
          </div>
          <a href="https://lungiza.co.za/home" style="display:block;background:#3DAA6A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:10px">
            Review &amp; confirm →
          </a>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 7. DISPUTE RAISED — notify admin ───────────────────────────
    if(type === 'dispute_raised') {
      const { jobId, reason, homeownerId } = body

      const { data: job }       = await supabase.from('jobs').select('title').eq('id', jobId).single()
      const { data: homeowner } = await supabase.from('profiles').select('full_name, email').eq('id', homeownerId).single()

      await notify(homeownerId,
        'Dispute submitted',
        'The Lungisa team will review your dispute within 24 hours.',
        'dispute_raised', '/home', { jobId }
      )

      await sendEmail('info@lungiza.co.za',
        `⚠ Dispute raised — ${job?.title || 'Job'}`,
        `
          <h2 style="color:#2C2C28">Dispute raised by homeowner</h2>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;width:120px">Job</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#222;font-weight:600">${job?.title}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Homeowner</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#222">${homeowner?.full_name} (${homeowner?.email})</td></tr>
            <tr><td style="padding:8px 0;color:#666;font-size:13px">Job ID</td><td style="padding:8px 0;font-size:12px;color:#555;font-family:monospace">${jobId}</td></tr>
          </table>
          <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px 16px;margin-bottom:16px">
            <div style="font-size:12px;font-weight:600;color:#856404;margin-bottom:6px">Reason for dispute:</div>
            <div style="font-size:14px;color:#2C2C28;line-height:1.6">${reason}</div>
          </div>
          <div style="font-size:13px;color:#5A5952;line-height:1.6">
            Payment remains in escrow. Review the job completion photos in Supabase and contact both parties to resolve.
          </div>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 8. PAYMENT RELEASE REQUEST — admin payout notification ─────
    if(type === 'payment_release_request') {
      const { jobId, jobTitle, amount, homeownerId, tradespersonId, tradespersonName } = body

      const { data: homeowner }   = await supabase.from('profiles').select('full_name, email').eq('id', homeownerId).single()
      const { data: trade }       = await supabase.from('profiles').select('full_name, email, phone').eq('id', tradespersonId).single()
      const { data: bankDetails } = await supabase.from('banking_details').select('*').eq('tradesperson_id', tradespersonId).single()
      const { data: completion }  = await supabase.from('job_completions').select('completed_at, report').eq('job_id', jobId).single()

      const netAmount  = Math.round(Number(amount) * 0.95)
      const lungisaFee = Number(amount) - netAmount
      const tradeName  = trade?.full_name || tradespersonName || 'Tradesperson'
      const homeName   = homeowner?.full_name || 'Homeowner'

      await notify(tradespersonId,
        'Payment being processed',
        `R${netAmount.toLocaleString()} is being processed to your ${bankDetails?.bank_name || 'bank account'}.`,
        'payment_processing', '/dashboard', { jobId, amount: netAmount }
      )

      await notify(homeownerId,
        `Job complete — payment released`,
        `R${Number(amount).toLocaleString()} released for ${jobTitle}. Thank you for using Lungisa!`,
        'payment_released', '/home', { jobId }
      )

      if(homeowner?.email) {
        await sendEmail(homeowner.email,
          `Payment confirmed — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Job complete ✓</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
              You&apos;ve confirmed <strong>${jobTitle}</strong> as complete. Payment of <strong>R${Number(amount).toLocaleString()}</strong> is being processed to ${tradeName}.
            </p>
            <div style="background:rgba(61,170,106,.06);border:1px solid rgba(61,170,106,.15);border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#2C2C28;line-height:1.6">
              Thank you for using Lungisa. Your review helps other homeowners find great tradespeople.
            </div>
            <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">
              View job history →
            </a>
          `
        )
      }

      if(trade?.email) {
        await sendEmail(trade.email,
          `Payment incoming — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Payment is on its way! 💸</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
              The homeowner has confirmed <strong>${jobTitle}</strong> is complete. Your payment is being processed.
            </p>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span style="font-size:13px;color:#5A5952">Job amount</span>
                <span style="font-size:13px;color:#2C2C28;font-weight:600">R${Number(amount).toLocaleString()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span style="font-size:13px;color:#5A5952">Lungisa commission (5%)</span>
                <span style="font-size:13px;color:#E24B4A">- R${lungisaFee.toLocaleString()}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #EAE3D6">
                <span style="font-size:15px;color:#2C2C28;font-weight:700">You receive</span>
                <span style="font-size:20px;color:#3DAA6A;font-weight:700">R${netAmount.toLocaleString()}</span>
              </div>
            </div>
            ${bankDetails ? `
            <div style="background:#f8f8f8;border:1px solid #eee;border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#5A5952">
              Payment will be sent to:<br/>
              <strong style="color:#2C2C28">${bankDetails.bank_name}</strong> · ${bankDetails.account_type} ·
              ****${bankDetails.account_number.slice(-4)}
            </div>
            ` : `
            <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#856404">
              ⚠ You haven&apos;t added banking details yet. Please add them in your dashboard.
            </div>
            `}
            <p style="color:#5A5952;font-size:12px;line-height:1.6;margin:0">Payments are typically processed within 1-2 business days.</p>
          `
        )
      }

      // ── ADMIN payout email ───────────────────────────────────────
      await sendEmail('info@lungiza.co.za',
        `💸 PAYOUT REQUIRED — ${tradeName} · R${netAmount.toLocaleString()}`,
        `
          <div style="font-family:Arial,sans-serif">
            <h2 style="color:#2C2C28;border-bottom:3px solid #C4593A;padding-bottom:10px">
              Action required: Process payout
            </h2>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#f8f8f8"><td colspan="2" style="padding:10px 14px;font-weight:700;color:#2C2C28;font-size:14px">JOB DETAILS</td></tr>
              <tr><td style="padding:8px 14px;color:#666;font-size:13px;width:160px">Job</td><td style="padding:8px 14px;font-size:13px;color:#222;font-weight:600">${jobTitle}</td></tr>
              <tr style="background:#f8f8f8"><td style="padding:8px 14px;color:#666;font-size:13px">Job ID</td><td style="padding:8px 14px;font-size:12px;color:#555;font-family:monospace">${jobId}</td></tr>
              ${completion ? `<tr><td style="padding:8px 14px;color:#666;font-size:13px">Completed on</td><td style="padding:8px 14px;font-size:13px;color:#222">${new Date(completion.completed_at).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</td></tr>` : ''}
              ${completion ? `<tr style="background:#f8f8f8"><td style="padding:8px 14px;color:#666;font-size:13px">Work done</td><td style="padding:8px 14px;font-size:13px;color:#222">${completion.report}</td></tr>` : ''}
            </table>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#f8f8f8"><td colspan="2" style="padding:10px 14px;font-weight:700;color:#2C2C28;font-size:14px">HOMEOWNER</td></tr>
              <tr><td style="padding:8px 14px;color:#666;font-size:13px;width:160px">Name</td><td style="padding:8px 14px;font-size:13px;color:#222">${homeName}</td></tr>
              <tr style="background:#f8f8f8"><td style="padding:8px 14px;color:#666;font-size:13px">Email</td><td style="padding:8px 14px;font-size:13px;color:#222">${homeowner?.email||'—'}</td></tr>
            </table>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr style="background:#3DAA6A"><td colspan="2" style="padding:10px 14px;font-weight:700;color:#fff;font-size:14px">TRADESPERSON — WHO TO PAY</td></tr>
              <tr><td style="padding:8px 14px;color:#666;font-size:13px;width:160px">Name</td><td style="padding:8px 14px;font-size:13px;color:#222;font-weight:600">${tradeName}</td></tr>
              <tr style="background:#f8f8f8"><td style="padding:8px 14px;color:#666;font-size:13px">Email</td><td style="padding:8px 14px;font-size:13px;color:#222">${trade?.email||'—'}</td></tr>
              <tr><td style="padding:8px 14px;color:#666;font-size:13px">Phone</td><td style="padding:8px 14px;font-size:13px;color:#222">${trade?.phone||'—'}</td></tr>
            </table>
            ${bankDetails ? `
            <table style="width:100%;border-collapse:collapse;margin:16px 0;border:2px solid #3DAA6A;border-radius:8px;overflow:hidden">
              <tr style="background:#3DAA6A"><td colspan="2" style="padding:10px 14px;font-weight:700;color:#fff;font-size:14px">🏦 BANKING DETAILS</td></tr>
              <tr><td style="padding:10px 14px;color:#666;font-size:13px;width:160px;background:#f8f8f8">Bank</td><td style="padding:10px 14px;font-size:15px;color:#222;font-weight:700">${bankDetails.bank_name}</td></tr>
              <tr><td style="padding:10px 14px;color:#666;font-size:13px;background:#f8f8f8">Account holder</td><td style="padding:10px 14px;font-size:15px;color:#222;font-weight:700">${bankDetails.account_holder}</td></tr>
              <tr><td style="padding:10px 14px;color:#666;font-size:13px;background:#f8f8f8">Account number</td><td style="padding:10px 14px;font-size:18px;color:#2C2C28;font-weight:700;font-family:monospace;letter-spacing:2px">${bankDetails.account_number}</td></tr>
              <tr><td style="padding:10px 14px;color:#666;font-size:13px;background:#f8f8f8">Account type</td><td style="padding:10px 14px;font-size:15px;color:#222;font-weight:700;text-transform:capitalize">${bankDetails.account_type}</td></tr>
              <tr><td style="padding:10px 14px;color:#666;font-size:13px;background:#f8f8f8">Branch code</td><td style="padding:10px 14px;font-size:18px;color:#2C2C28;font-weight:700;font-family:monospace;letter-spacing:2px">${bankDetails.branch_code}</td></tr>
            </table>
            ` : `
            <div style="background:#fff3cd;border:2px solid #ffc107;border-radius:8px;padding:16px;margin:16px 0">
              <strong>⚠ NO BANKING DETAILS ON FILE</strong><br/>
              ${tradeName} has not added their banking details yet. Contact them before processing payment.
            </div>
            `}
            <table style="width:100%;border-collapse:collapse;margin:16px 0;border:2px solid #C4593A;border-radius:8px;overflow:hidden">
              <tr style="background:#C4593A"><td colspan="2" style="padding:10px 14px;font-weight:700;color:#fff;font-size:14px">💰 AMOUNTS</td></tr>
              <tr><td style="padding:10px 14px;color:#666;font-size:13px;width:160px;background:#f8f8f8">Total paid by homeowner</td><td style="padding:10px 14px;font-size:15px;color:#222;font-weight:700">R${Number(amount).toLocaleString()}</td></tr>
              <tr><td style="padding:10px 14px;color:#666;font-size:13px;background:#f8f8f8">Lungisa commission (5%)</td><td style="padding:10px 14px;font-size:15px;color:#E24B4A;font-weight:700">R${lungisaFee.toLocaleString()}</td></tr>
              <tr style="background:#fff"><td style="padding:12px 14px;color:#2C2C28;font-size:14px;font-weight:700">TRANSFER TO TRADESPERSON</td><td style="padding:12px 14px;font-size:22px;color:#3DAA6A;font-weight:700">R${netAmount.toLocaleString()}</td></tr>
            </table>
            <div style="background:#f8f8f8;border-radius:8px;padding:14px;font-size:13px;color:#5A5952;line-height:1.8">
              <strong>Steps to process:</strong><br/>
              1. Log into your bank / internet banking<br/>
              2. Make an EFT to the banking details above<br/>
              3. Reference: LUNGISA-${jobId.substring(0,8).toUpperCase()}<br/>
            </div>
          </div>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 9. QUOTE REQUESTED — notify tradesperson ───────────────────
    if(type === 'quote_requested') {
      const { jobId, jobTitle, tradespersonId, homeownerId } = body

      const { data: trade } = await supabase.from('profiles').select('full_name, email').eq('id', tradespersonId).single()
      if(!trade?.email) return NextResponse.json({ error: 'No tradesperson email' })

      await notify(tradespersonId,
        `Formal quote requested — ${jobTitle}`,
        'The homeowner wants a labour + materials breakdown before accepting.',
        'quote_requested', '/dashboard', { jobId }
      )

      await sendEmail(trade.email,
        `Formal quote requested — ${jobTitle}`,
        `
          <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Quote requested 📋</h2>
          <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hey ${trade.full_name.split(' ')[0]}, the homeowner is interested in your bid on <strong>${jobTitle}</strong> and wants a formal quote before accepting.
          </p>
          <div style="background:rgba(196,89,58,.06);border:1px solid rgba(196,89,58,.2);border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#2C2C28;line-height:1.7">
            They need two numbers from you:<br/>
            <strong>1. Your labour charge</strong> — the fixed amount you will charge for the job.<br/>
            <strong>2. Materials estimate</strong> — what the homeowner will need to buy separately.
          </div>
          <a href="https://lungiza.co.za/dashboard" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:14px">
            Submit your quote →
          </a>
          <p style="color:#5A5952;font-size:12px;line-height:1.6;margin:0">
            Go to My Bids in your dashboard. The quote form will be waiting at the top.
          </p>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 10. QUOTE SUBMITTED — notify homeowner ─────────────────────
    if(type === 'quote_submitted') {
      const { jobId, jobTitle, labourAmount, materialsEstimate, tradespersonId } = body

      const { data: job }   = await supabase.from('jobs').select('homeowner_id, profiles!homeowner_id(full_name, email)').eq('id', jobId).single()
      const { data: trade } = await supabase.from('profiles').select('full_name').eq('id', tradespersonId).single()

      const homeownerEmail = (job?.profiles as any)?.email
      const homeownerId    = (job as any)?.homeowner_id
      const homeownerName  = (job?.profiles as any)?.full_name?.split(' ')[0] || 'there'
      const tradeName      = trade?.full_name || 'Tradesperson'

      if(!homeownerEmail) return NextResponse.json({ error: 'No homeowner email' })

      await notify(homeownerId,
        `Formal quote from ${tradeName.split(' ')[0]} — ${jobTitle}`,
        `Labour: R${Number(labourAmount).toLocaleString()} · Materials est: R${Number(materialsEstimate).toLocaleString()}`,
        'quote_submitted', '/home', { jobId, labourAmount, materialsEstimate }
      )

      await sendEmail(homeownerEmail,
        `Formal quote received — ${jobTitle}`,
        `
          <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Formal quote received 📋</h2>
          <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
            Hey ${homeownerName}, <strong>${tradeName}</strong> has submitted a formal quote for <strong>${jobTitle}</strong>.
          </p>
          <div style="background:#fff;border-radius:8px;padding:18px 20px;border:1px solid #EAE3D6;margin-bottom:20px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
              <div style="border-left:4px solid #C4593A;padding-left:14px">
                <div style="font-size:11px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Labour charge</div>
                <div style="font-size:28px;font-weight:700;color:#C4593A">R${Number(labourAmount).toLocaleString()}</div>
                <div style="font-size:11px;color:#5A5952;margin-top:3px">Fixed · into escrow</div>
              </div>
              <div style="border-left:4px solid #5A5952;padding-left:14px">
                <div style="font-size:11px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Materials est.</div>
                <div style="font-size:28px;font-weight:700;color:#2C2C28">R${Number(materialsEstimate).toLocaleString()}</div>
                <div style="font-size:11px;color:#5A5952;margin-top:3px">You pay separately</div>
              </div>
            </div>
          </div>
          <div style="background:rgba(61,170,106,.06);border:1px solid rgba(61,170,106,.15);border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:13px;color:#2C2C28;line-height:1.6">
            💡 Labour is the differentiator. Materials cost is the same regardless of which tradesperson you choose.
          </div>
          <a href="https://lungiza.co.za/home" style="display:block;background:#3DAA6A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:10px">
            Review quote &amp; accept →
          </a>
        `
      )
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })

  } catch(error) {
    console.error('Email route error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}