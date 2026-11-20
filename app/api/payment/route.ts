import { NextRequest, NextResponse } from 'next/server'
import { paymentsFrozen, requireUser } from '../../lib/auth-server'

// Not called by the app (the app uses /api/charge). Disabled unless PAYMENTS_ENABLED=true.

export async function POST(req: NextRequest) {
  const frozen = paymentsFrozen()
  if (frozen) return frozen
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  if (!process.env.YOCO_SECRET_KEY) return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
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