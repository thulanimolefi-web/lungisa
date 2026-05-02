'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 0 | 1 | 2 | 3 | 4 | 5

const CATEGORIES = [
  {name:'Plumbing',emoji:'🔧'},{name:'Electrical',emoji:'⚡'},{name:'Painting',emoji:'🎨'},
  {name:'Carpentry',emoji:'🪚'},{name:'Roofing',emoji:'🏠'},{name:'Tiling',emoji:'🚿'},
  {name:'Solar',emoji:'☀️'},{name:'Garden',emoji:'🌿'},{name:'Waterproofing',emoji:'💧'},
  {name:'Welding',emoji:'🔥'},{name:'Cleaning',emoji:'🧹'},{name:'General',emoji:'🔩'},
]
const URGENCIES = [
  {label:'Today — emergency',color:'#E24B4A'},
  {label:'Within 3 days',color:'#E8A020'},
  {label:'This week',color:'#3DAA6A'},
  {label:'Flexible',color:'#D4C9B4'},
]
const AREAS = ['Soweto','Sandton','Roodepoort','Midrand','Randburg','Fourways','Boksburg','Pretoria Central','Centurion']
const TIMES = ['Any time','Morning (7am–12pm)','Afternoon (12pm–5pm)','Evening (5pm–8pm)']

const BIDS = [
  {init:'TM',name:'Themba Mokoena',trade:'Licensed Plumber · 6 yrs',rating:'★★★★★',num:'4.9',jobs:'47 jobs',price:850,eta:'2 hrs',badge:'Top rated',bg:'#8B3A2A'},
  {init:'SK',name:'Sipho Khumalo',trade:'Plumber · 3 yrs',rating:'★★★★☆',num:'4.6',jobs:'19 jobs',price:720,eta:'1 hr',badge:'Fastest',bg:'#5A3A2A'},
  {init:'PN',name:'Patrick Nkosi',trade:'Master Plumber · 11 yrs',rating:'★★★★★',num:'4.8',jobs:'103 jobs',price:900,eta:'3 hrs',badge:'Most experience',bg:'#2A4A3A'},
]

export default function PostJob() {
  const router = useRouter()
  const [step, setStep]           = useState<Step>(0)
  const [cat, setCat]             = useState('Plumbing')
  const [catEmoji, setCatEmoji]   = useState('🔧')
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [area, setArea]           = useState('')
  const [urgency, setUrgency]     = useState('Today — emergency')
  const [date, setDate]           = useState('')
  const [time, setTime]           = useState('')
  const [budget, setBudget]       = useState(750)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [photos, setPhotos]       = useState<string[]>([])
  const [titleErr, setTitleErr]   = useState('')
  const [descErr, setDescErr]     = useState('')
  const [areaErr, setAreaErr]     = useState('')
  const [liveBids, setLiveBids]   = useState<typeof BIDS>([])
  const [bidCount, setBidCount]   = useState(0)
  const [selectedBid, setSelectedBid] = useState<typeof BIDS[0]|null>(null)
  const [counterAmt, setCounterAmt]   = useState('')
  const [counterResp, setCounterResp] = useState('')
  const [finalPrice, setFinalPrice]   = useState(0)
  const [accepted, setAccepted]       = useState(false)
  const [paid, setPaid]               = useState(false)
  const [toasts, setToasts]           = useState<{id:number,title:string,sub:string}[]>([])

  function toast(title:string, sub:string) {
    const id = Date.now()
    setToasts(t=>[...t,{id,title,sub}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500)
  }

  function goStep(n:Step) { setStep(n); window.scrollTo({top:0,behavior:'smooth'}) }

  function validateStep1() {
    let ok = true
    if(!title.trim()){setTitleErr('Please add a title');ok=false}else setTitleErr('')
    if(!desc.trim()){setDescErr('Please describe the problem');ok=false}else setDescErr('')
    if(ok) goStep(2)
  }

  function validateStep2() {
    if(!area){setAreaErr('Please select your area');return}
    setAreaErr(''); goStep(3)
  }

  function postJob() {
    goStep(5)
    toast('Job posted!','Your job is live. Tradespeople are being notified via WhatsApp.')
    setLiveBids([]); setBidCount(0); setSelectedBid(null)
    setCounterResp(''); setAccepted(false); setPaid(false)
    const delays = [3500,7000,13000]
    BIDS.forEach((bid,i)=>{
      setTimeout(()=>{
        setLiveBids(b=>[...b,bid])
        setBidCount(c=>c+1)
        toast('New bid received',`${bid.name} bid R${bid.price} · ETA ${bid.eta}`)
      }, delays[i])
    })
  }

  function sendCounter() {
    if(!selectedBid||!counterAmt) return
    setCounterResp('sending')
    setTimeout(()=>{
      const offered = parseInt(counterAmt)
      if(offered >= selectedBid.price * 0.82) {
        setCounterResp('accepted')
        setFinalPrice(offered)
        toast('Counter accepted!',`${selectedBid.name.split(' ')[0]} accepted R${offered}`)
      } else {
        setCounterResp('declined')
      }
    },1800)
  }

  function acceptBid(bid:typeof BIDS[0], price:number) {
    setSelectedBid(bid); setFinalPrice(price); setAccepted(true)
    window.scrollTo({top:9999,behavior:'smooth'})
  }

  const S = {
    wrap:{minHeight:'100vh',background:'#1A1A16',fontFamily:'var(--fb)'},
    topnav:{background:'#111110',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'0 28px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky' as const,top:0,zIndex:40},
    navLogo:{display:'flex',alignItems:'center',gap:9,textDecoration:'none' as const},
    navWord:{fontFamily:'var(--fd)',fontSize:22,letterSpacing:2,color:'var(--cream)'},
    stepBar:{background:'#111110',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'0 28px',display:'flex',alignItems:'center',overflowX:'auto' as const},
    pageWrap:{maxWidth:1100,margin:'0 auto',padding:'32px 28px',display:'grid' as const,gridTemplateColumns:'1fr 340px',gap:32,alignItems:'start'},
    card:{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:'28px 28px',marginBottom:20},
    cardEyebrow:{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:3,textTransform:'uppercase' as const,color:'var(--terra-l)',marginBottom:8,display:'flex',alignItems:'center',gap:8},
    cardTitle:{fontFamily:'var(--fd)',fontSize:38,letterSpacing:1.5,lineHeight:.95,color:'var(--cream)',marginBottom:6},
    cardSub:{fontSize:14,color:'rgba(245,240,232,.5)',lineHeight:1.55,marginBottom:24},
    catGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20},
    catTile:(sel:boolean)=>({border:`1.5px solid ${sel?'var(--terra)':'rgba(255,255,255,.08)'}`,borderRadius:10,padding:'14px 10px',cursor:'pointer',background:sel?'rgba(196,89,58,.08)':'rgba(255,255,255,.03)',textAlign:'center' as const,transition:'all .18s'}),
    catEmoji:{fontSize:20,display:'block',marginBottom:6},
    catName:{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,color:'rgba(245,240,232,.6)'},
    label:{display:'block',fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase' as const,color:'rgba(245,240,232,.45)',marginBottom:8},
    input:{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'12px 16px',fontFamily:'var(--fb)',fontSize:15,color:'var(--cream)',outline:'none',marginBottom:16},
    textarea:{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'12px 16px',fontFamily:'var(--fb)',fontSize:15,color:'var(--cream)',outline:'none',height:100,resize:'vertical' as const,lineHeight:1.6,marginBottom:4},
    select:{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'12px 16px',fontFamily:'var(--fb)',fontSize:15,color:'var(--cream)',outline:'none',marginBottom:16},
    err:{fontSize:12,color:'#f08080',marginBottom:12,fontFamily:'var(--fc)'},
    urgencyChips:{display:'flex',gap:10,flexWrap:'wrap' as const,marginBottom:20},
    urgChip:(sel:boolean)=>({border:`1.5px solid ${sel?'var(--terra)':'rgba(255,255,255,.1)'}`,borderRadius:6,padding:'10px 16px',cursor:'pointer',background:sel?'rgba(196,89,58,.1)':'rgba(255,255,255,.04)',fontFamily:'var(--fc)',fontSize:13,fontWeight:600,color:sel?'var(--terra-l)':'rgba(245,240,232,.5)',display:'flex',alignItems:'center',gap:8,transition:'all .15s'}),
    btnRow:{display:'flex',gap:12,marginTop:8},
    btn:(variant:'primary'|'ghost')=>({padding:'13px 24px',borderRadius:8,fontFamily:'var(--fc)',fontSize:14,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,cursor:'pointer',border:variant==='primary'?'none':'1px solid rgba(255,255,255,.1)',background:variant==='primary'?'var(--terra)':'rgba(255,255,255,.06)',color:variant==='primary'?'#fff':'rgba(245,240,232,.6)',flex:variant==='primary'?1:undefined,display:'flex',alignItems:'center',justifyContent:'center' as const,gap:8}),
    budgetDisplay:{fontFamily:'var(--fd)',fontSize:48,color:'var(--terra-l)',textAlign:'center' as const,marginBottom:4},
    sidebar:{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:'20px 22px',marginBottom:16},
    sbEyebrow:{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase' as const,color:'rgba(245,240,232,.35)',marginBottom:10},
    sbTitle:{fontFamily:'var(--fd)',fontSize:24,letterSpacing:1,color:'var(--cream)',lineHeight:.95,marginBottom:14},
    jpRow:{display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:13},
    jpLabel:{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase' as const,color:'rgba(245,240,232,.35)',minWidth:70,flexShrink:0,paddingTop:1},
    jpVal:{color:'rgba(245,240,232,.75)',fontSize:13,lineHeight:1.4},
    liveHeader:{background:'var(--charcoal)',borderRadius:12,padding:'22px 26px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between'},
    bidCard:(sel:boolean)=>({background:sel?'rgba(196,89,58,.06)':'#222220',borderRadius:12,border:`1.5px solid ${sel?'var(--terra)':'rgba(255,255,255,.06)'}`,padding:'18px 20px',marginBottom:12,display:'flex',alignItems:'center',gap:16,cursor:'pointer',transition:'all .2s'}),
    bidAvatar:(bg:string)=>({width:48,height:48,borderRadius:'50%',background:bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--fd)',fontSize:18,color:'#fff',flexShrink:0}),
    bidPrice:{fontFamily:'var(--fd)',fontSize:30,color:'var(--terra-l)',lineHeight:1},
    confirmCard:{background:'var(--charcoal)',borderRadius:12,padding:'24px',marginBottom:16},
    payBtn:{border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:14,background:'rgba(255,255,255,.04)',cursor:'pointer',textAlign:'center' as const,flex:1,transition:'all .18s'},
    toast:{background:'#2C2C28',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'flex-start',gap:10,maxWidth:280},
  }

  const stepLabels = ['Category','Job Details','Location','Budget','Review','Live Bids']

  return (
    <>
      <style>{}</style>

      <div style={S.wrap}>
        {/* NAV */}
        <nav style={S.topnav}>
          <a href="/" style={S.navLogo}><span style={S.navWord}>LUNGISA</span></a>
          <div style={{fontFamily:'var(--fc)',fontSize:13,color:'rgba(245,240,232,.5)',letterSpacing:1}}>Post a Job</div>
        </nav>

        {/* STEP BAR */}
        <div style={S.stepBar}>
          {stepLabels.map((label,i)=>(
            <div key={i} onClick={()=>i<=step&&goStep(i as Step)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'14px 16px 14px 0',cursor:i<=step?'pointer':'default',position:'relative'}}>
              <div style={{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--fc)',fontSize:11,fontWeight:700,background:i<step?'var(--terra)':i===step?'var(--terra)':'rgba(255,255,255,.1)',color:i<=step?'#fff':'rgba(245,240,232,.35)',flexShrink:0,transition:'all .25s'}}>
                {i<step?'✓':i+1}
              </div>
              <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:i===step?'var(--terra-l)':i<step?'rgba(245,240,232,.6)':'rgba(245,240,232,.3)',whiteSpace:'nowrap'}}>
                {label}
              </span>
              {i<5&&<span style={{marginLeft:8,color:'rgba(255,255,255,.2)',fontSize:16}}>›</span>}
            </div>
          ))}
        </div>

        <div style={S.pageWrap} className="page-grid">
          <div>

            {/* STEP 0: CATEGORY */}
            {step===0&&(
              <div style={S.card}>
                <div style={S.cardEyebrow}><span style={{width:14,height:2,background:'var(--terra)',display:'inline-block'}}/>Step 1 of 5</div>
                <div style={S.cardTitle}>WHAT NEEDS<br/>FIXING?</div>
                <p style={S.cardSub}>Select the type of job.</p>
                <div style={S.catGrid}>
                  {CATEGORIES.map(c=>(
                    <div key={c.name} style={S.catTile(cat===c.name)} onClick={()=>{setCat(c.name);setCatEmoji(c.emoji)}}>
                      <span style={S.catEmoji}>{c.emoji}</span>
                      <div style={S.catName}>{c.name}</div>
                    </div>
                  ))}
                </div>
                <div style={S.btnRow}>
                  <button style={S.btn('primary')} onClick={()=>goStep(1)}>Continue →</button>
                </div>
              </div>
            )}

            {/* STEP 1: JOB DETAILS */}
            {step===1&&(
              <div style={S.card}>
                <div style={S.cardEyebrow}><span style={{width:14,height:2,background:'var(--terra)',display:'inline-block'}}/>Step 2 of 5</div>
                <div style={S.cardTitle}>DESCRIBE<br/>THE JOB</div>
                <p style={S.cardSub}>Be specific — better descriptions get better bids faster.</p>
                <label style={S.label}>Job title *</label>
                <input style={S.input} value={title} onChange={e=>setTitle(e.target.value)} placeholder="E.g. Burst pipe under kitchen sink" maxLength={60}/>
                {titleErr&&<div style={S.err}>{titleErr}</div>}
                <label style={S.label}>Describe the problem *</label>
                <textarea style={S.textarea} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="E.g. There's a burst pipe under my kitchen sink — water is leaking onto the floor..." maxLength={500}/>
                <div style={{fontSize:11,color:'rgba(245,240,232,.3)',textAlign:'right',marginBottom:16}}>{500-desc.length} chars left</div>
                {descErr&&<div style={S.err}>{descErr}</div>}
                <div style={S.btnRow}>
                  <button style={S.btn('ghost')} onClick={()=>goStep(0)}>← Back</button>
                  <button style={S.btn('primary')} onClick={validateStep1}>Continue →</button>
                </div>
              </div>
            )}

            {/* STEP 2: LOCATION */}
            {step===2&&(
              <div style={S.card}>
                <div style={S.cardEyebrow}><span style={{width:14,height:2,background:'var(--terra)',display:'inline-block'}}/>Step 3 of 5</div>
                <div style={S.cardTitle}>WHERE &<br/>WHEN?</div>
                <p style={S.cardSub}>Tradespeople need your location to submit accurate bids.</p>
                <label style={S.label}>Area *</label>
                <select style={S.select} value={area} onChange={e=>setArea(e.target.value)}>
                  <option value="">Select area</option>
                  {AREAS.map(a=><option key={a}>{a}</option>)}
                </select>
                {areaErr&&<div style={S.err}>{areaErr}</div>}
                <label style={S.label}>How urgent?</label>
                <div style={S.urgencyChips}>
                  {URGENCIES.map(u=>(
                    <div key={u.label} style={S.urgChip(urgency===u.label)} onClick={()=>setUrgency(u.label)}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:u.color,flexShrink:0}}/>
                      {u.label}
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <div>
                    <label style={S.label}>Preferred date</label>
                    <input style={S.input} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
                  </div>
                  <div>
                    <label style={S.label}>Preferred time</label>
                    <select style={S.select} value={time} onChange={e=>setTime(e.target.value)}>
                      {TIMES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={S.btnRow}>
                  <button style={S.btn('ghost')} onClick={()=>goStep(1)}>← Back</button>
                  <button style={S.btn('primary')} onClick={validateStep2}>Continue →</button>
                </div>
              </div>
            )}

            {/* STEP 3: BUDGET */}
            {step===3&&(
              <div style={S.card}>
                <div style={S.cardEyebrow}><span style={{width:14,height:2,background:'var(--terra)',display:'inline-block'}}/>Step 4 of 5</div>
                <div style={S.cardTitle}>BUDGET &<br/>PHOTOS</div>
                <p style={S.cardSub}>Set a rough budget to attract relevant bids.</p>
                <div style={S.budgetDisplay}>{budgetOpen?'Open':`R ${budget.toLocaleString()}`}</div>
                <div style={{textAlign:'center',fontSize:12,color:'rgba(245,240,232,.4)',marginBottom:14}}>Drag to set your maximum budget</div>
                <input type="range" min={200} max={10000} step={50} value={budget} onChange={e=>{setBudget(parseInt(e.target.value));setBudgetOpen(false)}}
                  style={{width:'100%',accentColor:'var(--terra)',marginBottom:8}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'rgba(245,240,232,.3)',marginBottom:8}}>
                  <span>R200</span><span>R10,000+</span>
                </div>
                <button onClick={()=>setBudgetOpen(true)} style={{background:'none',border:'none',cursor:'pointer',fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.4)',textDecoration:'underline',display:'block',margin:'0 auto 20px'}}>
                  Skip — show me all bids
                </button>
                <div style={{border:'2px dashed rgba(255,255,255,.1)',borderRadius:10,padding:24,textAlign:'center',cursor:'pointer',marginBottom:8}} onClick={()=>setPhotos(p=>[...p,`Photo ${p.length+1}`])}>
                  <div style={{fontSize:13,color:'rgba(245,240,232,.5)'}}>📸 Tap to add photos</div>
                  <div style={{fontSize:11,color:'rgba(245,240,232,.3)',marginTop:4}}>Jobs with photos get 3× more bids</div>
                  {photos.length>0&&<div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12,flexWrap:'wrap'}}>
                    {photos.map((p,i)=><div key={i} style={{width:56,height:56,borderRadius:8,background:'rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>📷</div>)}
                  </div>}
                </div>
                <div style={S.btnRow}>
                  <button style={S.btn('ghost')} onClick={()=>goStep(2)}>← Back</button>
                  <button style={S.btn('primary')} onClick={()=>goStep(4)}>Review Job →</button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW */}
            {step===4&&(
              <div style={S.card}>
                <div style={S.cardEyebrow}><span style={{width:14,height:2,background:'var(--terra)',display:'inline-block'}}/>Step 5 of 5</div>
                <div style={S.cardTitle}>REVIEW<br/>& POST</div>
                <p style={S.cardSub}>Check everything looks right. Once posted, tradespeople will start bidding immediately.</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
                  <div><div style={{fontFamily:'var(--fc)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>Category</div><div style={{fontFamily:'var(--fc)',fontSize:18,fontWeight:700,color:'var(--terra-l)'}}>{catEmoji} {cat}</div></div>
                  <div><div style={{fontFamily:'var(--fc)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>Urgency</div><div style={{fontFamily:'var(--fc)',fontSize:16,fontWeight:700,color:'var(--terra-l)'}}>{urgency}</div></div>
                </div>
                <div style={{marginBottom:14}}><div style={{fontFamily:'var(--fc)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>Title</div><div style={{fontSize:16,fontWeight:600,color:'var(--cream)'}}>{title||'—'}</div></div>
                <div style={{marginBottom:14}}><div style={{fontFamily:'var(--fc)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>Description</div><div style={{fontSize:13,color:'rgba(245,240,232,.65)',lineHeight:1.55}}>{desc||'—'}</div></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
                  <div><div style={{fontFamily:'var(--fc)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>Location</div><div style={{fontSize:14,color:'var(--cream)'}}>{area||'—'}, JHB</div></div>
                  <div><div style={{fontFamily:'var(--fc)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>Budget</div><div style={{fontFamily:'var(--fd)',fontSize:22,color:'var(--terra-l)'}}>{budgetOpen?'Open':`R ${budget.toLocaleString()}`}</div></div>
                </div>
                <div style={{background:'rgba(196,89,58,.08)',border:'1px solid rgba(196,89,58,.2)',borderRadius:8,padding:'12px 16px',fontSize:13,color:'rgba(245,240,232,.65)',marginBottom:20,lineHeight:1.55}}>
                  <strong style={{color:'var(--terra-l)'}}>FREE TO POST.</strong> Lungisa charges R0 to homeowners. Tradespeople pay a small commission only when a job is completed.
                </div>
                <div style={S.btnRow}>
                  <button style={S.btn('ghost')} onClick={()=>goStep(3)}>← Edit</button>
                  <button style={{...S.btn('primary'),background:'var(--terra)'}} onClick={postJob}>🔨 Post Job — Get Free Bids</button>
                </div>
              </div>
            )}

            {/* STEP 5: LIVE BIDS */}
            {step===5&&(
              <div>
                <div style={S.liveHeader}>
                  <div>
                    <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#3DAA6A',display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:'#3DAA6A'}}/>Live
                    </div>
                    <div style={{fontFamily:'var(--fd)',fontSize:24,letterSpacing:1,color:'var(--cream)'}}>{title||'Home repair job'}</div>
                    <div style={{fontSize:13,color:'rgba(245,240,232,.45)',marginTop:2}}>{area}, JHB · {cat} · {urgency}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'var(--fd)',fontSize:52,color:'var(--terra-l)',lineHeight:1}}>{bidCount}</div>
                    <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)'}}>bids received</div>
                  </div>
                </div>

                {bidCount===0&&(
                  <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(245,240,232,.3)',fontFamily:'var(--fc)',fontSize:14,letterSpacing:1}}>
                    Notifying tradespeople via WhatsApp...
                  </div>
                )}

                {liveBids.map((bid,i)=>(
                  <div key={i} className="bid-card-anim" style={S.bidCard(selectedBid?.name===bid.name)} onClick={()=>setSelectedBid(bid)}>
                    <div style={S.bidAvatar(bid.bg)}>{bid.init}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--fb)',fontSize:15,fontWeight:600,color:'var(--cream)',marginBottom:2}}>{bid.name}</div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.45)',marginBottom:3}}>{bid.trade}</div>
                      <div style={{fontSize:12,color:'#E8A020'}}>{bid.rating} <span style={{color:'rgba(245,240,232,.45)'}}>{bid.num}</span></div>
                      <div style={{fontSize:11,color:'rgba(245,240,232,.4)'}}>{bid.jobs} on Lungisa</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={S.bidPrice}>R{bid.price}</div>
                      <div style={{fontSize:11,color:'rgba(245,240,232,.4)',marginTop:2}}>ETA: {bid.eta}</div>
                      <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',background:'rgba(196,89,58,.15)',color:'var(--terra-l)',padding:'3px 8px',borderRadius:3,marginTop:4,display:'inline-block'}}>{bid.badge}</div>
                    </div>
                  </div>
                ))}

                {selectedBid&&!accepted&&(
                  <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,border:'1px solid rgba(255,255,255,.08)',padding:'16px 20px',marginTop:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div style={{fontFamily:'var(--fc)',fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--cream)'}}>Counter-offer</div>
                      <div style={{fontSize:13,color:'rgba(245,240,232,.5)'}}>Negotiating with <strong style={{color:'var(--cream)'}}>{selectedBid.name.split(' ')[0]}</strong></div>
                    </div>
                    <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
                      <div style={{fontFamily:'var(--fd)',fontSize:24,color:'rgba(245,240,232,.4)',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'8px 0 0 8px',padding:'10px 14px'}}>R</div>
                      <input type="number" placeholder={String(Math.round(selectedBid.price*0.9))} value={counterAmt} onChange={e=>setCounterAmt(e.target.value)}
                        style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'0 8px 8px 0',padding:'10px 14px',fontFamily:'var(--fd)',fontSize:24,color:'var(--cream)',outline:'none'}}/>
                    </div>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={sendCounter} style={{...S.btn('primary'),flex:'none',padding:'11px 20px',fontSize:13}}>Send Counter-offer</button>
                      <button onClick={()=>acceptBid(selectedBid,selectedBid.price)} style={{...S.btn('ghost'),fontSize:13,padding:'11px 18px'}}>Accept as-is</button>
                    </div>
                    {counterResp==='sending'&&<div style={{fontSize:13,color:'rgba(245,240,232,.5)',marginTop:10}}>Sending offer...</div>}
                    {counterResp==='accepted'&&(
                      <div style={{background:'rgba(61,170,106,.1)',border:'1px solid rgba(61,170,106,.25)',borderRadius:8,padding:'12px 14px',marginTop:10,fontSize:13,color:'rgba(61,170,106,.9)'}}>
                        ✓ <strong>{selectedBid.name.split(' ')[0]} accepted R{counterAmt}.</strong> Ready to confirm and pay.
                        <div style={{marginTop:10}}><button onClick={()=>acceptBid(selectedBid,parseInt(counterAmt))} style={{...S.btn('primary'),flex:'none',width:'auto',padding:'10px 20px',fontSize:13}}>Confirm & Pay →</button></div>
                      </div>
                    )}
                    {counterResp==='declined'&&(
                      <div style={{background:'rgba(196,89,58,.08)',border:'1px solid rgba(196,89,58,.2)',borderRadius:8,padding:'12px 14px',marginTop:10,fontSize:13,color:'rgba(196,89,58,.9)'}}>
                        ✗ {selectedBid.name.split(' ')[0]} declined. Try a higher amount.
                      </div>
                    )}
                  </div>
                )}

                {accepted&&!paid&&selectedBid&&(
                  <div style={{marginTop:16}}>
                    <div style={S.confirmCard}>
                      <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(61,170,106,.8)',marginBottom:12}}>✓ Bid accepted</div>
                      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18,paddingBottom:18,borderBottom:'1px solid rgba(255,255,255,.08)'}}>
                        <div style={S.bidAvatar(selectedBid.bg)}>{selectedBid.init}</div>
                        <div>
                          <div style={{fontFamily:'var(--fc)',fontSize:18,fontWeight:700,color:'var(--cream)'}}>{selectedBid.name}</div>
                          <div style={{fontSize:12,color:'rgba(245,240,232,.5)',marginTop:2}}>{selectedBid.trade}</div>
                          <div style={{fontSize:12,color:'#E8A020',marginTop:2}}>{selectedBid.rating} {selectedBid.num}</div>
                        </div>
                      </div>
                      {[['Job',title||'Home repair'],['Location',`${area}, JHB`],['ETA',selectedBid.eta],['Agreed price',`R${finalPrice}`],['Lungisa fee','R0 (free for homeowners)']].map(([l,v])=>(
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
                          <span style={{fontSize:13,color:'rgba(245,240,232,.45)'}}>{l}</span>
                          <span style={{fontSize:l==='Agreed price'?20:13,color:l==='Agreed price'?'var(--terra-l)':'var(--cream)',fontFamily:l==='Agreed price'?'var(--fd)':undefined}}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'12px 14px',fontSize:12,color:'rgba(61,170,106,.85)',display:'flex',alignItems:'flex-start',gap:8,marginBottom:16,lineHeight:1.5}}>
                      🔒 Your payment is held in escrow. <strong>Only released once you confirm the job is complete.</strong>
                    </div>
                    <div style={{display:'flex',gap:12}}>
                      <button onClick={()=>setPaid(true)} style={{...S.btn('primary')}}>Pay by Card</button>
                      <button onClick={()=>setPaid(true)} style={{...S.btn('primary'),background:'rgba(255,255,255,.08)',color:'var(--cream)'}}>Pay by EFT</button>
                    </div>
                  </div>
                )}

                {paid&&selectedBid&&(
                  <div style={{...S.card,textAlign:'center',padding:'40px 28px'}}>
                    <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(61,170,106,.12)',border:'2px solid rgba(61,170,106,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:32}}>✓</div>
                    <div style={{fontFamily:'var(--fd)',fontSize:44,letterSpacing:2,color:'var(--cream)',marginBottom:8}}>JOB IS<br/>LIVE.</div>
                    <p style={{fontSize:14,color:'rgba(245,240,232,.5)',marginBottom:28}}>{selectedBid.name.split(' ')[0]} is on his way. You&apos;ll get a WhatsApp when he&apos;s 30 minutes away.</p>
                    <button style={{...S.btn('primary'),maxWidth:260,margin:'0 auto'}} onClick={()=>{goStep(0);setLiveBids([]);setBidCount(0);setTitle('');setDesc('');setArea('');setPhotos([]);setAccepted(false);setPaid(false);setSelectedBid(null)}}>
                      Post another job
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SIDEBAR */}
          <div className="sidebar-col">
            <div style={S.sidebar}>
              <div style={S.sbEyebrow}>Job preview</div>
              <div style={S.sbTitle}>{title?title.substring(0,22).toUpperCase():'YOUR JOB'}</div>
              {[['Category',`${catEmoji} ${cat}`],['Title',title||'Not yet filled'],['Location',area?`${area}, JHB`:'Not yet filled'],['Urgency',urgency],['Budget',budgetOpen?'Open':`R ${budget.toLocaleString()}`]].map(([l,v])=>(
                <div key={l} style={S.jpRow}>
                  <span style={S.jpLabel}>{l}</span>
                  <span style={{...S.jpVal,color:v==='Not yet filled'?'rgba(245,240,232,.2)':'rgba(245,240,232,.75)',fontStyle:v==='Not yet filled'?'italic':'normal'}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px'}}>
              <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--cream)',marginBottom:10}}>Tips for more bids</div>
              {['Be specific — details get better bids','Add a photo — 3× more responses','Set a realistic budget','Mark urgent jobs as "today"'].map(t=>(
                <div key={t} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:8,fontSize:12,color:'rgba(245,240,232,.5)',lineHeight:1.5}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'var(--terra)',marginTop:5,flexShrink:0}}/>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATIONS */}
      <div style={{position:'fixed',bottom:24,right:24,zIndex:200,pointerEvents:'none'}}>
        {toasts.map(t=>(
          <div key={t.id} className="toast-anim" style={S.toast}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'var(--terra)',marginTop:4,flexShrink:0}}/>
            <div>
              <div style={{fontFamily:'var(--fc)',fontSize:12,fontWeight:700,color:'var(--cream)',marginBottom:1}}>{t.title}</div>
              <div style={{fontSize:11,color:'rgba(245,240,232,.45)',lineHeight:1.4}}>{t.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
