import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '../../lib/auth-server'
import { db } from '../../lib/jobrecord-server'
import { evaluateCertificate } from '../../lib/certificate-rules'

// B34 (launch part): read-only home file. Properties I claimed, their job history and certificates.
// Reminders, export and transfer to a new owner are "add on usage".
export async function GET(req: NextRequest) {
  const auth = await requireUser(req)
  if (auth instanceof NextResponse) return auth
  const { data: grants } = await db().from('property_grants').select('property_id, created_at')
    .eq('user_id', auth.user.id).eq('grant_role', 'owner').is('revoked_at', null)
  const ids = (grants || []).map((g: any) => g.property_id)
  if (!ids.length) return NextResponse.json({ properties: [] })
  const [props, records, certs] = await Promise.all([
    db().from('properties').select('id, address_line, unit, suburb, city').in('id', ids),
    db().from('job_records').select('id, ref, title, status, created_at, closed_at, tradesperson_id, property_id').in('property_id', ids).order('created_at', { ascending: false }),
    db().from('certificates').select('id, property_id, record_id, cert_type, number, issue_date, issuer_name, issuer_reg_no, issuer_checked_at, file_path').in('property_id', ids),
  ])
  const tradeIds = Array.from(new Set((records.data || []).map((r: any) => r.tradesperson_id).filter(Boolean)))
  const { data: trades } = tradeIds.length ? await db().from('profiles').select('id, full_name').in('id', tradeIds) : { data: [] as any[] }
  return NextResponse.json({
    properties: (props.data || []).map((p: any) => ({
      ...p,
      records: (records.data || []).filter((r: any) => r.property_id === p.id)
        .map((r: any) => ({ ...r, trade_name: (trades || []).find((t: any) => t.id === r.tradesperson_id)?.full_name || null })),
      certificates: (certs.data || []).filter((c: any) => c.property_id === p.id)
        .map((c: any) => ({ ...c, file_path: undefined, has_file: !!c.file_path, rule: evaluateCertificate(c) })),
    })),
  })
}
