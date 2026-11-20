'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/apiFetch'
import { Field, money, shareLink, Shell, StatusPill } from '../components/rec-ui'

// B35/B40/B41: thin view for private landlords (organisation of one) and agencies.
export default function ManagePage() {
  const router = useRouter()
  const [d, setD] = useState<any>(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)
  const [org, setOrg] = useState({ name: '', kind: 'landlord' })
  const [p, setP] = useState({ address_line: '', unit: '', suburb: '', owner_name: '', owner_phone: '', owner_email: '', approval_cap: '', emergency_cap: '0', backup_name: '', backup_phone: '', backup_email: '' })
  const [job, setJob] = useState<{ property_id: string; title: string; scope: string; urgency: string }>({ property_id: '', title: '', scope: '', urgency: 'routine' })

  async function load() {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.push('/auth'); return }
    const r = await apiFetch('/api/manage'); const j = await r.json()
    if (!r.ok) { setErr(j.error || 'Could not load'); return }
    setD(j)
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function post(body: Record<string, unknown>, okText = 'Saved') {
    setBusy(true); setErr(''); setOk('')
    const r = await apiFetch('/api/manage', { method: 'POST', body: JSON.stringify(body) })
    const j = await r.json().catch(() => ({}))
    setBusy(false)
    if (!r.ok) { setErr(j.error || 'Something went wrong'); return null }
    setOk(okText); await load(); return j
  }
  async function newJob() {
    setBusy(true); setErr('')
    const r = await apiFetch('/api/records', { method: 'POST', body: JSON.stringify(job) })
    const j = await r.json(); setBusy(false)
    if (!r.ok) { setErr(j.error || 'Could not create'); return }
    router.push(`/records/${j.id}`)
  }
  async function tenantLink(pid: string, address: string) {
    const j = await post({ action: 'tenant_link', property_id: pid }, 'Tenant link ready')
    if (j?.token) { const url = `${window.location.origin}/l/${j.token}`; await shareLink(url, `Report a repair at ${address} here:`); setOk(`Tenant link: ${url}`) }
  }

  if (!d) return <Shell title="Properties">{err ? <div className="rx-err">{err}</div> : <p className="rx-muted">Loading...</p>}</Shell>
  const orgId = d.orgs[0]?.id
  const up = (k: string) => (e: any) => setP({ ...p, [k]: e.target.value })

  return (
    <Shell title="Properties">
      {err && <div className="rx-err">{err}</div>}
      {ok && <div className="rx-ok" style={{ wordBreak: 'break-all' }}>{ok}</div>}
      {!orgId ? (
        <div className="rx-card">
          <h2 className="rx-h2">Start managing repairs</h2>
          <p className="rx-muted">For private landlords (1 to 5 units) and rental agencies. You set an approval cap and an emergency cap per property. Above the cap, the owner approves by link.</p>
          <Field label="Name (your name or the agency)"><input value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} /></Field>
          <Field label="I am a"><select value={org.kind} onChange={e => setOrg({ ...org, kind: e.target.value })}><option value="landlord">Private landlord</option><option value="agency">Rental agency or property manager</option></select></Field>
          <button className="rx-btn" disabled={busy} onClick={() => post({ action: 'create_org', ...org }, 'Created')}>Continue</button>
        </div>
      ) : (<>
        <p className="rx-muted">{d.orgs[0].name} · {d.orgs[0].kind === 'agency' ? 'Agency' : 'Private landlord'}</p>

        <div className="rx-card">
          <h2 className="rx-h2">Open and overdue</h2>
          <p className="rx-muted">Routine repairs: 14-day target. Urgent: 1 day. Sorted with overdue first.</p>
          {d.overdue.length === 0 ? <p className="rx-muted">Nothing open.</p> : d.overdue.map((r: any) => (
            <Link key={r.id} href={`/records/${r.id}`} className="rx-item" style={{ color: 'inherit', textDecoration: 'none' }}>
              <div><b>{r.title}</b><div className="rx-muted">{r.reason} · {r.days_open} days open{r.overdue ? ' · OVERDUE' : ''}</div></div><StatusPill status={r.status} /></Link>
          ))}
        </div>

        {d.reports.length > 0 && (
          <div className="rx-card"><h2 className="rx-h2">Tenant reports</h2>
            {d.reports.map((t: any) => (
              <div key={t.id} className="rx-item"><div><b>{t.urgency === 'urgent' ? 'URGENT: ' : ''}{t.description}</b><div className="rx-muted">{t.reporter_name || 'Tenant'} · {new Date(t.created_at).toLocaleString('en-ZA')}</div></div>
                <button className="rx-btn sec" disabled={busy} onClick={async () => { const j = await post({ action: 'convert_report', report_id: t.id }, 'Job created'); if (j?.id) router.push(`/records/${j.id}`) }}>Make a job</button></div>
            ))}</div>
        )}

        <div className="rx-card">
          <h2 className="rx-h2">Log a repair</h2>
          <div className="rx-grid">
            <Field label="Property"><select value={job.property_id} onChange={e => setJob({ ...job, property_id: e.target.value })}>
              <option value="">Choose</option>{d.properties.map((x: any) => <option key={x.id} value={x.id}>{x.address_line}{x.unit ? `, ${x.unit}` : ''}</option>)}</select></Field>
            <Field label="Title"><input value={job.title} onChange={e => setJob({ ...job, title: e.target.value })} /></Field>
          </div>
          <Field label="What needs doing"><textarea value={job.scope} onChange={e => setJob({ ...job, scope: e.target.value })} /></Field>
          <Field label="Urgency"><select value={job.urgency} onChange={e => setJob({ ...job, urgency: e.target.value })}><option value="routine">Routine</option><option value="urgent">Urgent</option></select></Field>
          <button className="rx-btn" disabled={busy || !job.property_id || !job.title} onClick={newJob}>Create job</button>
        </div>

        <div className="rx-card">
          <h2 className="rx-h2">Properties and mandates</h2>
          {d.properties.map((x: any) => (
            <div key={x.id} className="rx-item"><div><b>{x.address_line}{x.unit ? `, ${x.unit}` : ''}</b>
              <div className="rx-muted">{x.mandate ? `Owner ${x.mandate.owner_name} · approval cap ${money(x.mandate.approval_cap_cents)} · emergency cap ${money(x.mandate.emergency_cap_cents)}${x.mandate.backup_name ? ` · backup ${x.mandate.backup_name}` : ''}` : 'No mandate'}</div></div>
              <button className="rx-btn sec" disabled={busy} onClick={() => tenantLink(x.id, x.address_line)}>Tenant link</button></div>
          ))}
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Add a property</summary>
            <div className="rx-grid" style={{ marginTop: 10 }}>
              <Field label="Street address"><input value={p.address_line} onChange={up('address_line')} /></Field>
              <Field label="Unit"><input value={p.unit} onChange={up('unit')} /></Field>
              <Field label="Suburb"><input value={p.suburb} onChange={up('suburb')} /></Field>
              <Field label="Owner name"><input value={p.owner_name} onChange={up('owner_name')} /></Field>
              <Field label="Owner phone"><input inputMode="tel" value={p.owner_phone} onChange={up('owner_phone')} /></Field>
              <Field label="Owner email (for approval codes)"><input inputMode="email" value={p.owner_email} onChange={up('owner_email')} /></Field>
              <Field label="Approval cap (R): you may approve up to this"><input inputMode="decimal" value={p.approval_cap} onChange={up('approval_cap')} /></Field>
              <Field label="Emergency cap (R): make-safe work allowed without waiting"><input inputMode="decimal" value={p.emergency_cap} onChange={up('emergency_cap')} /></Field>
              <Field label="Backup contact name"><input value={p.backup_name} onChange={up('backup_name')} /></Field>
              <Field label="Backup contact phone"><input inputMode="tel" value={p.backup_phone} onChange={up('backup_phone')} /></Field>
              <Field label="Backup contact email"><input inputMode="email" value={p.backup_email} onChange={up('backup_email')} /></Field>
            </div>
            <p className="rx-muted">The emergency cap defaults to zero: without a cap, emergency work waits for someone with authority.</p>
            <button className="rx-btn" disabled={busy} onClick={async () => { if (await post({ action: 'add_property', org_id: orgId, ...p }, 'Property added')) setP({ ...p, address_line: '', unit: '', suburb: '' }) }}>Add property</button>
          </details>
        </div>
      </>)}
    </Shell>
  )
}
