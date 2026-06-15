import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

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

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()

    if(!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    // Email to Lungisa team
    await transporter.sendMail({
      from:    '"Lungisa Website" <info@lungiza.co.za>',
      to:      'info@lungiza.co.za',
      replyTo: email,
      subject: `📬 New message from ${name} — lungiza.co.za`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:0;border-radius:8px;overflow:hidden">
          <div style="background:#2C2C28;padding:20px 28px">
            <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
            <div style="color:rgba(245,240,232,.5);font-size:11px;letter-spacing:1px">New contact form message</div>
          </div>
          <div style="padding:28px">
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #EAE3D6;color:#5A5952;font-size:13px;width:100px">Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #EAE3D6;font-size:14px;color:#2C2C28;font-weight:600">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #EAE3D6;color:#5A5952;font-size:13px">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #EAE3D6;font-size:14px;color:#2C2C28">
                  <a href="mailto:${email}" style="color:#C4593A">${email}</a>
                </td>
              </tr>
            </table>
            <div style="background:#fff;border-radius:8px;padding:18px 20px;border-left:4px solid #C4593A">
              <div style="font-size:11px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Message</div>
              <div style="font-size:15px;color:#2C2C28;line-height:1.7">${message.replace(/\n/g,'<br/>')}</div>
            </div>
            <div style="margin-top:20px">
              <a href="mailto:${email}?subject=Re: Your Lungisa enquiry"
                style="display:inline-block;background:#C4593A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">
                Reply to ${name.split(' ')[0]} →
              </a>
            </div>
          </div>
          <div style="background:#EAE3D6;padding:14px 28px;border-top:1px solid #DDD5C5">
            <p style="color:#5A5952;font-size:11px;text-align:center;margin:0">
              Sent via lungiza.co.za contact form
            </p>
          </div>
        </div>
      `,
    })

    // Auto-reply to sender
    await transporter.sendMail({
      from:    '"Lungisa" <info@lungiza.co.za>',
      to:      email,
      subject: `We got your message, ${name.split(' ')[0]} 🔨`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:0;border-radius:8px;overflow:hidden">
          <div style="background:#2C2C28;padding:20px 28px">
            <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
            <div style="color:rgba(245,240,232,.5);font-size:11px;letter-spacing:1px">Post It. Bid It. Fix It.</div>
          </div>
          <div style="padding:28px">
            <h2 style="color:#2C2C28;font-size:22px;margin:0 0 12px">Hey ${name.split(' ')[0]}, we got your message 👋</h2>
            <p style="color:#5A5952;font-size:15px;line-height:1.7;margin:0 0 20px">
              Thanks for reaching out. We&apos;ll get back to you within 24 hours.
            </p>
            <div style="background:#fff;border-radius:8px;padding:16px 20px;border-left:4px solid #C4593A;margin-bottom:24px;font-size:14px;color:#5A5952;line-height:1.6;font-style:italic">
              &ldquo;${message.substring(0, 120)}${message.length > 120 ? '...' : ''}&rdquo;
            </div>
            <p style="color:#5A5952;font-size:14px;line-height:1.7;margin:0 0 24px">
              While you wait, feel free to explore the platform:
            </p>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <a href="https://lungiza.co.za/auth"
                style="background:#C4593A;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;display:inline-block">
                Post a job free →
              </a>
              <a href="https://lungiza.co.za"
                style="background:transparent;color:#C4593A;padding:12px 22px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;border:1px solid #C4593A;display:inline-block">
                Back to Lungisa
              </a>
            </div>
          </div>
          <div style="background:#EAE3D6;padding:16px 28px;border-top:1px solid #DDD5C5">
            <p style="color:#5A5952;font-size:11px;text-align:center;margin:0">
              © 2026 Lungisa · <a href="https://lungiza.co.za" style="color:#C4593A">lungiza.co.za</a> · info@lungiza.co.za
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true })

  } catch(error) {
    console.error('Contact route error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}