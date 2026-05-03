'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type AdminTab = 'overview' | 'users' | 'jobs' | 'payments'

// Mock data for display while real data loads
const MOCK_USERS = [
  { id:'1', full_name:'Thabo Molefi',    email:'thabo@gmail.com',      role:'homeowner',    area:'Soweto',    created_at:'2026-05-01', is_verified:true  },
  { id:'2', full_name:'Themba Mokoena',  email:'themba@gmail.com',     role:'tradesperson', area:'Roodepoort',created_at:'2026-05-01', is_verified:true  },
  { id:'3', full_name:'Sipho Khumalo',   email:'sipho@gmail.com',      role:'tradesperson', area:'Midrand',   created_at:'2026-05-02', is_verified:true  },
  { id:'4', full_name:'Zanele Dlamini',  email:'zanele@gmail.com',     role:'homeowner',    area:'Sandton',   created_at:'2026-05-02', is_verified:false },
  { id:'5', full_name:'Patrick Nkosi',   email:'patrick@gmail.com',    role:'tradesperson', area:'Soweto',    created_at:'2026-05-03', is_verified:true  },
  { id:'6', full_name:'Nomsa Sithole',   email:'nomsa@gmail.com',      role:'homeowner',    area:'Randburg',  created_at:'2026-05-03', is_verified:true  },
]

const MOCK_JOBS = [
  { id:'j1', title:'Burst pipe — kitchen sink', category:'plumbing', area:'Soweto',     status:'bidding',    budget_max:900,  bid_count:3, homeowner:'Thabo Molefi',   created_at:'2026-05-03' },
  { id:'j2', title:'Tripping circuit breaker',  category:'electrical',area:'Roodepoort',status:'open',       budget_max:700,  bid_count:0, homeowner:'Zanele Dlamini',  created_at:'2026-05-03' },
  { id:'j3', title:'Geyser replacement',         category:'plumbing', area:'Midrand',    status:'in_progress',budget_max:1500, bid_count:2, homeowner:'Nomsa Sithole',   created_at:'2026-05-02' },
  { id:'j4', title:'Paint living room',          category:'painting', area:'Sandton',    status:'completed',  budget_max:2400, bid_count:4, homeowner:'Thabo Molefi',   created_at:'2026-05-01' },
  { id:'j5', title:'Fix garden gate',            category:'general',  area:'Soweto',     status:'completed',  budget_max:500,  bid_count:2, homeowner:'Zanele Dlamini',  created_at:'2026-04-30' },
]

const MOCK_PAYMENTS = [
  { id:'p1', job:'Paint living room',    homeowner:'Thabo Molefi',   tradesperson:'Themba Mokoena', amount:2200, commission:220, status:'released',  date:'2026-05-02' },
  { id:'p2', job:'Fix garden gate',      homeowner:'Zanele Dlamini', tradesperson:'Patrick Nkosi',  amount:450,  commission:45,  status:'released',  date:'2026-05-01' },
  { id:'p3', job:'Geyser replacement',   homeowner:'Nomsa Sithole',  tradesperson:'Sipho Khumalo',  amount:1400, commission:140, status:'held',      date:'2026-05-02' },
]

const STATUS_COLORS: Record<string,{bg:string,text:string}> = {
  open:        {bg:'rgba(232,160,32,.12)',   text:'#E8A020'},
  bidding:     {bg:'rgba(196,89,58,.12)',    text:'#E07A5F'},
  accepted:    {bg:'rgba(46,127,212,.12)',   text:'#6aaee8'},
  in_progress: {bg:'rgba(196,89,58,.15)',    text:'#C4593A'},
  completed:   {bg:'rgba(61,170,106,.12)',   text:'#3DAA6A'},
  cancelled:   {bg:'rgba(255,255,255,.08)',  text:'rgba(245,240,232,.4)'},
  held:        {bg:'rgba(232,160,32,.12)',   text:'#E8A020'},
  released:    {bg:'rgba(61,170,106,.12)',   text:'#3DAA6A'},
  disputed:    {bg:'rgba(226,75,74,.12)',    text:'#f08080'},
}

const CAT_EMOJIS: Record<string,string> = {
  plumbing:'🔧', electrical:'⚡', painting:'🎨', carpentry:'🪚',
  roofing:'🏠', tiling:'🚿', solar:'☀️', garden:'🌿',
  waterproofing:'💧', welding:'🔥', cleaning:'🧹', general:'🔩',
}

export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab]         = useState<AdminTab>('overview')
  const [users, setUsers]     = useState(MOCK_USERS)
  const [jobs, setJobs]       = useState(MOCK_JOBS)
  const [payments, setPayments] = useState(MOCK_PAYMENTS)
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [supaUsers, setSupaUsers] = useState<any[]>([])

  // Load real users from Supabase
  useEffect(()=>{
    loadRealUsers()
  },[])

  async function loadRealUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if(!error && data && data.length > 0) {
        setSupaUsers(data)
      }
    } catch(e) {
      console.log('Could not load real users:', e)
    }
    setLoading(false)
  }

  async function loadRealJobs() {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, profiles!homeowner_id(full_name)')
        .order('created_at', { ascending: false })
      if(!error && data && data.length > 0) {
        setJobs(data.map((j:any) => ({
          ...j,
          homeowner: j.profiles?.full_name || 'Unknown',
        })))
      }
    } catch(e) {
      console.log('Could not load real jobs:', e)
    }
  }

  const displayUsers = supaUsers.length > 0 ? supaUsers : users
  const totalRevenue = payments.filter(p=>p.status==='released').reduce((s,p)=>s+p.commission,0)
  const totalGMV     = payments.filter(p=>p.status==='released').reduce((s,p)=>s+p.amount,0)
  const activeJobs   = jobs.filter(j=>['open','bidding','accepted','in_progress'].includes(j.status)).length
  const completedJobs = jobs.filter(j=>j.status==='completed').length

  const filteredUsers = displayUsers.filter(u=>{
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter==='all' || u.role===roleFilter
    return matchSearch && matchRole
  })

  const filteredJobs = jobs.filter(j=>{
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter==='all' || j.status===statusFilter
    return matchSearch && matchStatus
  })

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-l:#E07A5F;--terra-d:#9E3E24;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#DDD5C5;
      --charcoal:#2C2C28;--charcoal-m:#3E3D38;--charcoal-l:#5A5952;
      --sand:#D4C9B4;--white:#FAFAF7;--green:#3DAA6A;--green-l:#52C47F;--amber:#E8A020;
      --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
    }
    html,body{min-height:100%;font-family:var(--fb);background:#1A1A16;color:var(--cream)}
    .shell{display:flex;min-height:100vh}
    .sidenav{width:220px;flex-shrink:0;background:#111110;display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,.05);position:sticky;top:0;height:100vh;overflow-y:auto}
    .sn-logo{padding:22px 20px 18px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:9px}
    .sn-hex{width:28px;height:28px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sn-word{font-family:var(--fd);font-size:20px;letter-spacing:2px;color:var(--cream)}
    .sn-admin-badge{font-family:var(--fc);font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:var(--terra);color:#fff;padding:2px 8px;border-radius:3px;margin-left:6px}
    .sn-profile{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}
    .sn-ava{width:36px;height:36px;border-radius:50%;background:var(--terra-d);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:16px;color:#fff;flex-shrink:0}
    .sn-name{font-family:var(--fc);font-size:13px;font-weight:700;color:var(--cream);line-height:1.2}
    .sn-role{font-size:10px;color:rgba(245,240,232,.4);margin-top:2px}
    .sn-menu{flex:1;padding:10px 0}
    .sn-sec{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:rgba(245,240,232,.2);padding:10px 20px 4px}
    .sn-item{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:.5px;color:rgba(245,240,232,.45);border-left:3px solid transparent;transition:all .15s}
    .sn-item:hover{color:rgba(245,240,232,.8);background:rgba(255,255,255,.03)}
    .sn-item.active{color:var(--cream);border-left-color:var(--terra);background:rgba(196,89,58,.08)}
    .main{flex:1;overflow-x:hidden}
    .topbar{background:#111110;border-bottom:1px solid rgba(255,255,255,.05);padding:0 28px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
    .page-title{font-family:var(--fd);font-size:22px;letter-spacing:1.5px;color:var(--cream)}
    .refresh-btn{font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(245,240,232,.6);padding:8px 16px;border-radius:6px;cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:6px}
    .refresh-btn:hover{background:rgba(255,255,255,.1);color:var(--cream)}
    .content{padding:24px 28px}
    .stat-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
    .stat-card{background:#222220;border-radius:10px;border:1px solid rgba(255,255,255,.06);padding:18px 20px;transition:border-color .2s}
    .stat-card:hover{border-color:rgba(255,255,255,.12)}
    .stat-eye{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:rgba(245,240,232,.35);margin-bottom:8px}
    .stat-num{font-family:var(--fd);font-size:36px;letter-spacing:1px;line-height:1;color:var(--cream)}
    .stat-num.green{color:var(--green-l)}
    .stat-num.terra{color:var(--terra-l)}
    .stat-num.amber{color:var(--amber)}
    .stat-delta{font-size:11px;color:rgba(245,240,232,.35);margin-top:5px;font-family:var(--fc);font-weight:500}
    .sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;flex-wrap:wrap}
    .sec-title{font-family:var(--fd);font-size:20px;letter-spacing:1.5px;color:var(--cream)}
    .search-bar{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:8px 14px;font-family:var(--fb);font-size:13px;color:var(--cream);outline:none;width:220px;transition:border-color .2s}
    .search-bar:focus{border-color:var(--terra)}
    .search-bar::placeholder{color:rgba(245,240,232,.3)}
    .filter-chips{display:flex;gap:6px}
    .fc{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(245,240,232,.4);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:5px 10px;border-radius:4px;cursor:pointer;transition:all .15s}
    .fc:hover{color:rgba(245,240,232,.7)}
    .fc.sel{color:var(--terra-l);border-color:rgba(196,89,58,.3);background:rgba(196,89,58,.08)}
    .table-wrap{background:#222220;border-radius:12px;border:1px solid rgba(255,255,255,.06);overflow:hidden;margin-bottom:24px}
    table{width:100%;border-collapse:collapse}
    thead tr{border-bottom:1px solid rgba(255,255,255,.06)}
    th{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.35);padding:12px 16px;text-align:left}
    tbody tr{border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s;cursor:pointer}
    tbody tr:last-child{border-bottom:none}
    tbody tr:hover{background:rgba(255,255,255,.03)}
    td{padding:12px 16px;font-size:13px;color:rgba(245,240,232,.8);vertical-align:middle}
    .user-cell{display:flex;align-items:center;gap:10px}
    .user-ava{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:14px;color:#fff;flex-shrink:0}
    .user-name{font-weight:600;color:var(--cream);margin-bottom:1px;font-size:13px}
    .user-email{font-size:11px;color:rgba(245,240,232,.4)}
    .role-badge{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:3px 8px;border-radius:3px}
    .role-home{background:rgba(46,127,212,.12);color:#6aaee8}
    .role-trade{background:rgba(196,89,58,.12);color:var(--terra-l)}
    .status-badge{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:3px 8px;border-radius:3px}
    .verified-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:5px}
    .empty-row td{text-align:center;padding:40px;color:rgba(245,240,232,.3);font-family:var(--fc);font-size:13px;letter-spacing:1px}
    .chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
    .chart-card{background:#222220;border-radius:12px;border:1px solid rgba(255,255,255,.06);padding:20px 22px}
    .chart-title{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.4);margin-bottom:16px}
    .bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .bar-label{font-family:var(--fc);font-size:11px;font-weight:600;color:rgba(245,240,232,.5);width:80px;flex-shrink:0}
    .bar-track{flex:1;background:rgba(255,255,255,.06);border-radius:2px;height:8px;overflow:hidden}
    .bar-fill{height:100%;border-radius:2px;background:var(--terra);transition:width .6s ease}
    .bar-val{font-family:var(--fc);font-size:11px;font-weight:600;color:rgba(245,240,232,.5);width:30px;text-align:right;flex-shrink:0}
    .activity-item{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04)}
    .activity-item:last-child{border-bottom:none}
    .activity-dot{width:8px;height:8px;border-radius:50%;margin-top:4px;flex-shrink:0}
    .activity-text{font-size:12px;color:rgba(245,240,232,.65);line-height:1.5}
    .activity-time{font-size:10px;color:rgba(245,240,232,.3);margin-top:2px;font-family:var(--fc)}
    .live-indicator{display:flex;align-items:center;gap:6px;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--green)}
    .live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 1.8s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .real-badge{background:rgba(61,170,106,.1);border:1px solid rgba(61,170,106,.2);border-radius:4px;padding:3px 8px;font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--green-l);margin-left:8px}
    .mock-badge{background:rgba(232,160,32,.08);border:1px solid rgba(232,160,32,.15);border-radius:4px;padding:3px 8px;font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--amber);margin-left:8px}
    @media(max-width:900px){.sidenav{display:none}.stat-strip{grid-template-columns:1fr 1fr}.chart-grid{grid-template-columns:1fr}.content{padding:16px}}
  `

  const avatarColors = ['#8B3A2A','#5A3A2A','#2A4A3A','#3A4A6A','#6A3A5A','#4A5A2A']

  return (
    <>
      <style>{css}</style>
      <div className="shell">

        {/* SIDEBAR */}
        <nav className="sidenav">
          <div className="sn-logo">
            <div className="sn-hex">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span className="sn-word">LUNGISA</span>
            <span className="sn-admin-badge">Admin</span>
          </div>
          <div className="sn-profile">
            <div className="sn-ava">TM</div>
            <div>
              <div className="sn-name">Thulani Molefi</div>
              <div className="sn-role">Super Admin</div>
            </div>
          </div>
          <div className="sn-menu">
            <div className="sn-sec">Dashboard</div>
            {[
              {id:'overview', icon:'📊', label:'Overview'},
              {id:'users',    icon:'👥', label:'Users',    count:displayUsers.length},
              {id:'jobs',     icon:'🔧', label:'Jobs',     count:jobs.length},
              {id:'payments', icon:'💳', label:'Payments', count:payments.length},
            ].map(item=>(
              <div key={item.id} className={`sn-item ${tab===item.id?'active':''}`} onClick={()=>setTab(item.id as AdminTab)}>
                <span style={{fontSize:14}}>{item.icon}</span>
                {item.label}
                {item.count!==undefined&&<span style={{marginLeft:'auto',background:'rgba(255,255,255,.08)',color:'rgba(245,240,232,.5)',fontFamily:'var(--fc)',fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10}}>{item.count}</span>}
              </div>
            ))}
            <div className="sn-sec">Navigate</div>
            <div className="sn-item" onClick={()=>router.push('/')}>
              <span style={{fontSize:14}}>🌐</span>Landing page
            </div>
            <div className="sn-item" onClick={()=>router.push('/home')}>
              <span style={{fontSize:14}}>🏠</span>Homeowner view
            </div>
            <div className="sn-item" onClick={()=>router.push('/dashboard')}>
              <span style={{fontSize:14}}>⚡</span>Tradesperson view
            </div>
          </div>
          <div style={{padding:'14px 20px',borderTop:'1px solid rgba(255,255,255,.05)'}}>
            <div className="live-indicator">
              <div className="live-dot"/>
              System online
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span className="page-title">
                {tab==='overview'?'OVERVIEW':tab==='users'?'USERS':tab==='jobs'?'JOBS':'PAYMENTS'}
              </span>
              {supaUsers.length>0
                ? <span className="real-badge">● Live data</span>
                : <span className="mock-badge">● Demo data</span>
              }
            </div>
            <button className="refresh-btn" onClick={()=>{loadRealUsers();loadRealJobs()}}>
              🔄 Refresh data
            </button>
          </div>

          <div className="content">

            {/* ── OVERVIEW ── */}
            {tab==='overview'&&(
              <>
                <div className="stat-strip">
                  {[
                    {eye:'Total users',    val:String(displayUsers.length),       cls:'terra',  delta:`${displayUsers.filter((u:any)=>u.role==='tradesperson').length} tradespeople`},
                    {eye:'Active jobs',    val:String(activeJobs),                cls:'',       delta:`${completedJobs} completed`},
                    {eye:'Total GMV',      val:`R${totalGMV.toLocaleString()}`,   cls:'green',  delta:'Gross merchandise value'},
                    {eye:'Revenue',        val:`R${totalRevenue.toLocaleString()}`,cls:'amber',  delta:'10% commission earned'},
                  ].map(s=>(
                    <div key={s.eye} className="stat-card">
                      <div className="stat-eye">{s.eye}</div>
                      <div className={`stat-num ${s.cls}`}>{s.val}</div>
                      <div className="stat-delta">{s.delta}</div>
                    </div>
                  ))}
                </div>

                <div className="chart-grid">
                  {/* Jobs by status */}
                  <div className="chart-card">
                    <div className="chart-title">Jobs by status</div>
                    {[
                      {label:'Open',       count:jobs.filter(j=>j.status==='open').length,        max:jobs.length, color:'#E8A020'},
                      {label:'Bidding',    count:jobs.filter(j=>j.status==='bidding').length,     max:jobs.length, color:'#E07A5F'},
                      {label:'Active',     count:jobs.filter(j=>j.status==='in_progress').length, max:jobs.length, color:'#C4593A'},
                      {label:'Completed',  count:jobs.filter(j=>j.status==='completed').length,   max:jobs.length, color:'#3DAA6A'},
                    ].map(b=>(
                      <div key={b.label} className="bar-row">
                        <div className="bar-label">{b.label}</div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{width:`${(b.count/Math.max(jobs.length,1))*100}%`,background:b.color}}/>
                        </div>
                        <div className="bar-val">{b.count}</div>
                      </div>
                    ))}
                  </div>

                  {/* Users by role */}
                  <div className="chart-card">
                    <div className="chart-title">Users by role</div>
                    {[
                      {label:'Homeowners',    count:displayUsers.filter((u:any)=>u.role==='homeowner').length,    color:'#6aaee8'},
                      {label:'Tradespeople',  count:displayUsers.filter((u:any)=>u.role==='tradesperson').length, color:'#E07A5F'},
                    ].map(b=>(
                      <div key={b.label} className="bar-row">
                        <div className="bar-label">{b.label}</div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{width:`${(b.count/Math.max(displayUsers.length,1))*100}%`,background:b.color}}/>
                        </div>
                        <div className="bar-val">{b.count}</div>
                      </div>
                    ))}

                    <div style={{marginTop:20}}>
                      <div className="chart-title">Recent activity</div>
                      {[
                        {dot:'#3DAA6A', text:'New user signed up — Nomsa Sithole (Homeowner)', time:'2 min ago'},
                        {dot:'#E07A5F', text:'New bid placed — Themba Mokoena on Burst pipe job', time:'8 min ago'},
                        {dot:'#E8A020', text:'Payment held in escrow — R1,400 for Geyser job', time:'34 min ago'},
                        {dot:'#3DAA6A', text:'Job completed — Paint living room · R2,200', time:'2 hrs ago'},
                      ].map((a,i)=>(
                        <div key={i} className="activity-item">
                          <div className="activity-dot" style={{background:a.dot}}/>
                          <div>
                            <div className="activity-text">{a.text}</div>
                            <div className="activity-time">{a.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quick stats row */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {[
                    {label:'Avg bids per job', val:'2.4', icon:'📊'},
                    {label:'Avg job value',    val:'R1,217', icon:'💰'},
                    {label:'Completion rate',  val:'40%', icon:'✅'},
                  ].map(s=>(
                    <div key={s.label} style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'16px 18px',display:'flex',alignItems:'center',gap:12}}>
                      <div style={{fontSize:24}}>{s.icon}</div>
                      <div>
                        <div style={{fontFamily:'var(--fd)',fontSize:24,color:'var(--cream)',letterSpacing:.5}}>{s.val}</div>
                        <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginTop:3}}>{s.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── USERS ── */}
            {tab==='users'&&(
              <>
                <div className="sec-hdr">
                  <div className="sec-title">
                    All Users
                    <span style={{fontFamily:'var(--fc)',fontSize:12,fontWeight:600,letterSpacing:1.5,background:'rgba(196,89,58,.15)',color:'var(--terra-l)',border:'1px solid rgba(196,89,58,.25)',padding:'3px 10px',borderRadius:4,marginLeft:10}}>
                      {filteredUsers.length} total
                    </span>
                  </div>
                  <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                    <input className="search-bar" placeholder="Search name or email..." value={search} onChange={e=>setSearch(e.target.value)}/>
                    <div className="filter-chips">
                      {['all','homeowner','tradesperson'].map(r=>(
                        <div key={r} className={`fc ${roleFilter===r?'sel':''}`} onClick={()=>setRoleFilter(r)}>
                          {r==='all'?'All':r==='homeowner'?'Homeowners':'Tradespeople'}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Area</th>
                        <th>Verified</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length===0?(
                        <tr className="empty-row"><td colSpan={5}>No users found</td></tr>
                      ):filteredUsers.map((u:any,i:number)=>(
                        <tr key={u.id}>
                          <td>
                            <div className="user-cell">
                              <div className="user-ava" style={{background:avatarColors[i%avatarColors.length]}}>
                                {(u.full_name||'?')[0]}
                              </div>
                              <div>
                                <div className="user-name">{u.full_name||'—'}</div>
                                <div className="user-email">{u.email||'—'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${u.role==='homeowner'?'role-home':'role-trade'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{color:'rgba(245,240,232,.6)'}}>{u.area||'—'}</td>
                          <td>
                            <span>
                              <span className="verified-dot" style={{background:u.is_verified?'#3DAA6A':'rgba(255,255,255,.2)'}}/>
                              <span style={{fontSize:11,color:u.is_verified?'#3DAA6A':'rgba(245,240,232,.3)',fontFamily:'var(--fc)',fontWeight:600,letterSpacing:1}}>
                                {u.is_verified?'Verified':'Pending'}
                              </span>
                            </span>
                          </td>
                          <td style={{color:'rgba(245,240,232,.4)',fontSize:11,fontFamily:'var(--fc)'}}>
                            {u.created_at?new Date(u.created_at).toLocaleDateString('en-ZA'):'—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── JOBS ── */}
            {tab==='jobs'&&(
              <>
                <div className="sec-hdr">
                  <div className="sec-title">All Jobs</div>
                  <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                    <input className="search-bar" placeholder="Search jobs..." value={search} onChange={e=>setSearch(e.target.value)}/>
                    <div className="filter-chips">
                      {['all','open','bidding','in_progress','completed'].map(s=>(
                        <div key={s} className={`fc ${statusFilter===s?'sel':''}`} onClick={()=>setStatusFilter(s)}>
                          {s==='all'?'All':s.replace('_',' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Job</th>
                        <th>Homeowner</th>
                        <th>Budget</th>
                        <th>Bids</th>
                        <th>Status</th>
                        <th>Posted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.length===0?(
                        <tr className="empty-row"><td colSpan={6}>No jobs found</td></tr>
                      ):filteredJobs.map(j=>(
                        <tr key={j.id}>
                          <td>
                            <div style={{fontWeight:600,color:'var(--cream)',marginBottom:2}}>{CAT_EMOJIS[j.category]||'🔧'} {j.title}</div>
                            <div style={{fontSize:11,color:'rgba(245,240,232,.4)'}}>{j.area}, JHB</div>
                          </td>
                          <td style={{color:'rgba(245,240,232,.6)'}}>{j.homeowner}</td>
                          <td style={{fontFamily:'var(--fd)',fontSize:16,color:'var(--terra-l)'}}>R{j.budget_max?.toLocaleString()}</td>
                          <td>
                            <span style={{fontFamily:'var(--fd)',fontSize:18,color:j.bid_count>0?'var(--cream)':'rgba(245,240,232,.3)'}}>{j.bid_count}</span>
                          </td>
                          <td>
                            <span className="status-badge" style={{background:STATUS_COLORS[j.status]?.bg||'rgba(255,255,255,.06)',color:STATUS_COLORS[j.status]?.text||'rgba(245,240,232,.4)'}}>
                              {j.status.replace('_',' ')}
                            </span>
                          </td>
                          <td style={{color:'rgba(245,240,232,.4)',fontSize:11,fontFamily:'var(--fc)'}}>
                            {new Date(j.created_at).toLocaleDateString('en-ZA')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* ── PAYMENTS ── */}
            {tab==='payments'&&(
              <>
                <div className="stat-strip" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
                  {[
                    {eye:'Total GMV',     val:`R${totalGMV.toLocaleString()}`,    cls:'green', delta:'Payments processed'},
                    {eye:'Revenue earned',val:`R${totalRevenue.toLocaleString()}`, cls:'amber', delta:'10% commission'},
                    {eye:'In escrow',     val:`R${payments.filter(p=>p.status==='held').reduce((s,p)=>s+p.amount,0).toLocaleString()}`, cls:'terra', delta:'Pending release'},
                  ].map(s=>(
                    <div key={s.eye} className="stat-card">
                      <div className="stat-eye">{s.eye}</div>
                      <div className={`stat-num ${s.cls}`}>{s.val}</div>
                      <div className="stat-delta">{s.delta}</div>
                    </div>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Job</th>
                        <th>Homeowner</th>
                        <th>Tradesperson</th>
                        <th>Amount</th>
                        <th>Commission</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length===0?(
                        <tr className="empty-row"><td colSpan={7}>No payments yet</td></tr>
                      ):payments.map(p=>(
                        <tr key={p.id}>
                          <td style={{fontWeight:600,color:'var(--cream)'}}>{p.job}</td>
                          <td style={{color:'rgba(245,240,232,.6)',fontSize:12}}>{p.homeowner}</td>
                          <td style={{color:'rgba(245,240,232,.6)',fontSize:12}}>{p.tradesperson}</td>
                          <td style={{fontFamily:'var(--fd)',fontSize:16,color:'var(--cream)'}}>R{p.amount.toLocaleString()}</td>
                          <td style={{fontFamily:'var(--fd)',fontSize:16,color:'var(--green-l)'}}>R{p.commission}</td>
                          <td>
                            <span className="status-badge" style={{background:STATUS_COLORS[p.status]?.bg,color:STATUS_COLORS[p.status]?.text}}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{color:'rgba(245,240,232,.4)',fontSize:11,fontFamily:'var(--fc)'}}>
                            {new Date(p.date).toLocaleDateString('en-ZA')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
