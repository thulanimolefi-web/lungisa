'use client'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'homeowner' | 'tradesperson'
type Screen = 'role' | 'signup' | 'otp' | 'success' | 'login'

const TRADES = ['Plumbing','Electrical','Painting','Carpentry','Roofing','Tiling','Landscaping','General','Solar']
const AREAS  = ['Soweto','Sandton','Roodepoort','Midrand','Randburg','Fourways','Boksburg','Pretoria Central','Centurion']

export default function AuthPage() {
  const router = useRouter()
  const [screen, setScreen]     = useState<Screen>('role')
  const [role, setRole]         = useState<Role>('homeowner')
  const [fname, setFname]       = useState('')
  const [lname, setLname]       = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [area,  setArea]        = useState('')
  const [trade, setTrade]       = useState('Plumbing')
  const [otp,   setOtp]         = useState(['','','','','',''])
  const [errors, setErrors]     = useState<Record<string,string>>({})
  const [counter, setCounter]   = useState(60)
  const [timerOn, setTimerOn]   = useState(false)
  const [otpErr, setOtpErr]     = useState('')

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
    const { error } = await supabase.auth.signInWithOtp({
      phone: '+27' + phone.replace(/^0/, ''),
    })
    if(error) { setErrors({phone: error.message}); return }
    setScreen('otp'); startTimer()
  }
  
  async function handleOtp() {
    const code = otp.join('')
    const { error } = await supabase.auth.verifyOtp({
      phone: '+27' + phone.replace(/^0/, ''),
      token: code,
      type: 'sms',
    })
    if(error) { setOtpErr('Incorrect code. Please try again.'); return }
    setOtpErr(''); setScreen('success')
  }

  function handleOtpInput(val: string, idx: number) {
    const n = [...otp]; n[idx] = val.replace(/\D/g,'').slice(-1); setOtp(n)
    if(val && idx < 5) { document.getElementById(`otp-${idx+1}`)?.focus() }
  }

  return (
    <>
      <style>{}</style>

      <div className="auth-left">
        <div style={{position:'relative',zIndex:1}}>
          <div className="logo-mark">
            <div className="logo-hex">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span className="logo-name">LUNGISA</span>
          </div>
          <div className="logo-tagline">Post It · Bid It · Fix It</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'20px 0',position:'relative',zIndex:1}}>
          <div className="feature-title">YOUR HOME.<br/><span>YOUR PRICE.</span><br/>SORTED.</div>
          <ul className="feature-list">
            <li><div className="fi"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>Post any home repair job free</li>
            <li><div className="fi"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>Get competitive bids in minutes</li>
            <li><div className="fi"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>Pay only when the job is done</li>
          </ul>
        </div>
        <div className="trust-chips">
          <span className="trust-chip">100% SA-built</span>
          <span className="trust-chip">Escrow protected</span>
          <span className="trust-chip">Free to post</span>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-panel">

          {/* ROLE SELECTION */}
          {screen === 'role' && (
            <div>
              <div className="screen-eyebrow">Welcome to Lungisa</div>
              <h1 className="screen-title">WHO<br/>ARE YOU?</h1>
              <p className="screen-sub">Choose how you&apos;ll be using Lungisa.</p>
              <div className="role-cards">
                <div className={`role-card ${role==='homeowner'?'selected':''}`} onClick={()=>setRole('homeowner')}>
                  <div className="role-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <div className="role-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                  <div className="role-title">Homeowner</div>
                  <div className="role-desc">Post jobs and get bids from vetted tradespeople</div>
                </div>
                <div className={`role-card ${role==='tradesperson'?'selected':''}`} onClick={()=>setRole('tradesperson')}>
                  <div className="role-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  <div className="role-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
                  <div className="role-title">Tradesperson</div>
                  <div className="role-desc">Bid on jobs and grow your business</div>
                </div>
              </div>
              <button className="btn-main btn-terra" onClick={()=>setScreen('signup')}>Continue as {role==='homeowner'?'Homeowner':'Tradesperson'} →</button>
              <div className="divider"><div className="divider-line"/><div className="divider-text">or</div><div className="divider-line"/></div>
              <div className="auth-switch">Already have an account? <button onClick={()=>setScreen('login')}>Sign in</button></div>
            </div>
          )}

          {/* SIGNUP */}
          {screen === 'signup' && (
            <div>
              <div className="progress">
                <div className="pdot done"/><div className="pdot active"/><div className="pdot"/><div className="pdot"/>
              </div>
              <div className="screen-eyebrow">New {role}</div>
              <h1 className="screen-title">CREATE<br/>ACCOUNT</h1>
              <p className="screen-sub">We&apos;ll send a one-time code to verify your number.</p>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First name</label>
                  <input className="form-input" value={fname} onChange={e=>setFname(e.target.value)} placeholder="Thabo"/>
                  {errors.fname && <div className="err">{errors.fname}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Last name</label>
                  <input className="form-input" value={lname} onChange={e=>setLname(e.target.value)} placeholder="Mokoena"/>
                  {errors.lname && <div className="err">{errors.lname}</div>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="thabo@email.com"/>
                {errors.email && <div className="err">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Mobile number</label>
                <div className="input-prefix">
                  <span className="prefix-label">🇿🇦 +27</span>
                  <input className="prefix-input" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="82 345 6789"/>
                </div>
                {errors.phone && <div className="err">{errors.phone}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Your area</label>
                <select className="form-select" value={area} onChange={e=>setArea(e.target.value)}>
                  <option value="">Select area</option>
                  {AREAS.map(a=><option key={a}>{a}</option>)}
                </select>
                {errors.area && <div className="err">{errors.area}</div>}
              </div>
              {role === 'tradesperson' && (
                <div className="form-group">
                  <label className="form-label">Your primary trade</label>
                  <div className="trade-grid">
                    {TRADES.map(t=>(
                      <div key={t} className={`trade-chip ${trade===t?'sel':''}`} onClick={()=>setTrade(t)}>{t}</div>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn-main btn-terra" onClick={handleSignup}>Send verification code →</button>
              <div className="auth-switch" style={{marginTop:16}}><button onClick={()=>setScreen('role')}>← Back</button></div>
            </div>
          )}

          {/* OTP */}
          {screen === 'otp' && (
            <div>
              <div className="progress">
                <div className="pdot done"/><div className="pdot done"/><div className="pdot active"/><div className="pdot"/>
              </div>
              <div className="screen-eyebrow">Phone verification</div>
              <h1 className="screen-title">ENTER<br/>CODE</h1>
              <div className="otp-sent">
                Code sent via WhatsApp to<br/>
                <strong>+27 {phone}</strong>
              </div>
              <div className="otp-wrap">
                {otp.map((v,i)=>(
                  <input key={i} id={`otp-${i}`} className="otp-box" type="text" maxLength={1} value={v}
                    onChange={e=>handleOtpInput(e.target.value,i)}
                    onKeyDown={e=>{ if(e.key==='Backspace'&&!v&&i>0) document.getElementById(`otp-${i-1}`)?.focus() }}
                  />
                ))}
              </div>
              {timerOn && <div className="otp-timer">Resend in <strong>{counter}s</strong></div>}
              {!timerOn && <div className="otp-timer"><button style={{background:'none',border:'none',cursor:'pointer',color:'var(--terra)',fontFamily:'var(--fc)',fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}} onClick={()=>{setOtp(['','','','','','']);startTimer()}}>Resend code</button></div>}
              {otpErr && <div className="err" style={{textAlign:'center',marginBottom:12}}>{otpErr}</div>}
              <button className="btn-main btn-terra" onClick={handleOtp} disabled={otp.join('').length<6}>Verify &amp; Continue</button>
              <div className="auth-switch" style={{marginTop:16}}><button onClick={()=>setScreen('signup')}>← Change number</button></div>
            </div>
          )}

          {/* SUCCESS */}
          {screen === 'success' && (
            <div style={{textAlign:'center'}}>
              <div className="progress">
                <div className="pdot done"/><div className="pdot done"/><div className="pdot done"/><div className="pdot active"/>
              </div>
              <div className="success-ring">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="screen-eyebrow" style={{justifyContent:'center'}}>Account created</div>
              <h1 className="screen-title">YOU&apos;RE<br/>IN.</h1>
              <p className="screen-sub">Welcome to Lungisa, <strong>{fname}</strong>.</p>
              <ul className="checklist" style={{textAlign:'left'}}>
                <li><div className="check-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Account verified</li>
                <li><div className="check-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Profile created</li>
                <li><div className="check-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Escrow wallet activated</li>
              </ul>
              <button className="btn-main btn-success" onClick={()=>router.push(role==='homeowner'?'/post':'/dashboard')}>
                Go to my dashboard →
              </button>
            </div>
          )}

          {/* LOGIN */}
          {screen === 'login' && (
            <div>
              <div className="screen-eyebrow">Welcome back</div>
              <h1 className="screen-title">SIGN<br/>IN</h1>
              <p className="screen-sub">Use your phone number to sign in.</p>
              <div className="form-group">
                <label className="form-label">Mobile number</label>
                <div className="input-prefix">
                  <span className="prefix-label">🇿🇦 +27</span>
                  <input className="prefix-input" type="tel" placeholder="82 345 6789" value={phone} onChange={e=>setPhone(e.target.value)}/>
                </div>
              </div>
              <button className="btn-main btn-terra" style={{marginBottom:10}} onClick={()=>{setScreen('otp');startTimer()}}>Send one-time code →</button>
              <div className="auth-switch">Don&apos;t have an account? <button onClick={()=>setScreen('role')}>Create one free</button></div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
