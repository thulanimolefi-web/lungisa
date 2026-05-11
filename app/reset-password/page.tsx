'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword]   = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking]   = useState(true)

  useEffect(()=>{
    // Supabase puts the token in the URL hash — check for valid session
    const checkSession = async () => {
      const { data:{ session } } = await supabase.auth.getSession()
      if(session) {
        setValidSession(true)
      } else {
        // Try to get session from URL hash (password reset flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if(accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          if(!error) setValidSession(true)
        }
      }
      setChecking(false)
    }
    checkSession()
  },[])

  function getPasswordStrength(pw:string):{width:string,color:string,label:string} {
    if(pw.length===0) return {width:'0%',color:'transparent',label:''}
    if(pw.length<6)   return {width:'25%',color:'#E24B4A',label:'Too short'}
    if(pw.length<8)   return {width:'50%',color:'#E8A020',label:'Weak'}
    if(pw.match(/[A-Z]/)&&pw.match(/[0-9]/)) return {width:'100%',color:'#3DAA6A',label:'Strong'}
    return {width:'75%',color:'#E8A020',label:'Good'}
  }

  async function handleSetPassword() {
    if(!password || password.length < 8) { setError('Password must be at least 8 characters'); return }
    if(password !== confirmPw) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if(error) { setError(error.message); setLoading(false); return }
      setSuccess(true)
      // Redirect to dashboard after 2 seconds
      setTimeout(async()=>{
        const { data:{ session } } = await supabase.auth.getSession()
        if(session?.user) {
          const { data:profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single()
          window.location.href = profile?.role === 'tradesperson' ? '/dashboard' : '/home'
        } else {
          window.location.href = '/auth'
        }
      }, 2500)
    } catch(e) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const pwStrength = getPasswordStrength(password)

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-l:#E07A5F;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#DDD5C5;
      --charcoal:#2C2C28;--charcoal-l:#5A5952;
      --white:#FAFAF7;--green:#3DAA6A;
      --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
    }
    html,body{min-height:100%;font-family:var(--fb);background:var(--charcoal)}
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 20px;position:relative;overflow:hidden}
    .wrap::before{content:'LUNGISA';position:absolute;bottom:-40px;right:-40px;font-family:var(--fd);font-size:200px;color:rgba(196,89,58,.05);line-height:1;pointer-events:none}
    .card{background:var(--cream);border-radius:16px;width:100%;max-width:440px;padding:40px;position:relative;z-index:1}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:32px}
    .logo-hex{width:34px;height:34px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .logo-name{font-family:var(--fd);font-size:24px;letter-spacing:2px;color:var(--charcoal)}
    .eyebrow{font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--terra);margin-bottom:10px;display:flex;align-items:center;gap:8px}
    .eyebrow::before{content:'';width:20px;height:2px;background:var(--terra)}
    .title{font-family:var(--fd);font-size:48px;letter-spacing:2px;line-height:.92;color:var(--charcoal);margin-bottom:8px}
    .sub{font-size:14px;color:var(--charcoal-l);line-height:1.6;margin-bottom:28px}
    .fg{margin-bottom:18px}
    .label{display:block;font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l);margin-bottom:8px}
    .pw-wrap{position:relative}
    .input{width:100%;background:var(--white);border:1.5px solid var(--cream-d);border-radius:8px;padding:13px 44px 13px 16px;font-family:var(--fb);font-size:15px;color:var(--charcoal);outline:none;transition:border-color .2s}
    .input:focus{border-color:var(--terra)}
    .input::placeholder{color:var(--cream-dd)}
    .pw-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:4px}
    .pw-strength{height:3px;border-radius:2px;margin-top:6px;transition:all .3s}
    .pw-label{font-size:10px;font-family:var(--fc);font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-top:3px}
    .err{font-size:11px;color:#C0392B;margin-top:6px;font-family:var(--fc);background:rgba(192,57,43,.08);border:1px solid rgba(192,57,43,.2);borderRadius:5px;padding:8px 12px;lineHeight:1.5}
    .btn{width:100%;padding:15px;border:none;border-radius:8px;font-family:var(--fc);font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--terra);color:#fff;margin-top:8px}
    .btn:hover:not(:disabled){background:var(--terra-l)}
    .btn:disabled{opacity:.6;cursor:not-allowed}
    .btn-green{background:var(--green)}
    .spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
    .success-ring{width:72px;height:72px;border-radius:50%;background:rgba(61,170,106,.1);border:2px solid rgba(61,170,106,.25);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
    .checklist{list-style:none;margin:16px 0 24px}
    .checklist li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--charcoal-l);padding:8px 0;border-bottom:1px solid var(--cream-d)}
    .ci{width:20px;height:20px;border-radius:50%;background:rgba(61,170,106,.12);flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .loading-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:60px 20px;color:var(--charcoal-l);font-family:var(--fc);font-size:13px;letter-spacing:1px}
    .invalid-wrap{text-align:center;padding:40px 0}
    @keyframes spin{to{transform:rotate(360deg)}}
  `

  return (
    <>
      <style>{css}</style>
      <div className="wrap">
        <div className="card">
          <div className="logo">
            <div className="logo-hex">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span className="logo-name">LUNGISA</span>
          </div>

          {/* Checking session */}
          {checking&&(
            <div className="loading-wrap">
              <div className="spin" style={{width:24,height:24,borderWidth:3}}/>
              <span>Verifying your link...</span>
            </div>
          )}

          {/* Invalid / expired link */}
          {!checking&&!validSession&&(
            <div className="invalid-wrap">
              <div style={{fontSize:48,marginBottom:16}}>🔗</div>
              <div className="eyebrow" style={{justifyContent:'center'}}>Link expired</div>
              <h1 className="title" style={{textAlign:'center',marginBottom:12}}>LINK<br/>EXPIRED.</h1>
              <p className="sub" style={{textAlign:'center'}}>
                This password reset link has expired or already been used. Request a new one from the login page.
              </p>
              <button className="btn" onClick={()=>window.location.href='/auth'}>
                Go to login →
              </button>
            </div>
          )}

          {/* Set password form */}
          {!checking&&validSession&&!success&&(
            <>
              <div className="eyebrow">Account upgrade</div>
              <h1 className="title">SET YOUR<br/>PASSWORD.</h1>
              <p className="sub">
                Create a password for your Lungisa account. You&apos;ll use this to sign in going forward, along with a daily email verification for security.
              </p>

              <div className="fg">
                <label className="label">New password</label>
                <div className="pw-wrap">
                  <input className="input" type={showPw?'text':'password'} value={password}
                    onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters"/>
                  <button className="pw-eye" type="button" onClick={()=>setShowPw(s=>!s)}>
                    {showPw?'🙈':'👁️'}
                  </button>
                </div>
                {password&&(
                  <>
                    <div className="pw-strength" style={{background:pwStrength.color,width:pwStrength.width}}/>
                    <div className="pw-label" style={{color:pwStrength.color}}>{pwStrength.label}</div>
                  </>
                )}
              </div>

              <div className="fg">
                <label className="label">Confirm password</label>
                <div className="pw-wrap">
                  <input className="input" type={showPw?'text':'password'} value={confirmPw}
                    onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat password"
                    onKeyDown={e=>e.key==='Enter'&&handleSetPassword()}/>
                  <button className="pw-eye" type="button" onClick={()=>setShowPw(s=>!s)}>
                    {showPw?'🙈':'👁️'}
                  </button>
                </div>
                {confirmPw&&password&&confirmPw===password&&(
                  <div style={{fontSize:11,color:'#3DAA6A',marginTop:4,fontFamily:'var(--fc)',fontWeight:600,letterSpacing:1}}>✓ Passwords match</div>
                )}
              </div>

              {error&&(
                <div style={{fontSize:12,color:'#C0392B',marginBottom:16,background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.2)',borderRadius:6,padding:'10px 12px',lineHeight:1.5,fontFamily:'var(--fc)'}}>
                  {error}
                </div>
              )}

              <button className="btn" onClick={handleSetPassword} disabled={loading||password.length<8||password!==confirmPw}>
                {loading?<span className="spin"/>:'Set my password →'}
              </button>

              <div style={{fontSize:12,color:'var(--charcoal-l)',textAlign:'center',marginTop:16,lineHeight:1.6}}>
                After setting your password, you&apos;ll sign in with email + password every day, with a quick OTP check on first login.
              </div>
            </>
          )}

          {/* Success */}
          {success&&(
            <div style={{textAlign:'center'}}>
              <div className="success-ring">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="eyebrow" style={{justifyContent:'center'}}>Password set</div>
              <h1 className="title" style={{marginBottom:8}}>ALL<br/>DONE.</h1>
              <p className="sub">Your password has been set. Taking you to your dashboard...</p>
              <ul className="checklist" style={{textAlign:'left'}}>
                <li>
                  <div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  Password created
                </li>
                <li>
                  <div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  Account upgraded to password login
                </li>
                <li>
                  <div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                  Redirecting to dashboard...
                </li>
              </ul>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,color:'var(--charcoal-l)',fontSize:13,fontFamily:'var(--fc)'}}>
                <div className="spin" style={{borderColor:'rgba(44,44,40,.2)',borderTopColor:'var(--terra)'}}/>
                Taking you there now...
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
