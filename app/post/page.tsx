'use client'

import { supabase } from '../lib/supabase'
import { useState, useEffect, useRef } from 'react'
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
const AVATAR_COLORS = ['#8B3A2A','#5A3A2A','#2A4A3A','#3A4A6A','#6A3A5A','#4A5A2A']

const MAX_IMAGES = 3
const MAX_VIDEOS = 1

type MediaFile = {
  url:       string
  type:      'image' | 'video'
  name:      string
  size:      number
}

type RealBid = {
  id: string
  name: string
  init: string
  bg: string
  trade: string
  rating: string
  ratingNum: string
  jobs: number
  price: number
  eta: string
}

export default function PostJob() {
  const router = useRouter()
  const [step, setStep]               = useState<Step>(0)
  const [cat, setCat]                 = useState('Plumbing')
  const [catEmoji, setCatEmoji]       = useState('🔧')
  const [title, setTitle]             = useState('')
  const [desc, setDesc]               = useState('')
  const [area, setArea]               = useState('')
  const [urgency, setUrgency]         = useState('Today — emergency')
  const [date, setDate]               = useState('')
  const [time, setTime]               = useState('')
  const [budget, setBudget]           = useState(750)
  const [budgetOpen, setBudgetOpen]   = useState(false)

  // ── Media state — track files with type ──────────────────────────
  const [mediaFiles, setMediaFiles]   = useState<MediaFile[]>([])
  const [uploading, setUploading]     = useState(false)
  const [uploadErr, setUploadErr]     = useState('')
  const imageInputRef                 = useRef<HTMLInputElement>(null)
  const videoInputRef                 = useRef<HTMLInputElement>(null)

  const images = mediaFiles.filter(m => m.type === 'image')
  const videos = mediaFiles.filter(m => m.type === 'video')

  const [titleErr, setTitleErr]       = useState('')
  const [descErr, setDescErr]         = useState('')
  const [areaErr, setAreaErr]         = useState('')
  const [postedJobId, setPostedJobId] = useState<string|null>(null)
  const [liveBids, setLiveBids]       = useState<RealBid[]>([])
  const [bidCount, setBidCount]       = useState(0)
  const [selectedBid, setSelectedBid] = useState<RealBid|null>(null)
  const [finalPrice, setFinalPrice]   = useState(0)
  const [accepted, setAccepted]       = useState(false)
  const [paid, setPaid]               = useState(false)
  const [toasts, setToasts]           = useState<{id:number,title:string,sub:string}[]>([])
  const [waitingMsg, setWaitingMsg]   = useState('Notifying tradespeople in your area...')
  const pollRef                       = useRef<NodeJS.Timeout|null>(null)

  // Poll for real bids after job is posted
  useEffect(()=>{
    if(!postedJobId) return
    const waitMessages = [
      'Notifying tradespeople in your area...',
      'Tradespeople are reviewing your job...',
      'First bids usually arrive within 5 minutes...',
      'Hang tight — tradespeople are checking their schedules...',
    ]
    let msgIdx = 0
    const msgInterval = setInterval(()=>{
      msgIdx = (msgIdx+1) % waitMessages.length
      setWaitingMsg(waitMessages[msgIdx])
    }, 4000)

    const channel = supabase
      .channel(`bids-${postedJobId}`)
      .on('postgres_changes',{
        event: 'INSERT', schema: 'public', table: 'bids',
        filter: `job_id=eq.${postedJobId}`,
      }, async (payload)=>{
        const bid = payload.new as any
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, tradesperson_profiles(trade_category, years_experience, rating_avg, jobs_completed)')
          .eq('id', bid.tradesperson_id)
          .single()
        const name = profile?.full_name || 'Tradesperson'
        const tp   = (profile as any)?.tradesperson_profiles
        const newBid: RealBid = {
          id:        bid.id,
          name,
          init:      name.split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase(),
          bg:        AVATAR_COLORS[Math.floor(Math.random()*AVATAR_COLORS.length)],
          trade:     `${tp?.trade_category?tp.trade_category.charAt(0).toUpperCase()+tp.trade_category.slice(1):'Tradesperson'} · ${tp?.years_experience||0} yrs`,
          rating:    '★★★★★',
          ratingNum: tp?.rating_avg>0?String(tp.rating_avg):'New',
          jobs:      tp?.jobs_completed||0,
          price:     bid.amount,
          eta:       bid.eta_label,
        }
        setLiveBids(b=>{
          if(b.find(x=>x.id===newBid.id)) return b
          toast('New bid received!',`${name.split(' ')[0]} bid R${bid.amount} · ETA ${bid.eta_label}`)
          return [...b, newBid]
        })
        setBidCount(c=>c+1)
      })
      .subscribe()

    pollRef.current = setInterval(async()=>{
      const { data } = await supabase
        .from('bids')
        .select(`*, profiles!tradesperson_id(full_name, tradesperson_profiles(trade_category, years_experience, rating_avg, jobs_completed))`)
        .eq('job_id', postedJobId)
        .order('created_at', {ascending:true})
      if(data && data.length > 0){
        const mapped: RealBid[] = data.map((b:any,i:number)=>({
          id:        b.id,
          name:      b.profiles?.full_name||'Tradesperson',
          init:      (b.profiles?.full_name||'T').split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase(),
          bg:        AVATAR_COLORS[i%AVATAR_COLORS.length],
          trade:     `${b.profiles?.tradesperson_profiles?.trade_category?b.profiles.tradesperson_profiles.trade_category.charAt(0).toUpperCase()+b.profiles.tradesperson_profiles.trade_category.slice(1):'Tradesperson'} · ${b.profiles?.tradesperson_profiles?.years_experience||0} yrs`,
          rating:    '★★★★★',
          ratingNum: b.profiles?.tradesperson_profiles?.rating_avg>0?String(b.profiles.tradesperson_profiles.rating_avg):'New',
          jobs:      b.profiles?.tradesperson_profiles?.jobs_completed||0,
          price:     b.amount,
          eta:       b.eta_label,
        }))
        setLiveBids(mapped)
        setBidCount(mapped.length)
      }
    }, 30000)

    return ()=>{
      clearInterval(msgInterval)
      if(pollRef.current) clearInterval(pollRef.current)
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[postedJobId])

  function toast(title:string, sub:string) {
    const id = Date.now()
    setToasts(t=>[...t,{id,title,sub}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500)
  }

  // ── Upload images (max 3) ────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files||[])
    if(!files.length) return
    setUploadErr('')

    const remaining = MAX_IMAGES - images.length
    if(remaining <= 0) { setUploadErr('Maximum 3 photos already attached'); return }

    const toUpload = files.slice(0, remaining)
    if(files.length > remaining) {
      setUploadErr(`Only ${remaining} more photo${remaining>1?'s':''} allowed — uploading first ${remaining}`)
    }

    setUploading(true)
    const uploaded: MediaFile[] = []

    for(const file of toUpload) {
      if(!file.type.startsWith('image/')) { setUploadErr('Please select image files only'); continue }
      if(file.size > 10 * 1024 * 1024) { setUploadErr(`${file.name} is too large — max 10MB`); continue }

      try {
        const ext      = file.name.split('.').pop()
        const path     = `job-media/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
        const { data, error } = await supabase.storage
          .from('job-photos')
          .upload(path, file, { cacheControl:'3600', upsert:false, contentType: file.type })

        if(error) { setUploadErr('Upload failed: '+error.message); continue }
        const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(data.path)
        uploaded.push({ url: urlData.publicUrl, type: 'image', name: file.name, size: file.size })
      } catch(err) {
        setUploadErr('Upload error — please try again')
      }
    }

    if(uploaded.length > 0) {
      setMediaFiles(prev => [...prev, ...uploaded])
      toast(`${uploaded.length} photo${uploaded.length>1?'s':''} added ✓`, 'Tradespeople will see your photos when bidding')
    }
    setUploading(false)
    // Reset input so same file can be re-selected if needed
    if(imageInputRef.current) imageInputRef.current.value = ''
  }

  // ── Upload video (max 1) ─────────────────────────────────────────
  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if(!file) return
    setUploadErr('')

    if(videos.length >= MAX_VIDEOS) { setUploadErr('Maximum 1 video already attached'); return }
    if(!file.type.startsWith('video/')) { setUploadErr('Please select a video file'); return }
    if(file.size > 50 * 1024 * 1024) { setUploadErr('Video must be under 50MB'); return }

    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `job-media/videos/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('job-photos')
        .upload(path, file, { cacheControl:'3600', upsert:false, contentType: file.type })

      if(error) { setUploadErr('Video upload failed: '+error.message); setUploading(false); return }
      const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(data.path)
      setMediaFiles(prev => [...prev, { url: urlData.publicUrl, type: 'video', name: file.name, size: file.size }])
      toast('Video added ✓', 'Tradespeople can review your video before bidding')
    } catch(err) {
      setUploadErr('Video upload error — please try again')
    }
    setUploading(false)
    if(videoInputRef.current) videoInputRef.current.value = ''
  }

  function removeMedia(idx: number) {
    setMediaFiles(prev => prev.filter((_,i) => i !== idx))
  }

  function formatSize(bytes: number) {
    if(bytes < 1024*1024) return `${(bytes/1024).toFixed(0)}KB`
    return `${(bytes/1024/1024).toFixed(1)}MB`
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

  async function postJob() {
    goStep(5)
    toast('Job posted!','Your job is live. Tradespeople are being notified.')
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      if(!session?.user) { window.location.href = '/auth'; return }

      const { data, error } = await supabase.from('jobs').insert({
        homeowner_id:   session.user.id,
        title,
        description:    desc,
        category:       cat.toLowerCase() as any,
        urgency:        urgency==='Today — emergency'?'emergency':urgency==='Within 3 days'?'within_3_days':urgency==='This week'?'this_week':'flexible',
        area,
        city:           'Johannesburg',
        budget_max:     budgetOpen ? null : budget,
        preferred_date: date||null,
        preferred_time: time||null,
        status:         'open',
        expires_at:     new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      }).select('id').single()

      if(error) { toast('Error posting job', error.message); return }

      if(data) {
        setPostedJobId(data.id)
        // Save all media to job_photos table
        if(mediaFiles.length > 0) {
          await supabase.from('job_photos').insert(
            mediaFiles.map((m, i) => ({
              job_id:      data.id,
              storage_url: m.url,
              file_type:   m.type,
              sort_order:  i,
            }))
          )
        }
      }
    } catch(e) {
      console.error('Job post error:', e)
    }
  }


  function acceptBid(bid:RealBid, price:number) {
    setSelectedBid(bid); setFinalPrice(price); setAccepted(true)
    window.scrollTo({top:9999,behavior:'smooth'})
  }

  function resetAndPostAnother() {
    setStep(0); setLiveBids([]); setBidCount(0); setTitle(''); setDesc('')
    setArea(''); setMediaFiles([]); setAccepted(false); setPaid(false)
    setSelectedBid(null); setPostedJobId(null); setFinalPrice(0)
  }

  const S = {
    wrap:{minHeight:'100vh',background:'#1A1A16',fontFamily:'var(--fb)'},
    topnav:{background:'#111110',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'0 28px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky' as const,top:0,zIndex:40},
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
    toast:{background:'#2C2C28',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'flex-start',gap:10,maxWidth:280},
  }

  const stepLabels = ['Category','Job Details','Location','Budget','Review','Live Bids']

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--terra:#C4593A;--terra-l:#E07A5F;--cream:#F5F0E8;--charcoal:#2C2C28;--charcoal-l:#5A5952;--fb:'Barlow',sans-serif;--fc:'Barlow Condensed',sans-serif;--fd:'Bebas Neue',sans-serif;}
        input::placeholder,textarea::placeholder{color:rgba(245,240,232,.25)}
        select option{background:#2C2C28;color:#F5F0E8}
        @keyframes bidSlide{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes thumbIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
        .bid-card-anim{animation:bidSlide .4s ease both}
        .toast-anim{animation:toastIn .3s ease both}
        .thumb-anim{animation:thumbIn .25s ease both}
        .pulse{animation:pulse 1.8s infinite}
        .spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
        .upload-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:2px dashed rgba(255,255,255,.12);border-radius:10px;padding:18px 12px;cursor:pointer;transition:all .2s;background:transparent;position:relative}
        .upload-btn:hover{border-color:rgba(196,89,58,.5);background:rgba(196,89,58,.04)}
        .upload-btn.disabled{opacity:.4;cursor:not-allowed;pointer-events:none}
        .upload-btn input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
        @media(max-width:900px){.page-grid{grid-template-columns:1fr!important}.sidebar-col{display:none}}
      `}</style>

      <div style={S.wrap}>
        {/* NAV */}
        <nav style={S.topnav}>
          <a href="/" style={{display:'flex',alignItems:'center',gap:9,textDecoration:'none'}}>
            <span style={S.navWord}>LUNGISA</span>
          </a>
          <div style={{fontFamily:'var(--fc)',fontSize:13,color:'rgba(245,240,232,.5)',letterSpacing:1}}>Post a Job</div>
        </nav>

        {/* STEP BAR */}
        <div style={S.stepBar}>
          {stepLabels.map((label,i)=>(
            <div key={i} onClick={()=>i<=step&&goStep(i as Step)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'14px 16px 14px 0',cursor:i<=step?'pointer':'default'}}>
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

            {/* STEP 3: BUDGET & MEDIA */}
            {step===3&&(
              <div style={S.card}>
                <div style={S.cardEyebrow}><span style={{width:14,height:2,background:'var(--terra)',display:'inline-block'}}/>Step 4 of 5</div>
                <div style={S.cardTitle}>BUDGET &<br/>PHOTOS</div>
                <p style={S.cardSub}>Set a rough budget. Add photos or a short video — jobs with media get 3× more bids.</p>

                {/* Budget slider */}
                <div style={S.budgetDisplay}>{budgetOpen?'Open':`R ${budget.toLocaleString()}`}</div>
                <div style={{textAlign:'center',fontSize:12,color:'rgba(245,240,232,.4)',marginBottom:14}}>Drag to set your maximum budget</div>
                <input type="range" min={200} max={10000} step={50} value={budget}
                  onChange={e=>{setBudget(parseInt(e.target.value));setBudgetOpen(false)}}
                  style={{width:'100%',accentColor:'var(--terra)',marginBottom:8}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'rgba(245,240,232,.3)',marginBottom:8}}>
                  <span>R200</span><span>R10,000+</span>
                </div>
                <button onClick={()=>setBudgetOpen(true)}
                  style={{background:'none',border:'none',cursor:'pointer',fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.4)',textDecoration:'underline',display:'block',margin:'0 auto 24px'}}>
                  Skip — show me all bids
                </button>

                {/* ── MEDIA UPLOAD SECTION ───────────────────────── */}
                <div style={{marginBottom:20}}>
                  <label style={S.label}>Photos & Video</label>

                  {/* Upload buttons row */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>

                    {/* Photo upload button */}
                    <div>
                      <label
                        className={`upload-btn ${images.length>=MAX_IMAGES?'disabled':''}`}
                        style={{opacity: images.length>=MAX_IMAGES ? .4 : 1}}>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/heic"
                          multiple
                          disabled={images.length>=MAX_IMAGES||uploading}
                          onChange={handleImageUpload}
                        />
                        {uploading ? (
                          <div className="spin"/>
                        ) : (
                          <>
                            <span style={{fontSize:28}}>📷</span>
                            <span style={{fontFamily:'var(--fc)',fontSize:12,fontWeight:700,color:'rgba(245,240,232,.7)'}}>
                              Add Photos
                            </span>
                            <span style={{fontFamily:'var(--fc)',fontSize:10,color:images.length>=MAX_IMAGES?'#3DAA6A':'rgba(245,240,232,.35)',fontWeight:600,letterSpacing:.5}}>
                              {images.length}/{MAX_IMAGES} used
                            </span>
                            <span style={{fontSize:10,color:'rgba(245,240,232,.25)'}}>JPG, PNG · max 10MB each</span>
                          </>
                        )}
                      </label>
                      {images.length>=MAX_IMAGES&&(
                        <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:.5,color:'#3DAA6A',textAlign:'center',marginTop:4}}>✓ Max photos reached</div>
                      )}
                    </div>

                    {/* Video upload button */}
                    <div>
                      <label
                        className={`upload-btn ${videos.length>=MAX_VIDEOS?'disabled':''}`}
                        style={{opacity: videos.length>=MAX_VIDEOS ? .4 : 1}}>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime,video/webm"
                          disabled={videos.length>=MAX_VIDEOS||uploading}
                          onChange={handleVideoUpload}
                        />
                        {uploading ? (
                          <div className="spin"/>
                        ) : (
                          <>
                            <span style={{fontSize:28}}>🎥</span>
                            <span style={{fontFamily:'var(--fc)',fontSize:12,fontWeight:700,color:'rgba(245,240,232,.7)'}}>
                              Add Video
                            </span>
                            <span style={{fontFamily:'var(--fc)',fontSize:10,color:videos.length>=MAX_VIDEOS?'#3DAA6A':'rgba(245,240,232,.35)',fontWeight:600,letterSpacing:.5}}>
                              {videos.length}/{MAX_VIDEOS} used
                            </span>
                            <span style={{fontSize:10,color:'rgba(245,240,232,.25)'}}>MP4, MOV · max 50MB</span>
                          </>
                        )}
                      </label>
                      {videos.length>=MAX_VIDEOS&&(
                        <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:.5,color:'#3DAA6A',textAlign:'center',marginTop:4}}>✓ Video attached</div>
                      )}
                    </div>
                  </div>

                  {/* Error message */}
                  {uploadErr&&(
                    <div style={{background:'rgba(226,75,74,.08)',border:'1px solid rgba(226,75,74,.2)',borderRadius:6,padding:'8px 12px',fontSize:12,color:'#f08080',marginBottom:10,fontFamily:'var(--fc)'}}>
                      ⚠ {uploadErr}
                    </div>
                  )}

                  {/* Uploading indicator */}
                  {uploading&&(
                    <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'rgba(245,240,232,.5)',marginBottom:10,fontFamily:'var(--fc)',fontWeight:600,letterSpacing:.5}}>
                      <div className="spin"/>Uploading to Lungisa...
                    </div>
                  )}

                  {/* Media preview grid */}
                  {mediaFiles.length > 0 && (
                    <>
                      {/* Summary bar */}
                      <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,fontFamily:'var(--fc)',fontSize:12,fontWeight:700,color:'rgba(61,170,106,.9)',letterSpacing:.5}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          {images.length > 0 && `${images.length} photo${images.length>1?'s':''}`}
                          {images.length > 0 && videos.length > 0 && ' · '}
                          {videos.length > 0 && `${videos.length} video`}
                          {' '}uploaded &amp; ready
                        </div>
                        <button onClick={()=>setMediaFiles([])}
                          style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'rgba(245,240,232,.3)',fontFamily:'var(--fc)',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>
                          Clear all
                        </button>
                      </div>

                      {/* Thumbnail grid */}
                      <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                        {mediaFiles.map((m, i)=>(
                          <div key={i} className="thumb-anim"
                            style={{width:90,height:90,borderRadius:10,overflow:'hidden',position:'relative',flexShrink:0,border:'2px solid rgba(61,170,106,.35)',background:'#111',boxShadow:'0 3px 12px rgba(0,0,0,.4)'}}>

                            {m.type === 'video' ? (
                              <>
                                <video src={m.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>
                                {/* Video overlay */}
                                <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.35)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,.9)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                    <span style={{fontSize:11,marginLeft:2}}>▶</span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={m.url} alt={`Photo ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                            )}

                            {/* Remove button */}
                            <button onClick={()=>removeMedia(i)}
                              style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,.8)',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer',color:'#fff',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',zIndex:3,lineHeight:1,fontWeight:700}}>
                              ✕
                            </button>

                            {/* Type badge */}
                            <div style={{position:'absolute',bottom:4,left:4,background:'rgba(0,0,0,.7)',borderRadius:3,padding:'2px 5px',fontSize:9,color:'rgba(255,255,255,.9)',fontFamily:'var(--fc)',fontWeight:700,letterSpacing:.5}}>
                              {m.type==='video'?'🎥 VIDEO':'📷'}
                            </div>

                            {/* Size badge */}
                            <div style={{position:'absolute',bottom:4,right:4,background:'rgba(0,0,0,.7)',borderRadius:3,padding:'2px 5px',fontSize:8,color:'rgba(255,255,255,.6)',fontFamily:'var(--fc)',fontWeight:600}}>
                              {formatSize(m.size)}
                            </div>
                          </div>
                        ))}

                        {/* Add more photos slot (if under limit) */}
                        {images.length < MAX_IMAGES && (
                          <label style={{width:90,height:90,borderRadius:10,border:'2px dashed rgba(255,255,255,.1)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .2s',position:'relative',flexShrink:0}}
                            onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(196,89,58,.4)')}
                            onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,.1)')}>
                            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple
                              style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}
                              onChange={handleImageUpload}/>
                            <span style={{fontSize:22,marginBottom:3}}>+</span>
                            <span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:600,color:'rgba(245,240,232,.3)',letterSpacing:.5}}>ADD PHOTO</span>
                          </label>
                        )}
                      </div>
                    </>
                  )}

                  {/* Empty state hint */}
                  {mediaFiles.length === 0 && !uploading && (
                    <div style={{textAlign:'center',padding:'10px 0 4px',fontSize:12,color:'rgba(245,240,232,.25)',fontStyle:'italic'}}>
                      No media attached yet · Jobs with photos get 3× more bids
                    </div>
                  )}
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

                {/* Media preview on review */}
                {mediaFiles.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{fontFamily:'var(--fc)',fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:10}}>
                      Attached media ({mediaFiles.length})
                    </div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {mediaFiles.map((m,i)=>(
                        <div key={i} style={{width:64,height:64,borderRadius:8,overflow:'hidden',border:'2px solid rgba(61,170,106,.3)',position:'relative',background:'#111'}}>
                          {m.type==='video'?(
                            <>
                              <video src={m.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted/>
                              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>▶</div>
                            </>
                          ):(
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={m.url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,color:'rgba(61,170,106,.8)',marginTop:8,letterSpacing:.5}}>
                      ✓ {images.length>0&&`${images.length} photo${images.length>1?'s':''}`}{images.length>0&&videos.length>0&&' · '}{videos.length>0&&`${videos.length} video`} will be visible to tradespeople when bidding
                    </div>
                  </div>
                )}

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
                      <div className="pulse" style={{width:7,height:7,borderRadius:'50%',background:'#3DAA6A'}}/>Live
                    </div>
                    <div style={{fontFamily:'var(--fd)',fontSize:24,letterSpacing:1,color:'var(--cream)'}}>{title||'Home repair job'}</div>
                    <div style={{fontSize:13,color:'rgba(245,240,232,.45)',marginTop:2}}>{area}, JHB · {cat} · {urgency}</div>
                    {mediaFiles.length>0&&(
                      <div style={{fontSize:12,color:'rgba(61,170,106,.7)',marginTop:4,fontFamily:'var(--fc)',fontWeight:600}}>
                        📎 {images.length>0&&`${images.length} photo${images.length>1?'s':''}`}{images.length>0&&videos.length>0&&' · '}{videos.length>0&&`${videos.length} video`} attached
                      </div>
                    )}
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'var(--fd)',fontSize:52,color:'var(--terra-l)',lineHeight:1}}>{bidCount}</div>
                    <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)'}}>bids received</div>
                  </div>
                </div>

                {bidCount===0&&(
                  <div style={{textAlign:'center',padding:'40px 20px',color:'rgba(245,240,232,.4)',fontFamily:'var(--fc)',fontSize:13,letterSpacing:1}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:12}}>
                      <div className="spin"/><span>{waitingMsg}</span>
                    </div>
                    <div style={{fontSize:11,color:'rgba(245,240,232,.25)',marginTop:8}}>You&apos;ll get an email and see bids appear here in real time</div>
                    <div style={{marginTop:20}}>
                      <button style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',background:'none',border:'1px solid rgba(255,255,255,.1)',borderRadius:5,padding:'8px 16px',color:'rgba(245,240,232,.4)',cursor:'pointer'}}
                        onClick={()=>router.push('/home')}>
                        Go to my dashboard to wait →
                      </button>
                    </div>
                  </div>
                )}

                {liveBids.map((bid,i)=>(
                  <div key={bid.id} className="bid-card-anim" style={{...S.bidCard(selectedBid?.id===bid.id),animationDelay:`${i*0.1}s`}} onClick={()=>setSelectedBid(bid)}>
                    <div style={S.bidAvatar(bid.bg)}>{bid.init}</div>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:'var(--fb)',fontSize:15,fontWeight:600,color:'var(--cream)',marginBottom:2}}>{bid.name}</div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.45)',marginBottom:3}}>{bid.trade}</div>
                      <div style={{fontSize:12,color:'#E8A020'}}>{bid.rating} <span style={{color:'rgba(245,240,232,.45)'}}>{bid.ratingNum}</span></div>
                      <div style={{fontSize:11,color:'rgba(245,240,232,.4)'}}>{bid.jobs} jobs on Lungisa</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={S.bidPrice}>R{bid.price}</div>
                      <div style={{fontSize:11,color:'rgba(245,240,232,.4)',marginTop:2}}>ETA: {bid.eta}</div>
                    </div>
                  </div>
                ))}

                {selectedBid&&!accepted&&(
                  <div style={{background:'rgba(255,255,255,.03)',borderRadius:10,border:'1px solid rgba(255,255,255,.08)',padding:'18px 20px',marginTop:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                      <div style={S.bidAvatar(selectedBid.bg)}>{selectedBid.init}</div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:'var(--fc)',fontSize:15,fontWeight:700,color:'var(--cream)'}}>{selectedBid.name}</div>
                        <div style={{fontSize:12,color:'rgba(245,240,232,.45)',marginTop:2}}>{selectedBid.trade}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={S.bidPrice}>R{selectedBid.price}</div>
                        <div style={{fontSize:11,color:'rgba(245,240,232,.4)',marginTop:2}}>ETA: {selectedBid.eta}</div>
                      </div>
                    </div>
                    <div style={{background:'rgba(196,89,58,.08)',border:'1px solid rgba(196,89,58,.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'rgba(245,240,232,.7)',lineHeight:1.6,marginBottom:14}}>
                      💡 Your job is live and bids are coming in. To negotiate, counter-offer, or accept a bid — go to your <strong style={{color:'#E07A5F'}}>Homeowner Dashboard</strong> where the full negotiation flow lives.
                    </div>
                    <div style={{display:'flex',gap:10}}>
                      <button onClick={()=>router.push('/home')} style={{...S.btn('primary')}}>
                        Go to my dashboard →
                      </button>
                      <button onClick={()=>acceptBid(selectedBid,selectedBid.price)} style={{...S.btn('ghost'),fontSize:13,padding:'11px 18px'}}>
                        Accept R{selectedBid.price} now
                      </button>
                    </div>
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
                          <div style={{fontSize:12,color:'#E8A020',marginTop:2}}>{selectedBid.rating} {selectedBid.ratingNum}</div>
                        </div>
                      </div>
                      {[['Job',title||'Home repair'],['Location',`${area}, JHB`],['ETA',selectedBid.eta],['Agreed price',`R${finalPrice}`],['Lungisa fee','R0 (free for homeowners)']].map(([l,v])=>(
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.06)'}}>
                          <span style={{fontSize:13,color:'rgba(245,240,232,.45)'}}>{l}</span>
                          <span style={{color:l==='Agreed price'?'var(--terra-l)':'var(--cream)',fontFamily:l==='Agreed price'?'var(--fd)':undefined,fontSize:l==='Agreed price'?20:13}}>{v}</span>
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
                    <p style={{fontSize:14,color:'rgba(245,240,232,.5)',marginBottom:28}}>{selectedBid.name.split(' ')[0]} is on the way. You&apos;ll get a notification when the job is confirmed.</p>
                    <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                      <button style={{...S.btn('primary'),flex:'none'}} onClick={()=>router.push('/home')}>Go to my dashboard →</button>
                      <button style={{...S.btn('ghost'),flex:'none'}} onClick={resetAndPostAnother}>Post another job</button>
                    </div>
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
              {[['Category',`${catEmoji} ${cat}`],['Title',title||'Not yet filled'],['Location',area?`${area}, JHB`:'Not yet filled'],['Urgency',urgency],['Budget',budgetOpen?'Open':`R ${budget.toLocaleString()}`],['Media',mediaFiles.length>0?`${mediaFiles.length} file${mediaFiles.length>1?'s':''} attached`:'None yet']].map(([l,v])=>(
                <div key={l} style={S.jpRow}>
                  <span style={S.jpLabel}>{l}</span>
                  <span style={{...S.jpVal,color:v==='Not yet filled'||v==='None yet'?'rgba(245,240,232,.2)':'rgba(245,240,232,.75)',fontStyle:v==='Not yet filled'||v==='None yet'?'italic':'normal'}}>{v}</span>
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

      {/* TOASTS */}
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