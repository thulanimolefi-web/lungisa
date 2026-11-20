'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/apiFetch'
import { Field, Shell, StatusPill } from '../components/rec-ui'

// B17/B31-lite: the tradesperson's (and manager's) list of job records, plus "New job".
export default function RecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<any[]>([])
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ customer_name: '', customer_phone: '', customer_email: '', address_line: '', unit: '', suburb: '', title: '', scope: '', trade_pack: '', urgency: 'routine' })

  async function load() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.push('/auth'); return }
    const res = await apiFetch('/api/records')
    const j = await res.json()
    setRecords(j.records || []); setRole(j.role || null); setLoading(false)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function create() {
    setBusy(true); setError('')
    const res = await apiFetch('/api/records', { method: 'POST', body: JSON.stringify(f) })
    const j = await res.json()
    setBusy(false)
    if (!res.ok) { setError(j.error || 'Could not create'); return }
    router.push(`/records/${j.id}`)
  }
  const up = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })

  return (
    <Shell title="Job records">
      <p className="rx-muted">Every job keeps its quote versions, approvals, photos and certificates, and stays with the property. Share it with your customer by WhatsApp link. No account needed on their side.</p>
      {role === 'tradesperson' && !show && <button className="rx-btn" onClick={() => setShow(true)}>+ New job for my customer</button>}
      {role && role !== 'tradesperson' && <p className="rx-muted">Landlords and agencies log jobs from <Link href="/manage">Properties</Link>. Homeowners see their jobs in the <Link href="/home-file">Home file</Link>.</p>}

      {show && (
        <div className="rx-card" style={{ marginTop: 12 }}>
          <h2 className="rx-h2">New job</h2>
          <div className="rx-grid">
            <Field label="Customer name"><input value={f.customer_name} onChange={up('customer_name')} /></Field>
            <Field label="Customer phone (WhatsApp)"><input inputMode="tel" value={f.customer_phone} onChange={up('customer_phone')} /></Field>
            <Field label="Customer email (for the approval code)"><input inputMode="email" value={f.customer_email} onChange={up('customer_email')} /></Field>
            <Field label="Job title"><input placeholder="Burst geyser, Sandton" value={f.title} onChange={up('title')} /></Field>
            <Field label="Street address"><input value={f.address_line} onChange={up('address_line')} /></Field>
            <Field label="Unit (optional)"><input value={f.unit} onChange={up('unit')} /></Field>
            <Field label="Suburb"><input value={f.suburb} onChange={up('suburb')} /></Field>
            <Field label="Trade pack">
              <select value={f.trade_pack} onChange={up('trade_pack')}>
                <option value="">None</option><option value="geyser">Geyser and plumbing</option><option value="electrical">Electrical</option>
              </select>
            </Field>
          </div>
          <Field label="What needs doing"><textarea value={f.scope} onChange={up('scope')} /></Field>
          <Field label="Urgency">
            <select value={f.urgency} onChange={up('urgency')}><option value="routine">Routine</option><option value="urgent">Urgent</option></select>
          </Field>
          <p className="rx-muted">The customer details you type are marked as entered by you until the customer confirms them.</p>
          {error && <div className="rx-err">{error}</div>}
          <div className="rx-row"><button className="rx-btn" disabled={busy} onClick={create}>Create job</button><button className="rx-btn sec" onClick={() => setShow(false)}>Cancel</button></div>
        </div>
      )}

      <div className="rx-card rx-list" style={{ marginTop: 14 }}>
        {loading ? <p className="rx-muted">Loading...</p> : records.length === 0 ? <p className="rx-muted">No jobs yet.</p> :
          records.map(r => (
            <Link key={r.id} href={`/records/${r.id}`} className="rx-item">
              <div>
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div className="rx-muted">{r.properties?.address_line}{r.properties?.unit ? `, ${r.properties.unit}` : ''} · {r.customer_name || 'No customer name'} · #{r.ref}</div>
              </div>
              <div style={{ textAlign: 'right' }}><StatusPill status={r.status} />{r.source === 'marketplace' && <div className="rx-muted">Marketplace, 8%</div>}</div>
            </Link>
          ))}
      </div>
    </Shell>
  )
}
