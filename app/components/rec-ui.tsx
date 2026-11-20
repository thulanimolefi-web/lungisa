'use client'
// Small shared UI kit for the job-record screens. Plain inline styles, mobile first,
// 44px tap targets (NFR-11), brand colours from the existing app.
import Link from 'next/link'
import { CSSProperties, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export const C = { ink: '#2C2C28', cream: '#F5F0E8', creamD: '#EAE3D6', line: '#DDD5C5', terra: '#C4593A', green: '#3DAA6A', amber: '#B7791F', red: '#C53030', grey: '#5A5952' }

export const css = `
  .rx{font-family:Arial,Helvetica,sans-serif;color:${C.ink};background:${C.cream};min-height:100vh}
  .rx *{box-sizing:border-box}
  .rx-top{background:${C.ink};color:${C.cream};padding:12px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
  .rx-top a{color:${C.cream};text-decoration:none;font-size:14px;opacity:.85}
  .rx-top .brand{font-weight:700;letter-spacing:2px;opacity:1;margin-right:auto}
  .rx-wrap{max-width:860px;margin:0 auto;padding:16px}
  .rx-card{background:#fff;border:1px solid ${C.line};border-radius:10px;padding:16px;margin-bottom:14px}
  .rx-h1{font-size:22px;margin:4px 0 12px}
  .rx-h2{font-size:16px;margin:0 0 10px}
  .rx-muted{color:${C.grey};font-size:13px;line-height:1.5}
  .rx-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .rx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  @media(max-width:560px){.rx-grid{grid-template-columns:1fr}}
  .rx label{display:block;font-size:12px;color:${C.grey};margin:0 0 4px}
  .rx input,.rx select,.rx textarea{width:100%;min-height:44px;border:1px solid ${C.line};border-radius:8px;padding:10px;font-size:16px;background:#fff;color:${C.ink}}
  .rx textarea{min-height:80px}
  .rx-btn{min-height:44px;border:none;border-radius:8px;padding:10px 16px;font-size:15px;font-weight:700;cursor:pointer;background:${C.terra};color:#fff}
  .rx-btn.sec{background:#fff;color:${C.ink};border:1px solid ${C.line}}
  .rx-btn.green{background:${C.green}}
  .rx-btn.red{background:${C.red}}
  .rx-btn:disabled{opacity:.5;cursor:not-allowed}
  .rx-pill{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;padding:3px 8px;border-radius:20px;border:1px solid ${C.line};background:${C.creamD}}
  .rx-list a{color:inherit;text-decoration:none}
  .rx-item{display:flex;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid ${C.creamD}}
  .rx-item:last-child{border-bottom:none}
  .rx-err{background:#fdecea;color:${C.red};border-radius:8px;padding:10px;font-size:14px;margin:8px 0}
  .rx-ok{background:#e8f6ee;color:#1f6b3f;border-radius:8px;padding:10px;font-size:14px;margin:8px 0}
  .rx-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
  .rx-photos img{width:100%;height:100px;object-fit:cover;border-radius:6px;border:1px solid ${C.line}}
  @media print{.rx-top,.rx-noprint{display:none!important}.rx{background:#fff}.rx-card{border:none;padding:0 0 10px}}
`

export function Shell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="rx">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="rx-top">
        <span className="brand">LUNGIZA</span>
        <Link href="/records">Jobs</Link>
        <Link href="/manage">Properties</Link>
        <Link href="/listings">Listings</Link>
        <Link href="/home-file">Home file</Link>
      </div>
      <div className="rx-wrap">
        {title && <h1 className="rx-h1">{title}</h1>}
        {children}
      </div>
    </div>
  )
}

export function Bare({ children }: { children: ReactNode }) {
  return (
    <div className="rx">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="rx-top"><span className="brand">LUNGIZA</span></div>
      <div className="rx-wrap">{children}</div>
    </div>
  )
}

export const STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: C.grey },
  unassigned: { label: 'Needs a tradesperson', color: C.amber },
  quoted: { label: 'Quote not approved', color: C.amber },
  awaiting_approval: { label: 'Awaiting approval', color: C.amber },
  approved: { label: 'Approved', color: C.green },
  in_progress: { label: 'In progress', color: '#2E7FD4' },
  awaiting_signoff: { label: 'Awaiting sign-off', color: C.amber },
  completed: { label: 'Signed off', color: C.green },
  disputed: { label: 'Problem reported', color: C.red },
  closed_without_signoff: { label: 'Closed without sign-off', color: C.grey },
  cancelled: { label: 'Cancelled', color: C.grey },
}

export function StatusPill({ status }: { status: string }) {
  const s = STATUS[status] || { label: status, color: C.grey }
  return <span className="rx-pill" style={{ color: s.color, borderColor: s.color }}>{s.label}</span>
}

export const APPROVAL_LABEL: Record<string, string> = {
  receiver_confirmed: 'Confirmed by the receiver (code checked)',
  creator_recorded: 'Recorded by the creator, not confirmed by the receiver',
  under_mandate: 'Approved under mandate',
}

export function money(c: number | null | undefined) { return 'R' + Math.round((c || 0) / 100).toLocaleString('en-ZA') }

export function Level({ level, children }: { level: 'green' | 'amber' | 'red'; children?: ReactNode }) {
  const col = level === 'green' ? C.green : level === 'amber' ? C.amber : C.red
  const txt = level === 'green' ? 'OK' : level === 'amber' ? 'Check' : 'Missing or invalid'
  return <span className="rx-pill" style={{ color: col, borderColor: col }}>{children || txt}</span>
}

/** Open the phone share sheet, or WhatsApp web as a fallback (NFR-10: no WhatsApp API). */
export async function shareLink(url: string, text: string) {
  try {
    if (typeof navigator !== 'undefined' && (navigator as any).share) { await (navigator as any).share({ text, url }); return }
  } catch { /* user cancelled */ }
  window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank', 'noopener')
}

/** Downscale photos before upload (NFR-8), then upload with a server-issued signed URL. */
export async function compress(file: File, max = 1600): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic') return file
  const img = document.createElement('img')
  const url = URL.createObjectURL(file)
  try {
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale); canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>(res => canvas.toBlob(b => res(b || file), 'image/jpeg', 0.72))
  } catch { return file } finally { URL.revokeObjectURL(url) }
}

export async function uploadSigned(path: string, token: string, file: File) {
  const blob = await compress(file)
  const { error } = await supabase.storage.from('job-records').uploadToSignedUrl(path, token, blob, { contentType: blob.type || file.type })
  if (error) throw new Error(error.message)
}

export function Field({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ marginBottom: 10, ...style }}><label>{label}</label>{children}</div>
}
