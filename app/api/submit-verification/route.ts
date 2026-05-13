import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

const ADMIN_EMAIL = 'stockstvm@gmail.com' // your review email

export async function POST(req: NextRequest) {
  try {
    const { userId, idUrl, selfieUrl, idType } = await req.json()
    if(!userId || !idUrl) {
      return NextResponse.json({ error: 'Missing userId or idUrl' }, { status: 400 })
    }

    // ── 1. Fetch tradesperson name for emails ──────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single()

    const fullName  = profile?.full_name || 'Tradesperson'
    const userEmail = profile?.email || ''
    const firstName = fullName.split(' ')[0]
    const docLabel  = idType === 'id_card' ? 'SA ID Card'
                    : idType === 'id_book' ? 'SA ID Book'
                    : 'Passport'

    // ── 2. Write in-app notification for the tradesperson ─────────
    // Runs with service role key — no RLS violation
    await supabase.from('notifications').insert({
      user_id: userId,
      type:    'id_submitted',
      title:   'ID submitted for verification',
      message: `Your ${docLabel} has been received. The Lungisa team will review it within 24 hours.`,
      link:    '/dashboard',
      read:    false,
      payload: { idUrl, selfieUrl, idType },
    })

    // ── 3. Email the tradesperson — confirmation ───────────────────
    if(userEmail) {
      await transporter.sendMail({
        from: '"Lungisa" <stockstvm@gmail.com>',
        to:   userEmail,
        subject: 'Your ID has been received — Lungisa verification',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;border-radius:8px;overflow:hidden">
            <div style="background:#2C2C28;padding:20px 28px;display:flex;align-items:center;gap:10px">
              <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
            </div>
            <div style="padding:28px">
              <h2 style="color:#2C2C28;font-size:22px;margin:0 0 8px">Hi ${firstName}, we&apos;ve received your ID 📋</h2>
              <p style="color:#5A5952;font-size:15px;line-height:1.6;margin:0 0 20px">
                Your <strong>${docLabel}</strong> has been submitted for verification. A member of the Lungisa team will review it manually within <strong>24 hours</strong>.
              </p>
              <div style="background:#fff;border-radius:8px;padding:16px 20px;border-left:4px solid #E8A020;margin-bottom:20px">
                <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">What happens next</div>
                <div style="font-size:14px;color:#2C2C28;line-height:1.7">
                  ✅ We review your document<br/>
                  ✅ You get an email with the result<br/>
                  ✅ Verified badge appears on your profile &amp; bids<br/>
                  ✅ Homeowners see you as a trusted tradesperson
                </div>
              </div>
              <div style="background:rgba(196,89,58,.06);border:1px solid rgba(196,89,58,.15);border-radius:8px;padding:12px 16px;font-size:12px;color:#5A5952;line-height:1.6">
                🔒 Your documents are encrypted and stored securely. They are never shared publicly or with third parties.
              </div>
            </div>
            <div style="background:#EAE3D6;padding:14px 28px;border-top:1px solid #DDD5C5;text-align:center">
              <p style="color:#D4C9B4;font-size:11px;margin:0">© 2026 Lungisa · <a href="https://lungiza.co.za" style="color:#C4593A">lungiza.co.za</a></p>
            </div>
          </div>
        `,
      })
    }

    // ── 4. Email YOU (admin) — review request with photo links ─────
    await transporter.sendMail({
      from:    '"Lungisa System" <stockstvm@gmail.com>',
      to:      ADMIN_EMAIL,
      subject: `🪪 ID Review required — ${fullName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f9f9;border-radius:8px;overflow:hidden;border:1px solid #ddd">
          <div style="background:#2C2C28;padding:18px 24px">
            <div style="color:#F5F0E8;font-size:20px;font-weight:bold;letter-spacing:2px">LUNGISA — ID REVIEW</div>
          </div>
          <div style="padding:24px">
            <h2 style="color:#2C2C28;margin:0 0 16px">New ID verification request</h2>

            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;width:140px">Name</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#222;font-weight:600">${fullName}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#222">${userEmail}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Document type</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:13px;color:#222">${docLabel}</td></tr>
              <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">User ID</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px;color:#555;font-family:monospace">${userId}</td></tr>
              <tr><td style="padding:8px 0;color:#666;font-size:13px">Submitted</td><td style="padding:8px 0;font-size:13px;color:#222">${new Date().toLocaleString('en-ZA',{dateStyle:'full',timeStyle:'short'})}</td></tr>
            </table>

            <div style="margin-bottom:20px">
              <div style="font-size:13px;font-weight:600;color:#2C2C28;margin-bottom:8px">📄 ID Document</div>
              <a href="${idUrl}" target="_blank" style="display:inline-block;background:#C4593A;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin-bottom:8px">
                View ID Document →
              </a>
              <div style="font-size:11px;color:#888;margin-top:4px;word-break:break-all">${idUrl}</div>
            </div>

            ${selfieUrl ? `
            <div style="margin-bottom:20px">
              <div style="font-size:13px;font-weight:600;color:#2C2C28;margin-bottom:8px">🤳 Selfie with ID</div>
              <a href="${selfieUrl}" target="_blank" style="display:inline-block;background:#5A5952;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin-bottom:8px">
                View Selfie →
              </a>
              <div style="font-size:11px;color:#888;margin-top:4px;word-break:break-all">${selfieUrl}</div>
            </div>
            ` : '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:10px 14px;font-size:12px;color:#856404;margin-bottom:20px">⚠️ No selfie uploaded — verify ID document carefully</div>'}

            <div style="background:#f8f8f8;border:1px solid #ddd;border-radius:8px;padding:16px;margin-bottom:20px">
              <div style="font-size:13px;font-weight:600;color:#2C2C28;margin-bottom:10px">To approve or reject:</div>
              <div style="font-size:13px;color:#444;line-height:1.8">
                <strong>Approve:</strong> Run in Supabase SQL Editor:<br/>
                <code style="background:#2C2C28;color:#E07A5F;padding:6px 10px;border-radius:4px;display:block;margin:6px 0;font-size:12px">UPDATE public.tradesperson_profiles SET id_verified = true, verification_status = 'verified' WHERE id = '${userId}';</code>
                <strong>Reject:</strong><br/>
                <code style="background:#2C2C28;color:#f08080;padding:6px 10px;border-radius:4px;display:block;margin:6px 0;font-size:12px">UPDATE public.tradesperson_profiles SET id_verified = false, verification_status = 'rejected' WHERE id = '${userId}';</code>
              </div>
            </div>

            <div style="font-size:12px;color:#888;line-height:1.6">
              Running the approve query will automatically notify ${firstName} via in-app notification (Supabase trigger). You may also want to send them a personal email confirming approval.
            </div>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })

  } catch(error) {
    console.error('Verification submission error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}