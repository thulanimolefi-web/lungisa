import { NextRequest, NextResponse } from 'next/server'
import { adminClient, requireAdmin } from '../../../lib/auth-server'

// B05/B10: the admin page no longer reads other users' private columns with the browser key.
// It asks this admin-only route, which uses the service role on the server.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (auth instanceof NextResponse) return auth
  const db = adminClient()
  const k = req.nextUrl.searchParams.get('k')
  switch (k) {
    case 'stats': {
      const [jobs, users, payments, disputes] = await Promise.all([
        db.from('jobs').select('id', { count: 'exact', head: true }),
        db.from('profiles').select('id', { count: 'exact', head: true }),
        db.from('payments').select('amount, net_amount, status'),
        db.from('job_disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      ])
      return NextResponse.json({ jobs: jobs.count || 0, users: users.count || 0, disputes: disputes.count || 0, payments: payments.data || [] })
    }
    case 'payouts': {
      const { data } = await db.from('payments').select(`
        id, amount, net_amount, status, created_at, yoco_charge_id, tradesperson_id,
        jobs(title, status),
        homeowner:profiles!payments_homeowner_id_fkey(full_name, email),
        tradesperson:profiles!payments_tradesperson_id_fkey(full_name, email, phone)
      `).eq('status', 'held').order('created_at', { ascending: false })
      // Same as before: the admin needs the tradesperson's banking details to pay out by EFT.
      // Now read on the server, for a verified admin only.
      const withBanking = await Promise.all((data || []).map(async (p: any) => {
        const { data: bd } = await db.from('banking_details')
          .select('bank_name, account_holder, account_number, account_type, branch_code')
          .eq('tradesperson_id', p.tradesperson_id).maybeSingle()
        return { ...p, banking: bd }
      }))
      return NextResponse.json({ data: withBanking })
    }
    case 'disputes': {
      const { data } = await db.from('job_disputes').select('*').order('created_at', { ascending: false })
      const enriched = await Promise.all((data || []).map(async (d: any) => {
        const { data: job } = await db.from('jobs').select('id, title, status, homeowner_id').eq('id', d.job_id).maybeSingle()
        const { data: raiser } = await db.from('profiles').select('full_name, email, role').eq('id', d.raised_by).maybeSingle()
        return { ...d, job, raiser }
      }))
      return NextResponse.json({ data: enriched })
    }
    case 'users': {
      const { data } = await db.from('profiles').select(`
        id, full_name, email, phone, role, area, created_at,
        tradesperson_profiles(trade_category, service_areas, rating_avg, jobs_completed, id_verified, verification_status, rejection_reason, id_document_url)
      `).order('created_at', { ascending: false }).limit(50)
      // Never send storage paths of ID documents to the browser; only whether one exists.
      const safe = (data || []).map((u: any) => {
        const tp = Array.isArray(u.tradesperson_profiles) ? u.tradesperson_profiles[0] : u.tradesperson_profiles
        if (!tp) return u
        const { id_document_url, ...rest } = tp
        return { ...u, tradesperson_profiles: { ...rest, id_document_url: id_document_url ? 'on-file' : null } }
      })
      return NextResponse.json({ data: safe })
    }
    case 'jobs': {
      const { data } = await db.from('jobs').select(`
        id, title, category, area, status, created_at, budget_max,
        profiles!jobs_homeowner_id_fkey(full_name, email)
      `).order('created_at', { ascending: false }).limit(50)
      return NextResponse.json({ data: data || [] })
    }
    default:
      return NextResponse.json({ error: 'Unknown key' }, { status: 400 })
  }
}
