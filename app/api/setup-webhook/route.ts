import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const secretKey = process.env.YOCO_SECRET_KEY
    if(!secretKey) {
      return NextResponse.json({ error: 'YOCO_SECRET_KEY not set' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lungiza.co.za'
    const webhookUrl = `${appUrl}/api/webhook`

    // First check existing webhooks
    const listRes = await fetch('https://payments.yoco.com/api/webhooks', {
      headers: { 'Authorization': `Bearer ${secretKey}` }
    })
    const existing = await listRes.json()
    console.log('Existing webhooks:', JSON.stringify(existing))

    // Register new webhook
    const res = await fetch('https://payments.yoco.com/api/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        name: 'lungisa-payments',
        url:  webhookUrl,
      }),
    })

    const data = await res.json()

    if(!res.ok) {
      return NextResponse.json({ error: data, existing }, { status: 400 })
    }

    // data.secret is shown ONLY ONCE — save it immediately
    return NextResponse.json({
      success:       true,
      webhookId:     data.id,
      webhookUrl:    data.url,
      secret:        data.secret, // ← COPY THIS and add to Vercel as YOCO_WEBHOOK_SECRET
      instruction:   'IMPORTANT: Copy the secret above and add it to Vercel as YOCO_WEBHOOK_SECRET. It will not be shown again.',
      existing,
    })

  } catch(error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}