import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// Service role — bypasses RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const transporter = nodemailer.createTransport({
  host:       'smtp.hmailplus.com',
  port:       587,
  secure:     false,
  requireTLS: true,
  auth: {
    user: 'info@lungiza.co.za',
    pass: process.env.LUNGISA_EMAIL_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
})

// Vercel cron calls GET /api/expire-jobs every night at 22:00 UTC
export async function GET(req: NextRequest) {
  // Protect endpoint — only Vercel cron or admin can call this
  const authHeader = req.headers.get('authorization')
  if(authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ── 1. Find all jobs that should expire ───────────────────────
    const { data: expiredJobs, error: fetchErr } = await supabase
      .from('jobs')
      .select('id, title, homeowner_id, created_at, expires_at, profiles!homeowner_id(full_name, email)')
      .eq('status', 'open')
      .lt('expires_at', new Date().toISOString())

    if(fetchErr) {
      console.error('Fetch expired jobs error:', fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    if(!expiredJobs || expiredJobs.length === 0) {
      return NextResponse.json({ message: 'No jobs to expire', count: 0 })
    }

    // ── 2. Mark them all as expired ───────────────────────────────
    const expiredIds = expiredJobs.map(j => j.id)
    const { error: updateErr } = await supabase
      .from('jobs')
      .update({ status: 'expired' })
      .in('id', expiredIds)

    if(updateErr) {
      console.error('Update expired jobs error:', updateErr)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // ── 3. Decline all open bids on expired jobs ──────────────────
    await supabase
      .from('bids')
      .update({ status: 'declined' })
      .in('job_id', expiredIds)
      .not('status', 'in', '("accepted","completed","declined")')

    // ── 4. Email each homeowner ───────────────────────────────────
    for(const job of expiredJobs) {
      const homeowner = (job as any).profiles
      if(!homeowner?.email) continue

      const firstName = homeowner.full_name?.split(' ')[0] || 'there'
      const bidCount  = 0 // We already declined them — this is informational

      try {
        await transporter.sendMail({
          from:    '"Lungisa" <info@lungiza.co.za>',
          to:      homeowner.email,
          subject: `Your job has expired — ${job.title}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:0;border-radius:8px;overflow:hidden">
              <div style="background:#2C2C28;padding:20px 28px">
                <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
                <div style="color:rgba(245,240,232,.5);font-size:11px;letter-spacing:1px">Post It. Bid It. Fix It.</div>
              </div>
              <div style="padding:28px">
                <h2 style="color:#2C2C28;font-size:20px;margin:0 0 12px">Hey ${firstName}, your job has expired</h2>
                <p style="color:#5A5952;font-size:15px;line-height:1.7;margin:0 0 16px">
                  Your job <strong>${job.title}</strong> was open for 7 days and has now closed automatically.
                </p>
                <div style="background:#fff;border-radius:8px;padding:16px 20px;border-left:4px solid #C4593A;margin-bottom:20px">
                  <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">What happens now?</div>
                  <ul style="color:#2C2C28;font-size:14px;line-height:1.8;margin:0;padding-left:18px">
                    <li>Your job has been closed and removed from the feed</li>
                    <li>Any open bids have been cancelled</li>
                    <li>You can re-post the job anytime — it only takes 2 minutes</li>
                  </ul>
                </div>
                <p style="color:#5A5952;font-size:14px;line-height:1.6;margin:0 0 24px">
                  Still need the work done? Post it again and fresh bids will start coming in.
                </p>
                <a href="https://lungiza.co.za/post"
                  style="display:block;background:#C4593A;color:#fff;text-align:center;padding:14px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;margin-bottom:12px">
                  Re-post this job →
                </a>
                <a href="https://lungiza.co.za/home"
                  style="display:block;background:transparent;color:#C4593A;text-align:center;padding:12px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;border:1px solid #C4593A">
                  View my dashboard
                </a>
              </div>
              <div style="background:#EAE3D6;padding:14px 28px;border-top:1px solid #DDD5C5">
                <p style="color:#5A5952;font-size:11px;text-align:center;margin:0">
                  © 2026 Lungisa · <a href="https://lungiza.co.za" style="color:#C4593A">lungiza.co.za</a>
                </p>
              </div>
            </div>
          `,
        })
      } catch(emailErr) {
        console.log(`Email failed for ${homeowner.email}:`, emailErr)
      }

      // ── 5. In-app notification ────────────────────────────────
      try {
        await supabase.from('notifications').insert({
          user_id: job.homeowner_id,
          type:    'job_expired',
          title:   `Job expired — ${job.title}`,
          message: 'Your job was open for 7 days and has closed. Re-post anytime.',
          link:    '/post',
          read:    false,
        })
      } catch(notifErr) {
        console.log('Notification insert error:', notifErr)
      }
    }

    console.log(`Expired ${expiredJobs.length} jobs:`, expiredIds)
    return NextResponse.json({
      message: `Successfully expired ${expiredJobs.length} job${expiredJobs.length !== 1 ? 's' : ''}`,
      count:   expiredJobs.length,
      jobIds:  expiredIds,
    })

  } catch(error) {
    console.error('Expire jobs route error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}