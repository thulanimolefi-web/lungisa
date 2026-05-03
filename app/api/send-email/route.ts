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

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, jobId, amount, eta, tradespersonId } = await req.json()

    // If called directly with email details — just send
    if(to && subject && html) {
      await transporter.sendMail({
        from: '"Lungisa" <stockstvm@gmail.com>',
        to, subject, html,
      })
      return NextResponse.json({ success: true })
    }

    // If called with jobId — look up details and send bid notification
    if(jobId) {
      // Get job and homeowner details
      const { data: job } = await supabase
        .from('jobs')
        .select('*, profiles!homeowner_id(full_name, email)')
        .eq('id', jobId)
        .single()

      if(!job || !(job.profiles as any)?.email) {
        return NextResponse.json({ error: 'No homeowner email found' }, { status: 200 })
      }

      // Get tradesperson name
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
      const homeownerName  = (job.profiles as any).full_name?.split(' ')[0] || 'there'
      const bidAmount      = `R${Number(amount).toLocaleString()}`
      const jobTitle       = job.title

      const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:32px;border-radius:8px">
          <div style="background:#C4593A;padding:20px 24px;border-radius:6px;margin-bottom:24px">
            <h1 style="font-family:Georgia,serif;color:#fff;margin:0;font-size:28px;letter-spacing:2px">LUNGISA</h1>
            <p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px">Post It. Bid It. Fix It.</p>
          </div>
          <h2 style="color:#2C2C28;font-size:22px;margin-bottom:8px">Hey ${homeownerName}, you have a new bid! 🔨</h2>
          <p style="color:#5A5952;font-size:15px;line-height:1.6;margin-bottom:24px">
            <strong>${tradeName}</strong> just placed a bid on your job:
          </p>
          <div style="background:#fff;border-radius:8px;padding:20px 24px;border-left:4px solid #C4593A;margin-bottom:24px">
            <div style="font-size:13px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Job</div>
            <div style="font-size:18px;font-weight:600;color:#2C2C28;margin-bottom:16px">${jobTitle}</div>
            <div style="display:flex;gap:24px">
              <div>
                <div style="font-size:13px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Bid amount</div>
                <div style="font-size:28px;font-weight:700;color:#C4593A">${bidAmount}</div>
              </div>
              <div>
                <div style="font-size:13px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">ETA</div>
                <div style="font-size:18px;font-weight:600;color:#2C2C28">${eta || 'TBD'}</div>
              </div>
            </div>
          </div>
          <a href="https://lungiza.co.za/home" style="display:block;background:#C4593A;color:#fff;text-align:center;padding:16px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:1px;margin-bottom:16px">
            VIEW BID &amp; RESPOND →
          </a>
          <p style="color:#5A5952;font-size:13px;line-height:1.6">
            You can counter-offer or accept directly on Lungisa. Payment is only released when you confirm the job is done.
          </p>
          <hr style="border:none;border-top:1px solid #DDD5C5;margin:24px 0"/>
          <p style="color:#D4C9B4;font-size:11px;text-align:center">
            © 2026 Lungisa · A VaultLink Africa product · lungiza.co.za
          </p>
        </div>
      `

      await transporter.sendMail({
        from:    '"Lungisa" <stockstvm@gmail.com>',
        to:      homeownerEmail,
        subject: `New bid on your job — ${jobTitle}`,
        html:    emailHtml,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  } catch(error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}