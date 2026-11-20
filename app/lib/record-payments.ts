// Card payments on job records, through Yoco's hosted checkout.
// The amount is always computed here on the server from the approved quote and approved extras.
// Lungiza receives the card payment and pays the tradesperson out manually (admin, EFT) after sign-off.
import { audit, currentQuote, db, notifyUser, quoteTotal } from './jobrecord-server'
import { splitCommission } from './commission'

/** Record statuses where the customer may pay by card: the work is done. */
export const PAYABLE_STATUSES = ['awaiting_signoff', 'completed']

export async function approvedExtrasCents(recordId: string) {
  const { data } = await db().from('variations').select('amount_cents, status').eq('record_id', recordId)
  return (data || []).filter((v: any) => v.status === 'approved' || v.status === 'emergency_within_cap')
    .reduce((s: number, v: any) => s + v.amount_cents, 0)
}

async function hasLiveQuoteApproval(recordId: string, version: number) {
  const { data } = await db().from('approvals').select('id').eq('record_id', recordId).eq('subject', 'quote')
    .eq('quote_version', version).eq('decision', 'approved').is('void_at', null).limit(1)
  return !!(data && data.length)
}

export async function paidCents(recordId: string) {
  const { data } = await db().from('record_payments').select('amount_cents').eq('record_id', recordId).eq('status', 'paid')
  return (data || []).reduce((s: number, p: any) => s + p.amount_cents, 0)
}

/** What the customer owes on this record, and whether a card payment is allowed now. */
export async function paymentState(record: any) {
  const q = await currentQuote(record.id)
  const approved = q ? await hasLiveQuoteApproval(record.id, q.version) : false
  const total = q && approved ? quoteTotal(q) + (await approvedExtrasCents(record.id)) : 0
  const paid = await paidCents(record.id)
  const due = Math.max(0, total - paid)
  let reason: string | null = null
  if (!q || !approved) reason = 'There is no approved quote yet'
  else if (!PAYABLE_STATUSES.includes(record.status)) reason = 'You can pay by card once the tradesperson marks the work done'
  else if (record.amount_disputed) reason = 'The amount is disputed. Sort it out with the tradesperson first'
  else if (due <= 0) reason = 'Nothing is due'
  return { quote: q, total_cents: total, paid_cents: paid, due_cents: due, can_pay: reason === null, reason }
}

/** Card payment fee on own-customer jobs, paid by the tradesperson out of the payout.
 *  Never added to the customer's price: card surcharges are not allowed in South Africa. */
export const CARD_FEE_RATE = 0.035

/** Marketplace jobs (commission_flag): 8% of call-out plus labour, card costs included.
 *  Own-customer jobs: CARD_FEE_RATE of the card amount. */
export function commissionFor(record: any, q: any, grossCents: number) {
  if (!record.commission_flag || !q) {
    const fee = Math.round(grossCents * CARD_FEE_RATE)
    return { commissionCents: fee, netCents: grossCents - fee }
  }
  // splitCommission only uses the ratio between the parts, so cents work the same as Rand.
  const { commissionAmountCents, netAmountCents } = splitCommission(grossCents, {
    call_out_fee: q.call_out_cents, labour_amount: q.labour_cents, materials_amount: q.materials_cents,
  })
  return { commissionCents: commissionAmountCents, netCents: netAmountCents }
}

/** Creates a pending payment row and a Yoco checkout for the full amount due. */
export async function startRecordCheckout(record: any, linkId: string, payerEmail: string | null) {
  const state = await paymentState(record)
  if (!state.can_pay) return { ok: false as const, error: state.reason || 'Payment not available' }
  const secretKey = process.env.YOCO_SECRET_KEY
  if (!secretKey) return { ok: false as const, error: 'Card payments are not set up. Contact Lungiza.' }

  const amount = state.due_cents
  const { commissionCents, netCents } = commissionFor(record, state.quote, amount)
  const { data: row, error } = await db().from('record_payments').insert({
    record_id: record.id, link_id: linkId, amount_cents: amount, commission_cents: commissionCents, net_cents: netCents,
    payer_email: payerEmail, status: 'pending',
  }).select('id').single()
  if (error || !row) return { ok: false as const, error: 'Could not start the payment' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lungiza.co.za'
  // The link token is never sent to Yoco: the return pages only carry the record reference.
  const res = await fetch('https://payments.yoco.com/api/checkouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `lungiza-rec-${(row as any).id}` },
    body: JSON.stringify({
      amount, currency: 'ZAR',
      successUrl: `${appUrl}/paid?ref=${encodeURIComponent(record.ref)}`,
      cancelUrl: `${appUrl}/paid?ref=${encodeURIComponent(record.ref)}&cancelled=1`,
      metadata: { kind: 'job_record', recordId: record.id, recordPaymentId: (row as any).id, ref: record.ref },
    }),
  })
  const checkout = await res.json().catch(() => ({}))
  if (!res.ok || !checkout?.id || !checkout?.redirectUrl) {
    await db().from('record_payments').update({ status: 'failed' }).eq('id', (row as any).id)
    console.error('Yoco record checkout failed, status', res.status)
    return { ok: false as const, error: 'The card payment could not be started. Try again in a minute.' }
  }
  await db().from('record_payments').update({ yoco_checkout_id: checkout.id }).eq('id', (row as any).id)
  await audit(null, 'record_checkout_started', 'job_records', record.id, { payment_id: (row as any).id, amount_cents: amount })
  return { ok: true as const, redirectUrl: checkout.redirectUrl as string }
}

/** Called from the signed Yoco webhook for metadata.kind === 'job_record'. */
export async function handleRecordWebhook(eventType: string, payload: any) {
  const meta = payload?.metadata || {}
  const checkoutId = payload?.id || payload?.checkoutId
  const { data: p } = await db().from('record_payments').select('*').eq('id', meta.recordPaymentId).maybeSingle()
  if (!p || (p as any).record_id !== meta.recordId || ((p as any).yoco_checkout_id && checkoutId && (p as any).yoco_checkout_id !== checkoutId)) {
    console.error('Record webhook: no matching payment row')
    return
  }
  const pay = p as any
  if (eventType === 'payment.failed' || eventType === 'checkout.expired') {
    if (pay.status === 'pending') await db().from('record_payments').update({ status: 'failed' }).eq('id', pay.id)
    return
  }
  if (pay.status === 'paid') return  // Yoco can send the same event twice
  const amount = Number(payload?.amountInCents ?? payload?.amount ?? 0)
  const { data: record } = await db().from('job_records').select('*').eq('id', pay.record_id).maybeSingle()
  const r = record as any
  if (amount !== pay.amount_cents) {
    await db().from('record_payments').update({ status: 'review', paid_at: new Date().toISOString() }).eq('id', pay.id)
    await audit(null, 'record_payment_amount_mismatch', 'job_records', pay.record_id, { payment_id: pay.id, expected: pay.amount_cents, received: amount })
    return
  }
  await db().from('record_payments').update({
    status: 'paid', paid_at: new Date().toISOString(),
    payout_status: r?.status === 'completed' ? 'pending' : 'not_due',
  }).eq('id', pay.id)
  if (r) {
    const state = await paymentState(r)
    await db().from('job_records').update({
      invoice_status: state.due_cents <= 0 ? 'paid' : 'part_paid', invoice_amount_cents: state.total_cents,
    }).eq('id', r.id)
    await notifyUser(r.tradesperson_id, 'Customer paid by card', `${r.title}: R${Math.round(amount / 100).toLocaleString('en-ZA')} received. Lungiza pays you out after the customer signs off.`, `/records/${r.id}`)
  }
  await audit(null, 'record_payment_paid', 'job_records', pay.record_id, { payment_id: pay.id, amount_cents: amount })
}

/** After the customer signs off, card payments on the record become due for payout. */
export async function markPayoutsDue(recordId: string) {
  await db().from('record_payments').update({ payout_status: 'pending' })
    .eq('record_id', recordId).eq('status', 'paid').eq('payout_status', 'not_due')
}
