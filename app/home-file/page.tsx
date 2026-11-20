'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/apiFetch'
import { CERT_LABELS } from '../lib/certificate-rules'
import { Level, Shell, StatusPill } from '../components/rec-ui'

// B34 (launch part): read-only home file. Manage My Home stays free.
export default function HomeFile() {
  const router = useRouter()
  const [d, setD] = useState<any>(null)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.push('/auth'); return }
      setD(await apiFetch('/api/home-file').then(r => r.json()))
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <Shell title="Home file"><p className="rx-muted">Loading...</p></Shell>
  return (
    <Shell title="Home file">
      <p className="rx-muted">Every repair and certificate for the homes you own, kept in one place. Free. To add a job, open the WhatsApp link a tradesperson sent you and tap &quot;Save to my home file&quot;.</p>
      {d.properties?.length === 0 && <div className="rx-card"><p className="rx-muted">Nothing here yet.</p></div>}
      {(d.properties || []).map((p: any) => (
        <div key={p.id} className="rx-card">
          <h2 className="rx-h2">{p.address_line}{p.unit ? `, ${p.unit}` : ''}{p.suburb ? `, ${p.suburb}` : ''}</h2>
          <h3 style={{ fontSize: 14 }}>Jobs</h3>
          {p.records.length === 0 ? <p className="rx-muted">None</p> : p.records.map((r: any) => (
            <div key={r.id} className="rx-item"><div><b>{r.title}</b><div className="rx-muted">{new Date(r.created_at).toLocaleDateString('en-ZA')} · {r.trade_name || 'Tradesperson'} · #{r.ref}</div></div><StatusPill status={r.status} /></div>
          ))}
          <h3 style={{ fontSize: 14 }}>Certificates</h3>
          {p.certificates.length === 0 ? <p className="rx-muted">None</p> : p.certificates.map((c: any) => (
            <div key={c.id} className="rx-item"><div><b>{CERT_LABELS[c.cert_type as keyof typeof CERT_LABELS]}</b> {c.number || ''} {c.issue_date ? `· ${c.issue_date}` : ''}
              <div className="rx-muted">{c.rule.label}</div>{c.rule.reasons.map((x: string) => <div key={x} className="rx-muted">· {x}</div>)}</div><Level level={c.rule.level} /></div>
          ))}
        </div>
      ))}
    </Shell>
  )
}
