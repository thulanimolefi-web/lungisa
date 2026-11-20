import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth-server'
import { audit, db } from '../../../lib/jobrecord-server'
import { BANKS } from '../../../lib/banks'

// The tradesperson's payout bank account, used for card payouts on job records.
// Same table as the dashboard's banking form. The full account number is never sent back to the browser.
const TYPES = ['cheque', 'savings', 'transmission']
const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

async function isTrade(userId: string) {
  const { data } = await db().from('profiles').select('role').eq('id', userId).maybeSingle()
  return (data as any)?.role === 'tradesperson'
}

function masked(b: any) {
  if (!b) return null
  const n = String(b.account_number || '')
  return { bank_name: b.bank_name, account_holder: b.account_holder, account_type: b.account_type, branch_code: b.branch_code,
    account_last4: n.slice(-4), updated_at: b.updated_at }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  if (!(await isTrade(auth.user.id))) return NextResponse.json({ applies: false, banking: null })
  const { data } = await db().from('banking_details').select('*').eq('tradesperson_id', auth.user.id).maybeSingle()
  return NextResponse.json({ applies: true, banking: masked(data) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  if (!(await isTrade(auth.user.id))) return err('Only tradespeople add a payout account', 403)
  const b = await req.json().catch(() => ({}))
  const bank_name = String(b.bank_name || '').trim()
  const account_holder = String(b.account_holder || '').trim().slice(0, 120)
  const account_number = String(b.account_number || '').replace(/\D/g, '')
  const branch_code = String(b.branch_code || '').replace(/\D/g, '')
  const account_type = TYPES.includes(b.account_type) ? b.account_type : 'cheque'
  if (!BANKS.includes(bank_name)) return err('Choose your bank')
  if (account_holder.length < 2) return err('Enter the account holder name')
  if (account_number.length < 6 || account_number.length > 16) return err('Check the account number')
  if (branch_code.length !== 6) return err('The branch code has 6 digits')
  const { error } = await db().from('banking_details').upsert({
    tradesperson_id: auth.user.id, bank_name, account_holder, account_number, account_type, branch_code,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'tradesperson_id' })
  if (error) return err('Could not save your bank details', 500)
  await audit(auth.user.id, 'banking_updated', 'banking_details', auth.user.id, { bank_name, last4: account_number.slice(-4) })
  const { data } = await db().from('banking_details').select('*').eq('tradesperson_id', auth.user.id).maybeSingle()
  return NextResponse.json({ ok: true, banking: masked(data) })
}
