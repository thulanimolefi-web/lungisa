import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'stockstvm@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function brandedEmail(content: string): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:0;border-radius:8px;overflow:hidden">
      <div style="background:#2C2C28;padding:20px 28px;display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;background:#C4593A;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;flex-shrink:0"></div>
        <div>
          <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
          <div style="color:rgba(245,240,232,.5);font-size:11px;letter-spacing:1px">Post It. Bid It. Fix It.</div>
        </div>
      </div>
      <div style="padding:28px">${content}</div>
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
    from: '"Lungisa" <stockstvm@gmail.com>',
    to,
    subject,
    html: brandedEmail(content),
  })
}

// ── Write an in-app notification row ────────────────────────────────
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
      user_id:    userId,
      type,
      title,
      message,
      link,
      read:       false,
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
    if(type === 'new_bid' || body.jobId) {
      const { jobId, amount, eta, tradespersonId } = body

      const { data: job } = await supabase
        .from('jobs')
        .select('*, profiles!homeowner_id(id, full_name, email)')
        .eq('id', jobId)
        .single()

      if(!job || !(job.profiles as any)?.email) return NextResponse.json({ error: 'No homeowner email' })

      let tradeName = 'A tradesperson'
      if(tradespersonId) {
        const { data: trade } = await supabase.from('profiles').select('full_name').eq('id', tradespersonId).single()
        if(trade) tradeName = trade.full_name
      }

      const homeownerEmail = (job.profiles as any).email
      const homeownerId    = (job.profiles as any).id
      const homeownerName  = (job.profiles as any).full_name?.split(' ')[0] || 'there'

      // In-app notification
      await notify(
        homeownerId,
        `New bid on "${job.title}"`,
        `${tradeName} bid R${Number(amount).toLocaleString()} · ETA ${eta || 'TBD'}`,
        'new_bid',
        '/home',
        { jobId, amount, tradespersonId }
      )

      // Email
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
              <div><div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Bid amount</div><div style="font-size:28px;font-weight:700;color:#C4593A">R${Number(amount).toLocaleString()}</div></div>
              <div><div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">ETA</div><div style="font-size:18px;font-weight:600;color:#2C2C28">${eta || 'TBD'}</div></div>
            </div>
          </div>
          <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:14px">View bid &amp; respond →</a>
          <p style="color:#5A5952;font-size:12px;line-height:1.6;margin:0">Counter-offer or accept on Lungisa. Payment only released when you confirm the job is done.</p>
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

      // In-app notification
      await notify(
        tradespersonId,
        `Bid accepted — ${jobTitle}`,
        `Your bid of R${Number(amount).toLocaleString()} was accepted. Payment is in escrow.`,
        'bid_accepted',
        '/dashboard',
        { bidId, amount, jobId }
      )

      // Email
      await sendEmail(
        trade.email,
        `Your bid was accepted — ${jobTitle}`,
        `
          <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Your bid was accepted! 🎉</h2>
          <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">Great news, ${trade.full_name.split(' ')[0]} — the homeowner accepted your bid.</p>
          <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
            <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Job</div>
            <div style="font-size:17px;font-weight:600;color:#2C2C28;margin-bottom:14px">${jobTitle}</div>
            <div><div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Your earnings</div><div style="font-size:28px;font-weight:700;color:#3DAA6A">R${Math.round(Number(amount)*0.9).toLocaleString()}</div></div>
            <div style="font-size:11px;color:#5A5952;margin-top:4px">After 10% Lungisa commission</div>
          </div>
          <div style="background:rgba(61,170,106,.08);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#2C2C28;line-height:1.6">
            🔒 Payment is held in escrow. Complete the job and the homeowner will release your payment.
          </div>
          <a href="https://lungiza.co.za/dashboard" style="display:block;background:#3DAA6A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">Go to my dashboard →</a>
        `
      )
      return NextResponse.json({ success: true })
    }

    // ─── 3. COUNTER OFFER — notify the other party ──────────────────
    if(type === 'counter_offer') {
      const { bidId, counterAmount, counterBy, jobTitle, jobId, homeownerId, tradespersonId } = body

      if(counterBy === 'homeowner') {
        const { data: trade } = await supabase.from('profiles').select('full_name, email').eq('id', tradespersonId).single()
        if(!trade?.email) return NextResponse.json({ error: 'No tradesperson email' })

        // In-app notification
        await notify(
          tradespersonId,
          `Counter-offer on "${jobTitle}"`,
          `Homeowner offered R${Number(counterAmount).toLocaleString()}. Accept, decline or counter.`,
          'counter_offer',
          '/dashboard',
          { bidId, counterAmount, jobId }
        )

        // Email
        await sendEmail(
          trade.email,
          `Counter-offer received — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Counter-offer received 💬</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">The homeowner sent a counter-offer on <strong>${jobTitle}</strong>.</p>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #E8A020;margin-bottom:20px">
              <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Their offer</div>
              <div style="font-size:32px;font-weight:700;color:#E8A020">R${Number(counterAmount).toLocaleString()}</div>
            </div>
            <a href="https://lungiza.co.za/dashboard" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:14px">Accept, decline or counter →</a>
            <p style="color:#5A5952;font-size:12px;line-height:1.6;margin:0">Go to My Bids in your dashboard to respond.</p>
          `
        )
      } else {
        const { data: homeowner } = await supabase.from('profiles').select('full_name, email').eq('id', homeownerId).single()
        const { data: trade }     = await supabase.from('profiles').select('full_name').eq('id', tradespersonId).single()
        if(!homeowner?.email) return NextResponse.json({ error: 'No homeowner email' })

        // In-app notification
        await notify(
          homeownerId,
          `Counter-offer on "${jobTitle}"`,
          `${trade?.full_name||'Tradesperson'} offered R${Number(counterAmount).toLocaleString()}. Accept, decline or counter.`,
          'counter_offer',
          '/home',
          { bidId, counterAmount, jobId }
        )

        // Email
        await sendEmail(
          homeowner.email,
          `${trade?.full_name||'Tradesperson'} counter-offered — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Counter-offer received 💬</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px"><strong>${trade?.full_name||'The tradesperson'}</strong> sent a counter-offer on <strong>${jobTitle}</strong>.</p>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #E8A020;margin-bottom:20px">
              <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Their offer</div>
              <div style="font-size:32px;font-weight:700;color:#E8A020">R${Number(counterAmount).toLocaleString()}</div>
            </div>
            <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:14px">Accept, decline or counter →</a>
          `
        )
      }
      return NextResponse.json({ success: true })
    }

    // ─── 4. PAYMENT CONFIRMED — notify both parties ─────────────────
    if(type === 'payment_confirmed') {
      const { jobId, amount, homeownerId, tradespersonId } = body

      const { data: job }      = await supabase.from('jobs').select('title').eq('id', jobId).single()
      const { data: homeowner } = await supabase.from('profiles').select('full_name, email').eq('id', homeownerId).single()
      const { data: trade }     = await supabase.from('profiles').select('full_name, email').eq('id', tradespersonId).single()

      const jobTitle  = job?.title || 'Home repair job'
      const netAmount = Math.round(Number(amount) * 0.9)

      // In-app notifications for both
      if(homeownerId) await notify(
        homeownerId,
        `Payment confirmed — ${jobTitle}`,
        `R${Number(amount).toLocaleString()} is held in escrow. Release payment when the job is done.`,
        'payment_confirmed',
        '/home',
        { jobId, amount }
      )
      if(tradespersonId) await notify(
        tradespersonId,
        `Payment in escrow — ${jobTitle}`,
        `R${netAmount.toLocaleString()} will be released to you on job completion.`,
        'payment_confirmed',
        '/dashboard',
        { jobId, amount: netAmount }
      )

      // Email homeowner
      if(homeowner?.email) {
        await sendEmail(
          homeowner.email,
          `Payment confirmed — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Payment confirmed ✓</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">Your payment of <strong>R${Number(amount).toLocaleString()}</strong> is held in escrow for <strong>${jobTitle}</strong>.</p>
            <div style="background:rgba(61,170,106,.08);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#2C2C28;line-height:1.6">
              🔒 Your money is safe. It will only be released to ${trade?.full_name||'the tradesperson'} once you confirm the job is complete.
            </div>
            <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">Track your job →</a>
          `
        )
      }

      // Email tradesperson
      if(trade?.email) {
        await sendEmail(
          trade.email,
          `Payment in escrow — ${jobTitle}`,
          `
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Payment is in escrow 🔒</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">The homeowner has paid for <strong>${jobTitle}</strong>. Complete the job and your payment will be released.</p>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
              <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">Your earnings (on completion)</div>
              <div style="font-size:32px;font-weight:700;color:#3DAA6A">R${netAmount.toLocaleString()}</div>
              <div style="font-size:11px;color:#5A5952;margin-top:4px">After 10% Lungisa commission</div>
            </div>
            <a href="https://lungiza.co.za/dashboard" style="display:block;background:#3DAA6A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;">Go to my dashboard →</a>
          `
        )
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown email type' }, { status: 400 })

  } catch(error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}