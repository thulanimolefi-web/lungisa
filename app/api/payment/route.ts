import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, amountInCents, jobId, bidId, homeownerId, tradespersonId } = await req.json()

    // Charge card via Yoco
    const yocoRes = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.YOCO_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: amountInCents,
        currency: 'ZAR',
        metadata: { jobId, bidId, homeownerId, tradespersonId },
      }),
    })

    const yocoData = await yocoRes.json()

    if(!yocoRes.ok) {
      return NextResponse.json({ error: yocoData.message||'Payment failed' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      checkoutId: yocoData.id,
      redirectUrl: yocoData.redirectUrl 
    })

  } catch(e) {
    console.error('Payment error:', e)
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}