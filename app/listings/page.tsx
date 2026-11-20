'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/apiFetch'
import { CERT_LABELS } from '../lib/certificate-rules'
import { Field, Level, shareLink, Shell, uploadSigned } from '../components/rec-ui'

// B37/B42: sales agent transfer checklist. Once-off handover pack payment is "add on usage" (no billing built).
export default function ListingsPage() {
  const router = useRouter()
  const [list, setList] = useState<any[]>([])
  const [sel, setSel] = useState<string>('')
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false)
  const [n, setN] = useState({ address_line: '', unit: '', suburb: '', seller_name: '', seller_phone: '', seller_email: '' })
  const [c, setC] = useState<{ item: string; number: string; issue_date: string; issuer_name: string; issuer_reg_no: string; file: File | null }>({ item: '', number: '', issue_date: '', issuer_name: '', issuer_reg_no: '', file: null })

  async function loadList() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.push('/auth'); return }
    const j = await apiFetch('/api/listings').then(r => r.json()); setList(j.listings || [])
  }
  async function loadOne(id: string) { setSel(id); const r = await apiFetch(`/api/listings?id=${id}`); setD(await r.json()) }
  useEffect(() => { loadList() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function post(body: Record<string, unknown>, okText = 'Saved') {
    setBusy(true); setErr(''); setOk('')
    const r = await apiFetch('/api/listings', { method: 'POST', body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({})); setBusy(false)
    if (!r.ok) { setErr(j.error || 'Something went wrong'); return null }
    setOk(okText); if (sel) await loadOne(sel); await loadList(); return j
  }
  async function attach() {
    let file_path: string | null = null
    if (c.file) {
      const u = await post({ action: 'upload_url', listing_id: sel, filename: c.file.name }, 'Uploading')
      if (!u) return
      try { await uploadSigned(u.path, u.token, c.file); file_path = u.path } catch (e) { setErr((e as Error).message); return }
    }
    const certType = c.item === 'solar_in_ecoc' ? 'ecoc' : c.item
    await post({ action: 'attach_certificate', listing_id: sel, item: c.item, cert_type: certType, number: c.number, issue_date: c.issue_date, issuer_name: c.issuer_name, issuer_reg_no: c.issuer_reg_no, file_path }, 'Certificate attached')
    setC({ item: '', number: '', issue_date: '', issuer_name: '', issuer_reg_no: '', file: null })
  }

  return (
    <Shell title="Sales listings">
      <p className="rx-muted">Track the transfer certificates for each listing, request a certificate job from tradespeople, and send the buyer one link with everything.</p>
      {err && <div className="rx-err">{err}</div>}
      {ok && <div className="rx-ok" style={{ wordBreak: 'break-all' }}>{ok}</div>}
      <div className="rx-card">
        {list.map(l => <div key={l.id} className="rx-item"><div><b>{l.properties?.address_line}{l.properties?.unit ? `, ${l.properties.unit}` : ''}</b><div className="rx-muted">{l.seller_name || 'Seller not named'} · {l.status}</div></div>
          <button className="rx-btn sec" onClick={() => loadOne(l.id)}>Open</button></div>)}
        <details style={{ marginTop: 10 }}><summary style={{ cursor: 'pointer', fontWeight: 700 }}>New listing</summary>
          <div className="rx-grid" style={{ marginTop: 10 }}>
            {(['address_line', 'unit', 'suburb', 'seller_name', 'seller_phone', 'seller_email'] as const).map(k => <Field key={k} label={k.replace('_', ' ')}><input value={n[k]} onChange={e => setN({ ...n, [k]: e.target.value })} /></Field>)}
          </div>
          <button className="rx-btn" disabled={busy} onClick={async () => { const j = await post({ action: 'create', ...n }, 'Listing created'); if (j?.id) loadOne(j.id) }}>Create</button></details>
      </div>

      {d?.listing && (
        <div className="rx-card">
          <h2 className="rx-h2">{d.property?.address_line}: transfer checklist</h2>
          {d.items.map((i: any) => (
            <div key={i.id} className="rx-item" style={{ flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}><b>{i.label}</b>
                {i.rule.reasons.map((x: string) => <div key={x} className="rx-muted">· {x}</div>)}
                {i.question && <div className="rx-row" style={{ marginTop: 6 }}><span className="rx-muted">{i.question}</span>
                  <button className="rx-btn sec" onClick={() => post({ action: 'answer', listing_id: sel, item: i.item, applies: true })}>Yes</button>
                  <button className="rx-btn sec" onClick={() => post({ action: 'answer', listing_id: sel, item: i.item, applies: false })}>No</button></div>}
                <div className="rx-row" style={{ marginTop: 6 }}>
                  <button className="rx-btn sec" onClick={() => setC({ ...c, item: i.item })}>Attach certificate</button>
                  {i.item !== 'solar_in_ecoc' && <button className="rx-btn sec" disabled={busy} onClick={() => post({ action: 'request_job', listing_id: sel, item: i.item }, 'Job posted on the marketplace. Tradespeople can now bid.')}>Request a certificate job</button>}
                </div></div>
              <Level level={i.rule.level}>{i.rule.label}</Level>
            </div>
          ))}
          {c.item && (
            <div style={{ marginTop: 12 }}>
              <h2 className="rx-h2">Attach: {CERT_LABELS[(c.item === 'solar_in_ecoc' ? 'ecoc' : c.item) as keyof typeof CERT_LABELS]}</h2>
              <div className="rx-grid">
                <Field label="Number"><input value={c.number} onChange={e => setC({ ...c, number: e.target.value })} /></Field>
                <Field label="Issue date"><input type="date" value={c.issue_date} onChange={e => setC({ ...c, issue_date: e.target.value })} /></Field>
                <Field label="Issued by"><input value={c.issuer_name} onChange={e => setC({ ...c, issuer_name: e.target.value })} /></Field>
                <Field label="Issuer registration number"><input value={c.issuer_reg_no} onChange={e => setC({ ...c, issuer_reg_no: e.target.value })} /></Field>
                <Field label="Photo or PDF"><input type="file" accept="image/*,application/pdf" onChange={e => setC({ ...c, file: e.target.files?.[0] || null })} /></Field>
              </div>
              <button className="rx-btn" disabled={busy} onClick={attach}>Save</button>
            </div>
          )}
          <div className="rx-row" style={{ marginTop: 14 }}>
            <button className="rx-btn green" disabled={busy} onClick={async () => { const j = await post({ action: 'handover_link', listing_id: sel }, 'Handover link ready'); if (j?.token) { const url = `${window.location.origin}/l/${j.token}`; await shareLink(url, `Certificates for ${d.property?.address_line}:`); setOk(`Handover link: ${url}`) } }}>Send handover link to buyer</button>
          </div>
          <p className="rx-muted">Seller approval of remedial quotes happens on the job record: the tradesperson who wins the job sends the approval link to the seller.</p>
        </div>
      )}
    </Shell>
  )
}
