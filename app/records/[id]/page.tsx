'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiFetch } from '../../lib/apiFetch'
import { PACKS, packCompleteness, PackId } from '../../lib/packs'
import { CERT_LABELS } from '../../lib/certificate-rules'
import { APPROVAL_LABEL, Field, Level, money, openWhatsApp, QuoteLines, shareLink, Shell, StatusPill, uploadSigned } from '../../components/rec-ui'
import BankingCard from '../../components/BankingCard'
import { KIND_LABEL, LineKind, lineKey } from '../../lib/quote-templates'

type QLine = { text: string; kind: LineKind; amount: string }
const randStr = (c: number) => (c ? String(Math.round(c) / 100) : '')
const toCents = (v: string) => Math.max(0, Math.round(Number(v || 0) * 100)) || 0

// B18 to B28, B42: the job card. One screen for the tradesperson and the managing landlord or agency.
export default function RecordPage() {
  const { id } = useParams() as { id: string }
  const [d, setD] = useState<any>(null)
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({})
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState({ notes: '' })
  const [lines, setLines] = useState<QLine[]>([{ text: 'Call-out fee', kind: 'call_out', amount: '' }, { text: '', kind: 'labour', amount: '' }, { text: '', kind: 'materials', amount: '' }])
  const [tpl, setTpl] = useState<{ builtIn: any[]; mine: any[]; lastPrices: Record<string, number> } | null>(null)
  const [tplName, setTplName] = useState('')
  const [v, setV] = useState({ description: '', amount: '', is_emergency: false, emergency_reason: '' })
  const [cert, setCert] = useState({ cert_type: 'ecoc', number: '', issue_date: '', issuer_name: '', issuer_reg_no: '' })
  const [certFile, setCertFile] = useState<File | null>(null)
  const [photoKind, setPhotoKind] = useState('before')
  const [packItem, setPackItem] = useState('')
  const [inv, setInv] = useState({ invoice_status: 'sent', amount: '', payment_details: '' })
  const [note, setNote] = useState('')
  const [rec, setRec] = useState({ approver_name: '', note: '' })
  const [tradeEmail, setTradeEmail] = useState('')
  const [pack, setPack] = useState<Record<string, string>>({})

  async function load() {
    const res = await apiFetch(`/api/records/${id}`)
    const j = await res.json()
    if (!res.ok) { setMsg({ err: j.error || 'Not found' }); return }
    setD(j); setPack(j.record.pack_fields || {})
    if (j.record.payment_details) setInv(s => ({ ...s, payment_details: j.record.payment_details }))
  }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function act(action: string, body: Record<string, unknown> = {}, okText = 'Saved') {
    setBusy(true); setMsg({})
    const res = await apiFetch(`/api/records/${id}`, { method: 'POST', body: JSON.stringify({ action, ...body }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMsg({ err: j.error || 'Something went wrong' }); return null }
    setMsg({ ok: j.note || okText }); await load(); return j
  }

  // One tap: create the customer's link and open WhatsApp in their chat with the message written.
  async function share(kind: 'quote' | 'signoff' | 'extra' | 'viewer', extra?: any) {
    const r = d.record
    const scope = kind === 'viewer' ? 'viewer' : 'approver'
    const j = await act('link', { scope, recipient_name: r.customer_name, recipient_phone: r.customer_phone, recipient_email: r.customer_email }, 'Link ready')
    if (!j) return
    const url = `${window.location.origin}/l/${j.token}`
    const first = String(r.customer_name || '').trim().split(' ')[0]
    const hi = first ? `Hi ${first}` : 'Hi'
    const from = d.tradeName ? ` from ${d.tradeName}` : ''
    const text = kind === 'quote'
      ? `${hi}, here is your quote${from} for ${r.title}: ${money(quoteTotal)}.\nCheck the details and approve it here: ${url}\nYou will get a code by email to confirm it is you.`
      : kind === 'signoff'
      ? `${hi}, the work on ${r.title} is done. Please check it and sign off here: ${url}\nYou can also pay ${money(quoteTotal + approvedExtras)} by card on the same page.`
      : kind === 'extra'
      ? `${hi}, I found extra work on ${r.title}: ${extra?.description} for ${money(extra?.amount_cents)}. I will only do it once you approve. Please approve or decline here: ${url}`
      : `Job record for ${r.title} (view only): ${url}`
    if (kind === 'viewer') await shareLink(url, `Job record for ${r.title} (view only):`)
    else openWhatsApp(r.customer_phone, text)
    setMsg({ ok: r.customer_phone ? 'WhatsApp opened with the message written. Tap send.' : `No customer phone on the job, so pick the chat in WhatsApp. Link: ${url}` })
  }

  // Quote templates: load once, fill lines with the tradesperson's last-used prices.
  async function loadTemplates() {
    if (tpl) return
    const r = await apiFetch(`/api/records/templates?pack=${encodeURIComponent(d?.record?.trade_pack || '')}`)
    const j = await r.json().catch(() => null)
    if (r.ok && j) setTpl(j)
  }
  function applyTemplate(key: string) {
    if (!tpl || !key) return
    const [src, id] = key.split(':')
    const t = (src === 'mine' ? tpl.mine : tpl.builtIn).find((x: any) => x.id === id)
    if (!t) return
    setLines(t.lines.map((l: any) => {
      const last = tpl.lastPrices[lineKey(l.text)]
      const own = l.amount_cents
      return { text: l.text, kind: l.kind, amount: randStr(src === 'mine' && own ? own : last || 0) }
    }))
    if (t.notes) setQ({ notes: t.notes })
  }
  async function saveTemplate() {
    setBusy(true); setMsg({})
    const res = await apiFetch('/api/records/templates', { method: 'POST', body: JSON.stringify({ name: tplName, trade_pack: d.record.trade_pack, lines, notes: q.notes }) })
    const j = await res.json().catch(() => ({})); setBusy(false)
    if (!res.ok) { setMsg({ err: j.error || 'Could not save the template' }); return }
    setMsg({ ok: 'Template saved. It will be in your list next time.' }); setTplName(''); setTpl(null)
  }
  const linesTotal = lines.reduce((t, l) => t + toCents(l.amount), 0)

  async function ownerLink(to: 'owner' | 'backup') {
    setBusy(true); setMsg({})
    const res = await apiFetch('/api/manage', { method: 'POST', body: JSON.stringify({ action: 'owner_link', record_id: id, to }) })
    const j = await res.json().catch(() => ({})); setBusy(false)
    if (!res.ok) { setMsg({ err: j.error || 'Could not create link' }); return }
    const url = `${window.location.origin}/l/${j.token}`
    await shareLink(url, `Hi ${j.recipient?.name || ''}, a repair at ${d.property?.address_line} needs your approval:`)
    setMsg({ ok: `Link: ${url}` }); await load()
  }

  async function upload(file: File, kind: string, item?: string) {
    setBusy(true); setMsg({})
    try {
      const u = await apiFetch(`/api/records/${id}`, { method: 'POST', body: JSON.stringify({ action: 'upload_url', filename: file.name }) }).then(r => r.json())
      if (!u.path) throw new Error(u.error || 'Upload not allowed')
      await uploadSigned(u.path, u.token, file)
      if (kind === 'certificate') return u.path as string
      await act('photo', { path: u.path, kind, pack_item: item || null }, 'Photo added')
    } catch (e) { setMsg({ err: (e as Error).message }) } finally { setBusy(false) }
    return null
  }

  async function saveCert() {
    let file_path: string | null = null
    if (certFile) file_path = await upload(certFile, 'certificate')
    await act('certificate', { ...cert, file_path }, 'Certificate saved')
    setCertFile(null)
  }

  if (!d) return <Shell>{msg.err ? <div className="rx-err">{msg.err}</div> : <p className="rx-muted">Loading...</p>}</Shell>
  const r = d.record
  const isTrade = d.access === 'trade'
  const isManager = d.access === 'manager' || (d.access === 'creator' && r.source === 'agent')
  const quote = d.quotes.filter((x: any) => !x.superseded_at).slice(-1)[0] || null
  const quoteTotal = quote ? quote.call_out_cents + quote.labour_cents + quote.materials_cents : 0
  const liveQuoteApproval = quote && d.approvals.find((a: any) => a.subject === 'quote' && a.quote_version === quote.version && a.decision === 'approved' && !a.void_at)
  const approvedExtras = d.variations.filter((x: any) => x.status === 'approved' || x.status === 'emergency_within_cap').reduce((s: number, x: any) => s + x.amount_cents, 0)
  const pid = r.trade_pack as PackId | null
  const packStatus = pid ? packCompleteness(pid, pack, d.photos.filter((p: any) => p.kind === 'pack').map((p: any) => p.pack_item)) : null
  const hoursSinceDone = r.work_done_at ? (Date.now() - new Date(r.work_done_at).getTime()) / 3600000 : 0
  const closed = ['completed', 'closed_without_signoff', 'cancelled'].includes(r.status)

  return (
    <Shell>
      <div className="rx-row" style={{ justifyContent: 'space-between' }}>
        <h1 className="rx-h1">{r.title}</h1><StatusPill status={r.status} />
      </div>
      <p className="rx-muted">#{r.ref} · {d.property?.address_line}{d.property?.unit ? `, ${d.property.unit}` : ''}{d.property?.suburb ? `, ${d.property.suburb}` : ''} · {r.source === 'marketplace' ? 'Marketplace job (8% of call-out and labour when completed and paid)' : r.source === 'agent' ? 'Managed property' : 'Own customer (no commission)'}</p>
      {r.customer_name && <p className="rx-muted">Customer: {r.customer_name} {r.customer_phone ? `· ${r.customer_phone}` : ''} <em>(entered by the creator)</em></p>}
      {d.tradeName && <p className="rx-muted">Tradesperson: {d.tradeName}</p>}
      {d.mandate && <p className="rx-muted">Mandate: approval cap {money(d.mandate.approval_cap_cents)}, emergency cap {money(d.mandate.emergency_cap_cents)}</p>}
      {msg.err && <div className="rx-err">{msg.err}</div>}
      {msg.ok && <div className="rx-ok" style={{ wordBreak: 'break-all' }}>{msg.ok}</div>}

      {isManager && !r.tradesperson_id && !closed && (
        <div className="rx-card">
          <h2 className="rx-h2">Assign a tradesperson</h2>
          <p className="rx-muted">The tradesperson needs a Lungiza account. If you do not have one, post the job on the marketplace.</p>
          <div className="rx-row"><input placeholder="Tradesperson email" value={tradeEmail} onChange={e => setTradeEmail(e.target.value)} style={{ flex: 1 }} />
            <button className="rx-btn" disabled={busy} onClick={() => act('assign_trade', { trade_email: tradeEmail }, 'Assigned')}>Assign</button></div>
        </div>
      )}

      {/* Share */}
      {(isTrade || isManager) && !closed && (
        <div className="rx-card rx-noprint">
          <h2 className="rx-h2">Share by WhatsApp</h2>
          <div className="rx-row">
            {isManager && d.mandate
              ? <>
                  <button className="rx-btn green" disabled={busy || !quote} onClick={() => ownerLink('owner')}>Send to owner to approve</button>
                  <button className="rx-btn sec" disabled={busy || !quote} onClick={() => ownerLink('backup')}>Send to backup contact</button>
                </>
              : <button className="rx-btn green" disabled={busy || !quote} onClick={() => share('quote')}>Send to customer on WhatsApp</button>}
            <button className="rx-btn sec" disabled={busy} onClick={() => share('viewer')}>View-only link</button>
            <Link className="rx-btn sec" href={`/records/${id}/print`} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Print or save PDF</Link>
          </div>
          {!quote && <p className="rx-muted">Send a quote first, then share the approval link.</p>}
          {d.links.filter((l: any) => !l.revoked_at).map((l: any) => (
            <div key={l.id} className="rx-item"><span className="rx-muted">{l.scope} link to {l.recipient_name || 'someone'} · expires {String(l.expires_at).slice(0, 10)}</span>
              <button className="rx-btn sec" onClick={() => act('revoke_link', { link_id: l.id }, 'Link revoked')}>Revoke</button></div>
          ))}
        </div>
      )}

      {/* Quote */}
      <div className="rx-card">
        <h2 className="rx-h2">Quote {quote ? `(version ${quote.version})` : ''}</h2>
        {quote ? (
          <>
            <QuoteLines quote={quote} />
            <div className="rx-total">{money(quoteTotal)}</div>
            {quote.notes && <p className="rx-muted">{quote.notes}</p>}
            <p>{liveQuoteApproval ? <Level level="green">Approved: {APPROVAL_LABEL[liveQuoteApproval.approval_type]}</Level> : <Level level="amber">Not approved yet. Silence is not approval.</Level>}</p>
          </>
        ) : <p className="rx-muted">No quote yet.</p>}
        {isTrade && !closed && (
          <details onToggle={e => { if ((e.target as HTMLDetailsElement).open) loadTemplates() }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700, margin: '8px 0' }}>{quote ? 'Send a new version' : 'Write the quote'}</summary>
            <Field label="Start from a template">
              <select defaultValue="" onChange={e => applyTemplate(e.target.value)}>
                <option value="">{tpl ? 'Choose a template' : 'Loading templates...'}</option>
                {tpl && tpl.mine.length > 0 && <optgroup label="My templates">{tpl.mine.map((t: any) => <option key={t.id} value={`mine:${t.id}`}>{t.name}</option>)}</optgroup>}
                {tpl && <optgroup label="Standard templates">{tpl.builtIn.map((t: any) => <option key={t.id} value={`std:${t.id}`}>{t.name}</option>)}</optgroup>}
              </select>
            </Field>
            <p className="rx-muted">Prices fill in from your last quote with the same line. Change anything before you send.</p>
            {lines.map((l, i) => (
              <div key={i} className="rx-row" style={{ alignItems: 'flex-end', marginBottom: 8 }}>
                <div style={{ flex: '3 1 200px' }}><Field label={i === 0 ? 'Line' : ''}><input value={l.text} placeholder="What it is" onChange={e => setLines(lines.map((x, k) => k === i ? { ...x, text: e.target.value } : x))} /></Field></div>
                <div style={{ flex: '1 1 120px' }}><Field label={i === 0 ? 'Type' : ''}><select value={l.kind} onChange={e => setLines(lines.map((x, k) => k === i ? { ...x, kind: e.target.value as LineKind } : x))}>
                  {(Object.keys(KIND_LABEL) as LineKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field></div>
                <div style={{ flex: '1 1 100px' }}><Field label={i === 0 ? 'Amount (R)' : ''}><input inputMode="decimal" value={l.amount} onChange={e => setLines(lines.map((x, k) => k === i ? { ...x, amount: e.target.value.replace(/[^0-9.]/g, '') } : x))} /></Field></div>
                <button className="rx-btn sec" aria-label="Remove line" onClick={() => setLines(lines.filter((_, k) => k !== i))} disabled={lines.length <= 1}>✕</button>
              </div>
            ))}
            <div className="rx-row" style={{ justifyContent: 'space-between' }}>
              <button className="rx-btn sec" onClick={() => setLines([...lines, { text: '', kind: 'materials', amount: '' }])}>+ Add line</button>
              <div className="rx-total">{money(linesTotal)}</div>
            </div>
            <Field label="Notes for the customer"><textarea value={q.notes} onChange={e => setQ({ notes: e.target.value })} /></Field>
            {quote && <p className="rx-muted">A new version replaces version {quote.version}. Any approval of the old version stops counting.</p>}
            <div className="rx-row">
              <button className="rx-btn" disabled={busy || linesTotal <= 0} onClick={() => act('quote', { lines, notes: q.notes }, 'Quote saved. Now send it to the customer.')}>Save quote</button>
            </div>
            <div className="rx-row" style={{ marginTop: 10 }}>
              <input value={tplName} placeholder="Name, e.g. My geyser 150L job" onChange={e => setTplName(e.target.value)} style={{ flex: '1 1 220px', width: 'auto' }} />
              <button className="rx-btn sec" disabled={busy || !tplName.trim() || linesTotal <= 0} onClick={saveTemplate}>Save as my template</button>
            </div>
          </details>
        )}
        {(isTrade || isManager) && quote && !liveQuoteApproval && !closed && !(isManager && d.mandate) && (
          <div className="rx-row rx-noprint" style={{ marginTop: 10 }}>
            <button className="rx-btn green" disabled={busy} onClick={() => share('quote')}>Send quote on WhatsApp</button>
          </div>
        )}
      </div>

      {/* Approvals and creator-recorded approval */}
      <div className="rx-card">
        <h2 className="rx-h2">Approvals on record</h2>
        {d.approvals.length === 0 ? <p className="rx-muted">None yet.</p> : d.approvals.map((a: any) => (
          <div key={a.id} className="rx-item">
            <div><b>{a.subject}{a.quote_version ? ` v${a.quote_version}` : ''}: {a.decision.replace(/_/g, ' ')}</b>
              <div className="rx-muted">{APPROVAL_LABEL[a.approval_type]}{a.approver_name ? ` · ${a.approver_name}` : ''}{a.note ? ` · "${a.note}"` : ''}</div>
              {a.void_at && <div className="rx-muted">No longer counts: the quote changed.</div>}</div>
            <div className="rx-muted">{new Date(a.created_at).toLocaleString('en-ZA')}</div>
          </div>
        ))}
        {(isTrade || isManager) && quote && !liveQuoteApproval && !closed && (
          <details>
            <summary style={{ cursor: 'pointer', margin: '8px 0' }}>Customer approved by phone or in person?</summary>
            <p className="rx-muted">This is recorded as <b>creator-recorded</b>: it shows on the record as not confirmed by the customer. The customer link is stronger.</p>
            <Field label="Who approved"><input value={rec.approver_name} onChange={e => setRec({ ...rec, approver_name: e.target.value })} /></Field>
            <Field label="How and when"><input value={rec.note} onChange={e => setRec({ ...rec, note: e.target.value })} placeholder="Phone call 14:10 today" /></Field>
            <div className="rx-row">
              <button className="rx-btn sec" disabled={busy} onClick={() => act('record_approval', { subject: 'quote', decision: 'approved', ...rec }, 'Recorded')}>Record approval</button>
              {isManager && d.mandate && <button className="rx-btn" disabled={busy} onClick={() => act('record_approval', { subject: 'quote', decision: 'approved', under_mandate: true, ...rec }, 'Approved under mandate')}>Approve under mandate</button>}
            </div>
          </details>
        )}
      </div>

      {/* Work */}
      {isTrade && !closed && (
        <div className="rx-card">
          <h2 className="rx-h2">Work</h2>
          <div className="rx-row">
            {['approved', 'awaiting_approval', 'quoted', 'draft'].includes(r.status) && <button className="rx-btn" disabled={busy || !liveQuoteApproval} onClick={() => act('start', {}, 'Work started')}>Start work</button>}
            {r.status === 'in_progress' && <button className="rx-btn green" disabled={busy} onClick={() => act('work_done', {}, 'Marked done. Send the link so the customer can sign off.')}>Work done, ask for sign-off</button>}
            {r.status === 'awaiting_signoff' && <button className="rx-btn green" disabled={busy} onClick={() => share('signoff')}>Ask for sign-off on WhatsApp</button>}
            {r.status === 'awaiting_signoff' && <span className="rx-muted">Waiting for the customer to sign off. Nothing is approved by silence.</span>}
            {r.status === 'awaiting_signoff' && hoursSinceDone >= 72 && <button className="rx-btn sec" disabled={busy} onClick={() => act('close_without_signoff', {}, 'Closed without sign-off')}>Close without sign-off</button>}
          </div>
          {!liveQuoteApproval && ['approved', 'awaiting_approval', 'quoted', 'draft'].includes(r.status) && <p className="rx-muted">You can start once the current quote is approved.</p>}
        </div>
      )}

      {/* Extras */}
      <div className="rx-card">
        <h2 className="rx-h2">Extras</h2>
        {d.variations.length === 0 && <p className="rx-muted">No extras.</p>}
        {d.variations.map((x: any) => (
          <div key={x.id} className="rx-item"><div><b>{x.description}</b> {money(x.amount_cents)}{x.is_emergency && <div className="rx-muted">Emergency: {x.emergency_reason}</div>}</div>
            <Level level={x.status === 'approved' || x.status === 'emergency_within_cap' ? 'green' : x.status === 'declined' ? 'red' : 'amber'}>
              {x.status === 'requested' ? 'Not approved' : x.status === 'emergency_within_cap' ? 'Emergency within cap' : x.status}</Level>
            {isTrade && x.status === 'requested' && !closed && <button className="rx-btn sec rx-noprint" disabled={busy} onClick={() => share('extra', x)}>Send on WhatsApp</button>}</div>
        ))}
        {isTrade && !closed && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, margin: '8px 0' }}>Add an extra</summary>
            <p className="rx-muted">Extras need the customer&apos;s approval before you do the extra work. Emergency work is allowed only up to the cap the owner set.</p>
            <Field label="What and why"><input value={v.description} onChange={e => setV({ ...v, description: e.target.value })} /></Field>
            <Field label="Amount (R)"><input inputMode="decimal" value={v.amount} onChange={e => setV({ ...v, amount: e.target.value })} /></Field>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}><input type="checkbox" style={{ width: 22, minHeight: 22 }} checked={v.is_emergency} onChange={e => setV({ ...v, is_emergency: e.target.checked })} /> Emergency (making safe)</label>
            {v.is_emergency && <Field label="Emergency reason"><input value={v.emergency_reason} onChange={e => setV({ ...v, emergency_reason: e.target.value })} /></Field>}
            <button className="rx-btn" disabled={busy} onClick={async () => { if (await act('variation', v, 'Extra saved. Share the link so the customer can approve.')) setV({ description: '', amount: '', is_emergency: false, emergency_reason: '' }) }}>Save extra</button>
          </details>
        )}
      </div>

      {/* Photos and pack */}
      <div className="rx-card">
        <h2 className="rx-h2">Photos</h2>
        <div className="rx-photos">{d.photos.map((p: any) => p.url && <a key={p.id} href={p.url} target="_blank" rel="noreferrer"><img src={p.url} alt={p.kind} /><div className="rx-muted">{p.pack_item || p.kind}</div></a>)}</div>
        {(isTrade || isManager) && !closed && (
          <div className="rx-row rx-noprint" style={{ marginTop: 10 }}>
            <select value={photoKind} onChange={e => setPhotoKind(e.target.value)} style={{ width: 'auto' }}>
              <option value="before">Before</option><option value="after">After</option><option value="variation">Extra</option><option value="problem">Problem</option>{pid && <option value="pack">Pack item</option>}
            </select>
            {photoKind === 'pack' && pid && <select value={packItem} onChange={e => setPackItem(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Choose item</option>{PACKS[pid].items.filter(i => i.kind === 'photo').map(i => <option key={i.id} value={i.id}>{i.label}</option>)}</select>}
            <input type="file" accept="image/*" capture="environment" disabled={busy || (photoKind === 'pack' && !packItem)} onChange={e => e.target.files?.[0] && upload(e.target.files[0], photoKind, packItem)} style={{ width: 'auto' }} />
          </div>
        )}
        {pid && packStatus && (
          <div style={{ marginTop: 12 }}>
            <h2 className="rx-h2">{PACKS[pid].name} pack: {packStatus.done} of {packStatus.total} done</h2>
            {PACKS[pid].certNote && <p className="rx-muted">{PACKS[pid].certNote} Add it under Certificates below.</p>}
            {PACKS[pid].items.filter(i => i.kind === 'field').map(i => (
              <Field key={i.id} label={i.label + (i.required ? '' : ' (optional)')}>
                <input value={pack[i.id] || ''} disabled={!isTrade} onChange={e => setPack({ ...pack, [i.id]: e.target.value })} />
              </Field>
            ))}
            {packStatus.missing.length > 0 && <p className="rx-muted">Missing: {packStatus.missing.map(m => m.label).join(', ')}</p>}
            {isTrade && <button className="rx-btn sec" disabled={busy} onClick={() => act('pack_fields', { fields: pack }, 'Pack saved')}>Save pack details</button>}
          </div>
        )}
      </div>

      {/* Certificates */}
      <div className="rx-card">
        <h2 className="rx-h2">Certificates</h2>
        <p className="rx-muted">Lungiza stores and checks certificates. It does not issue them. A certificate shows as self-declared until Lungiza checks the issuer registration.</p>
        {d.certificates.map((c: any) => (
          <div key={c.id} className="rx-item"><div><b>{CERT_LABELS[c.cert_type as keyof typeof CERT_LABELS]}</b> {c.number ? `#${c.number}` : ''} {c.issue_date ? `· ${c.issue_date}` : ''}
            <div className="rx-muted">{c.issuer_name} {c.issuer_reg_no ? `(${c.issuer_reg_no})` : ''} · {c.rule.label}</div>
            {c.rule.reasons.map((x: string) => <div key={x} className="rx-muted">· {x}</div>)}
            {c.url && <a href={c.url} target="_blank" rel="noreferrer">Open file</a>}</div><Level level={c.rule.level} /></div>
        ))}
        {(isTrade || isManager) && !closed && (
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 700, margin: '8px 0' }}>Add a certificate</summary>
            <div className="rx-grid">
              <Field label="Type"><select value={cert.cert_type} onChange={e => setCert({ ...cert, cert_type: e.target.value })}>
                {Object.entries(CERT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
              <Field label="Certificate number"><input value={cert.number} onChange={e => setCert({ ...cert, number: e.target.value })} /></Field>
              <Field label="Issue date"><input type="date" value={cert.issue_date} onChange={e => setCert({ ...cert, issue_date: e.target.value })} /></Field>
              <Field label="Issued by"><input value={cert.issuer_name} onChange={e => setCert({ ...cert, issuer_name: e.target.value })} /></Field>
              <Field label="Issuer registration number (DEL, PIRB, SAQCC Gas)"><input value={cert.issuer_reg_no} onChange={e => setCert({ ...cert, issuer_reg_no: e.target.value })} /></Field>
              <Field label="Photo or PDF"><input type="file" accept="image/*,application/pdf" onChange={e => setCertFile(e.target.files?.[0] || null)} /></Field>
            </div>
            <button className="rx-btn" disabled={busy} onClick={saveCert}>Save certificate</button>
          </details>
        )}
      </div>

      {isTrade && <BankingCard compact />}

      {/* Invoice status */}
      <div className="rx-card">
        <h2 className="rx-h2">Invoice</h2>
        <p className="rx-muted">Once you mark the work done, the customer can pay by card on their link (Yoco). {r.source === 'marketplace' ? 'The 8% marketplace fee covers card costs.' : 'Lungiza keeps a 3.5% card payment fee'} and pays you the rest by EFT after the customer signs off. The customer pays the approved price only, nothing extra. You can also record a payment made to you directly. Approved total: {money(quoteTotal + approvedExtras)} (quote plus approved extras).</p>
        {(d.payments || []).filter((p: any) => p.status === 'paid' || p.status === 'review').map((p: any) => <p key={p.id}>Card payment: <b>{money(p.amount_cents)}</b>{p.commission_cents ? ` (Lungiza fee ${money(p.commission_cents)})` : ''} · {p.status === 'review' ? 'being checked' : p.payout_status === 'paid' ? 'paid out to you' : p.payout_status === 'pending' ? 'payout due' : 'payout after sign-off'}</p>)}
        <p>Status: <b>{r.invoice_status.replace('_', ' ')}</b>{r.invoice_amount_cents ? ` · ${money(r.invoice_amount_cents)}` : ''}{r.amount_disputed && <span style={{ color: '#C53030' }}> · Customer disputes the amount</span>}{r.receiver_marked_paid_at && ' · Customer says paid'}</p>
        {r.invoice_amount_cents > quoteTotal + approvedExtras && <div className="rx-err">The invoice is higher than the approved total. Unapproved extras must not be charged as approved.</div>}
        {isTrade && (
          <div className="rx-noprint">
            <div className="rx-grid">
              <Field label="Status"><select value={inv.invoice_status} onChange={e => setInv({ ...inv, invoice_status: e.target.value })}>
                <option value="sent">Sent</option><option value="paid">Paid</option><option value="part_paid">Part-paid</option><option value="overdue">Overdue</option><option value="none">None</option></select></Field>
              <Field label="Amount (R, blank = approved total)"><input inputMode="decimal" value={inv.amount} onChange={e => setInv({ ...inv, amount: e.target.value })} /></Field>
            </div>
            <Field label="How to pay you (your EFT details or payment link)"><textarea value={inv.payment_details} onChange={e => setInv({ ...inv, payment_details: e.target.value })} /></Field>
            <button className="rx-btn sec" disabled={busy} onClick={() => act('invoice', inv, 'Invoice status saved')}>Save invoice status</button>
          </div>
        )}
      </div>

      {/* Private notes */}
      {isTrade && (
        <div className="rx-card rx-noprint">
          <h2 className="rx-h2">Private notes (only you see these)</h2>
          {d.notes.map((n: any) => <p key={n.id} className="rx-muted">{new Date(n.created_at).toLocaleDateString('en-ZA')}: {n.body}</p>)}
          <div className="rx-row"><input value={note} onChange={e => setNote(e.target.value)} style={{ flex: 1 }} />
            <button className="rx-btn sec" disabled={busy || !note.trim()} onClick={async () => { if (await act('note', { body: note }, 'Note saved')) setNote('') }}>Add</button></div>
        </div>
      )}

      {(isTrade || isManager) && !closed && (
        <div className="rx-noprint" style={{ marginBottom: 30 }}>
          <button className="rx-btn sec" disabled={busy} onClick={() => { if (confirm('Cancel this job?')) act('cancel', {}, 'Cancelled') }}>Cancel job</button>
        </div>
      )}
    </Shell>
  )
}
