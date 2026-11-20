'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { apiFetch } from '../../lib/apiFetch'
import { Field, money, Shell } from '../../components/rec-ui'

// Admin: card payments taken on job-record links, to be paid out to tradespeople by EFT.
export default function RecordPayoutsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<any[] | null>(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [refs, setRefs] = useState<Record<string, string>>({})

  async function load() {
    const { data: ok } = await supabase.rpc('is_admin')
    if (!ok) { router.push('/'); return }
    const r = await apiFetch('/api/admin/record-payouts'); const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(j.error || 'Could not load'); return }
    setRows(j.data || [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function markPaid(id: string) {
    setBusy(true); setErr(''); setOk('')
    const r = await apiFetch('/api/admin/record-payouts', { method: 'POST', body: JSON.stringify({ id, reference: refs[id] || '' }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setErr(j.error || 'Could not save'); return }
    setOk('Marked as paid out'); load()
  }

  const label = (p: any) => p.status === 'review' ? 'Amount mismatch: check in Yoco before paying'
    : p.payout_status === 'paid' ? `Paid out ${p.payout_at ? new Date(p.payout_at).toLocaleDateString('en-ZA') : ''} (${p.payout_reference || ''})`
    : p.payout_status === 'pending' ? 'Due: customer signed off'
    : p.job_records?.status === 'closed_without_signoff' ? 'Held: closed without customer sign-off. Decide before paying.'
    : 'Not due yet: waiting for customer sign-off'

  return (
    <Shell title="Record payouts">
      <h1 className="rx-h1">Card payouts on job records</h1>
      <p className="rx-muted">Card payments customers made on their job link. Pay the tradesperson by EFT, then record the reference here.</p>
      {err && <div className="rx-err">{err}</div>}
      {ok && <div className="rx-ok">{ok}</div>}
      {!rows ? <p className="rx-muted">Loading...</p> : rows.length === 0 ? <p className="rx-muted">No card payments yet.</p> : rows.map(p => (
        <div key={p.id} className="rx-card">
          <div className="rx-row" style={{ justifyContent: 'space-between' }}>
            <b>{p.job_records?.title} · #{p.job_records?.ref}</b>
            <span>{label(p)}</span>
          </div>
          <p>Customer paid <b>{money(p.amount_cents)}</b> · Lungiza fee {money(p.commission_cents)} · <b>pay the tradesperson {money(p.net_cents)}</b></p>
          <p className="rx-muted">{p.trade?.full_name || 'No tradesperson'} {p.trade?.phone ? `· ${p.trade.phone}` : ''} {p.trade?.email ? `· ${p.trade.email}` : ''}</p>
          {p.banking
            ? <p className="rx-muted">{p.banking.bank_name} · {p.banking.account_holder} · {p.banking.account_number} · {p.banking.account_type} · branch {p.banking.branch_code}</p>
            : <p className="rx-muted">No banking details on file. Ask the tradesperson before paying.</p>}
          {p.status === 'paid' && p.payout_status !== 'paid' && (
            <div className="rx-row">
              <Field label="EFT reference"><input value={refs[p.id] || ''} onChange={e => setRefs({ ...refs, [p.id]: e.target.value })} /></Field>
              <button className="rx-btn green" disabled={busy || !(refs[p.id] || '').trim()} onClick={() => markPaid(p.id)}>Mark paid out</button>
            </div>
          )}
        </div>
      ))}
    </Shell>
  )
}
