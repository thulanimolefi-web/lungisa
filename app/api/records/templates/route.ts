import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../../lib/auth-server'
import { db } from '../../../lib/jobrecord-server'
import { isPackId } from '../../../lib/packs'
import { builtInFor, LineKind, lineKey } from '../../../lib/quote-templates'

// Quote templates for the signed-in tradesperson: built-in ones for the trade pack, their own saved ones,
// and their last-used price per line (from their own earlier quotes).
const KINDS: LineKind[] = ['call_out', 'labour', 'materials']
const err = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status })

function cleanLines(lines: any): { text: string; kind: LineKind; amount_cents: number }[] {
  if (!Array.isArray(lines)) return []
  return lines.slice(0, 40).map((l: any) => ({
    text: String(l?.text || '').trim().slice(0, 200),
    kind: (KINDS.includes(l?.kind) ? l.kind : 'labour') as LineKind,
    amount_cents: Math.max(0, Math.round(Number(l?.amount || 0) * 100)) || 0,
  })).filter(l => l.text)
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const me = auth.user.id
  const pack = req.nextUrl.searchParams.get('pack')
  const [{ data: mine }, { data: quotes }] = await Promise.all([
    db().from('quote_templates').select('id, name, trade_pack, lines, notes, updated_at').eq('owner_id', me).order('updated_at', { ascending: false }).limit(50),
    db().from('record_quotes').select('lines, created_at').eq('created_by', me).order('created_at', { ascending: false }).limit(60),
  ])
  const lastPrices: Record<string, number> = {}
  for (const q of quotes || []) {
    for (const l of ((q as any).lines || []) as any[]) {
      const k = lineKey(String(l?.text || ''))
      if (k && lastPrices[k] === undefined && Number(l?.amount_cents) > 0) lastPrices[k] = Number(l.amount_cents)
    }
  }
  return NextResponse.json({
    builtIn: builtInFor(pack),
    mine: (mine || []).filter((t: any) => !pack || !t.trade_pack || t.trade_pack === pack),
    lastPrices,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const b = await req.json().catch(() => ({}))
  const name = String(b.name || '').trim().slice(0, 120)
  if (!name) return err('Give the template a name')
  const lines = cleanLines(b.lines)
  if (!lines.length) return err('Add at least one line')
  const { data: prof } = await db().from('profiles').select('role').eq('id', auth.user.id).maybeSingle()
  if ((prof as any)?.role !== 'tradesperson') return err('Only tradespeople save quote templates', 403)
  const { count } = await db().from('quote_templates').select('id', { count: 'exact', head: true }).eq('owner_id', auth.user.id)
  if ((count || 0) >= 50) return err('You have 50 templates. Delete one first.')
  const { data, error } = await db().from('quote_templates').insert({
    owner_id: auth.user.id, name, trade_pack: isPackId(b.trade_pack) ? b.trade_pack : null, lines,
    notes: String(b.notes || '').slice(0, 2000) || null,
  }).select('id').single()
  if (error) return err('Could not save the template', 500)
  return NextResponse.json({ ok: true, id: (data as any).id })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('Template id required')
  await db().from('quote_templates').delete().eq('id', id).eq('owner_id', auth.user.id)
  return NextResponse.json({ ok: true })
}
