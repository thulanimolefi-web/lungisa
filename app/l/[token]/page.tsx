'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '../../lib/apiFetch'
import { CERT_LABELS } from '../../lib/certificate-rules'
import { APPROVAL_LABEL, Bare, Field, Level, money, StatusPill } from '../../components/rec-ui'

// B20/B22/B39: the page behind every WhatsApp link. No account needed.
// Approving, signing off and reporting problems need a one-time code (receiver-confirmed, rule R4).
export default function LinkPage() {
  const { token } = useParams() as { token: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [challenge, setChallenge] = useState('')
  const [code, setCode] = useState('')
  const [session, setSession] = useState('')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [tenant, setTenant] = useState({ description: '', urgency: 'routine', name: '', phone: '' })
  const key = `lz-otp-${token.slice(0, 10)}`

  async function load() {
    const r = await fetch(`/api/l/${token}`, { cache: 'no-store' })
    const j = await r.json()
    if (!r.ok) { setErr(j.error || 'This link is no longer available'); return }
    setD(j); if (j.record?.customer_name && !name) setName(j.record.customer_name)
  }
  useEffect(() => {
    load()
    try { const s = sessionStorage.getItem(key); if (s) setSession(s) } catch { /* private mode */ }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function post(action: string, body: Record<string, unknown> = {}, okText = 'Done') {
    setBusy(true); setErr(''); setOk('')
    const r = await apiFetch(`/api/l/${token}`, { method: 'POST', body: JSON.stringify({ action, otp_session: session, name, ...body }) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { if (r.status === 401 && action !== 'claim') { setSession(''); try { sessionStorage.removeItem(key) } catch { } } setErr(j.error || 'Something went wrong'); return null }
    setOk(okText); await load(); return j
  }

  async function sendCode() {
    const j = await post('otp_send', { email }, 'We sent a 6-digit code to your email.')
    if (j?.challengeId) setChallenge(j.challengeId)
  }
  async function checkCode() {
    const j = await post('otp_verify', { challengeId: challenge, code }, 'Confirmed. You can now approve or sign off.')
    if (j?.session) { setSession(j.session); try { sessionStorage.setItem(key, j.session) } catch { } }
  }

  if (err && !d) return <Bare><div className="rx-err">{err}</div></Bare>
  if (!d) return <Bare><p className="rx-muted">Loading...</p></Bare>

  // ---------------------------------------------------------------- tenant report
  if (d.kind === 'tenant') return (
    <Bare>
      <h1 className="rx-h1">Report a problem</h1>
      <p className="rx-muted">{d.property?.address_line}{d.property?.unit ? `, ${d.property.unit}` : ''}. Your landlord or agent gets this straight away.</p>
      {ok ? <div className="rx-ok">Thank you. Your report was sent.</div> : (
        <div className="rx-card">
          <Field label="What is wrong"><textarea value={tenant.description} onChange={e => setTenant({ ...tenant, description: e.target.value })} /></Field>
          <Field label="How urgent"><select value={tenant.urgency} onChange={e => setTenant({ ...tenant, urgency: e.target.value })}>
            <option value="routine">Can wait a few days</option><option value="urgent">Urgent (water, power, safety)</option></select></Field>
          <div className="rx-grid">
            <Field label="Your name"><input value={tenant.name} onChange={e => setTenant({ ...tenant, name: e.target.value })} /></Field>
            <Field label="Your phone"><input inputMode="tel" value={tenant.phone} onChange={e => setTenant({ ...tenant, phone: e.target.value })} /></Field>
          </div>
          {err && <div className="rx-err">{err}</div>}
          <button className="rx-btn" disabled={busy} onClick={() => post('tenant_report', tenant, 'Sent')}>Send report</button>
        </div>
      )}
    </Bare>
  )

  // ---------------------------------------------------------------- sales handover pack
  if (d.kind === 'handover') return (
    <Bare>
      <h1 className="rx-h1">Property certificates</h1>
      <p className="rx-muted">{d.property?.address_line}{d.property?.unit ? `, ${d.property.unit}` : ''}{d.property?.suburb ? `, ${d.property.suburb}` : ''}</p>
      <div className="rx-card">
        {d.items.map((i: any) => (
          <div key={i.id} className="rx-item"><div><b>{i.label}</b>
            {i.rule.reasons.map((x: string) => <div key={x} className="rx-muted">· {x}</div>)}
            {i.certificate?.url && <a href={i.certificate.url} target="_blank" rel="noreferrer">Open certificate</a>}</div>
            <Level level={i.rule.level}>{i.rule.label}</Level></div>
        ))}
      </div>
      <p className="rx-muted">Certificates are uploaded by the agent or tradesperson. Lungiza checks dates and fields; it does not issue certificates or guarantee the work.</p>
    </Bare>
  )

  // ---------------------------------------------------------------- job record
  const r = d.record
  const isApprover = d.scope === 'approver'
  const quote = d.quotes.filter((q: any) => !q.superseded_at).slice(-1)[0] || null
  const total = quote ? quote.call_out_cents + quote.labour_cents + quote.materials_cents : 0
  const approved = quote && d.approvals.find((a: any) => a.subject === 'quote' && a.quote_version === quote.version && a.decision === 'approved' && !a.void_at)
  const closed = ['completed', 'closed_without_signoff', 'cancelled'].includes(r.status)
  const verified = !!session

  return (
    <Bare>
      <div className="rx-row" style={{ justifyContent: 'space-between' }}><h1 className="rx-h1">{r.title}</h1><StatusPill status={r.status} /></div>
      <p className="rx-muted">#{r.ref} · {d.property?.address_line}{d.property?.unit ? `, ${d.property.unit}` : ''} · {d.tradeName ? `Tradesperson: ${d.tradeName}` : ''}</p>
      {err && <div className="rx-err">{err}</div>}
      {ok && <div className="rx-ok">{ok}</div>}

      <div className="rx-card">
        <h2 className="rx-h2">Quote {quote ? `version ${quote.version}` : ''}</h2>
        {quote ? <>
          <div className="rx-muted">Call-out {money(quote.call_out_cents)} · Labour {money(quote.labour_cents)} · Materials {money(quote.materials_cents)}</div>
          <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0' }}>{money(total)}</div>
          {quote.notes && <p className="rx-muted">{quote.notes}</p>}
          {approved ? <Level level="green">Approved · {APPROVAL_LABEL[approved.approval_type]}</Level> : <Level level="amber">Not approved yet</Level>}
        </> : <p className="rx-muted">The tradesperson has not sent a quote yet.</p>}
      </div>

      {d.variations.length > 0 && (
        <div className="rx-card"><h2 className="rx-h2">Extras</h2>
          {d.variations.map((v: any) => (
            <div key={v.id} className="rx-item"><div><b>{v.description}</b> {money(v.amount_cents)}{v.is_emergency && <div className="rx-muted">Emergency: {v.emergency_reason}</div>}</div>
              <div>{v.status === 'requested' && isApprover && verified && !closed ? <div className="rx-row">
                <button className="rx-btn green" disabled={busy} onClick={() => post('approve_variation', { variation_id: v.id }, 'Extra approved')}>Approve</button>
                <button className="rx-btn sec" disabled={busy} onClick={() => post('decline_variation', { variation_id: v.id }, 'Extra declined')}>Decline</button></div>
                : <Level level={v.status === 'approved' || v.status === 'emergency_within_cap' ? 'green' : v.status === 'declined' ? 'red' : 'amber'}>{v.status === 'requested' ? 'Not approved' : v.status.replace(/_/g, ' ')}</Level>}</div></div>
          ))}
        </div>
      )}

      {isApprover && !closed && !verified && (
        <div className="rx-card">
          <h2 className="rx-h2">Confirm it is you</h2>
          <p className="rx-muted">To approve, sign off or report a problem we send a one-time code. Nothing is approved until you confirm{d.recipient_email_hint ? ` (the code goes to ${d.recipient_email_hint})` : ''}.</p>
          <Field label="Your name"><input value={name} onChange={e => setName(e.target.value)} /></Field>
          {!challenge ? <>
            {!d.recipient_email_hint && <Field label="Your email"><input inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></Field>}
            <button className="rx-btn" disabled={busy} onClick={sendCode}>Send me a code</button>
          </> : <>
            <Field label="6-digit code"><input inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} /></Field>
            <div className="rx-row"><button className="rx-btn" disabled={busy || code.length < 6} onClick={checkCode}>Confirm</button>
              <button className="rx-btn sec" onClick={() => { setChallenge(''); setCode('') }}>Send a new code</button></div>
          </>}
          <p className="rx-muted" style={{ marginTop: 8 }}>Cannot get the code? Ask the tradesperson to send the quote as a PDF. A phone approval they record shows as &quot;not confirmed by the receiver&quot;.</p>
        </div>
      )}

      {isApprover && verified && !closed && (
        <div className="rx-card">
          <h2 className="rx-h2">Your decision</h2>
          {quote && !approved && <div className="rx-row" style={{ marginBottom: 10 }}>
            <button className="rx-btn green" disabled={busy} onClick={() => post('approve_quote', { quote_version: quote.version }, 'Quote approved. The tradesperson has been told.')}>Approve quote ({money(total)})</button>
            <button className="rx-btn sec" disabled={busy} onClick={() => post('decline_quote', { quote_version: quote.version, note }, 'Quote declined')}>Decline</button></div>}
          {r.status === 'awaiting_signoff' && <div className="rx-row" style={{ marginBottom: 10 }}>
            <button className="rx-btn green" disabled={busy} onClick={() => post('sign_off', {}, 'Signed off. Thank you.')}>Work is done, sign off</button></div>}
          <Field label="Note (needed for a problem or an amount dispute)"><textarea value={note} onChange={e => setNote(e.target.value)} /></Field>
          <div className="rx-row">
            <button className="rx-btn red" disabled={busy} onClick={() => post('report_problem', { note }, 'Problem reported. The record stays open.')}>Report a problem</button>
            {['approved', 'awaiting_approval', 'quoted', 'draft'].includes(r.status) && <button className="rx-btn sec" disabled={busy} onClick={() => post('no_show', { note }, 'Recorded: tradesperson did not arrive')}>Tradesperson did not arrive</button>}
          </div>
        </div>
      )}

      {isApprover && verified && (d.payment?.total_cents > 0 || r.invoice_status !== 'none' || r.payment_details) && (
        <div className="rx-card">
          <h2 className="rx-h2">Payment</h2>
          {d.payment && d.payment.total_cents > 0 && <p>Approved total: <b>{money(d.payment.total_cents)}</b>{d.payment.paid_cents > 0 ? <> · paid by card: <b>{money(d.payment.paid_cents)}</b></> : null} · still due: <b>{money(d.payment.due_cents)}</b></p>}
          {d.payment?.can_pay
            ? <div style={{ marginBottom: 10 }}>
                <button className="rx-btn green" disabled={busy} onClick={async () => { const j = await post('pay_card', {}, 'Opening the secure card payment...'); if (j?.redirectUrl) window.location.href = j.redirectUrl }}>Pay {money(d.payment.due_cents)} by card</button>
                <p className="rx-muted">Card payments are processed securely by Yoco. Lungiza pays the tradesperson after you sign off.</p>
              </div>
            : d.payment?.reason && d.payment.due_cents > 0 && <p className="rx-muted">{d.payment.reason}.</p>}
          {r.invoice_amount_cents ? <p>Invoice: <b>{money(r.invoice_amount_cents)}</b> ({r.invoice_status.replace('_', ' ')})</p> : null}
          {r.payment_details && <><p className="rx-muted">Or pay the tradesperson the way they set out here:</p><pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: '#F5F0E8', padding: 10, borderRadius: 8 }}>{r.payment_details}</pre></>}
          <div className="rx-row">
            <button className="rx-btn sec" disabled={busy} onClick={() => post('mark_paid', {}, 'Recorded that you paid')}>I paid another way</button>
            <button className="rx-btn sec" disabled={busy} onClick={() => post('dispute_amount', { note }, 'Amount dispute recorded')}>The amount is wrong</button>
          </div>
        </div>
      )}

      {d.photos.length > 0 && <div className="rx-card"><h2 className="rx-h2">Photos</h2>
        <div className="rx-photos">{d.photos.map((p: any) => p.url && <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.kind} /><div className="rx-muted">{p.pack_item || p.kind}</div></a>)}</div></div>}

      {d.certificates.length > 0 && <div className="rx-card"><h2 className="rx-h2">Certificates</h2>
        {d.certificates.map((c: any) => <div key={c.id} className="rx-item"><div><b>{CERT_LABELS[c.cert_type as keyof typeof CERT_LABELS]}</b> {c.number || ''}
          <div className="rx-muted">{c.issuer_name} {c.issuer_reg_no ? `(${c.issuer_reg_no})` : ''} · {c.rule.label}</div>
          {c.rule.reasons.map((x: string) => <div key={x} className="rx-muted">· {x}</div>)}{c.url && <a href={c.url} target="_blank" rel="noreferrer">Open</a>}</div>
          <Level level={c.rule.level} /></div>)}</div>}

      <div className="rx-card"><h2 className="rx-h2">History</h2>
        {d.approvals.length ? d.approvals.map((a: any) => <p key={a.id} className="rx-muted">{new Date(a.created_at).toLocaleString('en-ZA')}: {a.subject} {a.decision.replace(/_/g, ' ')}{a.approver_name ? ` by ${a.approver_name}` : ''}. {APPROVAL_LABEL[a.approval_type]}.{a.void_at ? ' (replaced by a newer quote)' : ''}</p>) : <p className="rx-muted">Nothing approved yet.</p>}</div>

      {isApprover && verified && (
        <div className="rx-card">
          <h2 className="rx-h2">Keep this in your home file</h2>
          <p className="rx-muted">Free. Every job and certificate for this address stays in one place. You need a free Lungiza account.</p>
          <button className="rx-btn sec" disabled={busy} onClick={async () => {
            const j = await post('claim', {}, 'Saved to your home file')
            if (!j && typeof window !== 'undefined') setErr('Sign in first, then open this link again and tap the button. Sign in: ' + window.location.origin + '/auth')
          }}>Save to my home file</button>
        </div>
      )}
      <p className="rx-muted">Shared through Lungiza. Every change is recorded. Lungiza does not hold payments.</p>
    </Bare>
  )
}
