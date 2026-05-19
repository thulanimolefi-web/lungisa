'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'stockstvm@gmail.com'

type Tab = 'overview' | 'payouts' | 'disputes' | 'users' | 'jobs'

export default function AdminPanel() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('overview')
  const [loading, setLoading]   = useState(true)
  const [authed, setAuthed]     = useState(false)
  const [stats, setStats]       = useState({jobs:0,users:0,payouts:0,disputes:0,revenue:0,escrow:0})
  const [payouts, setPayouts]   = useState<any[]>([])
  const [disputes, setDisputes] = useState<any[]>([])
  const [users, setUsers]       = useState<any[]>([])
  const [jobs, setJobs]         = useState<any[]>([])
  const [toast, setToast]       = useState('')

  useEffect(()=>{
    checkAuth()
  },[])

  async function checkAuth(){
    const { data:{ session } } = await supabase.auth.getSession()
    if(!session?.user){ router.push('/auth'); return }
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', session.user.id)
      .single()
    if(profile?.email !== ADMIN_EMAIL){ router.push('/home'); return }
    setAuthed(true)
    loadAll()
  }

  async function loadAll(){
    setLoading(true)
    await Promise.all([loadStats(), loadPayouts(), loadDisputes(), loadUsers(), loadJobs()])
    setLoading(false)
  }

  async function loadStats(){
    const [jobs, users, payments, disputes] = await Promise.all([
      supabase.from('jobs').select('id', {count:'exact',head:true}),
      supabase.from('profiles').select('id', {count:'exact',head:true}),
      supabase.from('payments').select('amount, net_amount, status'),
      supabase.from('job_disputes').select('id', {count:'exact',head:true}).eq('status','open'),
    ])
    const pmts = payments.data || []
    setStats({
      jobs:     jobs.count||0,
      users:    users.count||0,
      disputes: disputes.count||0,
      payouts:  pmts.filter(p=>p.status==='held').length,
      revenue:  pmts.filter(p=>p.status==='released').reduce((s:number,p:any)=>s+(p.amount-p.net_amount),0),
      escrow:   pmts.filter(p=>p.status==='held').reduce((s:number,p:any)=>s+p.amount,0),
    })
  }

  async function loadPayouts(){
    const { data } = await supabase
      .from('payments')
      .select(`
        id, amount, net_amount, status, created_at, yoco_charge_id,
        jobs(title, status),
        homeowner:profiles!payments_homeowner_id_fkey(full_name, email),
        tradesperson:profiles!payments_tradesperson_id_fkey(full_name, email, phone)
      `)
      .eq('status','held')
      .order('created_at', {ascending:false})
    if(data) {
      // For each payment, get banking details
      const withBanking = await Promise.all((data||[]).map(async (p:any)=>{
        const { data: bd } = await supabase
          .from('banking_details')
          .select('bank_name, account_holder, account_number, account_type, branch_code')
          .eq('tradesperson_id', p.tradesperson_id)
          .single()
        return {...p, banking: bd}
      }))
      setPayouts(withBanking)
    }
  }

  async function loadDisputes(){
    const { data } = await supabase
      .from('job_disputes')
      .select(`
        id, reason, status, created_at,
        jobs(id, title, status),
        profiles!job_disputes_raised_by_fkey(full_name, email)
      `)
      .order('created_at', {ascending:false})
    if(data) setDisputes(data)
  }

  async function loadUsers(){
    const { data } = await supabase
      .from('profiles')
      .select(`
        id, full_name, email, phone, role, area, created_at,
        tradesperson_profiles(trade_category, service_areas, rating_avg, jobs_completed, id_verified, verification_status)
      `)
      .order('created_at', {ascending:false})
      .limit(50)
    if(data) setUsers(data)
  }

  async function loadJobs(){
    const { data } = await supabase
      .from('jobs')
      .select(`
        id, title, category, area, status, created_at, budget_max,
        profiles!jobs_homeowner_id_fkey(full_name, email)
      `)
      .order('created_at', {ascending:false})
      .limit(50)
    if(data) setJobs(data)
  }

  async function markPayoutReleased(paymentId:string){
    await supabase.from('payments').update({ status:'released' }).eq('id', paymentId)
    showToast('Payment marked as released ✓')
    loadPayouts()
    loadStats()
  }

  async function resolveDispute(disputeId:string, jobId:string, resolution:'approve'|'reject'){
    await supabase.from('job_disputes').update({ status:'resolved' }).eq('id', disputeId)
    if(resolution==='approve'){
      await supabase.from('jobs').update({ status:'completed' }).eq('id', jobId)
      showToast('Dispute resolved — job marked complete ✓')
    } else {
      await supabase.from('jobs').update({ status:'cancelled' }).eq('id', jobId)
      showToast('Dispute resolved — job cancelled ✓')
    }
    loadDisputes()
    loadStats()
  }

  async function verifyTradesperson(userId:string){
    await supabase.from('tradesperson_profiles').update({ id_verified:true, verification_status:'verified' }).eq('id', userId)
    showToast('Tradesperson verified ✓')
    loadUsers()
  }

  async function cancelJob(jobId:string){
    await supabase.from('jobs').update({ status:'cancelled' }).eq('id', jobId)
    showToast('Job cancelled ✓')
    loadJobs()
    loadStats()
  }

  function showToast(msg:string){
    setToast(msg)
    setTimeout(()=>setToast(''),3000)
  }

  function fmt(amount:number){ return `R${Number(amount).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})}` }
  function fmtDate(d:string){ return new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Barlow',sans-serif;background:#0F0F0E;color:#F5F0E8;min-height:100vh}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes toast{0%{opacity:0;transform:translateY(20px)}10%{opacity:1;transform:translateY(0)}80%{opacity:1}100%{opacity:0}}
    .spin{width:20px;height:20px;border:2px solid rgba(255,255,255,.1);border-top-color:#C4593A;border-radius:50%;animation:spin .6s linear infinite}
    table{width:100%;border-collapse:collapse}
    th{font-family:'Barlow Condensed',sans-serif;font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.3);padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,.06)}
    td{padding:12px 14px;font-size:13px;color:rgba(245,240,232,.75);border-bottom:1px solid rgba(255,255,255,.04);vertical-align:top}
    tr:hover td{background:rgba(255,255,255,.02)}
    .badge{display:inline-block;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:3px 8px;border-radius:3px}
    .badge-green{background:rgba(61,170,106,.12);border:1px solid rgba(61,170,106,.2);color:#3DAA6A}
    .badge-yellow{background:rgba(232,160,32,.12);border:1px solid rgba(232,160,32,.2);color:#E8A020}
    .badge-red{background:rgba(226,75,74,.12);border:1px solid rgba(226,75,74,.2);color:#E24B4A}
    .badge-blue{background:rgba(46,127,212,.12);border:1px solid rgba(46,127,212,.2);color:#5B9BD5}
    .badge-grey{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(245,240,232,.4)}
    .btn-sm{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:6px 14px;border-radius:5px;cursor:pointer;border:none;transition:all .15s}
    .btn-green{background:#3DAA6A;color:#fff}
    .btn-green:hover{background:#2d8a54}
    .btn-red{background:#E24B4A;color:#fff}
    .btn-red:hover{background:#c03b3a}
    .btn-terra{background:#C4593A;color:#fff}
    .btn-terra:hover{background:#E07A5F}
    .btn-ghost{background:rgba(255,255,255,.06);color:rgba(245,240,232,.6);border:1px solid rgba(255,255,255,.08)!important}
    .btn-ghost:hover{background:rgba(255,255,255,.1)}
    .card{background:#1A1A16;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:22px 24px;animation:fadeUp .3s ease both}
    .toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#3DAA6A;color:#fff;padding:12px 24px;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:13px;font-weight:700;letter-spacing:1px;animation:toast 3s ease forwards;z-index:200;white-space:nowrap}
    @media(max-width:768px){.sidebar{display:none!important}.main-content{margin-left:0!important}th,td{padding:8px 10px}td{font-size:12px}}
  `

  if(!authed) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#0F0F0E'}}><div className="spin"/></div>

  const tabs: {id:Tab,label:string,icon:string,count?:number}[] = [
    {id:'overview',  label:'Overview',  icon:'📊'},
    {id:'payouts',   label:'Payouts',   icon:'💸', count:payouts.length},
    {id:'disputes',  label:'Disputes',  icon:'⚠️', count:disputes.filter(d=>d.status==='open').length},
    {id:'users',     label:'Users',     icon:'👥', count:users.filter((u:any)=>u.tradesperson_profiles?.verification_status==='pending').length},
    {id:'jobs',      label:'Jobs',      icon:'🔨'},
  ]

  return (
    <>
      <style>{css}</style>
      <div style={{display:'flex',minHeight:'100vh'}}>

        {/* SIDEBAR */}
        <div className="sidebar" style={{width:220,background:'#111110',borderRight:'1px solid rgba(255,255,255,.06)',padding:'24px 0',position:'fixed',top:0,bottom:0,left:0,display:'flex',flexDirection:'column'}}>
          <div style={{padding:'0 20px 24px',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{width:28,height:28,background:'#C4593A',clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              </div>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:2,color:'#F5F0E8'}}>LUNGISA</span>
            </div>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.25)'}}>Admin panel</div>
          </div>

          <div style={{padding:'16px 12px',flex:1}}>
            {tabs.map(t=>(
              <div key={t.id} onClick={()=>setTab(t.id)}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',borderRadius:8,cursor:'pointer',marginBottom:4,
                  background:tab===t.id?'rgba(196,89,58,.15)':'transparent',
                  border:tab===t.id?'1px solid rgba(196,89,58,.2)':'1px solid transparent',
                  transition:'all .15s'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:16}}>{t.icon}</span>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:600,letterSpacing:.5,color:tab===t.id?'#E07A5F':'rgba(245,240,232,.5)'}}>{t.label}</span>
                </div>
                {t.count !== undefined && t.count > 0 && (
                  <span style={{background:'#C4593A',color:'#fff',borderRadius:10,padding:'1px 7px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700}}>{t.count}</span>
                )}
              </div>
            ))}
          </div>

          <div style={{padding:'12px 20px',borderTop:'1px solid rgba(255,255,255,.06)'}}>
            <div onClick={()=>router.push('/home')} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1,color:'rgba(245,240,232,.25)',cursor:'pointer',textTransform:'uppercase'}}>
              ← Back to app
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main-content" style={{marginLeft:220,flex:1,padding:28,minHeight:'100vh'}}>

          {/* HEADER */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
            <div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:1,color:'#F5F0E8',lineHeight:1}}>
                {tabs.find(t=>t.id===tab)?.icon} {tabs.find(t=>t.id===tab)?.label.toUpperCase()}
              </div>
              <div style={{fontSize:13,color:'rgba(245,240,232,.35)',marginTop:4}}>
                {new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              </div>
            </div>
            <button className="btn-sm btn-ghost" onClick={loadAll}>↻ Refresh</button>
          </div>

          {loading?(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
              <div className="spin"/>
            </div>
          ):(
            <>
              {/* ── OVERVIEW ─────────────────────────────────────── */}
              {tab==='overview'&&(
                <div style={{animation:'fadeUp .3s ease both'}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
                    {[
                      {label:'Total users',    val:stats.users,       color:'#E07A5F', icon:'👥'},
                      {label:'Total jobs',     val:stats.jobs,        color:'#5B9BD5', icon:'🔨'},
                      {label:'Pending payouts',val:stats.payouts,     color:'#E8A020', icon:'💸'},
                      {label:'Open disputes',  val:stats.disputes,    color:'#E24B4A', icon:'⚠️'},
                      {label:'In escrow',      val:fmt(stats.escrow), color:'#E8A020', icon:'🔒'},
                      {label:'Platform revenue',val:fmt(stats.revenue),color:'#3DAA6A', icon:'📈'},
                    ].map((s,i)=>(
                      <div key={i} className="card" style={{animationDelay:`${i*.05}s`}}>
                        <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:1,color:s.color,lineHeight:1}}>{s.val}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginTop:6}}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  {(payouts.length>0||disputes.filter((d:any)=>d.status==='open').length>0)&&(
                    <div className="card">
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:14}}>Action required</div>
                      {payouts.length>0&&(
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,.05)'}}>
                          <div style={{display:'flex',gap:10,alignItems:'center'}}>
                            <span style={{fontSize:20}}>💸</span>
                            <div>
                              <div style={{fontSize:14,color:'#F5F0E8',fontWeight:600}}>{payouts.length} payout{payouts.length>1?'s':''} pending</div>
                              <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>Total: {fmt(payouts.reduce((s:number,p:any)=>s+p.net_amount,0))}</div>
                            </div>
                          </div>
                          <button className="btn-sm btn-terra" onClick={()=>setTab('payouts')}>Process →</button>
                        </div>
                      )}
                      {disputes.filter((d:any)=>d.status==='open').length>0&&(
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0'}}>
                          <div style={{display:'flex',gap:10,alignItems:'center'}}>
                            <span style={{fontSize:20}}>⚠️</span>
                            <div>
                              <div style={{fontSize:14,color:'#F5F0E8',fontWeight:600}}>{disputes.filter((d:any)=>d.status==='open').length} open dispute{disputes.filter((d:any)=>d.status==='open').length>1?'s':''}</div>
                              <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>Review and resolve</div>
                            </div>
                          </div>
                          <button className="btn-sm btn-red" onClick={()=>setTab('disputes')}>Review →</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── PAYOUTS ──────────────────────────────────────── */}
              {tab==='payouts'&&(
                <div>
                  {payouts.length===0?(
                    <div className="card" style={{textAlign:'center',padding:'60px 20px'}}>
                      <div style={{fontSize:40,marginBottom:12}}>✓</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'rgba(245,240,232,.4)'}}>No pending payouts</div>
                    </div>
                  ):payouts.map((p:any,i)=>(
                    <div key={p.id} className="card" style={{marginBottom:16,animationDelay:`${i*.05}s`}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,gap:12}}>
                        <div>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1,color:'#F5F0E8',marginBottom:4}}>{p.jobs?.title||'Job'}</div>
                          <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>Payment received: {fmtDate(p.created_at)}</div>
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#3DAA6A',letterSpacing:1}}>{fmt(p.net_amount)}</div>
                          <div style={{fontSize:11,color:'rgba(245,240,232,.3)'}}>to tradesperson</div>
                        </div>
                      </div>

                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                        <div style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'12px 14px'}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:8}}>Homeowner</div>
                          <div style={{fontSize:13,color:'#F5F0E8',fontWeight:600}}>{p.homeowner?.full_name}</div>
                          <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{p.homeowner?.email}</div>
                          <div style={{marginTop:8,display:'flex',gap:8}}>
                            <span style={{fontSize:12,color:'rgba(245,240,232,.5)'}}>Charged:</span>
                            <span style={{fontSize:12,color:'#F5F0E8',fontWeight:600}}>{fmt(p.amount)}</span>
                          </div>
                        </div>

                        <div style={{background:'rgba(255,255,255,.03)',borderRadius:8,padding:'12px 14px'}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:8}}>Tradesperson</div>
                          <div style={{fontSize:13,color:'#F5F0E8',fontWeight:600}}>{p.tradesperson?.full_name}</div>
                          <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{p.tradesperson?.email}</div>
                          <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{p.tradesperson?.phone}</div>
                        </div>
                      </div>

                      {/* Banking details */}
                      {p.banking?(
                        <div style={{background:'rgba(61,170,106,.06)',border:'1px solid rgba(61,170,106,.15)',borderRadius:8,padding:'14px 16px',marginBottom:16}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#3DAA6A',marginBottom:10}}>🏦 Banking details — EFT to:</div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                            {[
                              {l:'Bank',                v:p.banking.bank_name},
                              {l:'Account holder',      v:p.banking.account_holder},
                              {l:'Account number',      v:p.banking.account_number},
                              {l:'Account type',        v:p.banking.account_type},
                              {l:'Branch code',         v:p.banking.branch_code},
                              {l:'Reference',           v:`LUNGISA-${p.id.substring(0,8).toUpperCase()}`},
                            ].map((r,i)=>(
                              <div key={i}>
                                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:3}}>{r.l}</div>
                                <div style={{fontSize:13,color:'#F5F0E8',fontWeight:600,
                                  fontFamily:['Account number','Branch code','Reference'].includes(r.l)?'monospace':'inherit',
                                  letterSpacing:['Account number','Branch code'].includes(r.l)?2:0}}>{r.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ):(
                        <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:8,padding:'12px 14px',marginBottom:16,fontSize:13,color:'#E8A020'}}>
                          ⚠ No banking details on file — contact tradesperson before processing.
                        </div>
                      )}

                      <div style={{display:'flex',gap:10,alignItems:'center'}}>
                        <button className="btn-sm btn-green" onClick={()=>markPayoutReleased(p.id)}>
                          ✓ Mark as paid (EFT done)
                        </button>
                        <div style={{fontSize:11,color:'rgba(245,240,232,.3)'}}>
                          Yoco ID: {p.yoco_charge_id?.substring(0,20)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── DISPUTES ─────────────────────────────────────── */}
              {tab==='disputes'&&(
                <div>
                  {disputes.length===0?(
                    <div className="card" style={{textAlign:'center',padding:'60px 20px'}}>
                      <div style={{fontSize:40,marginBottom:12}}>✓</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'rgba(245,240,232,.4)'}}>No disputes</div>
                    </div>
                  ):disputes.map((d:any,i)=>(
                    <div key={d.id} className="card" style={{marginBottom:16,animationDelay:`${i*.05}s`,
                      borderColor:d.status==='open'?'rgba(226,75,74,.2)':'rgba(255,255,255,.06)'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                        <div>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,color:'#F5F0E8',marginBottom:4}}>{d.jobs?.title||'Job'}</div>
                          <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{fmtDate(d.created_at)}</div>
                        </div>
                        <span className={`badge ${d.status==='open'?'badge-red':d.status==='resolved'?'badge-green':'badge-grey'}`}>{d.status}</span>
                      </div>
                      <div style={{background:'rgba(226,75,74,.06)',border:'1px solid rgba(226,75,74,.1)',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:6}}>Reason</div>
                        <div style={{fontSize:14,color:'#F5F0E8',lineHeight:1.6}}>{d.reason}</div>
                      </div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.4)',marginBottom:12}}>
                        Raised by: <strong style={{color:'#F5F0E8'}}>{d.profiles?.full_name}</strong> ({d.profiles?.email})
                      </div>
                      {d.status==='open'&&(
                        <div style={{display:'flex',gap:10}}>
                          <button className="btn-sm btn-green" onClick={()=>resolveDispute(d.id, d.jobs?.id, 'approve')}>
                            ✓ Approve completion — release payment
                          </button>
                          <button className="btn-sm btn-red" onClick={()=>resolveDispute(d.id, d.jobs?.id, 'reject')}>
                            ✗ Reject — cancel job
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── USERS ────────────────────────────────────────── */}
              {tab==='users'&&(
                <div className="card" style={{padding:0,overflow:'hidden'}}>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Trade / Area</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u:any)=>(
                        <tr key={u.id}>
                          <td>
                            <div style={{fontWeight:600,color:'#F5F0E8'}}>{u.full_name}</div>
                            <div style={{fontSize:11,color:'rgba(245,240,232,.3)'}}>{u.email}</div>
                          </td>
                          <td>
                            <span className={`badge ${u.role==='homeowner'?'badge-blue':'badge-yellow'}`}>{u.role}</span>
                          </td>
                          <td>
                            {u.tradesperson_profiles?(
                              <div>
                                <div style={{textTransform:'capitalize'}}>{u.tradesperson_profiles.trade_category||'—'}</div>
                                <div style={{fontSize:11,color:'rgba(245,240,232,.3)'}}>{u.tradesperson_profiles.service_areas?.join(', ')||'—'}</div>
                              </div>
                            ):u.area||'—'}
                          </td>
                          <td style={{fontSize:11}}>{new Date(u.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}</td>
                          <td>
                            {u.tradesperson_profiles&&(
                              <span className={`badge ${
                                u.tradesperson_profiles.verification_status==='verified'?'badge-green':
                                u.tradesperson_profiles.verification_status==='pending'?'badge-yellow':'badge-grey'
                              }`}>
                                {u.tradesperson_profiles.verification_status||'unsubmitted'}
                              </span>
                            )}
                          </td>
                          <td>
                            {u.tradesperson_profiles?.verification_status==='pending'&&(
                              <button className="btn-sm btn-green" onClick={()=>verifyTradesperson(u.id)}>
                                ✓ Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── JOBS ─────────────────────────────────────────── */}
              {tab==='jobs'&&(
                <div className="card" style={{padding:0,overflow:'hidden'}}>
                  <table>
                    <thead>
                      <tr>
                        <th>Job</th>
                        <th>Category</th>
                        <th>Area</th>
                        <th>Budget</th>
                        <th>Status</th>
                        <th>Posted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((j:any)=>(
                        <tr key={j.id}>
                          <td>
                            <div style={{fontWeight:600,color:'#F5F0E8'}}>{j.title}</div>
                            <div style={{fontSize:11,color:'rgba(245,240,232,.3)'}}>{j.profiles?.full_name}</div>
                          </td>
                          <td style={{textTransform:'capitalize'}}>{j.category}</td>
                          <td>{j.area}</td>
                          <td>{j.budget_max?`R${j.budget_max.toLocaleString()}`:'—'}</td>
                          <td>
                            <span className={`badge ${
                              j.status==='completed'?'badge-green':
                              j.status==='in_progress'||j.status==='completion_submitted'?'badge-yellow':
                              j.status==='disputed'?'badge-red':
                              j.status==='cancelled'?'badge-grey':'badge-blue'
                            }`}>{j.status}</span>
                          </td>
                          <td style={{fontSize:11}}>{new Date(j.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</td>
                          <td>
                            {['open','bidding','accepted'].includes(j.status)&&(
                              <button className="btn-sm btn-ghost" onClick={()=>cancelJob(j.id)}>Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {toast&&<div className="toast">{toast}</div>}
    </>
  )
}
