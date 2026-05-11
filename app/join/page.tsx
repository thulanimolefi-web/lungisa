'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const TRADES = [
  {id:'plumbing',     label:'Plumbing',       emoji:'🔧', desc:'Pipes, geysers, taps, drains'},
  {id:'electrical',   label:'Electrical',     emoji:'⚡', desc:'Wiring, circuits, DB boards'},
  {id:'painting',     label:'Painting',       emoji:'🎨', desc:'Interior & exterior painting'},
  {id:'carpentry',    label:'Carpentry',      emoji:'🪚', desc:'Doors, built-ins, woodwork'},
  {id:'roofing',      label:'Roofing',        emoji:'🏠', desc:'Tiles, IBR, waterproofing'},
  {id:'tiling',       label:'Tiling',         emoji:'🚿', desc:'Floor & wall tiles'},
  {id:'solar',        label:'Solar',          emoji:'☀️', desc:'Solar panels & installation'},
  {id:'garden',       label:'Garden',         emoji:'🌿', desc:'Landscaping & maintenance'},
  {id:'waterproofing',label:'Waterproofing',  emoji:'💧', desc:'Damp & leak solutions'},
  {id:'welding',      label:'Welding',        emoji:'🔥', desc:'Gates, burglar bars, steel'},
  {id:'cleaning',     label:'Cleaning',       emoji:'🧹', desc:'Deep clean & maintenance'},
  {id:'general',      label:'General',        emoji:'🔩', desc:'Handyman & odd jobs'},
]

const AREAS = [
  'Soweto','Sandton','Roodepoort','Midrand','Randburg','Fourways',
  'Boksburg','Pretoria Central','Centurion','Krugersdorp','Germiston',
  'Benoni','Springs','Alberton','Edenvale','Kempton Park',
]

const PERKS = [
  {icon:'💰', title:'You set your price',     desc:'Bid what you want. No fixed rates. Your skill, your value.'},
  {icon:'📍', title:'Jobs near you',          desc:'Only see jobs in your area. No wasted travel.'},
  {icon:'🔒', title:'Get paid securely',      desc:'Payment held in escrow. Released when job is confirmed done. No chasing invoices.'},
  {icon:'⭐', title:'Build your reputation',  desc:'Every job builds your rating. Higher rating = more jobs.'},
  {icon:'📱', title:'Manage on your phone',   desc:'Bid, negotiate and confirm jobs from anywhere.'},
  {icon:'🆓', title:'Free to join',           desc:'No monthly fees. No subscription. We only earn when you earn.'},
]

function setLastOtpDate() {
  if(typeof window === 'undefined') return
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem('lungisa_otp_verified_date', today)
}

type Step = 'landing' | 'signup' | 'otp' | 'success'

export default function JoinPage() {
  const router = useRouter()
  const [step, setStep]           = useState<Step>('landing')
  const [fname, setFname]         = useState('')
  const [lname, setLname]         = useState('')
  const [email, setEmail]         = useState('')
  const [phone, setPhone]         = useState('')
  const [trade, setTrade]         = useState('')
  const [areas, setAreas]         = useState<string[]>([])
  const [years, setYears]         = useState('1-3')
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [otp,   setOtp]           = useState(['','','','','',''])
  const [errors, setErrors]       = useState<Record<string,string>>({})
  const [otpErr, setOtpErr]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [counter, setCounter]     = useState(60)
  const [timerOn, setTimerOn]     = useState(false)
  const [count, setCount]         = useState(47)

  function startTimer(){
    setCounter(60); setTimerOn(true)
    const iv=setInterval(()=>{
      setCounter(c=>{if(c<=1){clearInterval(iv);setTimerOn(false);return 0}return c-1})
    },1000)
  }

  function toggleArea(a:string){
    setAreas(prev=>prev.includes(a)?prev.filter(x=>x!==a):[...prev,a])
  }

  function getPasswordStrength(pw:string):{width:string,color:string,label:string} {
    if(pw.length===0) return {width:'0%',color:'transparent',label:''}
    if(pw.length<6)   return {width:'25%',color:'#E24B4A',label:'Too short'}
    if(pw.length<8)   return {width:'50%',color:'#E8A020',label:'Weak'}
    if(pw.match(/[A-Z]/)&&pw.match(/[0-9]/)) return {width:'100%',color:'#3DAA6A',label:'Strong'}
    return {width:'75%',color:'#E8A020',label:'Good'}
  }

  function validate(){
    const e:Record<string,string>={}
    if(!fname.trim()) e.fname='Required'
    if(!lname.trim()) e.lname='Required'
    if(!email.trim()||!email.includes('@')) e.email='Enter a valid email'
    if(!phone.trim()||phone.length<9) e.phone='Enter a valid number'
    if(!trade) e.trade='Select your primary trade'
    if(areas.length===0) e.areas='Select at least one area'
    if(!password||password.length<8) e.password='Password must be at least 8 characters'
    if(password!==confirmPw) e.confirmPw='Passwords do not match'
    setErrors(e)
    return Object.keys(e).length===0
  }

  async function handleSignup(){
    if(!validate()) return
    setLoading(true)
    try {
      // Create account with password
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options:{
          data:{ full_name:fname+' '+lname, role:'tradesperson', trade, areas, phone }
        }
      })
      if(error){ setErrors({email:error.message}); setLoading(false); return }

      // Send OTP to verify email
      await supabase.auth.signInWithOtp({
        email,
        options:{ shouldCreateUser:false }
      })
      setStep('otp'); startTimer()
    } catch(e){ setErrors({email:'Something went wrong. Please try again.'}) }
    setLoading(false)
  }

  async function handleOtp(){
    const code=otp.join('')
    if(code.length<6) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token:code, type:'email' })
      if(error){ setOtpErr('Incorrect code. Please try again.'); setLoading(false); return }
      if(data.user){
        // Save profile with all details
        await supabase.from('profiles').upsert({
          id:        data.user.id,
          role:      'tradesperson',
          full_name: fname+' '+lname,
          phone:     '+27'+phone.replace(/^0/,''),
          email,
          area:      areas[0],
          city:      'Johannesburg',
        })
        // Save tradesperson profile with trade and areas
        await supabase.from('tradesperson_profiles').upsert({
          id:               data.user.id,
          trade_category:   trade as any,
          service_areas:    areas,
          years_experience: parseInt(years.split('-')[0])||1,
        })
        setLastOtpDate()
        setCount(c=>c+1)
      }
      setOtpErr(''); setStep('success')
    } catch(e){ setOtpErr('Something went wrong. Please try again.') }
    setLoading(false)
  }

  function handleOtpInput(val:string, idx:number){
    const n=[...otp]; n[idx]=val.replace(/\D/g,'').slice(-1); setOtp(n)
    if(val&&idx<5) document.getElementById(`jotp-${idx+1}`)?.focus()
  }

  const selectedTrade = TRADES.find(t=>t.id===trade)
  const pwStrength = getPasswordStrength(password)

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-l:#E07A5F;--terra-d:#9E3E24;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#DDD5C5;
      --charcoal:#2C2C28;--charcoal-m:#3E3D38;--charcoal-l:#5A5952;
      --sand:#D4C9B4;--white:#FAFAF7;--green:#3DAA6A;--green-l:#52C47F;--amber:#E8A020;
      --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
    }
    html,body{font-family:var(--fb);background:var(--charcoal);color:var(--cream)}
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(26,26,22,.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.06);padding:16px 40px;display:flex;align-items:center;justify-content:space-between}
    .nav-logo{font-family:var(--fd);font-size:24px;letter-spacing:2px;color:var(--cream);text-decoration:none;display:flex;align-items:center;gap:8px}
    .nav-hex{width:26px;height:26px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .nav-login{font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(245,240,232,.5);text-decoration:none;transition:color .2s}
    .nav-login:hover{color:var(--cream)}
    .hero{min-height:100vh;background:var(--charcoal);padding:120px 40px 80px;position:relative;overflow:hidden;display:flex;align-items:center}
    .hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 30% 50%,rgba(196,89,58,.12) 0%,transparent 65%);pointer-events:none}
    .hero-inner{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;position:relative;z-index:1;width:100%}
    .hero-eye{font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--terra-l);margin-bottom:16px;display:flex;align-items:center;gap:10px}
    .hero-eye::before{content:'';width:24px;height:2px;background:var(--terra)}
    .hero-h1{font-family:var(--fd);font-size:clamp(56px,7vw,96px);line-height:.92;letter-spacing:2px;color:var(--cream);margin-bottom:20px}
    .hero-h1 span{color:var(--terra)}
    .hero-body{font-size:17px;line-height:1.7;color:rgba(245,240,232,.65);max-width:480px;margin-bottom:36px}
    .hero-body strong{color:var(--terra-l)}
    .counter-strip{display:flex;gap:32px;margin-bottom:40px;padding:20px 24px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;width:fit-content}
    .cs-num{font-family:var(--fd);font-size:40px;color:var(--terra-l);line-height:1}
    .cs-lbl{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.4);margin-top:4px}
    .cta-btn{font-family:var(--fc);font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:var(--terra);color:#fff;padding:16px 36px;border-radius:6px;border:none;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:10px}
    .cta-btn:hover{background:var(--terra-l);transform:translateY(-1px)}
    .perks{padding:100px 40px;background:#1A1A16}
    .perks-inner{max-width:1100px;margin:0 auto}
    .sec-eye{font-family:var(--fc);font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--terra);margin-bottom:12px}
    .sec-h{font-family:var(--fd);font-size:clamp(44px,5vw,72px);line-height:.92;letter-spacing:2px;color:var(--cream);margin-bottom:16px}
    .sec-b{font-size:16px;line-height:1.7;color:rgba(245,240,232,.55);max-width:540px;margin-bottom:60px}
    .perks-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
    .perk{background:#222220;padding:36px 32px}
    .perk:first-child{border-radius:8px 0 0 0}
    .perk:nth-child(3){border-radius:0 8px 0 0}
    .perk:nth-child(4){border-radius:0 0 0 8px}
    .perk:last-child{border-radius:0 0 8px 0}
    .perk-icon{font-size:32px;margin-bottom:16px}
    .perk-title{font-family:var(--fc);font-size:20px;font-weight:700;letter-spacing:.5px;color:var(--cream);margin-bottom:10px}
    .perk-desc{font-size:14px;line-height:1.65;color:rgba(245,240,232,.5)}
    .signup-sec{padding:100px 40px;background:var(--charcoal)}
    .signup-inner{max-width:620px;margin:0 auto}
    .form-card{background:#222220;border-radius:16px;border:1px solid rgba(255,255,255,.08);padding:40px}
    .form-title{font-family:var(--fd);font-size:48px;letter-spacing:2px;color:var(--cream);line-height:.92;margin-bottom:8px}
    .form-sub{font-size:14px;color:rgba(245,240,232,.5);margin-bottom:32px;line-height:1.6}
    .fg{margin-bottom:18px}
    .fl{display:block;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:rgba(245,240,232,.4);margin-bottom:8px}
    .fi,.fs{width:100%;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:8px;padding:13px 16px;font-family:var(--fb);font-size:15px;color:var(--cream);outline:none;transition:border-color .2s}
    .fi:focus,.fs:focus{border-color:var(--terra)}
    .fi::placeholder{color:rgba(245,240,232,.25)}
    .fr{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .ip{display:flex;align-items:center;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:8px;overflow:hidden;transition:border-color .2s}
    .ip:focus-within{border-color:var(--terra)}
    .ipl{padding:13px 14px;font-family:var(--fc);font-size:13px;font-weight:600;color:rgba(245,240,232,.4);background:rgba(255,255,255,.05);border-right:1px solid rgba(255,255,255,.1);flex-shrink:0}
    .ipi{flex:1;border:none;outline:none;padding:13px 14px;font-family:var(--fb);font-size:15px;color:var(--cream);background:transparent}
    .ipi::placeholder{color:rgba(245,240,232,.25)}
    .err{font-size:11px;color:#f08080;margin-top:4px;font-family:var(--fc)}
    .trade-grid-sm{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:4px}
    .tc{border:1.5px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 8px;cursor:pointer;text-align:center;background:rgba(255,255,255,.04);transition:all .15s;font-family:var(--fc);font-size:11px;font-weight:600;color:rgba(245,240,232,.5)}
    .tc:hover{border-color:rgba(196,89,58,.3);color:rgba(245,240,232,.8)}
    .tc.sel{border-color:var(--terra);background:rgba(196,89,58,.1);color:var(--terra-l)}
    .area-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:4px}
    .ac{border:1px solid rgba(255,255,255,.08);border-radius:6px;padding:8px 10px;cursor:pointer;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:.5px;color:rgba(245,240,232,.4);background:rgba(255,255,255,.03);transition:all .15s;text-align:center}
    .ac:hover{border-color:rgba(196,89,58,.3);color:rgba(245,240,232,.7)}
    .ac.sel{border-color:var(--terra);background:rgba(196,89,58,.08);color:var(--terra-l)}
    .pw-wrap{position:relative}
    .pw-wrap .fi{padding-right:44px}
    .pw-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:4px}
    .pw-strength{height:3px;border-radius:2px;margin-top:6px;transition:all .3s}
    .submit-btn{width:100%;padding:16px;border:none;border-radius:8px;font-family:var(--fc);font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--terra);color:#fff;margin-top:8px}
    .submit-btn:hover:not(:disabled){background:var(--terra-l)}
    .submit-btn:disabled{opacity:.6;cursor:not-allowed}
    .submit-btn.green{background:var(--green)}
    .otp-wrap{display:flex;gap:10px;justify-content:center;margin-bottom:20px}
    .otp-box{width:54px;height:62px;text-align:center;border:2px solid rgba(255,255,255,.12);border-radius:10px;font-family:var(--fd);font-size:32px;color:var(--cream);background:rgba(255,255,255,.06);outline:none;transition:border-color .2s}
    .otp-box:focus{border-color:var(--terra)}
    .otp-sent{background:rgba(196,89,58,.08);border:1px solid rgba(196,89,58,.2);border-radius:8px;padding:14px 16px;margin-bottom:24px;font-size:13px;color:rgba(245,240,232,.65);text-align:center;line-height:1.6}
    .otp-sent strong{color:var(--cream);display:block;font-size:15px;margin-bottom:2px}
    .timer{font-family:var(--fc);font-size:13px;color:rgba(245,240,232,.4);text-align:center;margin-bottom:16px}
    .success-ring{width:80px;height:80px;border-radius:50%;background:rgba(61,170,106,.12);border:2px solid rgba(61,170,106,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
    .checklist{list-style:none;margin:16px 0 28px;text-align:left}
    .checklist li{display:flex;align-items:center;gap:10px;font-size:14px;color:rgba(245,240,232,.65);padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    .ci{width:20px;height:20px;border-radius:50%;background:rgba(61,170,106,.15);flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .founding-badge{background:rgba(196,89,58,.1);border:1px solid rgba(196,89,58,.2);border-radius:6px;padding:8px 14px;font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--terra-l);display:inline-flex;align-items:center;gap:6px;margin-bottom:20px}
    .spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    footer{background:#111110;padding:40px;text-align:center;border-top:1px solid rgba(255,255,255,.05)}
    .footer-logo{font-family:var(--fd);font-size:24px;color:var(--cream);letter-spacing:2px;margin-bottom:8px}
    .footer-sub{font-size:12px;color:rgba(245,240,232,.3)}
    @media(max-width:900px){
      .hero-inner{grid-template-columns:1fr;gap:40px;text-align:center}
      .hero-eye{justify-content:center}
      .counter-strip{margin:0 auto 40px}
      .perks-grid{grid-template-columns:1fr}
      .nav{padding:14px 20px}
      .hero,.perks,.signup-sec{padding-left:20px;padding-right:20px}
    }
  `

  return (
    <>
      <style>{css}</style>

      {/* NAV */}
      <nav className="nav">
        <a href="/" className="nav-logo">
          <div className="nav-hex">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          LUNGISA
        </a>
        <a href="/auth" className="nav-login">Already registered? Sign in →</a>
      </nav>

      {step==='landing'&&(
        <>
          {/* HERO */}
          <section className="hero">
            <div className="hero-inner">
              <div>
                <div className="hero-eye">For tradespeople in Johannesburg</div>
                <h1 className="hero-h1">MORE JOBS.<br/><span>YOUR PRICE.</span><br/>PAID SECURE.</h1>
                <p className="hero-body">
                  Lungisa connects you directly with homeowners who need your skills.
                  <strong> You bid. You negotiate. You get paid</strong> — only when the job is done.
                </p>
                <div className="counter-strip">
                  <div><div className="cs-num">{count}</div><div className="cs-lbl">Founding members</div></div>
                  <div><div className="cs-num">50</div><div className="cs-lbl">Target spots</div></div>
                  <div><div className="cs-num">{50-count}</div><div className="cs-lbl">Spots left</div></div>
                </div>
                <button className="cta-btn" onClick={()=>setStep('signup')}>Join free — claim your spot →</button>
              </div>
              <div style={{background:'#222220',borderRadius:16,border:'1px solid rgba(255,255,255,.08)',padding:32}}>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:16}}>Sample jobs near you</div>
                {[
                  {emoji:'🔧',title:'Burst pipe — kitchen sink',area:'Soweto',budget:'R900',bids:2,urgColor:'#E24B4A'},
                  {emoji:'⚡',title:'Tripping circuit breaker',area:'Sandton',budget:'R700',bids:1,urgColor:'#E8A020'},
                  {emoji:'🎨',title:'Paint 3 bedroom house',area:'Midrand',budget:'R3,500',bids:0,urgColor:'#3DAA6A'},
                ].map((j,i)=>(
                  <div key={i} style={{background:'rgba(255,255,255,.04)',borderRadius:8,border:'1px solid rgba(255,255,255,.06)',padding:'12px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:4,height:40,borderRadius:2,background:j.urgColor,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:'#F5F0E8',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{j.emoji} {j.title}</div>
                      <div style={{fontSize:11,color:'rgba(245,240,232,.4)',marginTop:2}}>📍 {j.area} · {j.bids} bid{j.bids!==1?'s':''}</div>
                    </div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:'#E07A5F',flexShrink:0}}>{j.budget}</div>
                  </div>
                ))}
                <button onClick={()=>setStep('signup')} style={{width:'100%',marginTop:8,background:'var(--terra)',border:'none',borderRadius:8,padding:'12px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#fff',cursor:'pointer'}}>
                  Start bidding on these jobs →
                </button>
              </div>
            </div>
          </section>

          {/* PERKS */}
          <section className="perks">
            <div className="perks-inner">
              <div className="sec-eye">Why join Lungisa</div>
              <h2 className="sec-h">GROW YOUR<br/>BUSINESS.</h2>
              <p className="sec-b">Everything you need to find more work, get paid faster and build a reputation that lasts.</p>
              <div className="perks-grid">
                {PERKS.map(p=>(
                  <div key={p.title} className="perk">
                    <div className="perk-icon">{p.icon}</div>
                    <div className="perk-title">{p.title}</div>
                    <p className="perk-desc">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* BOTTOM CTA */}
          <section style={{padding:'80px 40px',background:'var(--terra)',textAlign:'center'}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:3,textTransform:'uppercase',color:'rgba(255,255,255,.7)',marginBottom:12}}>Only {50-count} founding spots left</div>
            <h2 style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'clamp(48px,6vw,80px)',letterSpacing:2,color:'#fff',lineHeight:.92,marginBottom:20}}>JOIN THE<br/>FOUNDING CREW.</h2>
            <p style={{fontSize:16,color:'rgba(255,255,255,.8)',marginBottom:36,maxWidth:480,margin:'0 auto 36px',lineHeight:1.7}}>First 50 tradespeople get a Founding Member badge, priority job matching, and free access forever.</p>
            <button className="cta-btn" style={{background:'#fff',color:'var(--terra)'}} onClick={()=>setStep('signup')}>Claim your spot now →</button>
          </section>
        </>
      )}

      {/* SIGNUP FORM */}
      {step==='signup'&&(
        <section className="signup-sec" style={{minHeight:'100vh',display:'flex',alignItems:'center',paddingTop:100}}>
          <div className="signup-inner" style={{width:'100%'}}>
            <div className="founding-badge">🔨 Founding member application</div>
            <div className="form-card">
              <h1 className="form-title">JOIN<br/>LUNGISA</h1>
              <p className="form-sub">Fill in your details and create your password. Takes 2 minutes.</p>

              <div className="fr">
                <div className="fg">
                  <label className="fl">First name</label>
                  <input className="fi" value={fname} onChange={e=>setFname(e.target.value)} placeholder="Themba"/>
                  {errors.fname&&<div className="err">{errors.fname}</div>}
                </div>
                <div className="fg">
                  <label className="fl">Last name</label>
                  <input className="fi" value={lname} onChange={e=>setLname(e.target.value)} placeholder="Mokoena"/>
                  {errors.lname&&<div className="err">{errors.lname}</div>}
                </div>
              </div>

              <div className="fg">
                <label className="fl">Email address</label>
                <input className="fi" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="themba@email.com"/>
                {errors.email&&<div className="err">{errors.email}</div>}
              </div>

              <div className="fg">
                <label className="fl">Mobile number</label>
                <div className="ip">
                  <span className="ipl">🇿🇦 +27</span>
                  <input className="ipi" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="82 345 6789"/>
                </div>
                {errors.phone&&<div className="err">{errors.phone}</div>}
              </div>

              <div className="fg">
                <label className="fl">Your primary trade</label>
                <div className="trade-grid-sm">
                  {TRADES.map(t=>(
                    <div key={t.id} className={`tc ${trade===t.id?'sel':''}`} onClick={()=>setTrade(t.id)}>
                      {t.emoji} {t.label}
                    </div>
                  ))}
                </div>
                {errors.trade&&<div className="err">{errors.trade}</div>}
              </div>

              <div className="fg">
                <label className="fl">Service areas (select all that apply)</label>
                <div className="area-grid">
                  {AREAS.map(a=>(
                    <div key={a} className={`ac ${areas.includes(a)?'sel':''}`} onClick={()=>toggleArea(a)}>{a}</div>
                  ))}
                </div>
                {errors.areas&&<div className="err">{errors.areas}</div>}
              </div>

              <div className="fg">
                <label className="fl">Years of experience</label>
                <select className="fs" value={years} onChange={e=>setYears(e.target.value)}>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1–3 years</option>
                  <option value="3-5">3–5 years</option>
                  <option value="5-10">5–10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>

              {/* PASSWORD FIELDS */}
              <div className="fg">
                <label className="fl">Create password</label>
                <div className="pw-wrap">
                  <input className="fi" type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters"/>
                  <button className="pw-eye" type="button" onClick={()=>setShowPw(s=>!s)}>{showPw?'🙈':'👁️'}</button>
                </div>
                {password&&(
                  <>
                    <div className="pw-strength" style={{background:pwStrength.color,width:pwStrength.width}}/>
                    <div style={{fontSize:10,color:pwStrength.color,fontFamily:'var(--fc)',fontWeight:600,letterSpacing:1,textTransform:'uppercase',marginTop:3}}>{pwStrength.label}</div>
                  </>
                )}
                {errors.password&&<div className="err">{errors.password}</div>}
              </div>

              <div className="fg">
                <label className="fl">Confirm password</label>
                <div className="pw-wrap">
                  <input className="fi" type={showPw?'text':'password'} value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat password"/>
                </div>
                {confirmPw&&password===confirmPw&&<div style={{fontSize:10,color:'#3DAA6A',marginTop:4,fontFamily:'var(--fc)',fontWeight:600,letterSpacing:1}}>✓ Passwords match</div>}
                {errors.confirmPw&&<div className="err">{errors.confirmPw}</div>}
              </div>

              <button className="submit-btn" onClick={handleSignup} disabled={loading}>
                {loading?<span className="spin"/>:'Send verification code →'}
              </button>

              <div style={{textAlign:'center',marginTop:16,fontSize:12,color:'rgba(245,240,232,.3)',lineHeight:1.6}}>
                Free to join. No monthly fees. We only earn when you earn.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* OTP */}
      {step==='otp'&&(
        <section className="signup-sec" style={{minHeight:'100vh',display:'flex',alignItems:'center',paddingTop:100}}>
          <div className="signup-inner" style={{width:'100%'}}>
            <div className="form-card" style={{textAlign:'center'}}>
              <h1 className="form-title" style={{marginBottom:8}}>VERIFY<br/>EMAIL</h1>
              <p className="form-sub">Almost there — enter your 6-digit code.</p>
              <div className="otp-sent">
                Code sent to<br/>
                <strong>{email}</strong>
              </div>
              <div className="otp-wrap">
                {otp.map((v,i)=>(
                  <input key={i} id={`jotp-${i}`} className="otp-box" type="text" maxLength={1} value={v}
                    onChange={e=>handleOtpInput(e.target.value,i)}
                    onKeyDown={e=>{if(e.key==='Backspace'&&!v&&i>0)document.getElementById(`jotp-${i-1}`)?.focus()}}
                  />
                ))}
              </div>
              {timerOn&&<div className="timer">Resend in <strong>{counter}s</strong></div>}
              {!timerOn&&(
                <div className="timer">
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--terra)',fontFamily:'var(--fc)',fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}
                    onClick={()=>{setOtp(['','','','','','']);handleSignup()}}>
                    Resend code
                  </button>
                </div>
              )}
              {otpErr&&<div className="err" style={{textAlign:'center',marginBottom:12}}>{otpErr}</div>}
              <div style={{fontSize:12,color:'rgba(245,240,232,.4)',marginBottom:16,lineHeight:1.6}}>
                Check your inbox for your 6-digit verification code.
              </div>
              <button className="submit-btn" onClick={handleOtp} disabled={otp.join('').length<6||loading}>
                {loading?<span className="spin"/>:'Verify & Continue'}
              </button>
              <div style={{marginTop:14}}>
                <button style={{background:'none',border:'none',cursor:'pointer',color:'rgba(245,240,232,.4)',fontFamily:'var(--fc)',fontSize:12,letterSpacing:1}} onClick={()=>setStep('signup')}>
                  ← Change details
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SUCCESS */}
      {step==='success'&&(
        <section className="signup-sec" style={{minHeight:'100vh',display:'flex',alignItems:'center',paddingTop:100}}>
          <div className="signup-inner" style={{width:'100%'}}>
            <div className="form-card" style={{textAlign:'center'}}>
              <div className="success-ring">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:3,textTransform:'uppercase',color:'var(--green)',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                <span style={{width:16,height:2,background:'var(--green)',display:'inline-block'}}/>
                Founding member #{count}
                <span style={{width:16,height:2,background:'var(--green)',display:'inline-block'}}/>
              </div>
              <h1 className="form-title" style={{marginBottom:8}}>YOU&apos;RE<br/>IN.</h1>
              <p className="form-sub">Welcome to Lungisa, <strong style={{color:'var(--cream)'}}>{fname}</strong>. Your profile is live.</p>

              {selectedTrade&&(
                <div style={{background:'rgba(196,89,58,.08)',border:'1px solid rgba(196,89,58,.2)',borderRadius:8,padding:'12px 16px',marginBottom:20,display:'inline-flex',alignItems:'center',gap:8,fontSize:13,color:'rgba(245,240,232,.75)'}}>
                  <span style={{fontSize:20}}>{selectedTrade.emoji}</span>
                  <span>{selectedTrade.label} · {areas.join(', ')}</span>
                </div>
              )}

              <ul className="checklist">
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Profile created and verified</li>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Password set — sign in with email + password</li>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Founding Member badge activated</li>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Ready to bid on jobs in {areas[0]||'Johannesburg'}</li>
              </ul>

              <button className="submit-btn green" onClick={async()=>{
                await new Promise(r=>setTimeout(r,800))
                window.location.href = '/dashboard'
              }}>
                Go to my job feed →
              </button>

              <div style={{marginTop:16,fontSize:12,color:'rgba(245,240,232,.3)'}}>
                Share with other tradespeople 👇
              </div>
              <div style={{marginTop:10,display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                {['WhatsApp','Facebook','Twitter'].map(s=>(
                  <a key={s}
                    href={s==='WhatsApp'?`https://wa.me/?text=I just joined Lungisa — SA's first home repair bidding platform. Join me: lungiza.co.za/join`:s==='Facebook'?`https://www.facebook.com/sharer/sharer.php?u=lungiza.co.za/join`:`https://twitter.com/intent/tweet?text=I just joined @LungisaApp — SA's first home repair bidding platform. Join free: lungiza.co.za/join`}
                    target="_blank" rel="noopener noreferrer"
                    style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.5)',border:'1px solid rgba(255,255,255,.1)',padding:'7px 14px',borderRadius:5,textDecoration:'none'}}>
                    Share on {s}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <footer>
        <div className="footer-logo">LUNGISA</div>
        <div className="footer-sub">Post It. Bid It. Fix It. · A VaultLink Africa product · lungiza.co.za</div>
      </footer>
    </>
  )
}
