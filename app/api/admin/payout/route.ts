import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

// POST /api/admin/payout — mark a payment as processed
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if(authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { paymentId, status, reference, notes } = await req.json()
    if(!paymentId || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data: payment, error: fetchErr } = await supabase
      .from('payments')
      .select('*, jobs(title), profiles!tradesperson_id(full_name, email)')
      .eq('id', paymentId)
      .single()
    if(fetchErr || !payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })

    await supabase.from('payments').update({
      payout_status:    status,
      payout_reference: reference || null,
      payout_notes:     notes || null,
      payout_date:      status === 'paid' ? new Date().toISOString() : null,
    }).eq('id', paymentId)

    // Email tradesperson when marked as paid
    if(status === 'paid') {
      const trade = (payment as any).profiles
      const jobTitle = (payment as any).jobs?.title || 'Job'
      if(trade?.email) {
        await transporter.sendMail({
          from: '"Lungisa" <info@lungiza.co.za>',
          to: trade.email,
          subject: `Payment sent — ${jobTitle}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#F5F0E8;padding:0;border-radius:8px;overflow:hidden">
              <div style="background:#2C2C28;padding:20px 28px">
                <div style="font-family:Georgia,serif;color:#F5F0E8;font-size:22px;letter-spacing:3px;font-weight:bold">LUNGISA</div>
              </div>
              <div style="padding:28px">
                <h2 style="color:#2C2C28;font-size:20px;margin:0 0 12px">Your payment has been sent 💸</h2>
                <p style="color:#5A5952;font-size:15px;line-height:1.7;margin:0 0 16px">
                  Hey ${trade.full_name?.split(' ')[0] || 'there'}, your payment for <strong>${jobTitle}</strong> has been processed and sent to your bank account.
                </p>
                <div style="background:#fff;border-radius:8px;padding:16px 20px;border-left:4px solid #3DAA6A;margin-bottom:20px">
                  <div style="font-size:12px;color:#5A5952;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Amount sent</div>
                  <div style="font-size:28px;font-weight:700;color:#3DAA6A">R${payment.net_amount?.toLocaleString()}</div>
                  ${reference ? `<div style="font-size:12px;color:#5A5952;margin-top:6px">Reference: ${reference}</div>` : ''}
                </div>
                <p style="color:#5A5952;font-size:13px;line-height:1.6;margin:0">
                  Payments typically reflect within 1 to 2 business days depending on your bank.
                </p>
              </div>
              <div style="background:#EAE3D6;padding:14px 28px;border-top:1px solid #DDD5C5">
                <p style="color:#5A5952;font-size:11px;text-align:center;margin:0">© 2026 Lungisa · lungiza.co.za</p>
              </div>
            </div>
          `,
        })
      }
      // In-app notification
      await supabase.from('notifications').insert({
        user_id: payment.tradesperson_id,
        type:    'payment_sent',
        title:   `Payment sent — ${jobTitle}`,
        message: `R${payment.net_amount?.toLocaleString()} has been sent to your bank account.`,
        link:    '/dashboard',
        read:    false,
      })
    }
    return NextResponse.json({ success: true, status })
  } catch(error) {
    console.error('Admin payout error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET /api/admin/payout — list all pending payouts
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if(authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        jobs(title, id),
        profiles!tradesperson_id(full_name, email, phone),
        banking_details!tradesperson_id(bank_name, account_number, account_holder, branch_code, account_type)
      `)
      .eq('payout_status', 'pending')
      .order('created_at', { ascending: false })
    if(error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ payouts: data })
  } catch(error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}