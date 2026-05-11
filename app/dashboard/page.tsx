'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type View = 'feed' | 'bids' | 'earnings' | 'profile'
type Bid = { job: string; loc: string; price: number; status: string; time: string }
type Job = {
  id: any; cat: string; emoji: string; urgency: string; urgencyLabel: string; urgColor: string
  title: string; loc: string; dist: string; budget: string; budgetNum: number; desc: string
  time: string; photos: number; bids: number
  tags: {label:string,color:string,text:string}[]
  timing: string; submitted: boolean; submitPrice: number
}

function getCatEmoji(cat:string){const m:Record<string,string>={plumbing:'🔧',electrical:'⚡',painting:'🎨',carpentry:'🪚',roofing:'🏠',tiling:'🚿',solar:'☀️',garden:'🌿',waterproofing:'💧',welding:'🔥',cleaning:'🧹',general:'🔩'};return m[cat]||'🔧'}
function getUrgencyLabel(u:string){const m:Record<string,string>={emergency:'Today — emergency',within_3_days:'Within 3 days',this_week:'This week',flexible:'Flexible'};return m[u]||'Flexible'}
function getUrgencyColor(u:string){const m:Record<string,string>={emergency:'#E24B4A',within_3_days:'#E8A020',this_week:'#3DAA6A',flexible:'#D4C9B4'};return m[u]||'#D4C9B4'}
function getTimeAgo(d:string){const diff=Date.now()-new Date(d).getTime();const mins=Math.floor(diff/60000);if(mins<60)return`${mins} min ago`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs} hr${hrs>1?'s':''} ago`;return`${Math.floor(hrs/24)} day${Math.floor(hrs/24)>1?'s':''} ago`}
function getJobTags(j:any){const t=[];if(j.urgency==='emergency')t.push({label:'Urgent',color:'rgba(226,75,74,.12)',text:'#f08080'});if((j.photo_count||0)>0)t.push({label:`${j.photo_count} Photo${j.photo_count>1?'s':''}`,color:'rgba(46,127,212,.1)',text:'#6aaee8'});if((j.bid_count||0)>0)t.push({label:`${j.bid_count} bids placed`,color:'rgba(255,255,255,.06)',text:'rgba(245,240,232,.45)'});if((j.bid_count||0)===0)t.push({label:'New',color:'rgba(196,89,58,.15)',text:'var(--terra-l)'});return t}

export default function Dashboard() {
  const [view, setView]           = useState<View>('feed')
  const [jobs, setJobs]           = useState<Job[]>([])
  const [isOnline, setIsOnline]   = useState(true)
  const [modalJob, setModalJob]   = useState<Job|null>(null)
  const [bidPrice, setBidPrice]   = useState('')
  const [bidEta, setBidEta]       = useState('30 mins')
  const [bidNote, setBidNote]     = useState('')
  const [myBids, setMyBids]       = useState<Bid[]>([])
  const [filter, setFilter]       = useState('all')
  const [toasts, setToasts]       = useState<{id:number,title:string,sub:string,alert:boolean}[]>([])
  const [counterVal, setCounterVal] = useState(0)
  const [showCounter, setShowCounter] = useState(false)
  const [profile, setProfile]     = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [earnings, setEarnings]   = useState({thisWeek:0,totalJobs:0,avgJobValue:0,inEscrow:0})

  const ETAS = ['30 mins','1 hour','2 hours','Half day','Tomorrow']

  useEffect(()=>{
    loadProfile()
    loadRealJobs()
    loadMyBids()
    loadEarnings()

    const channel = supabase
      .channel('dashboard-jobs')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'jobs'},()=>{
        loadRealJobs()
        toast('New job posted!','A new job just appeared in your area',true)
      })
      .subscribe()

    return ()=>supabase.removeChannel(channel)
  },[])

  async function loadProfile(){
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(session?.user){
        const {data}=await supabase
          .from('profiles')
          .select(`
            *,
            tradesperson_profiles(
              trade_category,
              service_areas,
              years_experience,
              rating_avg,
              rating_count,
              jobs_completed
            )
          `)
          .eq('id',session.user.id)
          .single()
        if(data) setProfile(data)
      }
    }catch(e){console.log('Profile error:',e)}
  }

  async function loadRealJobs(){
    setLoading(true)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user){ setLoading(false); return }

      const {data:tp}=await supabase
        .from('tradesperson_profiles')
        .select('trade_category, service_areas')
        .eq('id',session.user.id)
        .single()

      let query=supabase
        .from('v_jobs_feed')
        .select('*')
        .order('created_at',{ascending:false})

      if(tp?.trade_category){
        const tradeCategories=[tp.trade_category].filter(Boolean).map((t:string)=>t.toLowerCase())
        query=query.in('category',tradeCategories)
      }

      if(tp?.service_areas&&tp.service_areas.length>0){
        const serviceAreas=tp.service_areas.map((a:string)=>a.trim())
        query=query.in('area',serviceAreas)
      }

      const {data,error}=await query
      console.log('Jobs loaded:', data?.length, 'error:', error, 'trade:', tp?.trade_category, 'areas:', tp?.service_areas)

      if(!error&&data){
        const mapped:Job[]=data.map((j:any)=>({
          id:           j.id,
          cat:          j.category.charAt(0).toUpperCase()+j.category.slice(1),
          emoji:        getCatEmoji(j.category),
          urgency:      j.urgency,
          urgencyLabel: getUrgencyLabel(j.urgency),
          urgColor:     getUrgencyColor(j.urgency),
          title:        j.title,
          loc:          `${j.area}, JHB`,
          dist:         'Nearby',
          budget:       j.budget_max?`R${j.budget_max.toLocaleString()}`:'Open',
          budgetNum:    j.budget_max||0,
          desc:         j.description,
          time:         `Posted ${getTimeAgo(j.created_at)}`,
          photos:       j.photo_count||0,
          bids:         j.bid_count||0,
          tags:         getJobTags(j),
          timing:       j.preferred_time||'Flexible',
          submitted:    false,
          submitPrice:  0,
        }))
        setJobs(mapped)
      }
    }catch(e){console.log('Jobs error:',e)}
    setLoading(false)
  }

  async function loadMyBids(){
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user) return
      const {data,error}=await supabase
        .from('bids')
        .select('*, jobs(title, area)')
        .eq('tradesperson_id',session.user.id)
        .order('created_at',{ascending:false})
      if(!error&&data){
        setMyBids(data.map((b:any)=>({
          job:    b.jobs?.title||'Job',
          loc:    b.jobs?.area||'JHB',
          price:  b.amount,
          status: b.status.charAt(0).toUpperCase()+b.status.slice(1),
          time:   getTimeAgo(b.created_at),
        })))
      }
    }catch(e){console.log('Bids error:',e)}
  }

  async function loadEarnings(){
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user) return
      const {data}=await supabase
        .from('payments')
        .select('*')
        .eq('tradesperson_id',session.user.id)
      if(data){
        const released=data.filter((p:any)=>p.status==='released')
        const held=data.filter((p:any)=>p.status==='held')
        const weekAgo=Date.now()-7*24*60*60*1000
        const thisWeek=released.filter((p:any)=>new Date(p.created_at).getTime()>weekAgo)
        setEarnings({
          thisWeek:   thisWeek.reduce((s:number,p:any)=>s+p.net_amount,0),
          totalJobs:  released.length,
          avgJobValue:released.length>0?Math.round(released.reduce((s:number,p:any)=>s+p.net_amount,0)/released.length):0,
          inEscrow:   held.reduce((s:number,p:any)=>s+p.net_amount,0),
        })
      }
    }catch(e){console.log('Earnings error:',e)}
  }

  function toast(title:string,sub:string,alert:boolean){
    const id=Date.now()
    setToasts(t=>[...t,{id,title,sub,alert}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500)
  }

  function openModal(job:Job){ setModalJob(job); setBidPrice(''); setBidNote(''); setBidEta('30 mins'); setShowCounter(false) }

  async function submitBid(){
    if(!bidPrice||parseInt(bidPrice)<100||!modalJob) return
    const price=parseInt(bidPrice)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(session?.user){
        const { data, error } = await supabase.from('bids').insert({
          job_id:          modalJob.id,
          tradesperson_id: session.user.id,
          amount:          price,
          eta_label:       bidEta,
          note:            bidNote||null,
          status:          'pending',
        }).select('id').single()

        if(error){ console.log('Bid insert error:', error); toast('Error submitting bid', error.message, false); return }

        // Update job status to bidding
        await supabase.from('jobs').update({ status:'bidding' }).eq('id', modalJob.id)

        // Email homeowner
        fetch('/api/send-email', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            jobId:           modalJob.id,
            amount:          price,
            eta:             bidEta,
            tradespersonId:  session.user.id,
          })
        }).catch(e=>console.log('Email error:',e))
      }
    }catch(e){console.log('Bid error:',e)}
    setJobs(j=>j.map(x=>x.id===modalJob.id?{...x,submitted:true,submitPrice:price}:x))
    setMyBids(b=>[...b,{job:modalJob.title,loc:modalJob.loc,price,status:'Pending',time:'Just now'}])
    toast('Bid submitted!',`R${price} on ${modalJob.title}`,false)
    setModalJob(null)
    loadMyBids()
  }

  function acceptCounter(){ toast('Job confirmed!',`R${counterVal} locked in. Payment in escrow.`,false); setShowCounter(false); setModalJob(null) }

  const visibleJobs=jobs.filter(j=>{
    if(filter==='urgent') return j.urgency==='today'||j.urgency==='emergency'
    if(filter==='new') return j.bids===0&&!j.submitted
    return true
  })

  const displayName=profile?.full_name||'—'
  const displayTrade=profile?.tradesperson_profiles?.trade_category
    ? profile.tradesperson_profiles.trade_category.charAt(0).toUpperCase()+profile.tradesperson_profiles.trade_category.slice(1)
    : 'Tradesperson'
  const displayInitials=displayName.split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase()||'?'
  const displayRating=profile?.tradesperson_profiles?.rating_avg>0?`★ ${profile.tradesperson_profiles.rating_avg}`:' New'
  const displayJobs=profile?.tradesperson_profiles?.jobs_completed||0

  const S={
    shell:{display:'flex',minHeight:'100vh',fontFamily:"'Barlow',sans-serif",background:'#1A1A16'},
    sidenav:{width:220,flexShrink:0,background:'#111110',display:'flex',flexDirection:'column' as const,borderRight:'1px solid rgba(255,255,255,.05)',position:'sticky' as const,top:0,height:'100vh',overflowY:'auto' as const},
    snLogo:{padding:'22px 20px 18px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:9},
    snHex:{width:28,height:28,background:'#C4593A',clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',display:'flex',alignItems:'center',justifyContent:'center'},
    snWord:{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:'#F5F0E8',textDecoration:'none'},
    snProfile:{padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10},
    snAvatar:{width:40,height:40,borderRadius:'50%',background:'#9E3E24',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:'#fff',flexShrink:0,border:'2px solid rgba(196,89,58,.3)'},
    snName:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:'#F5F0E8',lineHeight:1.2},
    snTrade:{fontSize:11,color:'rgba(245,240,232,.4)'},
    snRating:{fontSize:11,color:'#E8A020',marginTop:2},
    snItem:(active:boolean)=>({display:'flex',alignItems:'center',gap:10,padding:'10px 20px',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:600,letterSpacing:.5,color:active?'#F5F0E8':'rgba(245,240,232,.45)',borderLeft:`3px solid ${active?'#C4593A':'transparent'}`,background:active?'rgba(196,89,58,.08)':'transparent',transition:'all .15s'}),
    snSection:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase' as const,color:'rgba(245,240,232,.2)',padding:'12px 20px 4px'},
    onlineToggle:(on:boolean)=>({display:'flex',alignItems:'center',justifyContent:'space-between',background:on?'rgba(61,170,106,.08)':'rgba(255,255,255,.04)',border:`1px solid ${on?'rgba(61,170,106,.2)':'rgba(255,255,255,.1)'}`,borderRadius:8,padding:'10px 12px',cursor:'pointer'}),
    onlineLabel:(on:boolean)=>({fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:.5,color:on?'rgba(61,170,106,.9)':'rgba(245,240,232,.3)'}),
    topbar:{background:'#111110',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'0 28px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky' as const,top:0,zIndex:40},
    pageTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1.5,color:'#F5F0E8'},
    content:{padding:'24px 28px'},
    statStrip:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24},
    statCard:{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px'},
    statEye:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase' as const,color:'rgba(245,240,232,.35)',marginBottom:8},
    secHeader:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14},
    secTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1.5,color:'#F5F0E8',display:'flex',alignItems:'center',gap:10},
    filterChip:(sel:boolean)=>({fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase' as const,color:sel?'#E07A5F':'rgba(245,240,232,.4)',background:sel?'rgba(196,89,58,.08)':'rgba(255,255,255,.04)',border:`1px solid ${sel?'rgba(196,89,58,.3)':'rgba(255,255,255,.08)'}`,padding:'6px 12px',borderRadius:4,cursor:'pointer',transition:'all .15s'}),
    jobCard:{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',overflow:'hidden',transition:'border-color .2s',marginBottom:12,cursor:'pointer'},
    urgBar:(color:string)=>({width:4,height:52,borderRadius:2,background:color,flexShrink:0}),
    bidNowBtn:(sub:boolean)=>({fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,background:sub?'rgba(61,170,106,.2)':'#C4593A',color:sub?'rgba(61,170,106,.9)':'#fff',border:'none',padding:'8px 18px',borderRadius:6,cursor:sub?'default':'pointer',transition:'all .15s'}),
    overlay:{position:'fixed' as const,inset:0,background:'rgba(0,0,0,.75)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
    modal:{background:'#222220',borderRadius:16,border:'1px solid rgba(255,255,255,.1)',width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto' as const},
    mHeader:{padding:'22px 26px 18px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16},
    mBody:{padding:'22px 26px'},
    mFooter:{padding:'14px 26px 22px',display:'flex',gap:10},
    detailRow:{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:13},
    drLabel:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase' as const,color:'rgba(245,240,232,.35)',minWidth:80,flexShrink:0,paddingTop:1},
    descBox:{background:'rgba(255,255,255,.04)',borderRadius:8,border:'1px solid rgba(255,255,255,.06)',padding:'12px 14px',fontSize:13,color:'rgba(245,240,232,.7)',lineHeight:1.65,margin:'10px 0'},
    priceWrap:{display:'flex',alignItems:'center',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,overflow:'hidden',marginBottom:14},
    priceR:{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',padding:'12px 16px',background:'rgba(255,255,255,.04)',borderRight:'1px solid rgba(255,255,255,.08)'},
    priceInput:{flex:1,background:'transparent',border:'none',outline:'none',fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#F5F0E8',padding:'12px 16px',letterSpacing:1},
    etaChips:{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:14},
    etaChip:(sel:boolean)=>({border:`1px solid ${sel?'#C4593A':'rgba(255,255,255,.1)'}`,borderRadius:6,padding:'8px 14px',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,color:sel?'#E07A5F':'rgba(245,240,232,.5)',background:sel?'rgba(196,89,58,.12)':'rgba(255,255,255,.04)',transition:'all .15s'}),
    bidNoteInput:{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'10px 14px',fontFamily:"'Barlow',sans-serif",fontSize:13,color:'#F5F0E8',outline:'none',resize:'none' as const,height:80,lineHeight:1.55},
    earningsPreview:{background:'rgba(61,170,106,.07)',border:'1px solid rgba(61,170,106,.18)',borderRadius:8,padding:'12px 14px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'},
    btn:(variant:'terra'|'ghost')=>({padding:'12px 22px',borderRadius:8,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,cursor:'pointer',border:'none',background:variant==='terra'?'#C4593A':'rgba(255,255,255,.06)',color:variant==='ghost'?'rgba(245,240,232,.6)':'#fff',flex:variant!=='ghost'?1:undefined,display:'flex',alignItems:'center',justifyContent:'center' as const,gap:8,transition:'all .15s'}),
    toast:(alert:boolean)=>({background:'#2C2C28',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'flex-start',gap:10,maxWidth:280}),
  }

  const viewTitles:Record<View,string>={feed:'JOB FEED',bids:'MY BIDS',earnings:'EARNINGS',profile:'MY PROFILE'}
  const navItems=[
    {view:'feed' as View,   icon:'🏠',label:'Job Feed',  badge:jobs.filter(j=>!j.submitted).length},
    {view:'bids' as View,   icon:'💸',label:'My Bids',   badge:myBids.length},
    {view:'earnings' as View,icon:'📈',label:'Earnings'},
    {view:'profile' as View, icon:'👤',label:'My Profile'},
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        input::placeholder,textarea::placeholder{color:rgba(245,240,232,.25)}
        @keyframes bidIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .bid-in{animation:bidIn .4s ease both}
        .toast-in{animation:toastIn .3s ease both}
        .online-dot{animation:pulse 1.8s infinite}
        .spin{display:inline-block;width:20px;height:20px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
        @media(max-width:900px){.sidenav{display:none!important}.stat-strip{grid-template-columns:1fr 1fr!important}}
      `}</style>

      <div style={S.shell}>
        <nav style={S.sidenav} className="sidenav">
          <div style={S.snLogo}>
            <div style={S.snHex}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <a href="/" style={S.snWord}>LUNGISA</a>
          </div>
          <div style={S.snProfile}>
            <div style={S.snAvatar}>{displayInitials}</div>
            <div>
              <div style={S.snName}>{displayName}</div>
              <div style={S.snTrade}>{displayTrade}</div>
              <div style={S.snRating}>{displayRating} · {displayJobs} jobs</div>
            </div>
          </div>
          <div style={{flex:1,padding:'10px 0'}}>
            <div style={S.snSection}>Main</div>
            {navItems.map(item=>(
              <div key={item.view} style={S.snItem(view===item.view)} onClick={()=>setView(item.view)}>
                <span style={{fontSize:14}}>{item.icon}</span>
                {item.label}
                {item.badge!==undefined&&item.badge>0&&<span style={{marginLeft:'auto',background:'#C4593A',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10}}>{item.badge}</span>}
              </div>
            ))}
          </div>
          <div style={{padding:'14px 18px',borderTop:'1px solid rgba(255,255,255,.05)'}}>
            <div style={S.onlineToggle(isOnline)} onClick={()=>setIsOnline(o=>!o)}>
              <span style={S.onlineLabel(isOnline)}>{isOnline?'Online — receiving jobs':'Offline'}</span>
              <div className={isOnline?'online-dot':''} style={{width:8,height:8,borderRadius:'50%',background:isOnline?'#3DAA6A':'rgba(255,255,255,.2)'}}/>
            </div>
          </div>
        </nav>

        <div style={{flex:1,overflowX:'hidden'}}>
          <div style={S.topbar}>
            <span style={S.pageTitle}>{viewTitles[view]}</span>
            <div style={{width:34,height:34,borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}>
              🔔
            </div>
          </div>

          {/* JOB FEED */}
          {view==='feed'&&(
            <div style={S.content}>
              <div style={{...S.statStrip}} className="stat-strip">
                {[
                  {label:'This week',  val:earnings.thisWeek>0?`R${earnings.thisWeek.toLocaleString()}`:'R0',          color:'#52C47F', delta:earnings.thisWeek>0?'Earned this week':'Complete your first job'},
                  {label:'Bids placed',val:String(myBids.length),                                                       color:'#E07A5F', delta:myBids.length>0?`${myBids.filter(b=>b.status==='Accepted').length} accepted`:'Start bidding on jobs'},
                  {label:'Win rate',   val:myBids.length>0?`${Math.round((myBids.filter(b=>b.status==='Accepted').length/myBids.length)*100)}%`:'—', color:'#E8A020', delta:myBids.length>0?'Acceptance rate':'No bids yet'},
                  {label:'Rating',     val:profile?.tradesperson_profiles?.rating_avg>0?String(profile.tradesperson_profiles.rating_avg):'New', color:'#F5F0E8', delta:profile?.tradesperson_profiles?.rating_count>0?`${profile.tradesperson_profiles.rating_count} reviews`:'No reviews yet'},
                ].map(s=>(
                  <div key={s.label} style={S.statCard}>
                    <div style={S.statEye}>{s.label}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:1,lineHeight:1,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:11,color:'rgba(245,240,232,.35)',marginTop:6,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:500}}>{s.delta}</div>
                  </div>
                ))}
              </div>

              <div style={S.secHeader}>
                <div style={S.secTitle}>
                  Open Jobs
                  {!loading&&<span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1.5,background:'rgba(196,89,58,.15)',color:'#E07A5F',border:'1px solid rgba(196,89,58,.25)',padding:'3px 10px',borderRadius:4}}>{visibleJobs.length} near you</span>}
                </div>
                <div style={{display:'flex',gap:8}}>
                  {['all','urgent','new'].map(f=>(
                    <div key={f} style={S.filterChip(filter===f)} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</div>
                  ))}
                </div>
              </div>

              {loading?(
                <div style={{textAlign:'center',padding:'60px',color:'rgba(245,240,232,.4)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:1,display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
                  <div className="spin"/> Loading jobs...
                </div>
              ):visibleJobs.length===0?(
                <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(245,240,232,.3)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,letterSpacing:1}}>
                  <div style={{fontSize:40,marginBottom:16}}>🔍</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',marginBottom:8}}>No jobs right now</div>
                  <p style={{fontSize:13,lineHeight:1.6}}>New jobs are posted daily. Check back soon or{' '}
                    <span style={{color:'#E07A5F',cursor:'pointer'}} onClick={loadRealJobs}>refresh</span>.
                  </p>
                </div>
              ):visibleJobs.map(job=>(
                <div key={String(job.id)} style={S.jobCard} className="bid-in">
                  <div style={{display:'flex',alignItems:'center',gap:14,padding:'18px 20px 12px'}} onClick={()=>openModal(job)}>
                    <div style={S.urgBar(job.urgColor)}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:4}}>{job.emoji} {job.cat}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,color:'#F5F0E8',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{job.title}</div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.45)'}}>📍 {job.loc}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:'#E07A5F',letterSpacing:.5,lineHeight:1}}>{job.budget}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:500,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.3)'}}>Budget</div>
                      <div style={{fontSize:11,color:'rgba(245,240,232,.3)',marginTop:3}}>{job.time}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',padding:'10px 20px',background:'rgba(255,255,255,.02)',borderTop:'1px solid rgba(255,255,255,.04)',gap:8}}>
                    {job.tags.map(t=>(
                      <span key={t.label} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',padding:'3px 8px',borderRadius:3,background:t.color,color:t.text}}>{t.label}</span>
                    ))}
                    <div style={{flex:1}}/>
                    <button style={S.bidNowBtn(job.submitted)} onClick={()=>!job.submitted&&openModal(job)}>
                      {job.submitted?'✓ Bid submitted':'Bid Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MY BIDS */}
          {view==='bids'&&(
            <div style={S.content}>
              {myBids.length===0?(
                <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(245,240,232,.3)',fontFamily:"'Barlow Condensed',sans-serif"}}>
                  <div style={{fontSize:40,marginBottom:16}}>💸</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',marginBottom:8}}>No bids yet</div>
                  <p style={{fontSize:13,lineHeight:1.6,marginBottom:20}}>Go to the Job Feed and start bidding on jobs near you.</p>
                  <button style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 24px',borderRadius:6,cursor:'pointer'}} onClick={()=>setView('feed')}>Browse jobs →</button>
                </div>
              ):myBids.map((b,i)=>(
                <div key={i} style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'16px 20px',marginBottom:10,display:'flex',alignItems:'center',gap:14}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:'#F5F0E8',marginBottom:2}}>{b.job}</div>
                    <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{b.loc} · {b.time}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'#E07A5F'}}>R{b.price}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:b.status==='Accepted'?'#3DAA6A':b.status==='Declined'?'#f08080':'rgba(245,240,232,.4)'}}>{b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EARNINGS */}
          {view==='earnings'&&(
            <div style={S.content}>
              {earnings.totalJobs===0?(
                <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(245,240,232,.3)'}}>
                  <div style={{fontSize:40,marginBottom:16}}>📈</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',marginBottom:8,letterSpacing:1}}>No earnings yet</div>
                  <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,lineHeight:1.6,marginBottom:20}}>Complete your first job to start seeing earnings here.</p>
                  <button style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 24px',borderRadius:6,cursor:'pointer'}} onClick={()=>setView('feed')}>Find jobs →</button>
                </div>
              ):(
                <>
                  <div style={{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:'20px 22px',marginBottom:20}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:'#52C47F',letterSpacing:1,lineHeight:1}}>R{earnings.thisWeek.toLocaleString()}</div>
                    <div style={{fontSize:12,color:'rgba(245,240,232,.4)',marginTop:3}}>This week</div>
                  </div>
                  <div style={{...S.statStrip}} className="stat-strip">
                    {[
                      {label:'Jobs done',     val:String(earnings.totalJobs),                                               color:'#52C47F'},
                      {label:'Avg job value', val:earnings.avgJobValue>0?`R${earnings.avgJobValue.toLocaleString()}`:'—',   color:'#E07A5F'},
                      {label:'In escrow',     val:earnings.inEscrow>0?`R${earnings.inEscrow.toLocaleString()}`:'R0',        color:'#E8A020'},
                      {label:'Rating',        val:profile?.tradesperson_profiles?.rating_avg>0?String(profile.tradesperson_profiles.rating_avg):'New', color:'#F5F0E8'},
                    ].map(s=>(
                      <div key={s.label} style={S.statCard}>
                        <div style={S.statEye}>{s.label}</div>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:s.color,lineHeight:1}}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* PROFILE */}
          {view==='profile'&&(
            <div style={S.content}>
              <div style={{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:28}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:20,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:'#9E3E24',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'#fff',border:'3px solid rgba(196,89,58,.3)'}}>{displayInitials}</div>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:'#F5F0E8',lineHeight:1}}>{displayName.toUpperCase()}</div>
                    <div style={{fontSize:13,color:'rgba(245,240,232,.5)',marginTop:4}}>{displayTrade} · {profile?.tradesperson_profiles?.years_experience||0} yrs experience</div>
                    <div style={{fontSize:13,color:'#E8A020',marginTop:3}}>{displayRating} · {displayJobs} completed jobs</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[
                    {label:'Email',        val:profile?.email||'—'},
                    {label:'Phone',        val:profile?.phone||'—'},
                    {label:'Service areas',val:profile?.tradesperson_profiles?.service_areas?.join(' · ')||profile?.area||'—'},
                    {label:'Member since', val:profile?.created_at?new Date(profile.created_at).toLocaleDateString('en-ZA',{month:'long',year:'numeric'}):'—'},
                  ].map(r=>(
                    <div key={r.label}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>{r.label}</div>
                      <div style={{fontSize:13,color:'rgba(245,240,232,.75)'}}>{r.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BID MODAL */}
      {modalJob&&(
        <div style={S.overlay} onClick={e=>{ if(e.target===e.currentTarget) setModalJob(null) }}>
          <div style={S.modal}>
            <div style={S.mHeader}>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase',color:'#E07A5F',marginBottom:6}}>{modalJob.emoji} {modalJob.cat} · {modalJob.loc}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:'#F5F0E8',lineHeight:1}}>{modalJob.title}</div>
                <div style={{fontSize:13,color:'rgba(245,240,232,.5)',marginTop:4}}>{modalJob.time} · {modalJob.bids} bid{modalJob.bids!==1?'s':''}</div>
              </div>
              <div onClick={()=>setModalJob(null)} style={{width:32,height:32,borderRadius:6,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,color:'rgba(245,240,232,.5)',flexShrink:0}}>✕</div>
            </div>
            <div style={S.mBody}>
              {[['Budget',modalJob.budget],['Urgency',modalJob.urgencyLabel],['Location',modalJob.loc],['Timing',modalJob.timing]].map(([l,v])=>(
                <div key={l} style={S.detailRow}><span style={S.drLabel}>{l}</span><span style={{color:'rgba(245,240,232,.8)',fontSize:13}}>{v}</span></div>
              ))}
              <div style={S.descBox}>{modalJob.desc}</div>
              {!modalJob.submitted?(
                <>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',margin:'18px 0 10px',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:14,height:2,background:'#C4593A',display:'inline-block'}}/>Your bid
                  </div>
                  <div style={S.priceWrap}>
                    <div style={S.priceR}>R</div>
                    <input style={S.priceInput} type="number" placeholder="750" value={bidPrice} onChange={e=>setBidPrice(e.target.value)}/>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:10}}>Estimated arrival</div>
                  <div style={S.etaChips}>
                    {ETAS.map(e=><div key={e} style={S.etaChip(bidEta===e)} onClick={()=>setBidEta(e)}>{e}</div>)}
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:8}}>Message (optional)</div>
                  <textarea style={S.bidNoteInput} placeholder="E.g. I carry all replacement parts and can be there in 30 mins..." value={bidNote} onChange={e=>setBidNote(e.target.value)}/>
                  <div style={S.earningsPreview}>
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,color:'rgba(61,170,106,.7)'}}>You&apos;ll earn</div>
                      <div style={{fontSize:10,color:'rgba(61,170,106,.5)',marginTop:1}}>after 10% Lungisa commission</div>
                    </div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'#52C47F',letterSpacing:.5}}>
                      {bidPrice?`R ${Math.round(parseInt(bidPrice)*0.9).toLocaleString()}`:'—'}
                    </div>
                  </div>
                  {showCounter&&(
                    <div style={{background:'rgba(232,160,32,.07)',border:'1px solid rgba(232,160,32,.2)',borderRadius:8,padding:'12px 14px',marginTop:14,fontSize:13}}>
                      <div style={{color:'rgba(245,240,232,.75)',marginBottom:10}}>
                        💬 Homeowner counter-offered <strong style={{color:'#E8A020'}}>R{counterVal}</strong>. Accept or decline?
                      </div>
                      <div style={{display:'flex',gap:8}}>
                        <button onClick={acceptCounter} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'7px 14px',borderRadius:5,border:'none',cursor:'pointer',background:'#3DAA6A',color:'#fff'}}>Accept R{counterVal}</button>
                        <button onClick={()=>setShowCounter(false)} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'7px 14px',borderRadius:5,border:'none',cursor:'pointer',background:'rgba(255,255,255,.08)',color:'rgba(245,240,232,.6)'}}>Decline</button>
                      </div>
                    </div>
                  )}
                </>
              ):(
                <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,marginTop:12}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(61,170,106,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✓</div>
                  <div style={{fontSize:13,color:'rgba(245,240,232,.75)',lineHeight:1.4}}>
                    Bid submitted — <strong style={{color:'#52C47F'}}>R{modalJob.submitPrice}</strong>. Homeowner notified.
                  </div>
                </div>
              )}
            </div>
            {!modalJob.submitted&&(
              <div style={S.mFooter}>
                <button style={S.btn('ghost')} onClick={()=>setModalJob(null)}>Cancel</button>
                <button style={S.btn('terra')} onClick={submitBid}>Submit Bid →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div style={{position:'fixed',top:70,right:20,zIndex:200,pointerEvents:'none'}}>
        {toasts.map(t=>(
          <div key={t.id} className="toast-in" style={S.toast(t.alert)}>
            <div style={{width:8,height:8,borderRadius:'50%',background:t.alert?'#E8A020':'#C4593A',marginTop:4,flexShrink:0}}/>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,color:'#F5F0E8',marginBottom:1}}>{t.title}</div>
              <div style={{fontSize:11,color:'rgba(245,240,232,.45)',lineHeight:1.4}}>{t.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
