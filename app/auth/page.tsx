'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Role = 'homeowner' | 'tradesperson'
type Screen = 'role' | 'signup' | 'otp' | 'success' | 'login'

const TRADES = ['Plumbing','Electrical','Painting','Carpentry','Roofing','Tiling','Landscaping','General','Solar']
const AREAS  = ['Soweto','Sandton','Roodepoort','Midrand','Randburg','Fourways','Boksburg','Pretoria Central','Centurion']

export default function AuthPage() {
  const router = useRouter()
  const [screen, setScreen]   = useState<Screen>('role')
  const [role, setRole]       = useState<Role>('homeowner')
  const [fname, setFname]     = useState('')
  const [lname, setLname]     = useState('')
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [area,  setArea]      = useState('')
  const [trade, setTrade]     = useState('Plumbing')
  const [otp,   setOtp]       = useState(['','','','','',''])
  const [errors, setErrors]   = useState<Record<string,string>>({})
  const [counter, setCounter] = useState(60)
  const [timerOn, setTimerOn] = useState(false)
  const [otpErr, setOtpErr]   = useState('')
  const [loading, setLoading] = useState(false)
  const [isLoginMode, setIsLoginMode] = useState(false)

  function startTimer() {
    setCounter(60); setTimerOn(true)
    const iv = setInterval(() => {
      setCounter(c => { if(c<=1){clearInterval(iv);setTimerOn(false);return 0} return c-1 })
    }, 1000)
  }

  function validate() {
    const e: Record<string,string> = {}
    if(!fname.trim()) e.fname = 'Required'
    if(!lname.trim()) e.lname = 'Required'
    if(!email.trim()||!email.includes('@')) e.email = 'Enter a valid email'
    if(!phone.trim()||phone.length<9) e.phone = 'Enter a valid number'
    if(!area) e.area = 'Select your area'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSignup() {
    if(!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: fname + ' ' + lname,
            role: role,
            area: area,
            phone: phone,
          }
        }
      })
      if(error) {
        setErrors({email: error.message})
        setLoading(false)
        return
      }
      setScreen('otp')
      startTimer()
    } catch(e) {
      console.log('Signup error:', e)
      setErrors({email: 'Something went wrong. Please try again.'})
    }
    setLoading(false)
  }

  async function handleOtp() {
    const code = otp.join('')
    if(code.length < 6) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'email',
      })
      if(error) {
        setOtpErr('Incorrect code. Please check your email and try again.')
        setLoading(false)
        return
      }

      if(isLoginMode) {
        // Returning user — just check their role and redirect
        if(data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single()
          const userRole = profile?.role || 'homeowner'
          await new Promise(r=>setTimeout(r,1000))
          window.location.href = userRole === 'tradesperson' ? '/dashboard' : '/home'
        }
        return
      }

      // New user — save profile
      if(data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          role: role,
          full_name: fname + ' ' + lname,
          phone: '+27' + phone.replace(/^0/, ''),
          email: email,
          area: area,
          city: 'Johannesburg',
        })
        if(profileError) console.log('Profile error:', profileError)

        if(role === 'tradesperson') {
          await supabase.from('tradesperson_profiles').upsert({
            id: data.user.id,
            trade_category: trade.toLowerCase() as any,
            service_areas: [area],
            years_experience: 0,
          })
        }
      }
      setOtpErr('')
      setScreen('success')
    } catch(e) {
      console.log('OTP error:', e)
      setOtpErr('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function handleLogin() {
    if(!email || !email.includes('@')) {
      setErrors({email: 'Enter a valid email'})
      return
    }
    setLoading(true)
    setIsLoginMode(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
      })
      if(error) { setErrors({email: error.message}); setLoading(false); return }
      setScreen('otp')
      startTimer()
    } catch(e) {
      setErrors({email: 'Something went wrong. Please try again.'})
    }
    setLoading(false)
  }

  function handleOtpInput(val: string, idx: number) {
    const n = [...otp]; n[idx] = val.replace(/\D/g,'').slice(-1); setOtp(n)
    if(val && idx < 5) { document.getElementById(`otp-${idx+1}`)?.focus() }
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-d:#9E3E24;--terra-l:#E07A5F;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#DDD5C5;
      --charcoal:#2C2C28;--charcoal-m:#3E3D38;--charcoal-l:#5A5952;
      --sand:#D4C9B4;--white:#FAFAF7;--green:#3DAA6A;
      --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
    }
    html,body{height:100%;font-family:var(--fb)}
    body{background:var(--charcoal);display:flex;min-height:100vh}
    .al{width:420px;flex-shrink:0;background:var(--charcoal-m);display:flex;flex-direction:column;justify-content:space-between;padding:40px;position:relative;overflow:hidden}
    .al::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 20% 80%,rgba(196,89,58,.18) 0%,transparent 65%);pointer-events:none}
    .al::after{content:'LUNGISA';position:absolute;bottom:-30px;left:-20px;font-family:var(--fd);font-size:140px;color:rgba(196,89,58,.07);line-height:1;pointer-events:none;white-space:nowrap}
    .lm{display:flex;align-items:center;gap:10px;margin-bottom:4px}
    .lh{width:38px;height:38px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center}
    .ln{font-family:var(--fd);font-size:28px;letter-spacing:3px;color:var(--cream)}
    .lt{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--terra-l)}
    .ft{font-family:var(--fd);font-size:52px;line-height:.92;letter-spacing:2px;color:var(--cream);margin-bottom:20px;position:relative;z-index:1}
    .ft span{color:var(--terra-l)}
    .fl{list-style:none;position:relative;z-index:1}
    .fl li{display:flex;align-items:center;gap:12px;font-family:var(--fc);font-size:14px;font-weight:600;color:rgba(245,240,232,.7);padding:9px 0;border-bottom:1px solid rgba(255,255,255,.06)}
    .fi{width:28px;height:28px;border-radius:6px;background:rgba(196,89,58,.15);border:1px solid rgba(196,89,58,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .tc{display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1}
    .tc span{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(245,240,232,.4);border:1px solid rgba(255,255,255,.08);padding:5px 10px;border-radius:3px}
    .ar{flex:1;background:var(--cream);display:flex;align-items:center;justify-content:center;padding:40px 60px;overflow-y:auto}
    .ap{width:100%;max-width:420px}
    .se{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--terra);margin-bottom:10px;display:flex;align-items:center;gap:8px}
    .se::before{content:'';width:20px;height:2px;background:var(--terra)}
    .st{font-family:var(--fd);font-size:52px;letter-spacing:2px;line-height:.92;color:var(--charcoal);margin-bottom:8px}
    .ss{font-size:15px;line-height:1.6;color:var(--charcoal-l);margin-bottom:32px}
    .rc{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px}
    .rcard{border:2px solid var(--cream-d);border-radius:12px;padding:24px 18px;cursor:pointer;background:var(--white);transition:all .2s;text-align:center;position:relative}
    .rcard.sel{border-color:var(--terra);background:rgba(196,89,58,.04)}
    .rchk{position:absolute;top:10px;right:10px;width:20px;height:20px;border-radius:50%;background:var(--terra);display:flex;align-items:center;justify-content:center;opacity:0;transform:scale(.5);transition:all .2s}
    .rcard.sel .rchk{opacity:1;transform:scale(1)}
    .rico{width:52px;height:52px;border-radius:12px;background:rgba(196,89,58,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
    .rt{font-family:var(--fc);font-size:17px;font-weight:700;color:var(--charcoal);margin-bottom:4px}
    .rd{font-size:12px;color:var(--charcoal-l);line-height:1.4}
    .fg{margin-bottom:18px}
    .fl2{display:block;font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l);margin-bottom:8px}
    .fi2,.fs{width:100%;background:var(--white);border:1.5px solid var(--cream-d);border-radius:8px;padding:13px 16px;font-family:var(--fb);font-size:15px;color:var(--charcoal);outline:none;transition:border-color .2s}
    .fi2:focus,.fs:focus{border-color:var(--terra)}
    .fi2::placeholder{color:var(--sand)}
    .fr{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .ip{display:flex;align-items:center;background:var(--white);border:1.5px solid var(--cream-d);border-radius:8px;overflow:hidden;transition:border-color .2s}
    .ip:focus-within{border-color:var(--terra)}
    .ipl{padding:13px 14px;font-family:var(--fc);font-size:14px;font-weight:600;color:var(--charcoal-l);background:var(--cream-d);border-right:1.5px solid var(--cream-d);flex-shrink:0}
    .ipi{flex:1;border:none;outline:none;padding:13px 14px;font-family:var(--fb);font-size:15px;color:var(--charcoal);background:transparent}
    .ipi::placeholder{color:var(--sand)}
    .err{font-size:11px;color:#C0392B;margin-top:4px;font-family:var(--fc)}
    .tg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px}
    .tc2{border:1.5px solid var(--cream-d);border-radius:8px;padding:10px 8px;cursor:pointer;text-align:center;background:var(--white);transition:all .15s;font-family:var(--fc);font-size:11px;font-weight:600;color:var(--charcoal-l)}
    .tc2.sel{border-color:var(--terra);background:rgba(196,89,58,.05);color:var(--terra-d)}
    .ow{display:flex;gap:10px;justify-content:center;margin-bottom:20px}
    .ob{width:54px;height:62px;text-align:center;border:2px solid var(--cream-d);border-radius:10px;font-family:var(--fd);font-size:32px;color:var(--charcoal);background:var(--white);outline:none;transition:border-color .2s}
    .ob:focus{border-color:var(--terra)}
    .os{background:rgba(196,89,58,.06);border:1px solid rgba(196,89,58,.15);border-radius:8px;padding:12px 16px;margin-bottom:24px;font-size:13px;color:var(--charcoal-l);text-align:center}
    .os strong{color:var(--charcoal);display:block;font-size:15px;margin-top:2px}
    .ot{font-family:var(--fc);font-size:13px;color:var(--charcoal-l);text-align:center;margin-bottom:16px}
    .bm{width:100%;padding:15px;border:none;border-radius:8px;font-family:var(--fc);font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
    .bm:disabled{opacity:.6;cursor:not-allowed}
    .bt{background:var(--terra);color:var(--white)}
    .bt:hover:not(:disabled){background:var(--terra-l)}
    .bg{background:transparent;color:var(--charcoal);border:1.5px solid var(--cream-dd);margin-bottom:10px}
    .bg:hover:not(:disabled){border-color:var(--charcoal-l)}
    .bsu{background:var(--green);color:#fff}
    .as{text-align:center;margin-top:20px;font-size:14px;color:var(--charcoal-l)}
    .as button{background:none;border:none;cursor:pointer;font-weight:600;color:var(--terra);text-decoration:underline;font-size:14px;font-family:var(--fb)}
    .dv{display:flex;align-items:center;gap:12px;margin:16px 0}
    .dl{flex:1;height:1px;background:var(--cream-d)}
    .dt{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--sand)}
    .sr{width:80px;height:80px;border-radius:50%;background:rgba(196,89,58,.1);border:2px solid rgba(196,89,58,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
    .cl{list-style:none;margin:16px 0 24px}
    .cl li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--charcoal-l);padding:8px 0;border-bottom:1px solid var(--cream-d)}
    .ci{width:20px;height:20px;border-radius:50%;background:rgba(61,170,106,.12);flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .pg{display:flex;gap:6px;justify-content:center;margin-bottom:28px}
    .pd{width:8px;height:8px;border-radius:50%;background:var(--cream-d);transition:all .25s}
    .pd.active{background:var(--terra);width:24px;border-radius:4px}
    .pd.done{background:var(--terra);opacity:.4}
    .spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:800px){.al{display:none}.ar{padding:32px 24px}}
  `

  return (
    <>
      <style>{css}</style>
      <div className="al">
        <div style={{position:'relative',zIndex:1}}>
          <div className="lm">
            <div className="lh">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
            </div>
            <span className="ln">LUNGISA</span>
          </div>
          <div className="lt">Post It · Bid It · Fix It</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'20px 0',position:'relative',zIndex:1}}>
          <div className="ft">YOUR HOME.<br/><span>YOUR PRICE.</span><br/>SORTED.</div>
          <ul className="fl">
            <li><div className="fi"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>Post any home repair job free</li>
            <li><div className="fi"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>Get competitive bids in minutes</li>
            <li><div className="fi"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>Pay only when the job is done</li>
          </ul>
        </div>
        <div className="tc">
          <span>100% SA-built</span><span>Escrow protected</span><span>Free to post</span>
        </div>
      </div>

      <div className="ar">
        <div className="ap">

          {/* ROLE */}
          {screen==='role'&&(
            <div>
              <div className="se">Welcome to Lungisa</div>
              <h1 className="st">WHO<br/>ARE YOU?</h1>
              <p className="ss">Choose how you&apos;ll be using Lungisa.</p>
              <div className="rc">
                <div className={`rcard ${role==='homeowner'?'sel':''}`} onClick={()=>setRole('homeowner')}>
                  <div className="rchk"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <div className="rico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                  <div className="rt">Homeowner</div>
                  <div className="rd">Post jobs and get bids from vetted tradespeople</div>
                </div>
                <div className={`rcard ${role==='tradesperson'?'sel':''}`} onClick={()=>setRole('tradesperson')}>
                  <div className="rchk"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <div className="rico"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
                  <div className="rt">Tradesperson</div>
                  <div className="rd">Bid on jobs and grow your business</div>
                </div>
              </div>
              <button className="bm bt" onClick={()=>setScreen('signup')}>Continue as {role==='homeowner'?'Homeowner':'Tradesperson'} →</button>
              <div className="dv"><div className="dl"/><div className="dt">or</div><div className="dl"/></div>
              <div className="as">Already have an account? <button onClick={()=>setScreen('login')}>Sign in</button></div>
            </div>
          )}

          {/* SIGNUP */}
          {screen==='signup'&&(
            <div>
              <div className="pg"><div className="pd done"/><div className="pd active"/><div className="pd"/><div className="pd"/></div>
              <div className="se">New {role}</div>
              <h1 className="st">CREATE<br/>ACCOUNT</h1>
              <p className="ss">We&apos;ll send a one-time code to your email to verify your account.</p>
              <div className="fr">
                <div className="fg">
                  <label className="fl2">First name</label>
                  <input className="fi2" value={fname} onChange={e=>setFname(e.target.value)} placeholder="Thabo"/>
                  {errors.fname&&<div className="err">{errors.fname}</div>}
                </div>
                <div className="fg">
                  <label className="fl2">Last name</label>
                  <input className="fi2" value={lname} onChange={e=>setLname(e.target.value)} placeholder="Mokoena"/>
                  {errors.lname&&<div className="err">{errors.lname}</div>}
                </div>
              </div>
              <div className="fg">
                <label className="fl2">Email address</label>
                <input className="fi2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="thabo@email.com"/>
                {errors.email&&<div className="err">{errors.email}</div>}
              </div>
              <div className="fg">
                <label className="fl2">Mobile number</label>
                <div className="ip">
                  <span className="ipl">🇿🇦 +27</span>
                  <input className="ipi" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="82 345 6789"/>
                </div>
                {errors.phone&&<div className="err">{errors.phone}</div>}
              </div>
              <div className="fg">
                <label className="fl2">Your area</label>
                <select className="fs" value={area} onChange={e=>setArea(e.target.value)}>
                  <option value="">Select area</option>
                  {AREAS.map(a=><option key={a}>{a}</option>)}
                </select>
                {errors.area&&<div className="err">{errors.area}</div>}
              </div>
              {role==='tradesperson'&&(
                <div className="fg">
                  <label className="fl2">Your primary trade</label>
                  <div className="tg">
                    {TRADES.map(t=><div key={t} className={`tc2 ${trade===t?'sel':''}`} onClick={()=>setTrade(t)}>{t}</div>)}
                  </div>
                </div>
              )}
              <button className="bm bt" onClick={handleSignup} disabled={loading}>
                {loading?<span className="spin"/>:'Send verification code →'}
              </button>
              <div className="as" style={{marginTop:16}}><button onClick={()=>setScreen('role')}>← Back</button></div>
            </div>
          )}

          {/* OTP */}
          {screen==='otp'&&(
            <div>
              <div className="pg"><div className="pd done"/><div className="pd done"/><div className="pd active"/><div className="pd"/></div>
              <div className="se">Email verification</div>
              <h1 className="st">ENTER<br/>CODE</h1>
              <div className="os">
                6-digit code sent to<br/>
                <strong>{email}</strong>
              </div>
              <div className="ow">
                {otp.map((v,i)=>(
                  <input key={i} id={`otp-${i}`} className="ob" type="text" maxLength={1} value={v}
                    onChange={e=>handleOtpInput(e.target.value,i)}
                    onKeyDown={e=>{if(e.key==='Backspace'&&!v&&i>0)document.getElementById(`otp-${i-1}`)?.focus()}}
                  />
                ))}
              </div>
              {timerOn&&<div className="ot">Resend code in <strong>{counter}s</strong></div>}
              {!timerOn&&(
                <div className="ot">
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--terra)',fontFamily:'var(--fc)',fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}
                    onClick={()=>{setOtp(['','','','','','']);handleSignup()}}>
                    Resend code
                  </button>
                </div>
              )}
              {otpErr&&<div className="err" style={{textAlign:'center',marginBottom:12}}>{otpErr}</div>}
              <div style={{fontSize:12,color:'var(--charcoal-l)',textAlign:'center',marginBottom:16,lineHeight:1.6}}>
                Check your inbox (and spam folder) for your 6-digit code.
              </div>
              <button className="bm bt" onClick={handleOtp} disabled={otp.join('').length<6||loading}>
                {loading?<span className="spin"/>:'Verify & Continue'}
              </button>
              <div className="as" style={{marginTop:16}}><button onClick={()=>setScreen('signup')}>← Change email</button></div>
            </div>
          )}

          {/* SUCCESS */}
          {screen==='success'&&(
            <div style={{textAlign:'center'}}>
              <div className="pg"><div className="pd done"/><div className="pd done"/><div className="pd done"/><div className="pd active"/></div>
              <div className="sr"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div className="se" style={{justifyContent:'center'}}>Account created</div>
              <h1 className="st">YOU&apos;RE<br/>IN.</h1>
              <p className="ss">Welcome to Lungisa, <strong>{fname||'friend'}</strong>. Your account is ready.</p>
              <ul className="cl" style={{textAlign:'left'}}>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Account verified</li>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Profile saved to database</li>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Escrow wallet activated</li>
              </ul>
              <button className="bm bsu" onClick={async()=>{
                try {
                  await supabase.auth.getSession()
                  await new Promise(r=>setTimeout(r,1000))
                } catch(e){}
                window.location.href = role==='homeowner' ? '/home' : '/dashboard'
              }}>
                Go to my dashboard →
              </button>
            </div>
          )}

          {/* LOGIN */}
          {screen==='login'&&(
            <div>
              <div className="se">Welcome back</div>
              <h1 className="st">SIGN<br/>IN</h1>
              <p className="ss">Enter your email and we&apos;ll send you a one-time sign-in code.</p>
              <div className="fg">
                <label className="fl2">Email address</label>
                <input className="fi2" type="email" placeholder="thabo@email.com" value={email} onChange={e=>setEmail(e.target.value)}/>
                {errors.email&&<div className="err">{errors.email}</div>}
              </div>
              <button className="bm bt" style={{marginBottom:10}} onClick={handleLogin} disabled={loading}>
                {loading?<span className="spin"/>:'Send one-time code →'}
              </button>
              <div className="as">Don&apos;t have an account? <button onClick={()=>setScreen('role')}>Create one free</button></div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
