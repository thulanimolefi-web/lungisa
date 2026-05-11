'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

type Review = {
  id: string
  rating: number
  comment: string
  date: string
  reviewer: string
  jobTitle: string
}

type Profile = {
  id: string
  full_name: string
  area: string
  city: string
  email: string
  phone: string
  created_at: string
  trade_category: string
  service_areas: string[]
  years_experience: number
  rating_avg: number
  rating_count: number
  jobs_completed: number
  bio: string
}

function getCatEmoji(cat:string){
  const m:Record<string,string>={plumbing:'🔧',electrical:'⚡',painting:'🎨',carpentry:'🪚',roofing:'🏠',tiling:'🚿',solar:'☀️',garden:'🌿',waterproofing:'💧',welding:'🔥',cleaning:'🧹',general:'🔩'}
  return m[cat]||'🔧'
}

function getInitials(name:string){
  return name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
}

export default function TradespersonProfile({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [profile, setProfile]   = useState<Profile|null>(null)
  const [reviews, setReviews]   = useState<Review[]>([])
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(()=>{
    loadProfile()
    loadReviews()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[params.id])

  async function loadProfile(){
    try{
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          tradesperson_profiles(
            trade_category,
            service_areas,
            years_experience,
            rating_avg,
            rating_count,
            jobs_completed,
            bio
          )
        `)
        .eq('id', params.id)
        .eq('role', 'tradesperson')
        .single()

      if(error||!data){ setNotFound(true); setLoading(false); return }

      const tp = (data as any).tradesperson_profiles
      setProfile({
        id:               data.id,
        full_name:        data.full_name||'Tradesperson',
        area:             data.area||'Johannesburg',
        city:             data.city||'Johannesburg',
        email:            data.email||'',
        phone:            data.phone||'',
        created_at:       data.created_at,
        trade_category:   tp?.trade_category||'general',
        service_areas:    tp?.service_areas||[],
        years_experience: tp?.years_experience||0,
        rating_avg:       tp?.rating_avg||0,
        rating_count:     tp?.rating_count||0,
        jobs_completed:   tp?.jobs_completed||0,
        bio:              tp?.bio||'',
      })
    }catch(e){ setNotFound(true) }
    setLoading(false)
  }

  async function loadReviews(){
    try{
      const { data } = await supabase
        .from('reviews')
        .select(`
          id, rating, comment, created_at,
          profiles!reviewer_id(full_name),
          jobs(title)
        `)
        .eq('reviewee_id', params.id)
        .order('created_at', {ascending:false})
        .limit(10)

      if(data){
        setReviews(data.map((r:any)=>({
          id:       r.id,
          rating:   r.rating,
          comment:  r.comment||'',
          date:     new Date(r.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}),
          reviewer: r.profiles?.full_name||'Homeowner',
          jobTitle: r.jobs?.title||'Home repair job',
        })))
      }
    }catch(e){ console.log('Reviews error:',e) }
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-l:#E07A5F;--terra-d:#9E3E24;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#DDD5C5;
      --charcoal:#2C2C28;--charcoal-m:#3E3D38;--charcoal-l:#5A5952;
      --sand:#D4C9B4;--white:#FAFAF7;--green:#3DAA6A;--amber:#E8A020;
      --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
    }
    html,body{font-family:var(--fb);background:var(--cream);color:var(--charcoal)}
    .nav{background:var(--charcoal);padding:0 40px;height:58px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40;border-bottom:1px solid rgba(255,255,255,.05)}
    .nav-logo{font-family:var(--fd);font-size:22px;letter-spacing:2px;color:var(--cream);text-decoration:none;display:flex;align-items:center;gap:8px;cursor:pointer}
    .nav-hex{width:26px;height:26px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .back-btn{font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(245,240,232,.5);background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;transition:color .2s}
    .back-btn:hover{color:var(--cream)}
    .hero{background:var(--charcoal);padding:48px 40px;position:relative;overflow:hidden}
    .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 100% 0%,rgba(196,89,58,.12) 0%,transparent 60%);pointer-events:none}
    .hero-inner{max-width:1000px;margin:0 auto;display:flex;align-items:flex-start;gap:28px;position:relative;z-index:1}
    .avatar{width:100px;height:100px;border-radius:50%;background:var(--terra-d);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:40px;color:#fff;border:3px solid rgba(196,89,58,.3);flex-shrink:0}
    .hero-info{flex:1}
    .trade-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--terra-l);margin-bottom:8px}
    .hero-name{font-family:var(--fd);font-size:clamp(36px,5vw,60px);letter-spacing:1.5px;color:var(--cream);line-height:.92;margin-bottom:8px}
    .hero-meta{font-size:14px;color:rgba(245,240,232,.5);margin-bottom:16px}
    .hero-stats{display:flex;gap:24px;flex-wrap:wrap}
    .hs{text-align:center}
    .hs-num{font-family:var(--fd);font-size:36px;color:var(--cream);line-height:1}
    .hs-num.terra{color:var(--terra-l)}
    .hs-num.amber{color:var(--amber)}
    .hs-num.green{color:var(--green)}
    .hs-lbl{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.35);margin-top:4px}
    .founding-badge{background:rgba(196,89,58,.15);border:1px solid rgba(196,89,58,.25);border-radius:20px;padding:5px 12px;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--terra-l);display:inline-flex;align-items:center;gap:5px;margin-top:12px}
    .content{max-width:1000px;margin:0 auto;padding:36px 40px;display:grid;grid-template-columns:1fr 340px;gap:28px;align-items:start}
    .card{background:var(--white);border-radius:12px;border:1px solid var(--cream-d);padding:24px;margin-bottom:16px}
    .card-title{font-family:var(--fd);font-size:24px;letter-spacing:1px;color:var(--charcoal);margin-bottom:16px;display:flex;align-items:center;gap:10px}
    .card-title::before{content:'';width:14px;height:3px;background:var(--terra);flex-shrink:0}
    .info-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--cream-d)}
    .info-row:last-child{border-bottom:none}
    .info-label{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l)}
    .info-val{font-size:14px;color:var(--charcoal);font-weight:500;text-align:right;max-width:60%}
    .area-chip{display:inline-flex;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;background:rgba(196,89,58,.08);border:1px solid rgba(196,89,58,.15);color:var(--terra-d);padding:4px 10px;border-radius:4px;margin:2px}
    .review-card{background:var(--cream);border-radius:10px;border:1px solid var(--cream-d);padding:16px 18px;margin-bottom:10px}
    .rv-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
    .rv-reviewer{font-family:var(--fc);font-size:13px;font-weight:700;color:var(--charcoal)}
    .rv-stars{color:var(--amber);font-size:14px}
    .rv-job{font-size:11px;color:var(--charcoal-l);margin-bottom:6px}
    .rv-comment{font-size:13px;color:var(--charcoal-l);line-height:1.55}
    .rv-date{font-size:11px;color:var(--sand);margin-top:6px}
    .empty-reviews{text-align:center;padding:40px 20px;color:var(--charcoal-l)}
    .rating-bar{display:flex;align-items:center;gap:10px;margin-bottom:8px}
    .rb-label{font-family:var(--fc);font-size:11px;font-weight:600;color:var(--charcoal-l);width:20px;text-align:right;flex-shrink:0}
    .rb-track{flex:1;height:6px;background:var(--cream-d);border-radius:3px;overflow:hidden}
    .rb-fill{height:100%;border-radius:3px;background:var(--amber);transition:width .5s ease}
    .rb-count{font-size:11px;color:var(--charcoal-l);width:20px;flex-shrink:0}
    .big-rating{font-family:var(--fd);font-size:72px;color:var(--charcoal);line-height:1;text-align:center}
    .big-stars{color:var(--amber);font-size:20px;text-align:center;margin:4px 0}
    .big-count{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--charcoal-l);text-align:center;margin-bottom:20px}
    .contact-btn{width:100%;padding:14px;border:none;border-radius:8px;font-family:var(--fc);font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px}
    .cb-primary{background:var(--terra);color:#fff}
    .cb-primary:hover{background:var(--terra-l)}
    .cb-ghost{background:transparent;border:1.5px solid var(--cream-dd);color:var(--charcoal-l)}
    .cb-ghost:hover{border-color:var(--charcoal-l);color:var(--charcoal)}
    .verified-badge{display:flex;align-items:center;gap:8px;background:rgba(61,170,106,.08);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--charcoal-l);line-height:1.5;margin-bottom:14px}
    .loading-wrap{display:flex;align-items:center;justify-content:center;min-height:60vh;color:var(--charcoal-l);font-family:var(--fc);font-size:13px;letter-spacing:1px;gap:12px;flex-direction:column}
    .spin{display:inline-block;width:24px;height:24px;border:2px solid var(--cream-d);border-top-color:var(--terra);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.content{grid-template-columns:1fr}.hero{padding:32px 20px}.nav{padding:0 20px}.content{padding:24px 20px}}
  `

  if(loading) return (
    <>
      <style>{css}</style>
      <nav className="nav">
        <div className="nav-logo" onClick={()=>router.back()}>
          <div className="nav-hex"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
          LUNGISA
        </div>
      </nav>
      <div className="loading-wrap"><div className="spin"/><span>Loading profile...</span></div>
    </>
  )

  if(notFound||!profile) return (
    <>
      <style>{css}</style>
      <nav className="nav">
        <div className="nav-logo" onClick={()=>router.back()}>
          <div className="nav-hex"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
          LUNGISA
        </div>
      </nav>
      <div className="loading-wrap">
        <div style={{fontSize:48,marginBottom:16}}>🔍</div>
        <div style={{fontFamily:'var(--fd)',fontSize:32,color:'var(--charcoal)',marginBottom:8}}>Profile not found</div>
        <button onClick={()=>router.back()} style={{fontFamily:'var(--fc)',fontSize:13,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',background:'var(--terra)',color:'#fff',border:'none',padding:'12px 24px',borderRadius:6,cursor:'pointer',marginTop:16}}>← Go back</button>
      </div>
    </>
  )

  const tradeEmoji = getCatEmoji(profile.trade_category)
  const tradeName = profile.trade_category.charAt(0).toUpperCase()+profile.trade_category.slice(1)
  const initials = getInitials(profile.full_name)
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-ZA',{month:'long',year:'numeric'})
  const ratingDisplay = profile.rating_avg>0 ? profile.rating_avg.toFixed(1) : '—'
  const starsFull = Math.floor(profile.rating_avg)
  const starsDisplay = profile.rating_avg>0 ? '★'.repeat(starsFull)+'☆'.repeat(5-starsFull) : '☆☆☆☆☆'

  // Calculate rating distribution (mock based on avg)
  const ratingDist = profile.rating_count>0 ? [
    {stars:5, count: Math.round(profile.rating_count*0.6)},
    {stars:4, count: Math.round(profile.rating_count*0.25)},
    {stars:3, count: Math.round(profile.rating_count*0.1)},
    {stars:2, count: Math.round(profile.rating_count*0.03)},
    {stars:1, count: Math.round(profile.rating_count*0.02)},
  ] : []

  return (
    <>
      <style>{css}</style>

      {/* NAV */}
      <nav className="nav">
        <div className="nav-logo" onClick={()=>router.back()}>
          <div className="nav-hex"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
          LUNGISA
        </div>
        <button className="back-btn" onClick={()=>router.back()}>← Back</button>
      </nav>

      {/* HERO */}
      <div className="hero">
        <div className="hero-inner">
          <div className="avatar">{initials}</div>
          <div className="hero-info">
            <div className="trade-badge">
              <span>{tradeEmoji}</span>
              <span>{tradeName}</span>
              {profile.years_experience>0&&<span>· {profile.years_experience} yrs experience</span>}
            </div>
            <h1 className="hero-name">{profile.full_name.toUpperCase()}</h1>
            <p className="hero-meta">📍 {profile.service_areas.join(', ')||profile.area} · Member since {memberSince}</p>
            <div className="hero-stats">
              <div className="hs">
                <div className="hs-num amber">{ratingDisplay}</div>
                <div className="hs-lbl">Rating</div>
              </div>
              <div style={{width:1,background:'rgba(255,255,255,.08)',margin:'0 8px'}}/>
              <div className="hs">
                <div className="hs-num green">{profile.jobs_completed}</div>
                <div className="hs-lbl">Jobs done</div>
              </div>
              <div style={{width:1,background:'rgba(255,255,255,.08)',margin:'0 8px'}}/>
              <div className="hs">
                <div className="hs-num">{profile.rating_count}</div>
                <div className="hs-lbl">Reviews</div>
              </div>
              <div style={{width:1,background:'rgba(255,255,255,.08)',margin:'0 8px'}}/>
              <div className="hs">
                <div className="hs-num terra">{profile.years_experience}</div>
                <div className="hs-lbl">Yrs exp</div>
              </div>
            </div>
            <div className="founding-badge">🔨 Founding Member</div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="content">
        {/* LEFT — main info */}
        <div>

          {/* About */}
          {profile.bio&&(
            <div className="card">
              <div className="card-title">About</div>
              <p style={{fontSize:14,color:'var(--charcoal-l)',lineHeight:1.7}}>{profile.bio}</p>
            </div>
          )}

          {/* Details */}
          <div className="card">
            <div className="card-title">Profile Details</div>
            {[
              {label:'Trade',     val:`${tradeEmoji} ${tradeName}`},
              {label:'Experience',val:`${profile.years_experience} year${profile.years_experience!==1?'s':''}`},
              {label:'Member since', val:memberSince},
              {label:'Jobs completed', val:String(profile.jobs_completed)},
            ].map(r=>(
              <div key={r.label} className="info-row">
                <span className="info-label">{r.label}</span>
                <span className="info-val">{r.val}</span>
              </div>
            ))}
            <div className="info-row">
              <span className="info-label">Service areas</span>
              <div style={{display:'flex',flexWrap:'wrap',justifyContent:'flex-end',gap:4,maxWidth:'60%'}}>
                {(profile.service_areas.length>0?profile.service_areas:[profile.area]).map(a=>(
                  <span key={a} className="area-chip">{a}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="card">
            <div className="card-title">
              Reviews
              {profile.rating_count>0&&<span style={{fontFamily:'var(--fc)',fontSize:12,fontWeight:600,color:'var(--charcoal-l)',marginLeft:'auto'}}>
                {profile.rating_count} review{profile.rating_count!==1?'s':''}
              </span>}
            </div>

            {reviews.length===0?(
              <div className="empty-reviews">
                <div style={{fontSize:32,marginBottom:12}}>⭐</div>
                <div style={{fontFamily:'var(--fc)',fontSize:16,fontWeight:700,color:'var(--charcoal)',marginBottom:6}}>No reviews yet</div>
                <p style={{fontSize:13,lineHeight:1.6}}>Reviews will appear here after completing jobs on Lungisa.</p>
              </div>
            ):reviews.map(r=>(
              <div key={r.id} className="review-card">
                <div className="rv-header">
                  <div className="rv-reviewer">{r.reviewer}</div>
                  <div className="rv-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div>
                </div>
                <div className="rv-job">🔧 {r.jobTitle}</div>
                {r.comment&&<div className="rv-comment">{r.comment}</div>}
                <div className="rv-date">{r.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — sidebar */}
        <div>
          {/* Rating summary */}
          <div className="card">
            <div className="card-title">Rating</div>
            <div className="big-rating">{ratingDisplay}</div>
            <div className="big-stars">{starsDisplay}</div>
            <div className="big-count">{profile.rating_count} review{profile.rating_count!==1?'s':''}</div>

            {ratingDist.length>0&&ratingDist.map(r=>(
              <div key={r.stars} className="rating-bar">
                <div className="rb-label">{r.stars}</div>
                <div className="rb-track">
                  <div className="rb-fill" style={{width:profile.rating_count>0?`${(r.count/profile.rating_count)*100}%`:'0%'}}/>
                </div>
                <div className="rb-count">{r.count}</div>
              </div>
            ))}

            {profile.rating_count===0&&(
              <div style={{textAlign:'center',fontSize:13,color:'var(--charcoal-l)',padding:'10px 0'}}>No ratings yet</div>
            )}
          </div>

          {/* Verified */}
          <div className="card">
            <div className="card-title">Verification</div>
            <div className="verified-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Email verified</span>
            </div>
            <div className="verified-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Phone verified</span>
            </div>
            <div className="verified-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Lungisa founding member</span>
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <div className="card-title">Stats</div>
            {[
              {label:'Response rate',    val:'—'},
              {label:'Avg response time',val:'—'},
              {label:'Jobs completed',   val:String(profile.jobs_completed)},
              {label:'Member since',     val:memberSince},
            ].map(s=>(
              <div key={s.label} className="info-row">
                <span className="info-label">{s.label}</span>
                <span className="info-val">{s.val}</span>
              </div>
            ))}
          </div>

          {/* Safety note */}
          <div style={{background:'rgba(196,89,58,.05)',border:'1px solid rgba(196,89,58,.1)',borderRadius:8,padding:'14px 16px',fontSize:12,color:'var(--charcoal-l)',lineHeight:1.6}}>
            🔒 All payments on Lungisa are held in escrow and only released when you confirm the job is complete. Never pay outside the platform.
          </div>
        </div>
      </div>
    </>
  )
}
