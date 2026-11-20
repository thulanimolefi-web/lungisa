'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiFetch } from '../../../lib/apiFetch'
import { CERT_LABELS } from '../../../lib/certificate-rules'
import { APPROVAL_LABEL, Bare, money, QuoteLines } from '../../../components/rec-ui'

// B29 (lean): printable job record. "Save as PDF" from the browser print dialog gives the PDF
// an agent attaches to a PayProp or WeconnectU ticket. A server-generated PDF is "add on usage".
export default function PrintRecord() {
  const { id } = useParams() as { id: string }
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    apiFetch(`/api/records/${id}`).then(async r => { const j = await r.json(); if (r.ok) setD(j); else setErr(j.error || 'Not found') })
  }, [id])
  if (err) return <Bare><div className="rx-err">{err}</div></Bare>
  if (!d) return <Bare><p className="rx-muted">Loading...</p></Bare>
  const r = d.record
  return (
    <Bare>
      <div className="rx-noprint" style={{ marginBottom: 12 }}><button className="rx-btn" onClick={() => window.print()}>Print or save as PDF</button></div>
      <h1 className="rx-h1">Job record #{r.ref}: {r.title}</h1>
      <p className="rx-muted">{d.property?.address_line}{d.property?.unit ? `, ${d.property.unit}` : ''}{d.property?.suburb ? `, ${d.property.suburb}` : ''} · Created {new Date(r.created_at).toLocaleDateString('en-ZA')} · Status {r.status.replace(/_/g, ' ')}</p>
      {d.tradeName && <p className="rx-muted">Tradesperson: {d.tradeName}</p>}
      {r.scope && <div className="rx-card"><h2 className="rx-h2">Scope</h2><p>{r.scope}</p></div>}
      <div className="rx-card"><h2 className="rx-h2">Quote versions</h2>
        {d.quotes.map((q: any) => <div key={q.id}><p><b>Version {q.version}{q.superseded_at ? ' (replaced)' : ''}: total {money(q.call_out_cents + q.labour_cents + q.materials_cents)}</b></p><QuoteLines quote={q} /></div>)}</div>
      <div className="rx-card"><h2 className="rx-h2">Extras</h2>
        {d.variations.length ? d.variations.map((v: any) => <p key={v.id}>{v.description}: {money(v.amount_cents)} ({v.status === 'requested' ? 'not approved' : v.status.replace(/_/g, ' ')})</p>) : <p className="rx-muted">None</p>}</div>
      <div className="rx-card"><h2 className="rx-h2">Approvals</h2>
        {d.approvals.map((a: any) => <p key={a.id}>{new Date(a.created_at).toLocaleString('en-ZA')}: {a.subject}{a.quote_version ? ` v${a.quote_version}` : ''} {a.decision.replace(/_/g, ' ')} by {a.approver_name || 'unknown'}. {APPROVAL_LABEL[a.approval_type]}.{a.void_at ? ' No longer counts.' : ''}</p>)}</div>
      <div className="rx-card"><h2 className="rx-h2">Certificates</h2>
        {d.certificates.length ? d.certificates.map((c: any) => <p key={c.id}>{CERT_LABELS[c.cert_type as keyof typeof CERT_LABELS]} {c.number || ''} {c.issue_date || ''}, {c.issuer_name || ''} {c.issuer_reg_no || ''}. {c.rule.label}. {c.rule.reasons.join('; ')}</p>) : <p className="rx-muted">None</p>}</div>
      <div className="rx-card"><h2 className="rx-h2">Photos</h2>
        <div className="rx-photos">{d.photos.map((p: any) => p.url && <div key={p.id}><img src={p.url} alt={p.kind} /><div className="rx-muted">{p.pack_item || p.kind} · {new Date(p.created_at).toLocaleDateString('en-ZA')}</div></div>)}</div></div>
      <div className="rx-card"><h2 className="rx-h2">Invoice</h2><p>{r.invoice_status.replace('_', ' ')} {r.invoice_amount_cents ? money(r.invoice_amount_cents) : ''}{r.amount_disputed ? ' · amount disputed by customer' : ''}</p>
        <p className="rx-muted">Card payments are processed by Yoco for Lungiza and paid out to the tradesperson. Other payments are made directly to the tradesperson.</p></div>
      <p className="rx-muted">Generated from the Lungiza job record. Every change is kept in an append-only audit log.</p>
    </Bare>
  )
}
