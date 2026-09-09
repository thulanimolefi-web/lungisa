// Shared commission math for Lungisa.
//
// Lungisa takes 8% of the call-out fee + labour portion of a job only.
// Materials are passed through to the tradesperson at cost and are never
// commissioned — see app/terms/page.tsx section 4/5 for the user-facing
// explanation of this split.
export const COMMISSION_RATE = 0.08

export type BidBreakdown = {
  call_out_fee?: number | null
  labour_amount?: number | null
  materials_amount?: number | null
  amount?: number | null
}

/**
 * Splits a gross charged amount (in cents) into commission and net payout,
 * using the accepted bid's itemised breakdown (in whole Rand, as stored on
 * the `bids` table) when one is available.
 *
 * If the bid has no breakdown (e.g. a pre-itemisation row that somehow
 * skipped the migration backfill), falls back to commissioning the full
 * amount — the old behaviour — rather than throwing.
 *
 * Commission is computed proportionally against the *actual* amount
 * charged rather than trusting the bid's own Rand total blindly, so small
 * drift between the bid total and the final charged amount (rounding,
 * a late counter-offer, etc.) doesn't produce an inconsistent split.
 */
export function splitCommission(grossAmountInCents: number, bid?: BidBreakdown | null) {
  const hasBreakdown = bid != null && bid.labour_amount != null

  if (hasBreakdown) {
    const commissionableRand = (bid!.call_out_fee || 0) + (bid!.labour_amount || 0)
    const totalRand = commissionableRand + (bid!.materials_amount || 0)
    const ratio = totalRand > 0 ? commissionableRand / totalRand : 1
    const commissionAmountCents = Math.round(grossAmountInCents * ratio * COMMISSION_RATE)
    return { commissionAmountCents, netAmountCents: grossAmountInCents - commissionAmountCents }
  }

  const commissionAmountCents = Math.round(grossAmountInCents * COMMISSION_RATE)
  return { commissionAmountCents, netAmountCents: grossAmountInCents - commissionAmountCents }
}
