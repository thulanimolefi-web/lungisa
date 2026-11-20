// Server-only helpers for API routes (B07).
// Every route that changes data calls requireUser / requireAdmin first.
import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'
import crypto from 'crypto'

let _admin: SupabaseClient | null = null

/** Service-role client. Throws if env is missing (fail closed). */
export function adminClient(): SupabaseClient {
  if (_admin) return _admin
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase server env not configured')
  _admin = createClient(url, key, { auth: { persistSession: false } })
  return _admin
}

/** Constant-time string compare. False if either side is empty. */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/** Checks `Authorization: Bearer <secret>` against an env var. Fails closed if the env var is unset. */
export function checkBearerSecret(req: NextRequest, envName: string): NextResponse | null {
  const secret = process.env[envName]
  if (!secret) {
    console.error(`${envName} not set; refusing request`)
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }
  const header = req.headers.get('authorization') || ''
  if (!safeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export type AuthedUser = { user: User; role: string | null }

/** Reads the Supabase access token from the Authorization header and verifies it. */
export async function getUser(req: NextRequest): Promise<AuthedUser | null> {
  const header = req.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const db = adminClient()
  const { data, error } = await db.auth.getUser(token)
  if (error || !data?.user) return null
  const { data: prof } = await db.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  return { user: data.user, role: (prof as any)?.role ?? null }
}

export async function requireUser(req: NextRequest): Promise<AuthedUser | NextResponse> {
  const u = await getUser(req)
  if (!u) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  return u
}

/** Admin = row in public.admins (server-checked allow-list, B10). */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await adminClient().from('admins').select('user_id').eq('user_id', userId).maybeSingle()
  return !!data
}

export async function requireAdmin(req: NextRequest): Promise<AuthedUser | NextResponse> {
  const u = await requireUser(req)
  if (u instanceof NextResponse) return u
  if (!(await isAdmin(u.user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return u
}

/** Feature flag: payments stay frozen unless PAYMENTS_ENABLED === 'true' (B38). */
export function paymentsFrozen(): NextResponse | null {
  if (process.env.PAYMENTS_ENABLED === 'true') return null
  return NextResponse.json({ error: 'Card payments are paused. Pay the tradesperson directly.' }, { status: 503 })
}
