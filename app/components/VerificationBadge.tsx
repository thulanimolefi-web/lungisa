'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type VerificationStatus = 'unsubmitted' | 'pending' | 'verified' | 'rejected'

type Props = {
  /** compact = small inline badge only, full = full card with CTA */
  variant?: 'compact' | 'full'
}

export default function VerificationBadge({ variant = 'full' }: Props) {
  const [status, setStatus]           = useState<VerificationStatus>('unsubmitted')
  const [loading, setLoading]         = useState(true)
  const [showUpload, setShowUpload]   = useState(false)
  const [idFile, setIdFile]           = useState<File|null>(null)
  const [selfieFile, setSelfieFile]   = useState<File|null>(null)
  const [idPreview, setIdPreview]     = useState('')
  const [selfiePreview, setSelfiePreview] = useState('')
  const [idType, setIdType]           = useState<'id_card'|'id_book'|'passport'>('id_card')
  const [uploading, setUploading]     = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadErr, setUploadErr]     = useState('')
  const [profile, setProfile]         = useState<any>(null)

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if(!session?.user) { setLoading(false); return }
      const { data } = await supabase
        .from('tradesperson_profiles')
        .select('id_verified, verification_status, id_submitted_at')
        .eq('id', session.user.id)
        .single()
      if(data) {
        if(data.id_verified)                           setStatus('verified')
        else if(data.verification_status==='pending')  setStatus('pending')
        else if(data.verification_status==='rejected') setStatus('rejected')
        else                                           setStatus('unsubmitted')
        setProfile(data)
      }
    } catch(e) { console.log('Verification status error:', e) }
    setLoading(false)
  }

  function handleFileSelect(file: File, type: 'id'|'selfie') {
    if(!file) return
    if(file.size > 10*1024*1024) { setUploadErr('File must be under 10MB'); return }
    setUploadErr('')
    const reader = new FileReader()
    reader.onload = e => {
      if(type==='id') { setIdFile(file); setIdPreview(e.target?.result as string) }
      else            { setSelfieFile(file); setSelfiePreview(e.target?.result as string) }
    }
    reader.readAsDataURL(file)
  }

  async function handleUpload() {
    if(!idFile) { setUploadErr('Please select your ID document'); return }
    setUploading(true); setUploadErr(''); setUploadProgress(15)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if(!session?.user) return
      const uid = session.user.id

      const idExt  = idFile.name.split('.').pop()
      const idPath = `id-docs/${uid}/id_document.${idExt}`
      setUploadProgress(35)

      const { error: idErr } = await supabase.storage
        .from('job-photos')
        .upload(idPath, idFile, { upsert: true, contentType: idFile.type })
      if(idErr) { setUploadErr('Upload failed: '+idErr.message); setUploading(false); return }

      const { data: idData } = supabase.storage.from('job-photos').getPublicUrl(idPath)
      setUploadProgress(65)

      let selfieUrl = ''
      if(selfieFile) {
        const selfieExt  = selfieFile.name.split('.').pop()
        const selfiePath = `id-docs/${uid}/selfie.${selfieExt}`
        const { error: selfieErr } = await supabase.storage
          .from('job-photos')
          .upload(selfiePath, selfieFile, { upsert: true, contentType: selfieFile.type })
        if(!selfieErr) {
          const { data: selfieData } = supabase.storage.from('job-photos').getPublicUrl(selfiePath)
          selfieUrl = selfieData.publicUrl
        }
      }
      setUploadProgress(85)

      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', uid)
        .single()

      await supabase.from('tradesperson_profiles').update({
        id_document_url:     idData.publicUrl,
        selfie_url:          selfieUrl || null,
        id_submitted_at:     new Date().toISOString(),
        verification_status: 'pending',
        qualification:       idType,
      }).eq('id', uid)

      // Admin notification
      await supabase.from('notifications').insert({
        user_id: uid,
        type:    'id_submitted',
        title:   'ID verification submitted',
        message: `${prof?.full_name||'Tradesperson'} submitted their ${idType.replace('_',' ')} for verification.`,
        link:    `/admin/verify/${uid}`,
        read:    false,
        payload: { idUrl: idData.publicUrl, selfieUrl, idType },
      })

      setUploadProgress(100)
      setStatus('pending')
      setShowUpload(false)
    } catch(e) {
      setUploadErr('Something went wrong. Please try again.')
    }
    setUploading(false)
  }

  // ── Compact badge (inline, for bid cards etc.) ───────────────────
  if(variant === 'compact') {
    if(loading) return null
    if(status === 'verified') return (
      <span style={{
        display:'inline-flex',alignItems:'center',gap:4,
        background:'rgba(61,170,106,.12)',border:'1px solid rgba(61,170,106,.25)',
        borderRadius:4,padding:'3px 8px',
        fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,
        letterSpacing:1,textTransform:'uppercase',color:'#1a6e35',
      }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Verified
      </span>
    )
    if(status === 'pending') return (
      <span style={{
        display:'inline-flex',alignItems:'center',gap:4,
        background:'rgba(232,160,32,.1)',border:'1px solid rgba(232,160,32,.2)',
        borderRadius:4,padding:'3px 8px',
        fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,
        letterSpacing:1,textTransform:'uppercase',color:'#b87a00',
      }}>
        ⏳ Pending
      </span>
    )
    return null
  }

  // ── Full card ────────────────────────────────────────────────────
  if(loading) return null

  const cardStyle: React.CSSProperties = {
    borderRadius:12,border:'1px solid',padding:'18px 20px',marginBottom:16,
  }

  if(status === 'verified') return (
    <div style={{...cardStyle,background:'rgba(61,170,106,.06)',borderColor:'rgba(61,170,106,.2)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(61,170,106,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#1a6e35',marginBottom:2}}>
            ✅ Identity Verified
          </div>
          <div style={{fontSize:12,color:'rgba(26,110,53,.7)',lineHeight:1.4}}>
            Your verified badge is visible on every bid. Homeowners trust you more.
          </div>
        </div>
      </div>
    </div>
  )

  if(status === 'pending') return (
    <div style={{...cardStyle,background:'rgba(232,160,32,.05)',borderColor:'rgba(232,160,32,.2)'}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(232,160,32,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18}}>
          ⏳
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#b87a00',marginBottom:2}}>
            Verification in progress
          </div>
          <div style={{fontSize:12,color:'rgba(184,122,0,.7)',lineHeight:1.4}}>
            Your ID is being reviewed. This usually takes less than 24 hours.
          </div>
        </div>
      </div>
    </div>
  )

  if(status === 'rejected') return (
    <div style={{...cardStyle,background:'rgba(226,75,74,.05)',borderColor:'rgba(226,75,74,.2)'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:14}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(226,75,74,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18}}>
          ✗
        </div>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#b03030',marginBottom:2}}>
            Verification failed
          </div>
          <div style={{fontSize:12,color:'rgba(176,48,48,.7)',lineHeight:1.4}}>
            We couldn&apos;t verify your ID. Please re-upload a clear photo and try again.
          </div>
        </div>
      </div>
      <button
        onClick={()=>setShowUpload(true)}
        style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 18px',borderRadius:6,cursor:'pointer',width:'100%'}}>
        Re-upload ID →
      </button>
    </div>
  )

  // Unsubmitted
  return (
    <>
      <div style={{...cardStyle,background:'rgba(196,89,58,.04)',borderColor:'rgba(196,89,58,.15)'}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:14}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(196,89,58,.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#9E3E24',marginBottom:4}}>
              Get your Verified badge
            </div>
            <div style={{fontSize:12,color:'rgba(90,89,82,.8)',lineHeight:1.5,marginBottom:8}}>
              Upload your SA ID to earn the <strong style={{color:'#C4593A'}}>Verified ✓</strong> badge. Verified tradespeople get significantly more job acceptances.
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {['🏅 More job wins','🔒 Encrypted','📋 24h review'].map(b=>(
                <span key={b} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'rgba(90,89,82,.6)',border:'1px solid rgba(90,89,82,.15)',borderRadius:3,padding:'3px 7px'}}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={()=>setShowUpload(v=>!v)}
          style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 18px',borderRadius:6,cursor:'pointer',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {showUpload?'▲ Hide upload':'🪪 Verify my identity →'}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload&&(
        <div style={{background:'#1E1E1C',borderRadius:12,border:'1px solid rgba(255,255,255,.08)',padding:'20px',marginBottom:16}}>
          <style>{`
            .vb-upload-zone{border:2px dashed rgba(255,255,255,.15);border-radius:10px;padding:20px;text-align:center;cursor:pointer;transition:all .2s;background:rgba(255,255,255,.03);position:relative;margin-bottom:10px}
            .vb-upload-zone:hover{border-color:rgba(196,89,58,.5);background:rgba(196,89,58,.04)}
            .vb-upload-zone.has-file{border-color:#C4593A;border-style:solid}
            .vb-upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
            .vb-preview{width:100%;max-height:120px;object-fit:contain;border-radius:6px;margin-bottom:6px}
            .vb-progress{height:4px;border-radius:2px;background:rgba(255,255,255,.1);margin:10px 0;overflow:hidden}
            .vb-progress-fill{height:100%;background:#C4593A;border-radius:2px;transition:width .4s ease}
          `}</style>

          {/* ID Type */}
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:8}}>
            Document type
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:16}}>
            {([
              {key:'id_card',  icon:'🪪', label:'ID Card'},
              {key:'id_book',  icon:'📗', label:'ID Book'},
              {key:'passport', icon:'📘', label:'Passport'},
            ] as {key:'id_card'|'id_book'|'passport',icon:string,label:string}[]).map(t=>(
              <div key={t.key}
                onClick={()=>setIdType(t.key)}
                style={{border:`1.5px solid ${idType===t.key?'#C4593A':'rgba(255,255,255,.1)'}`,borderRadius:8,padding:'10px 6px',cursor:'pointer',textAlign:'center',background:idType===t.key?'rgba(196,89,58,.1)':'rgba(255,255,255,.03)',transition:'all .15s'}}>
                <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:idType===t.key?'#E07A5F':'rgba(245,240,232,.4)'}}>{t.label}</div>
              </div>
            ))}
          </div>

          {/* ID upload */}
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
            ID document <span style={{color:'#E24B4A'}}>*</span>
          </div>
          <div className={`vb-upload-zone ${idFile?'has-file':''}`}>
            <input type="file" accept="image/*,.pdf" onChange={e=>e.target.files?.[0]&&handleFileSelect(e.target.files[0],'id')}/>
            {idPreview&&idFile?.type.startsWith('image/') ? (
              <>
                <img src={idPreview} alt="ID" className="vb-preview"/>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,color:'#E07A5F'}}>✓ {idFile.name}</div>
              </>
            ) : idFile ? (
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,color:'#E07A5F'}}>✓ {idFile.name}</div>
            ) : (
              <>
                <div style={{fontSize:24,marginBottom:6}}>📄</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,color:'rgba(245,240,232,.6)',marginBottom:2}}>Tap to upload</div>
                <div style={{fontSize:11,color:'rgba(245,240,232,.3)'}}>JPG, PNG or PDF · Max 10MB</div>
              </>
            )}
          </div>

          {/* Selfie upload */}
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6,marginTop:10}}>
            Selfie with ID <span style={{fontWeight:400,fontSize:9,textTransform:'none',letterSpacing:0,color:'rgba(245,240,232,.25)'}}>optional</span>
          </div>
          <div className={`vb-upload-zone ${selfieFile?'has-file':''}`}>
            <input type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&handleFileSelect(e.target.files[0],'selfie')}/>
            {selfiePreview ? (
              <>
                <img src={selfiePreview} alt="Selfie" className="vb-preview"/>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,color:'#E07A5F'}}>✓ {selfieFile?.name}</div>
              </>
            ) : (
              <>
                <div style={{fontSize:24,marginBottom:6}}>🤳</div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,color:'rgba(245,240,232,.6)',marginBottom:2}}>Selfie holding your ID</div>
                <div style={{fontSize:11,color:'rgba(245,240,232,.3)'}}>Speeds up verification</div>
              </>
            )}
          </div>

          {uploadErr&&(
            <div style={{background:'rgba(226,75,74,.1)',border:'1px solid rgba(226,75,74,.2)',borderRadius:6,padding:'8px 12px',fontSize:11,color:'#f08080',marginBottom:10,fontFamily:"'Barlow Condensed',sans-serif"}}>
              ✗ {uploadErr}
            </div>
          )}

          {uploading&&uploadProgress>0&&(
            <div className="vb-progress">
              <div className="vb-progress-fill" style={{width:`${uploadProgress}%`}}/>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading||!idFile}
            style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:uploading||!idFile?'rgba(196,89,58,.4)':'#C4593A',color:'#fff',border:'none',padding:'12px',borderRadius:6,cursor:uploading||!idFile?'not-allowed':'pointer',width:'100%',marginTop:4,display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'background .15s'}}>
            {uploading
              ? <><span style={{display:'inline-block',width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite'}}/> Uploading...</>
              : 'Submit for verification →'
            }
          </button>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </>
  )
}