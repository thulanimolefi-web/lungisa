import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '../../../lib/auth-server'

// B02: admin-only, short-lived signed links to private verification documents.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const { userId } = await req.json().catch(() => ({}))
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
  const db = adminClient()
  const { data: tp } = await db.from('tradesperson_profiles').select('id_document_url, selfie_url').eq('id', userId).maybeSingle()
  if (!tp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const sign = async (path?: string | null) => {
    if (!path || path.startsWith('http')) return null // legacy public URLs are not re-served
    const { data } = await db.storage.from('verification-docs').createSignedUrl(path, 300)
    return data?.signedUrl ?? null
  }
  await db.from('audit_events').insert({ actor_id: auth.user.id, action: 'admin_viewed_verification_doc', entity: 'tradesperson_profiles', entity_id: userId })
  return NextResponse.json({ idUrl: await sign((tp as any).id_document_url), selfieUrl: await sign((tp as any).selfie_url) })
}
