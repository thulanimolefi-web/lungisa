'use client'

import { useState, useEffect } from 'react'

type View = 'feed' | 'active' | 'bids' | 'earnings' | 'profile'
type Bid = { job: string; loc: string; price: number; status: string; time: string }

const INITIAL_JOBS = [
  { id:0, cat:'Plumbing', emoji:'🔧', urgency:'today', urgencyLabel:'Today — emergency', urgColor:'#E24B4A',
    title:'Burst pipe — kitchen sink', loc:'Soweto, JHB', dist:'3.2km',
    budget:'R500–R900', budgetNum:900, desc:'Burst pipe under my kitchen sink — water leaking onto floor. Turned off mains. Need urgent fix today.',
    time:'Posted 8 min ago', photos:2, bids:1, tags:[{label:'Urgent',color:'rgba(226,75,74,.12)',text:'#f08080'},{label:'2 Photos',color:'rgba(46,127,212,.1)',text:'#6aaee8'}],
    timing:'Anytime today', submitted:false, submitPrice:0 },
  { id:1, cat:'Electrical', emoji:'⚡', urgency:'week', urgencyLabel:'Within 3 days', urgColor:'#E8A020',
    title:'Tripping circuit breaker — lounge', loc:'Roodepoort, JHB', dist:'7.1km',
    budget:'R400–R700', budgetNum:700, desc:'Circuit breaker keeps tripping every few hours. Happens when TV and AC are both on. Suspect wiring issue.',
    time:'Posted 34 min ago', photos:0, bids:2, tags:[{label:'2 bids placed',color:'rgba(255,255,255,.06)',text:'rgba(245,240,232,.45)'}],
    timing:'This week — flexible', submitted:false, submitPrice:0 },
  { id:2, cat:'Plumbing', emoji:'🔧', urgency:'flex', urgencyLabel:'Flexible', urgColor:'#3DAA6A',
    title:'Geyser service + inspection', loc:'Midrand, JHB', dist:'11km',
    budget:'R800–R1,500', budgetNum:1500, desc:'Geyser is 8 years old and making a banging noise. Want a full service — thermostat, element, pressure valve.',
    time:'Posted 2 hrs ago', photos:1, bids:0, tags:[{label:'New',color:'rgba(196,89,58,.15)',text:'var(--terra-l)'},{label:'1 Photo',color:'rgba(46,127,212,.1)',text:'#6aaee8'}],
    timing:'Any day this week', submitted:false, submitPrice:0 },
]

export default function Dashboard() {
  const [view, setView]             = useState<View>('feed')
  const [jobs, setJobs]             = useState(INITIAL_JOBS)
  const [isOnline, setIsOnline]     = useState(true)
  const [modalJob, setModalJob]     = useState<typeof INITIAL_JOBS[0]|null>(null)
  const [bidPrice, setBidPrice]     = useState('')
  const [bidEta, setBidEta]         = useState('30 mins')
  const [bidNote, setBidNote]       = useState('')
  const [myBids, setMyBids]         = useState<Bid[]>([])
  const [filter, setFilter]         = useState('all')
  const [toasts, setToasts]         = useState<{id:number,title:string,sub:string,alert:boolean}[]>([])
  const [counterVal, setCounterVal] = useState(0)
  const [showCounter, setShowCounter] = useState(false)

  const ETAS = ['30 mins','1 hour','2 hours','Half day','Tomorrow']

  useEffect(()=>{
    const t = setTimeout(()=>{
      if(!isOnline) return
      setJobs(j=>[...j,{
        id:3,cat:'Plumbing',emoji:'🔧',urgency:'today',urgencyLabel:'Today — emergency',urgColor:'#E24B4A',
        title:'No hot water — geyser element',loc:'Soweto, JHB',dist:'4.5km',
        budget:'R600–R900',budgetNum:900,desc:'Woke up with no hot water. Geyser light is on but no heat. Suspect element. Need someone today.',
        time:'Just now',photos:0,bids:0,tags:[{label:'New',color:'rgba(196,89,58,.15)',text:'var(--terra-l)'},{label:'Urgent',color:'rgba(226,75,74,.12)',text:'#f08080'}],
        timing:'Today urgently',submitted:false,submitPrice:0
      }])
      toast('New job near you!','No hot water — Soweto · R900 · 4.5km away',true)
    },8000)
    return ()=>clearTimeout(t)
  },[isOnline])

  function toast(title:string,sub:string,alert:boolean){
    const id=Date.now()
    setToasts(t=>[...t,{id,title,sub,alert}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500)
  }

  function openModal(job:typeof INITIAL_JOBS[0]){
    setModalJob(job); setBidPrice(''); setBidNote(''); setBidEta('30 mins')
    setShowCounter(false)
  }

  function submitBid(){
    if(!bidPrice||parseInt(bidPrice)<100||!modalJob) return
    const price=parseInt(bidPrice)
    setJobs(j=>j.map(x=>x.id===modalJob.id?{...x,submitted:true,submitPrice:price}:x))
    setMyBids(b=>[...b,{job:modalJob.title,loc:modalJob.loc,price,status:'Pending',time:'Just now'}])
    toast('Bid submitted!',`R${price} on ${modalJob.title}`,false)
    if(modalJob.id===0){
      const cv=Math.round(price*0.88)
      setCounterVal(cv)
      setTimeout(()=>{setShowCounter(true);toast('Counter-offer received!',`Homeowner offered R${cv}`,true)},3000)
    }
  }

  function acceptCounter(){
    toast('Job confirmed!',`R${counterVal} locked in. Payment in escrow.`,false)
    setShowCounter(false); setModalJob(null)
  }

  const visibleJobs = jobs.filter(j=>{
    if(filter==='urgent') return j.urgency==='today'
    if(filter==='new') return j.bids===0&&!j.submitted
    return true
  })

  const S={
    shell:{display:'flex',minHeight:'100vh',fontFamily:"'Barlow',sans-serif",background:'#1A1A16'},
    sidenav:{width:220,flexShrink:0,background:'#111110',display:'flex',flexDirection:'column' as const,borderRight:'1px solid rgba(255,255,255,.05)',position:'sticky' as const,top:0,height:'100vh',overflowY:'auto' as const},
    snLogo:{padding:'22px 20px 18px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:9},
    snHex:{width:28,height:28,background:'#C4593A',clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',display:'flex',alignItems:'center',justifyContent:'center'},
    snWord:{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:'#F5F0E8'},
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
    statEyebrow:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase' as const,color:'rgba(245,240,232,.35)',marginBottom:8},
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
    priceWrap:{display:'flex',alignItems:'center',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,overflow:'hidden',marginBottom:14,transition:'border-color .2s'},
    priceR:{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',padding:'12px 16px',background:'rgba(255,255,255,.04)',borderRight:'1px solid rgba(255,255,255,.08)'},
    priceInput:{flex:1,background:'transparent',border:'none',outline:'none',fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#F5F0E8',padding:'12px 16px',letterSpacing:1},
    etaChips:{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:14},
    etaChip:(sel:boolean)=>({border:`1px solid ${sel?'#C4593A':'rgba(255,255,255,.1)'}`,borderRadius:6,padding:'8px 14px',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,color:sel?'#E07A5F':'rgba(245,240,232,.5)',background:sel?'rgba(196,89,58,.12)':'rgba(255,255,255,.04)',transition:'all .15s'}),
    bidNoteInput:{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'10px 14px',fontFamily:"'Barlow',sans-serif",fontSize:13,color:'#F5F0E8',outline:'none',resize:'none' as const,height:80,lineHeight:1.55},
    earningsPreview:{background:'rgba(61,170,106,.07)',border:'1px solid rgba(61,170,106,.18)',borderRadius:8,padding:'12px 14px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'},
    btn:(variant:'terra'|'ghost'|'success')=>({padding:'12px 22px',borderRadius:8,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,cursor:'pointer',border:'none',background:variant==='terra'?'#C4593A':variant==='success'?'#3DAA6A':'rgba(255,255,255,.06)',color:variant==='ghost'?'rgba(245,240,232,.6)':'#fff',flex:variant!=='ghost'?1:undefined,display:'flex',alignItems:'center',justifyContent:'center' as const,gap:8,transition:'all .15s'}),
    activeCard:{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:16},
    barChart:{display:'flex',alignItems:'flex-end',gap:6,height:80},
    barWrap:{flex:1,display:'flex',flexDirection:'column' as const,alignItems:'center',gap:4},
    toast:(alert:boolean)=>({background:'#2C2C28',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'flex-start',gap:10,maxWidth:280}),
  }

  const views:View[]=['feed','active','bids','earnings','profile']
  const viewTitles:Record<View,string>={feed:'JOB FEED',active:'ACTIVE JOBS',bids:'MY BIDS',earnings:'EARNINGS',profile:'MY PROFILE'}
  const navItems=[
    {view:'feed' as View,icon:'🏠',label:'Job Feed',badge:jobs.filter(j=>!j.submitted).length},
    {view:'active' as View,icon:'⏱',label:'Active Jobs'},
    {view:'bids' as View,icon:'💸',label:'My Bids'},
    {view:'earnings' as View,icon:'📈',label:'Earnings'},
    {view:'profile' as View,icon:'👤',label:'My Profile'},
  ]

  return (
    <>
      <style>{}</style>

      <div style={S.shell}>

        {/* SIDEBAR */}
        <nav style={S.sidenav} className="sidenav">
          <div style={S.snLogo}>
            <div style={S.snHex}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <a href="/" style={{...S.snWord,textDecoration:'none'}}> LUNGISA</a>
          </div>

          <div style={S.snProfile}>
            <div style={S.snAvatar}>TM</div>
            <div>
              <div style={S.snName}>Themba Mokoena</div>
              <div style={S.snTrade}>Licensed Plumber</div>
              <div style={S.snRating}>★★★★★ 4.9 · 47 jobs</div>
            </div>
          </div>

          <div style={{flex:1,padding:'10px 0'}}>
            <div style={S.snSection}>Main</div>
            {navItems.map(item=>(
              <div key={item.view} style={S.snItem(view===item.view)} onClick={()=>setView(item.view)}>
                <span style={{fontSize:14}}>{item.icon}</span>
                {item.label}
                {item.badge&&item.badge>0&&<span style={{marginLeft:'auto',background:'#C4593A',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10}}>{item.badge}</span>}
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

        {/* MAIN */}
        <div style={{flex:1,overflowX:'hidden'}}>
          <div style={S.topbar}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <span style={S.pageTitle}>{viewTitles[view]}</span>
              <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1,color:'rgba(245,240,232,.5)',border:'1px solid rgba(255,255,255,.1)',background:'rgba(255,255,255,.04)',padding:'5px 12px',borderRadius:4,display:'flex',alignItems:'center',gap:6}}>
                📍 Soweto · Roodepoort · Midrand
              </span>
            </div>
            <div style={{width:34,height:34,borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}
              onClick={()=>toast('New job alert','Burst pipe in Midrand — R900 budget',true)}>
              🔔
              <div style={{position:'absolute',top:6,right:6,width:7,height:7,borderRadius:'50%',background:'#C4593A',border:'1.5px solid #111110'}}/>
            </div>
          </div>

          {/* JOB FEED */}
          {view==='feed'&&(
            <div style={S.content}>
              <div style={{...S.statStrip}} className="stat-strip">
                {[{label:'This week',val:'R3,240',color:'#52C47F',delta:'↑ 18% vs last week'},{label:'Bids placed',val:'7',color:'#E07A5F',delta:'3 accepted this week'},{label:'Win rate',val:'43%',color:'#E8A020',delta:'↑ vs 31% last month'},{label:'Rating',val:'4.9',color:'#F5F0E8',delta:'★★★★★ 38 reviews'}].map(s=>(
                  <div key={s.label} style={S.statCard}>
                    <div style={S.statEyebrow}>{s.label}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:1,lineHeight:1,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:11,color:'rgba(245,240,232,.35)',marginTop:6,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:500}}>{s.delta}</div>
                  </div>
                ))}
              </div>

              <div style={S.secHeader}>
                <div style={S.secTitle}>
                  Open Jobs
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1.5,background:'rgba(196,89,58,.15)',color:'#E07A5F',border:'1px solid rgba(196,89,58,.25)',padding:'3px 10px',borderRadius:4}}>{visibleJobs.length} near you</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {['all','urgent','new'].map(f=>(
                    <div key={f} style={S.filterChip(filter===f)} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</div>
                  ))}
                </div>
              </div>

              {visibleJobs.map(job=>(
                <div key={job.id} style={S.jobCard} className="bid-in">
                  <div style={{display:'flex',alignItems:'center',gap:14,padding:'18px 20px 12px'}} onClick={()=>openModal(job)}>
                    <div style={S.urgBar(job.urgColor)}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:4}}>{job.emoji} {job.cat}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,color:'#F5F0E8',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{job.title}</div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.45)'}}>📍 {job.loc} · {job.dist} away</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:'#E07A5F',letterSpacing:.5,lineHeight:1}}>R{job.budgetNum.toLocaleString()}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:500,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.3)'}}>Max budget</div>
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

          {/* ACTIVE JOBS */}
          {view==='active'&&(
            <div style={S.content}>
              {[{init:'TM',name:'Burst pipe — kitchen sink',meta:'Soweto · En route · Due today 2pm',earn:'R720',status:'en-route',icon:'⏱',iconColor:'#E8A020'},
                {init:'TM',name:'Geyser replacement',meta:'Midrand · In progress · Due tomorrow',earn:'R1,800',status:'in-progress',icon:'🔧',iconColor:'#E07A5F'},
                {init:'TM',name:'New tap installation',meta:'Sandton · Completed · Payment pending',earn:'R450',status:'complete',icon:'✓',iconColor:'#3DAA6A'}
              ].map((j,i)=>(
                <div key={i} style={S.activeCard}>
                  <div style={{width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',background:`${j.iconColor}22`,border:`1px solid ${j.iconColor}55`,flexShrink:0,fontSize:16}}>{j.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:'#F5F0E8',marginBottom:2}}>{j.name}</div>
                    <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{j.meta}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'#52C47F',letterSpacing:.5}}>{j.earn}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.3)'}}>Agreed</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MY BIDS */}
          {view==='bids'&&(
            <div style={S.content}>
              {myBids.length===0?(
                <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(245,240,232,.3)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,letterSpacing:1}}>
                  No bids yet — go to Job Feed to start bidding
                </div>
              ):myBids.map((b,i)=>(
                <div key={i} style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'16px 20px',marginBottom:10,display:'flex',alignItems:'center',gap:14}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:'#F5F0E8',marginBottom:2}}>{b.job}</div>
                    <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{b.loc} · {b.time}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'#E07A5F'}}>R{b.price}</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.4)'}}>{b.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* EARNINGS */}
          {view==='earnings'&&(
            <div style={S.content}>
              <div style={{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:'20px 22px',marginBottom:20}}>
                <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:20}}>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:44,color:'#52C47F',letterSpacing:1,lineHeight:1}}>R12,840</div>
                    <div style={{fontSize:12,color:'rgba(245,240,232,.4)',marginTop:3}}>Total this month · May 2026</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'rgba(245,240,232,.5)'}}>R3,240</div>
                    <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:1,color:'rgba(245,240,232,.3)'}}>This week</div>
                  </div>
                </div>
                <div style={S.barChart}>
                  {[{h:'45%',label:'W1'},{h:'60%',label:'W2'},{h:'38%',label:'W3'},{h:'72%',label:'W4 ✦',highlight:true}].map(b=>(
                    <div key={b.label} style={S.barWrap}>
                      <div style={{width:'100%',borderRadius:'3px 3px 0 0',background:b.highlight?'#C4593A':'rgba(196,89,58,.3)',height:b.h,minHeight:4,transition:'height .6s ease'}}/>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,color:'rgba(245,240,232,.3)',textAlign:'center'}}>{b.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{...S.statStrip}} className="stat-strip">
                {[{label:'Jobs done',val:'14',color:'#52C47F'},{label:'Avg job value',val:'R917',color:'#E07A5F'},{label:'Commission paid',val:'R1,284',color:'#F5F0E8'},{label:'In escrow',val:'R450',color:'#E8A020'}].map(s=>(
                  <div key={s.label} style={S.statCard}>
                    <div style={S.statEyebrow}>{s.label}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:s.color,lineHeight:1}}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFILE */}
          {view==='profile'&&(
            <div style={S.content}>
              <div style={{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:28}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:20,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:'#9E3E24',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'#fff',border:'3px solid rgba(196,89,58,.3)'}}>TM</div>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:'#F5F0E8',lineHeight:1}}>THEMBA MOKOENA</div>
                    <div style={{fontSize:13,color:'rgba(245,240,232,.5)',marginTop:4}}>Licensed Plumber · 6 years experience</div>
                    <div style={{fontSize:13,color:'#E8A020',marginTop:3}}>★★★★★ 4.9 · 47 completed jobs</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[{label:'Service areas',val:'Soweto · Roodepoort · Midrand'},{label:'Qualification',val:'PIRB Registered · COID Active'},{label:'ID verified',val:'✓ Verified',green:true},{label:'Member since',val:'April 2026'}].map(r=>(
                    <div key={r.label}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>{r.label}</div>
                      <div style={{fontSize:13,color:r.green?'#52C47F':'rgba(245,240,232,.75)'}}>{r.val}</div>
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
              {[['Budget',modalJob.budget],['Urgency',modalJob.urgencyLabel],['Location',`${modalJob.loc} · ${modalJob.dist} from you`],['Timing',modalJob.timing]].map(([l,v])=>(
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
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:.5,color:'rgba(61,170,106,.7)'}}>You&apos;ll earn</div>
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
                    Bid submitted — <strong style={{color:'#52C47F'}}>R{modalJob.submitPrice}</strong>. Homeowner notified via WhatsApp.
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
