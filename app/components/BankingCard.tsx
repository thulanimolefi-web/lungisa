'use client'
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/apiFetch'
import { ACCOUNT_TYPES, BANKS, UNIVERSAL_BRANCH } from '../lib/banks'
import { Field, Level } from './rec-ui'

// The tradesperson's payout account, inside job records. Shows a short summary once saved.
// `compact` shows only a prompt when details are missing (used on the job card).
export default function BankingCard({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<{ applies: boolean; banking: any } | null>(null)
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState({ bank_name: '', account_holder: '', account_number: '', account_type: 'cheque', branch_code: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})

  async function load() {
    const r = await apiFetch('/api/records/banking')
    const j = await r.json().catch(() => null)
    if (r.ok && j) setState(j)
  }
  useEffect(() => { load() }, [])

  async function save() {
    setBusy(true); setMsg({})
    const r = await apiFetch('/api/records/banking', { method: 'POST', body: JSON.stringify(f) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setMsg({ err: j.error || 'Could not save' }); return }
    setState({ applies: true, banking: j.banking }); setEdit(false); setMsg({ ok: 'Bank details saved' })
    setF({ ...f, account_number: '' })
  }

  if (!state || !state.applies) return null
  const b = state.banking
  if (compact && b && !edit) return null

  return (
    <div className="rx-card" id="bank">
      <h2 className="rx-h2">Your payout account</h2>
      {msg.ok && <div className="rx-ok">{msg.ok}</div>}
      {b && !edit ? (
        <div className="rx-row" style={{ justifyContent: 'space-between' }}>
          <div>
            <b>{b.bank_name}</b> · {b.account_holder} · ****{b.account_last4}
            <div className="rx-muted">{(ACCOUNT_TYPES.find(t => t[0] === b.account_type) || ['', b.account_type])[1]} · branch {b.branch_code}. Card payments from customers are paid into this account after sign-off.</div>
          </div>
          <button className="rx-btn sec" onClick={() => { setF({ bank_name: b.bank_name, account_holder: b.account_holder, account_number: '', account_type: b.account_type, branch_code: b.branch_code }); setEdit(true) }}>Change</button>
        </div>
      ) : (
        <>
          {!b && <p><Level level="amber">Missing</Level> <span className="rx-muted">Add the account Lungiza pays you into when a customer pays by card. You only do this once.</span></p>}
          <div className="rx-grid">
            <Field label="Bank">
              <select value={f.bank_name} onChange={e => setF({ ...f, bank_name: e.target.value, branch_code: UNIVERSAL_BRANCH[e.target.value] || f.branch_code })}>
                <option value="">Choose your bank</option>{BANKS.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <Field label="Account holder"><input value={f.account_holder} onChange={e => setF({ ...f, account_holder: e.target.value })} autoComplete="name" /></Field>
            <Field label="Account number"><input inputMode="numeric" value={f.account_number} placeholder={b ? `Re-enter (ends ${b.account_last4})` : ''} onChange={e => setF({ ...f, account_number: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="Account type">
              <select value={f.account_type} onChange={e => setF({ ...f, account_type: e.target.value })}>
                {ACCOUNT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Branch code"><input inputMode="numeric" maxLength={6} value={f.branch_code} onChange={e => setF({ ...f, branch_code: e.target.value.replace(/\D/g, '') })} /></Field>
          </div>
          {msg.err && <div className="rx-err">{msg.err}</div>}
          <div className="rx-row" style={{ marginTop: 10 }}>
            <button className="rx-btn" disabled={busy} onClick={save}>Save bank details</button>
            {b && <button className="rx-btn sec" disabled={busy} onClick={() => setEdit(false)}>Cancel</button>}
          </div>
          <p className="rx-muted">The branch code fills in for banks with a universal code. Check it against your bank app.</p>
        </>
      )}
    </div>
  )
}
