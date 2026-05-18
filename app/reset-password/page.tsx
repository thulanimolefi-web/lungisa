'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const router = useRouter()
  const [mode, setMode]         = useState<'request'|'update'|'done'>('request')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  // Detect if we arrived via reset link (has access_token in URL hash)
  useEffect(() => {
    const hash = window.location.hash
    if(hash && hash.includes('type=recovery')) {
      setMode('update')
    }
    // Supabase auth state change fires when recovery token is processed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if(event === 'PASSWORD_RECOVERY') setMode('update')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function requestReset() {
    if(!email.trim()) { setError('Please enter your email address'); return }
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if(err) { setError(err.message); setLoading(false); return }
      setMode('done')
    } catch(e) { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  async function updatePassword() {
    if(!password) { setError('Please enter a new password'); return }
    if(password.length < 8) { setError('Password must be at least 8 characters'); return }
    if(password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if(err) { setError(err.message); setLoading(false); return }
      // Sign out and redirect to login
      await supabase.auth.signOut()
      router.push('/auth?reset=success')
    } catch(e) { setError('Something went wrong. Please try again.') }
    setLoading(false)
  }

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--terra:#C4593A;--terra-l:#E07A5F;--cream:#F5F0E8;--charcoal:#2C2C28;--charcoal-l:#5A5952;}
    html,body{min-height:100%;font-family:'Barlow',sans-serif;background:var(--cream)}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    .card{animation:fadeUp .4s ease both}
    .spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
    input::placeholder{color:rgba(44,44,40,.3)}
    .inp{width:100%;border:1.5px solid #DDD5C5;border-radius:8px;padding:13px 16px;font-family:'Barlow',sans-serif;font-size:15px;color:var(--charcoal);background:#fff;outline:none;transition:border-color .2s}
    .inp:focus{border-color:var(--terra)}
    .btn-main{width:100%;padding:14px;background:var(--terra);color:#fff;border:none;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:15px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .15s;margin-top:6px}
    .btn-main:hover:not(:disabled){background:var(--terra-l)}
    .btn-main:disabled{opacity:.6;cursor:not-allowed}
    .err{background:rgba(226,75,74,.08);border:1px solid rgba(226,75,74,.2);color:#c0392b;border-radius:6px;padding:10px 14px;font-size:13px;margin-bottom:14px;font-family:'Barlow Condensed',sans-serif;font-weight:600}
    @media(max-width:480px){.card-wrap{padding:16px!important}}
  `

  return (
    <>
      <style>{css}</style>
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:20,background:'var(--cream)'}}>

        {/* Logo */}
        <div onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:10,marginBottom:32,cursor:'pointer'}}>
          <div style={{width:34,height:34,background:'var(--terra)',clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>
          </div>
          <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:3,color:'var(--charcoal)'}}>LUNGISA</span>
        </div>

        <div className="card card-wrap" style={{background:'#fff',borderRadius:16,border:'1px solid #EAE3D6',padding:36,width:'100%',maxWidth:420,boxShadow:'0 4px 32px rgba(0,0,0,.08)'}}>

          {/* ── REQUEST MODE ─────────────────────────────────── */}
          {mode==='request'&&(
            <>
              <div style={{textAlign:'center',marginBottom:28}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(196,89,58,.1)',border:'1px solid rgba(196,89,58,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>
                  🔑
                </div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:1,color:'var(--charcoal)',marginBottom:6}}>
                  Reset password
                </div>
                <div style={{fontSize:14,color:'var(--charcoal-l)',lineHeight:1.6}}>
                  Enter your email and we&apos;ll send you a link to reset your password.
                </div>
              </div>

              {error&&<div className="err">{error}</div>}

              <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:8}}>
                Email address
              </label>
              <input
                className="inp"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&requestReset()}
                style={{marginBottom:16}}
              />

              <button className="btn-main" onClick={requestReset} disabled={loading}>
                {loading?<><div className="spin"/>Sending...</>:'Send reset link →'}
              </button>

              <div style={{textAlign:'center',marginTop:20}}>
                <span style={{fontSize:13,color:'var(--charcoal-l)',cursor:'pointer',textDecoration:'underline',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:.5}}
                  onClick={()=>router.push('/auth')}>
                  ← Back to login
                </span>
              </div>
            </>
          )}

          {/* ── DONE MODE — email sent ────────────────────────── */}
          {mode==='done'&&(
            <div style={{textAlign:'center'}}>
              <div style={{width:60,height:60,borderRadius:'50%',background:'rgba(61,170,106,.1)',border:'2px solid rgba(61,170,106,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',fontSize:28}}>
                ✉️
              </div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:'var(--charcoal)',marginBottom:8}}>
                Check your email
              </div>
              <p style={{fontSize:14,color:'var(--charcoal-l)',lineHeight:1.7,marginBottom:24}}>
                We sent a reset link to <strong style={{color:'var(--charcoal)'}}>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:8,padding:'12px 14px',fontSize:12,color:'var(--charcoal-l)',lineHeight:1.6,marginBottom:20,textAlign:'left'}}>
                💡 Check your spam folder if you don&apos;t see it within a minute. The link expires in 60 minutes.
              </div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button className="btn-main" style={{width:'auto',padding:'11px 24px',fontSize:13}}
                  onClick={()=>{setMode('request');setEmail('')}}>
                  Try a different email
                </button>
              </div>
            </div>
          )}

          {/* ── UPDATE MODE — set new password ───────────────── */}
          {mode==='update'&&(
            <>
              <div style={{textAlign:'center',marginBottom:28}}>
                <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(61,170,106,.1)',border:'1px solid rgba(61,170,106,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:22}}>
                  🔒
                </div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:1,color:'var(--charcoal)',marginBottom:6}}>
                  New password
                </div>
                <div style={{fontSize:14,color:'var(--charcoal-l)',lineHeight:1.6}}>
                  Choose a strong password for your Lungisa account.
                </div>
              </div>

              {error&&<div className="err">{error}</div>}

              <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:8}}>
                New password
              </label>
              <div style={{position:'relative',marginBottom:14}}>
                <input
                  className="inp"
                  type={showPass?'text':'password'}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  style={{paddingRight:48}}
                />
                <button onClick={()=>setShowPass(s=>!s)}
                  style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--charcoal-l)'}}>
                  {showPass?'🙈':'👁️'}
                </button>
              </div>

              {/* Password strength */}
              {password.length>0&&(
                <div style={{display:'flex',gap:4,marginBottom:14}}>
                  {[1,2,3,4].map(n=>{
                    const strength = password.length>=12&&/[A-Z]/.test(password)&&/[0-9]/.test(password) ? 4
                      : password.length>=10 ? 3
                      : password.length>=8 ? 2 : 1
                    return <div key={n} style={{flex:1,height:4,borderRadius:2,background:n<=strength?
                      (strength>=4?'#3DAA6A':strength>=3?'#E8A020':strength>=2?'#E07A5F':'#E24B4A'):
                      '#EAE3D6',transition:'background .3s'}}/>
                  })}
                </div>
              )}

              <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:8}}>
                Confirm password
              </label>
              <input
                className="inp"
                type={showPass?'text':'password'}
                placeholder="Repeat your password"
                value={confirm}
                onChange={e=>setConfirm(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&updatePassword()}
                style={{marginBottom:16}}
              />

              {confirm.length>0&&password!==confirm&&(
                <div style={{fontSize:12,color:'#E24B4A',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,marginBottom:10}}>
                  ✗ Passwords don&apos;t match
                </div>
              )}
              {confirm.length>0&&password===confirm&&(
                <div style={{fontSize:12,color:'#3DAA6A',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,marginBottom:10}}>
                  ✓ Passwords match
                </div>
              )}

              <button className="btn-main" onClick={updatePassword} disabled={loading}>
                {loading?<><div className="spin"/>Updating...</>:'Set new password →'}
              </button>
            </>
          )}
        </div>

        <div style={{marginTop:20,fontSize:12,color:'var(--charcoal-l)',textAlign:'center'}}>
          © 2026 Lungisa · A VaultLink Africa product
        </div>
      </div>
    </>
  )
}