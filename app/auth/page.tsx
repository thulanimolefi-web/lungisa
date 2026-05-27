'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Role = 'homeowner' | 'tradesperson'
type Screen = 'role' | 'signup' | 'otp' | 'verify-id' | 'success' | 'login' | 'login-otp' | 'forgot' | 'forgot-sent'

const TRADES = [
  'Plumbing','Electrical','Painting','Carpentry','Roofing','Tiling',
  'Solar','Landscaping','Waterproofing','Welding','Cleaning','General',
  'Moving','Pest Control','Appliance Repair','Air Conditioning',
  'Security','Paving','Plastering',
]
const AREAS = [
  // Johannesburg North
  'Sandton','Fourways','Bryanston','Morningside','Rivonia','Sunninghill',
  'Paulshof','Kyalami','Halfway House','Woodmead','Kramerville',
  // Johannesburg Central & South
  'Johannesburg CBD','Parktown','Rosebank','Melrose','Illovo','Hyde Park',
  'Northcliff','Auckland Park','Greenside','Linden','Victory Park',
  'Mayfair','Fordsburg','Newtown','Maboneng',
  // Johannesburg West
  'Randburg','Ferndale','Honeydew','Ruimsig','Florida','Krugersdorp',
  'Roodepoort','Northgate','Weltevredenpark','Constantia Kloof',
  'Strubensvalley','Radiokop','Wilgeheuwel',
  // Johannesburg South & SW
  'Soweto','Lenasia','Ennerdale','Orange Farm','Alberton','Germiston',
  'Meyersdal','Glenvista','Bassonia','Kibler Park','Mulbarton',
  'Winchester Hills','Turffontein','Booysens','Ophirton',
  // East Rand / Ekurhuleni
  'Boksburg','Benoni','Brakpan','Springs','Edenvale','Bedfordview',
  'Kempton Park','Tembisa','Ekurhuleni','Germiston','Alberton',
  'Vosloorus','Daveyton','Katlehong','Thokoza','Nigel',
  'Heidelberg','Duduza',
  // Midrand
  'Midrand','Vorna Valley','Halfway House','Waterfall','Jukskei Park',
  'Grand Central','Carlswald',
  // Pretoria / Tshwane
  'Pretoria Central','Centurion','Pretoria East','Pretoria North',
  'Pretoria West','Soshanguve','Mamelodi','Atteridgeville','Hatfield',
  'Menlyn','Lynnwood','Faerie Glen','Moreleta Park','Garsfontein',
  'Queenswood','Arcadia','Muckleneuk','Brooklyn','Groenkloof',
  'Montana','Gezina','Silverton','Eersterust','Watloo',
  'Irene','Rooihuiskraal','Olievenhoutbosch',
  // West Rand
  'Randfontein','Westonaria','Carletonville','Fochville',
  'Magaliesburg','Krugersdorp','Chamdor',
  // Sedibeng
  'Vereeniging','Vanderbijlpark','Meyerton','Evaton','Sebokeng',
  'Sharpeville','Bophelong','Three Rivers',
]

function getLastOtpDate(): string {
  if(typeof window === 'undefined') return ''
  return localStorage.getItem('lungisa_otp_verified_date') || ''
}
function setLastOtpDate() {
  if(typeof window === 'undefined') return
  const today = new Date().toISOString().split('T')[0]
  localStorage.setItem('lungisa_otp_verified_date', today)
}
function needsDailyOtp(): boolean {
  const today = new Date().toISOString().split('T')[0]
  return getLastOtpDate() !== today
}

export default function AuthPage() {
  const router = useRouter()
  const [screen, setScreen]         = useState<Screen>('role')
  const [role, setRole]             = useState<Role>('homeowner')
  const [fname, setFname]           = useState('')
  const [lname, setLname]           = useState('')
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [area,  setArea]            = useState('')
  const [trade, setTrade]           = useState('Plumbing')
  const [trades, setTrades]         = useState<string[]>([])
  const [areas,  setAreas]          = useState<string[]>([])
  const [password, setPassword]     = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [showPw, setShowPw]         = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPw, setLoginPw]       = useState('')
  const [showLoginPw, setShowLoginPw] = useState(false)
  const [otp, setOtp]               = useState(['','','','','',''])
  const [errors, setErrors]         = useState<Record<string,string>>({})
  const [counter, setCounter]       = useState(60)
  const [timerOn, setTimerOn]       = useState(false)
  const [otpErr, setOtpErr]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [userId, setUserId]         = useState('')

  // ── Vetting state ─────────────────────────────────────────────────
  const [idFile, setIdFile]         = useState<File|null>(null)
  const [selfieFile, setSelfieFile] = useState<File|null>(null)
  const [idPreview, setIdPreview]   = useState('')
  const [selfiePreview, setSelfiePreview] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [idType, setIdType]         = useState<'id_book'|'id_card'|'passport'>('id_card')
  const [uploadErr, setUploadErr]   = useState('')
  const [skipVerify, setSkipVerify] = useState(false)

  function toggleTrade(t:string){
    setTrades(prev=>{
      if(prev.includes(t)) return prev.filter(x=>x!==t)
      if(prev.length>=3) return prev
      return [...prev, t]
    })
  }
  function toggleArea(a:string){
    setAreas(prev=>{
      if(prev.includes(a)) return prev.filter(x=>x!==a)
      if(prev.length>=3) return prev
      return [...prev, a]
    })
  }

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
    if(role==='homeowner'&&!area) e.area = 'Select your area'
    if(role==='tradesperson'&&trades.length===0) e.trades = 'Select at least one trade'
    if(role==='tradesperson'&&areas.length===0) e.areas = 'Select at least one area'
    if(!password||password.length<8) e.password = 'Password must be at least 8 characters'
    if(password!==confirmPw) e.confirmPw = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSignup() {
    if(!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fname+' '+lname, role, area: role==='homeowner' ? area : areas[0], phone, trades, areas } }
      })
      if(error) { setErrors({email: error.message}); setLoading(false); return }
      await supabase.auth.signInWithOtp({ email, options:{ shouldCreateUser:false } })
      setScreen('otp'); startTimer()
    } catch(e) { setErrors({email: 'Something went wrong. Please try again.'}) }
    setLoading(false)
  }

  async function handleOtp() {
    const code = otp.join('')
    if(code.length < 6) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email, token:code, type:'email' })
      if(error) { setOtpErr('Incorrect code. Please check your email.'); setLoading(false); return }
      if(data.user) {
        setUserId(data.user.id)
        const primaryArea = role==='homeowner' ? area : (areas[0]||'Johannesburg')
        await supabase.from('profiles').upsert({
          id: data.user.id, role, full_name: fname+' '+lname,
          phone: '+27'+phone.replace(/^0/,''), email, area: primaryArea, city: 'Johannesburg',
        })
        if(role==='tradesperson') {
          const safeAreas = areas.length > 0 ? areas : [area||'Johannesburg']
          await supabase.from('tradesperson_profiles').upsert({
            id:               data.user.id,
            trade_category:   (trades[0]||trade).toLowerCase() as any,
            service_areas:    safeAreas,
            years_experience: 0,
            verification_status: 'unsubmitted',
          })
        }
        setLastOtpDate()
        // Tradesperson goes to ID vetting, homeowner goes to success
        if(role==='tradesperson') {
          setScreen('verify-id')
        } else {
          setScreen('success')
        }
      }
      setOtpErr('')
    } catch(e) { setOtpErr('Something went wrong. Please try again.') }
    setLoading(false)
  }

  function handleFileSelect(file: File, type: 'id'|'selfie') {
    if(!file) return
    if(file.size > 10 * 1024 * 1024) { setUploadErr('File must be under 10MB'); return }
    if(!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setUploadErr('Please upload an image (JPG, PNG) or PDF')
      return
    }
    setUploadErr('')
    const reader = new FileReader()
    reader.onload = e => {
      if(type==='id') { setIdFile(file); setIdPreview(e.target?.result as string) }
      else            { setSelfieFile(file); setSelfiePreview(e.target?.result as string) }
    }
    reader.readAsDataURL(file)
  }

  async function handleIdUpload() {
    if(!idFile) { setUploadErr('Please upload your ID document'); return }
    setLoading(true); setUploadErr(''); setUploadProgress(10)

    try {
      const uid = userId
      let idUrl = ''; let selfieUrl = ''

      // Upload ID document
      const idExt = idFile.name.split('.').pop()
      const idPath = `id-docs/${uid}/id_document.${idExt}`
      setUploadProgress(30)
      const { error: idErr } = await supabase.storage
        .from('job-photos')
        .upload(idPath, idFile, { upsert: true, contentType: idFile.type })
      if(idErr) { setUploadErr('Upload failed: '+idErr.message); setLoading(false); return }
      const { data: idData } = supabase.storage.from('job-photos').getPublicUrl(idPath)
      idUrl = idData.publicUrl
      setUploadProgress(60)

      // Upload selfie if provided
      if(selfieFile) {
        const selfieExt = selfieFile.name.split('.').pop()
        const selfiePath = `id-docs/${uid}/selfie.${selfieExt}`
        const { error: selfieErr } = await supabase.storage
          .from('job-photos')
          .upload(selfiePath, selfieFile, { upsert: true, contentType: selfieFile.type })
        if(!selfieErr) {
          const { data: selfieData } = supabase.storage.from('job-photos').getPublicUrl(selfiePath)
          selfieUrl = selfieData.publicUrl
        }
      }
      setUploadProgress(80)

      // Update tradesperson_profiles
      await supabase.from('tradesperson_profiles').update({
        id_document_url:     idUrl,
        selfie_url:          selfieUrl || null,
        id_submitted_at:     new Date().toISOString(),
        verification_status: 'pending',
        qualification:       idType,
      }).eq('id', uid)

      // Notify admin via notification row
      await supabase.from('notifications').insert({
        user_id:  uid,
        type:     'id_submitted',
        title:    'ID verification submitted',
        message:  `${fname} ${lname} submitted their ${idType.replace('_',' ')} for verification.`,
        link:     `/admin/verify/${uid}`,
        read:     false,
        payload:  { idUrl, selfieUrl, idType, tradeName: trades[0] },
      })

      setUploadProgress(100)
      setScreen('success')
    } catch(e) {
      setUploadErr('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  async function handleSkipVerification() {
    // Mark as unsubmitted and proceed — they can verify later from dashboard
    setScreen('success')
  }

  async function handleLogin() {
    const e: Record<string,string> = {}
    if(!loginEmail.trim()||!loginEmail.includes('@')) e.loginEmail = 'Enter a valid email'
    if(!loginPw.trim()) e.loginPw = 'Enter your password'
    if(Object.keys(e).length>0) { setErrors(e); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email:loginEmail, password:loginPw })
      if(error) { setErrors({loginPw:'Incorrect email or password'}); setLoading(false); return }
      if(needsDailyOtp()) {
        setEmail(loginEmail)
        await supabase.auth.signInWithOtp({ email:loginEmail, options:{ shouldCreateUser:false } })
        setScreen('login-otp'); startTimer()
      } else {
        const { data:profile } = await supabase.from('profiles').select('role').eq('id',data.user.id).single()
        await new Promise(r=>setTimeout(r,500))
        window.location.href = profile?.role==='tradesperson' ? '/dashboard' : '/home'
      }
    } catch(e) { setErrors({loginPw: 'Something went wrong. Please try again.'}) }
    setLoading(false)
  }

  async function handleLoginOtp() {
    const code = otp.join('')
    if(code.length<6) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email:loginEmail||email, token:code, type:'email' })
      if(error) { setOtpErr('Incorrect code. Please check your email.'); setLoading(false); return }
      if(data.user) {
        setLastOtpDate()
        const { data:profile } = await supabase.from('profiles').select('role').eq('id',data.user.id).single()
        await new Promise(r=>setTimeout(r,500))
        window.location.href = profile?.role==='tradesperson' ? '/dashboard' : '/home'
      }
    } catch(e) { setOtpErr('Something went wrong. Please try again.') }
    setLoading(false)
  }

  async function handleForgotPassword() {
    if(!loginEmail.trim()||!loginEmail.includes('@')) {
      setErrors({loginEmail:'Enter your email address first'}); return
    }
    setLoading(true)
    try {
      await supabase.auth.resetPasswordForEmail(loginEmail, { redirectTo: 'https://lungiza.co.za/reset-password' })
      setScreen('forgot-sent')
    } catch(e) { setErrors({loginEmail:'Something went wrong. Please try again.'}) }
    setLoading(false)
  }

  function handleOtpInput(val:string, idx:number) {
    const n=[...otp]; n[idx]=val.replace(/\D/g,'').slice(-1); setOtp(n)
    if(val&&idx<5) document.getElementById(`otp-${idx+1}`)?.focus()
  }

  function getPasswordStrength(pw:string):{width:string,color:string,label:string} {
    if(pw.length===0) return {width:'0%',color:'transparent',label:''}
    if(pw.length<6)   return {width:'25%',color:'#E24B4A',label:'Too short'}
    if(pw.length<8)   return {width:'50%',color:'#E8A020',label:'Weak'}
    if(pw.match(/[A-Z]/)&&pw.match(/[0-9]/)) return {width:'100%',color:'#3DAA6A',label:'Strong'}
    return {width:'75%',color:'#E8A020',label:'Good'}
  }
  const pwStrength = getPasswordStrength(password)

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-d:#9E3E24;--terra-l:#E07A5F;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#DDD5C5;
      --charcoal:#2C2C28;--charcoal-m:#3E3D38;--charcoal-l:#5A5952;
      --sand:#D4C9B4;--white:#FAFAF7;--green:#3DAA6A;--amber:#E8A020;
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
    .fi-icon{width:28px;height:28px;border-radius:6px;background:rgba(196,89,58,.15);border:1px solid rgba(196,89,58,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .tc-chips{display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1}
    .tc-chips span{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:rgba(245,240,232,.4);border:1px solid rgba(255,255,255,.08);padding:5px 10px;border-radius:3px}
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
    .pw-wrap{position:relative}
    .pw-wrap .fi2{padding-right:44px;width:100%}
    .pw-eye{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;padding:4px}
    .pw-strength{height:3px;border-radius:2px;margin-top:6px;transition:all .3s}
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
    .security-note{background:rgba(196,89,58,.05);border:1px solid rgba(196,89,58,.1);border-radius:6px;padding:10px 12px;font-size:12px;color:var(--charcoal-l);line-height:1.6;margin-bottom:20px}

    /* ── ID Upload styles ────────────────────────────── */
    .id-type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px}
    .id-type-card{border:1.5px solid var(--cream-d);border-radius:10px;padding:14px 10px;cursor:pointer;text-align:center;background:var(--white);transition:all .15s}
    .id-type-card.sel{border-color:var(--terra);background:rgba(196,89,58,.04)}
    .id-type-icon{font-size:24px;margin-bottom:6px}
    .id-type-label{font-family:var(--fc);font-size:11px;font-weight:700;letter-spacing:1px;color:var(--charcoal-l);text-transform:uppercase}
    .id-type-card.sel .id-type-label{color:var(--terra-d)}
    .upload-zone{border:2px dashed var(--cream-dd);border-radius:12px;padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--white);position:relative;margin-bottom:12px}
    .upload-zone:hover{border-color:var(--terra-l);background:rgba(196,89,58,.02)}
    .upload-zone.has-file{border-color:var(--terra);border-style:solid;background:rgba(196,89,58,.03)}
    .upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
    .upload-preview{width:100%;max-height:140px;object-fit:contain;border-radius:8px;margin-bottom:8px}
    .upload-icon{width:44px;height:44px;border-radius:10px;background:rgba(196,89,58,.08);display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
    .upload-label{font-family:var(--fc);font-size:13px;font-weight:700;color:var(--charcoal);margin-bottom:3px}
    .upload-sub{font-size:11px;color:var(--charcoal-l)}
    .upload-fname{font-family:var(--fc);font-size:11px;font-weight:600;color:var(--terra);margin-top:6px}
    .progress-bar{height:4px;border-radius:2px;background:var(--cream-d);margin:12px 0;overflow:hidden}
    .progress-fill{height:100%;background:var(--terra);border-radius:2px;transition:width .4s ease}
    .trust-badges{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
    .trust-badge{display:flex;align-items:center;gap:6px;background:rgba(61,170,106,.06);border:1px solid rgba(61,170,106,.15);border-radius:6px;padding:6px 10px;font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#1a6e35}
    .why-verify{background:var(--white);border:1px solid var(--cream-d);border-radius:10px;padding:14px 16px;margin-bottom:20px}
    .why-row{display:flex;align-items:flex-start;gap:10px;padding:6px 0;font-size:12px;color:var(--charcoal-l);line-height:1.5}
    .why-row:not(:last-child){border-bottom:1px solid var(--cream-d)}
    .why-icon{font-size:14px;flex-shrink:0;margin-top:1px}
    .skip-link{display:block;text-align:center;margin-top:14px;font-family:var(--fc);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--charcoal-l);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
    .skip-link:hover{color:var(--charcoal)}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:800px){.al{display:none}.ar{padding:32px 24px}}
  `

  return (
    <>
      <style>{css}</style>

      {/* LEFT PANEL */}
      <div className="al">
        <div style={{position:'relative',zIndex:1}}>
          <div className="lm">
            <div className="lh">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <span className="ln">LUNGISA</span>
          </div>
          <div className="lt">Post It · Bid It · Fix It</div>
        </div>
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'20px 0',position:'relative',zIndex:1}}>
          <div className="ft">YOUR HOME.<br/><span>YOUR PRICE.</span><br/>SORTED.</div>
          <ul className="fl">
            <li>
              <div className="fi-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </div>
              Post any home repair job free
            </li>
            <li>
              <div className="fi-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              Get competitive bids in minutes
            </li>
            <li>
              <div className="fi-icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              Pay only when the job is done
            </li>
          </ul>
        </div>
        <div className="tc-chips">
          <span>100% SA-built</span>
          <span>Escrow protected</span>
          <span>Free to post</span>
        </div>
      </div>

      {/* RIGHT PANEL */}
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
              <button className="bm bt" onClick={()=>setScreen('signup')}>
                Continue as {role==='homeowner'?'Homeowner':'Tradesperson'} →
              </button>
              <div className="dv"><div className="dl"/><div className="dt">or</div><div className="dl"/></div>
              <div className="as">Already have an account? <button onClick={()=>setScreen('login')}>Sign in</button></div>
            </div>
          )}

          {/* SIGNUP */}
          {screen==='signup'&&(
            <div>
              <div className="pg"><div className="pd done"/><div className="pd active"/><div className="pd"/><div className="pd"/>{role==='tradesperson'&&<div className="pd"/>}</div>
              <div className="se">New {role}</div>
              <h1 className="st">CREATE<br/>ACCOUNT</h1>
              <p className="ss">Fill in your details and create your password.</p>

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

              {role==='homeowner'&&(
                <div className="fg">
                  <label className="fl2">Your area</label>
                  <select className="fs" value={area} onChange={e=>setArea(e.target.value)}>
                    <option value="">Select area</option>
                    {AREAS.map(a=><option key={a}>{a}</option>)}
                  </select>
                  {errors.area&&<div className="err">{errors.area}</div>}
                </div>
              )}

              {role==='tradesperson'&&(
                <>
                  <div className="fg">
                    <label className="fl2">Your trades <span style={{color:'var(--charcoal-l)',fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:11}}>(select up to 3)</span></label>
                    <div className="tg">
                      {TRADES.map(t=>{
                        const sel=trades.includes(t)
                        const maxed=trades.length>=3&&!sel
                        return (
                          <div key={t} className={`tc2 ${sel?'sel':''}`}
                            onClick={()=>!maxed&&toggleTrade(t)}
                            style={{opacity:maxed?.4:1,cursor:maxed?'not-allowed':'pointer'}}>
                            {t}
                          </div>
                        )
                      })}
                    </div>
                    {errors.trades&&<div className="err">{errors.trades}</div>}
                    {trades.length>0&&<div style={{fontSize:11,color:'var(--terra)',fontFamily:'var(--fc)',fontWeight:600,letterSpacing:1,marginTop:4}}>✓ {trades.join(' · ')}</div>}
                  </div>

                  <div className="fg">
                    <label className="fl2">Service areas <span style={{color:'var(--charcoal-l)',fontWeight:400,textTransform:'none',letterSpacing:0,fontSize:11}}>(select up to 3)</span></label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:4}}>
                      {AREAS.map(a=>{
                        const sel=areas.includes(a)
                        const maxed=areas.length>=3&&!sel
                        return (
                          <div key={a}
                            style={{border:`1.5px solid ${sel?'var(--terra)':'var(--cream-d)'}`,borderRadius:8,padding:'10px 8px',cursor:maxed?'not-allowed':'pointer',textAlign:'center',background:sel?'rgba(196,89,58,.05)':'var(--white)',transition:'all .15s',fontFamily:'var(--fc)',fontSize:11,fontWeight:600,color:sel?'var(--terra-d)':'var(--charcoal-l)',opacity:maxed?.4:1}}
                            onClick={()=>!maxed&&toggleArea(a)}>
                            {a}
                          </div>
                        )
                      })}
                    </div>
                    {errors.areas&&<div className="err">{errors.areas}</div>}
                    {areas.length>0&&<div style={{fontSize:11,color:'var(--terra)',fontFamily:'var(--fc)',fontWeight:600,letterSpacing:1,marginTop:4}}>✓ {areas.join(' · ')}</div>}
                  </div>
                </>
              )}

              <div className="fg">
                <label className="fl2">Create password</label>
                <div className="pw-wrap">
                  <input className="fi2" type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 8 characters"/>
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
                <label className="fl2">Confirm password</label>
                <div className="pw-wrap">
                  <input className="fi2" type={showPw?'text':'password'} value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Repeat password"/>
                </div>
                {errors.confirmPw&&<div className="err">{errors.confirmPw}</div>}
              </div>

              <button className="bm bt" onClick={handleSignup} disabled={loading}>
                {loading?<span className="spin"/>:'Send verification code →'}
              </button>
              <div className="as" style={{marginTop:16}}><button onClick={()=>setScreen('role')}>← Back</button></div>
            </div>
          )}

          {/* OTP */}
          {screen==='otp'&&(
            <div>
              <div className="pg"><div className="pd done"/><div className="pd done"/><div className="pd active"/><div className="pd"/>{role==='tradesperson'&&<div className="pd"/>}</div>
              <div className="se">Email verification</div>
              <h1 className="st">VERIFY<br/>EMAIL</h1>
              <div className="os">6-digit code sent to<br/><strong>{email}</strong></div>
              <div className="ow">
                {otp.map((v,i)=>(
                  <input key={i} id={`otp-${i}`} className="ob" type="text" maxLength={1} value={v}
                    onChange={e=>handleOtpInput(e.target.value,i)}
                    onKeyDown={e=>{if(e.key==='Backspace'&&!v&&i>0)document.getElementById(`otp-${i-1}`)?.focus()}}
                  />
                ))}
              </div>
              {timerOn&&<div className="ot">Resend in <strong>{counter}s</strong></div>}
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
                Check your inbox for your 6-digit verification code.
              </div>
              <button className="bm bt" onClick={handleOtp} disabled={otp.join('').length<6||loading}>
                {loading?<span className="spin"/>:role==='tradesperson'?'Verify & Continue →':'Verify & Finish →'}
              </button>
              <div className="as" style={{marginTop:16}}><button onClick={()=>setScreen('signup')}>← Change email</button></div>
            </div>
          )}

          {/* ── ID VERIFICATION (tradesperson only) ─────────────── */}
          {screen==='verify-id'&&(
            <div>
              <div className="pg">
                <div className="pd done"/><div className="pd done"/><div className="pd done"/>
                <div className="pd active"/><div className="pd"/>
              </div>
              <div className="se">Identity verification</div>
              <h1 className="st">VERIFY<br/>YOUR ID</h1>
              <p className="ss" style={{marginBottom:16}}>Upload your SA ID to get a <strong style={{color:'var(--terra)'}}>Verified ✓</strong> badge. Homeowners trust verified tradespeople more.</p>

              {/* Why verify */}
              <div className="why-verify">
                <div className="why-row"><span className="why-icon">🏅</span><span>Verified badge shown on every bid — stands out instantly</span></div>
                <div className="why-row"><span className="why-icon">📈</span><span>Verified tradespeople get up to 3× more job acceptances</span></div>
                <div className="why-row"><span className="why-icon">🔒</span><span>Documents are encrypted and never shared publicly</span></div>
              </div>

              {/* Trust badges */}
              <div className="trust-badges">
                <div className="trust-badge">🔐 Encrypted upload</div>
                <div className="trust-badge">✅ Private & secure</div>
                <div className="trust-badge">📋 Reviewed within 24h</div>
              </div>

              {/* ID type selector */}
              <div className="fg">
                <label className="fl2">Document type</label>
                <div className="id-type-grid">
                  {([
                    {key:'id_card',    icon:'🪪', label:'SA ID Card'},
                    {key:'id_book',    icon:'📗', label:'SA ID Book'},
                    {key:'passport',   icon:'📘', label:'Passport'},
                  ] as {key:'id_card'|'id_book'|'passport',icon:string,label:string}[]).map(t=>(
                    <div key={t.key} className={`id-type-card ${idType===t.key?'sel':''}`} onClick={()=>setIdType(t.key)}>
                      <div className="id-type-icon">{t.icon}</div>
                      <div className="id-type-label">{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ID document upload */}
              <div className="fg">
                <label className="fl2">
                  {idType==='id_card'?'SA ID Card (both sides)':idType==='id_book'?'SA ID Book (photo page)':'Passport (photo page)'}
                  <span style={{color:'#C0392B',marginLeft:4}}>*</span>
                </label>
                <div className={`upload-zone ${idFile?'has-file':''}`}>
                  <input type="file" accept="image/*,.pdf"
                    onChange={e=>e.target.files?.[0]&&handleFileSelect(e.target.files[0],'id')}/>
                  {idPreview&&idFile?.type.startsWith('image/') ? (
                    <>
                      <img src={idPreview} alt="ID preview" className="upload-preview"/>
                      <div className="upload-fname">✓ {idFile.name}</div>
                    </>
                  ) : idFile ? (
                    <>
                      <div className="upload-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </div>
                      <div className="upload-fname">✓ {idFile.name}</div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                      </div>
                      <div className="upload-label">Tap to upload</div>
                      <div className="upload-sub">JPG, PNG or PDF · Max 10MB</div>
                    </>
                  )}
                </div>
              </div>

              {/* Selfie upload (optional) */}
              <div className="fg">
                <label className="fl2">Selfie holding your ID <span style={{color:'var(--charcoal-l)',fontWeight:400,fontSize:11,textTransform:'none',letterSpacing:0}}>(optional but speeds up verification)</span></label>
                <div className={`upload-zone ${selfieFile?'has-file':''}`}>
                  <input type="file" accept="image/*"
                    onChange={e=>e.target.files?.[0]&&handleFileSelect(e.target.files[0],'selfie')}/>
                  {selfiePreview ? (
                    <>
                      <img src={selfiePreview} alt="Selfie preview" className="upload-preview"/>
                      <div className="upload-fname">✓ {selfieFile?.name}</div>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div className="upload-label">Selfie with ID</div>
                      <div className="upload-sub">Helps us verify faster · JPG or PNG</div>
                    </>
                  )}
                </div>
              </div>

              {uploadErr&&(
                <div style={{background:'rgba(192,57,43,.08)',border:'1px solid rgba(192,57,43,.2)',borderRadius:6,padding:'10px 12px',fontSize:12,color:'#C0392B',marginBottom:12,fontFamily:'var(--fc)'}}>
                  ✗ {uploadErr}
                </div>
              )}

              {loading&&uploadProgress>0&&(
                <div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${uploadProgress}%`}}/>
                  </div>
                  <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1,color:'var(--charcoal-l)',textAlign:'center'}}>
                    {uploadProgress<60?'Uploading documents...':uploadProgress<90?'Saving to your profile...':'Done!'}
                  </div>
                </div>
              )}

              <button className="bm bt" onClick={handleIdUpload} disabled={loading||!idFile}>
                {loading?<span className="spin"/>:'Submit for verification →'}
              </button>

              <span className="skip-link" onClick={handleSkipVerification}>
                Skip for now — I&apos;ll verify later from my dashboard
              </span>
            </div>
          )}

          {/* SUCCESS */}
          {screen==='success'&&(
            <div style={{textAlign:'center'}}>
              <div className="pg">
                <div className="pd done"/><div className="pd done"/><div className="pd done"/>
                {role==='tradesperson'&&<><div className="pd done"/><div className="pd active"/></>}
                {role==='homeowner'&&<div className="pd active"/>}
              </div>
              <div className="sr"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C4593A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div className="se" style={{justifyContent:'center'}}>Account created</div>
              <h1 className="st">YOU&apos;RE<br/>IN.</h1>
              <p className="ss">Welcome to Lungisa, <strong>{fname&&fname.trim()!==''?fname:'there'}</strong>. Your account is ready.</p>
              <ul className="cl" style={{textAlign:'left'}}>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Account verified</li>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Password set — login with email + password</li>
                <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>Profile saved to database</li>
                {role==='tradesperson'&&idFile&&(
                  <li><div className="ci"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>ID submitted — verification within 24h</li>
                )}
                {role==='tradesperson'&&!idFile&&(
                  <li>
                    <div style={{width:20,height:20,borderRadius:'50%',background:'rgba(232,160,32,.15)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    ID verification pending — complete from your dashboard
                  </li>
                )}
              </ul>
              <button className="bm bsu" onClick={async()=>{
                await new Promise(r=>setTimeout(r,500))
                if(role==='tradesperson' && !idFile){
                  window.location.href = '/dashboard?verify=1'
                } else {
                  window.location.href = role==='homeowner'?'/home':'/dashboard'
                }
              }}>
                {role==='tradesperson'&&!idFile ? 'Verify my ID now →' : 'Go to my dashboard →'}
              </button>
              {role==='tradesperson'&&!idFile&&(
                <div style={{marginTop:10,fontSize:12,color:'var(--charcoal-l)',textAlign:'center',lineHeight:1.6}}>
                  Verified tradespeople win bids at <strong>2x the rate</strong>. Takes 2 minutes.
                  <br/>
                  <span style={{fontSize:11,color:'rgba(44,44,40,.4)',cursor:'pointer'}}
                    onClick={async()=>{await new Promise(r=>setTimeout(r,500));window.location.href='/dashboard'}}>
                    Skip and verify later from dashboard
                  </span>
                </div>
              )}
            </div>
          )}

          {/* LOGIN */}
          {screen==='login'&&(
            <div>
              <div className="se">Welcome back</div>
              <h1 className="st">SIGN<br/>IN</h1>
              <p className="ss">Enter your email and password.</p>
              <div className="fg">
                <label className="fl2">Email address</label>
                <input className="fi2" type="email" placeholder="thabo@email.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)}/>
                {errors.loginEmail&&<div className="err">{errors.loginEmail}</div>}
              </div>
              <div className="fg">
                <label className="fl2">Password</label>
                <div className="pw-wrap">
                  <input className="fi2" type={showLoginPw?'text':'password'} placeholder="Your password" value={loginPw}
                    onChange={e=>setLoginPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
                  <button className="pw-eye" type="button" onClick={()=>setShowLoginPw(s=>!s)}>{showLoginPw?'🙈':'👁️'}</button>
                </div>
                {errors.loginPw&&<div className="err">{errors.loginPw}</div>}
              </div>
              <div className="security-note">
                🔐 A one-time code will be sent to your email once per day on first login for security.
              </div>
              <button className="bm bt" style={{marginBottom:10}} onClick={handleLogin} disabled={loading}>
                {loading?<span className="spin"/>:'Sign in →'}
              </button>
              <div style={{textAlign:'center',marginBottom:10}}>
                <button onClick={()=>setScreen('forgot')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--terra)',fontSize:13,fontFamily:'var(--fb)',fontWeight:500,textDecoration:'underline'}}>
                  Forgot password?
                </button>
              </div>
              <div className="as">Don&apos;t have an account? <button onClick={()=>setScreen('role')}>Create one free</button></div>
            </div>
          )}

          {/* DAILY OTP */}
          {screen==='login-otp'&&(
            <div>
              <div className="se">Daily security check</div>
              <h1 className="st">QUICK<br/>CHECK.</h1>
              <p className="ss">We verify your identity once per day to keep your account secure.</p>
              <div className="os">Code sent to<br/><strong>{loginEmail||email}</strong></div>
              <div className="ow">
                {otp.map((v,i)=>(
                  <input key={i} id={`otp-${i}`} className="ob" type="text" maxLength={1} value={v}
                    onChange={e=>handleOtpInput(e.target.value,i)}
                    onKeyDown={e=>{if(e.key==='Backspace'&&!v&&i>0)document.getElementById(`otp-${i-1}`)?.focus()}}
                  />
                ))}
              </div>
              {timerOn&&<div className="ot">Resend in <strong>{counter}s</strong></div>}
              {!timerOn&&(
                <div className="ot">
                  <button style={{background:'none',border:'none',cursor:'pointer',color:'var(--terra)',fontFamily:'var(--fc)',fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}
                    onClick={async()=>{
                      setOtp(['','','','','',''])
                      await supabase.auth.signInWithOtp({email:loginEmail||email,options:{shouldCreateUser:false}})
                      startTimer()
                    }}>
                    Resend code
                  </button>
                </div>
              )}
              {otpErr&&<div className="err" style={{textAlign:'center',marginBottom:12}}>{otpErr}</div>}
              <div style={{fontSize:12,color:'var(--charcoal-l)',textAlign:'center',marginBottom:16,lineHeight:1.6}}>
                Check your inbox for the 6-digit code.
              </div>
              <button className="bm bt" onClick={handleLoginOtp} disabled={otp.join('').length<6||loading}>
                {loading?<span className="spin"/>:'Verify & Continue'}
              </button>
              <div className="as" style={{marginTop:16}}>
                <button onClick={()=>{setScreen('login');setOtp(['','','','','','']);setOtpErr('')}}>← Back to login</button>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD */}
          {screen==='forgot'&&(
            <div>
              <div className="se">Reset password</div>
              <h1 className="st">FORGOT<br/>PASSWORD?</h1>
              <p className="ss">Enter your email and we&apos;ll send you a link to reset your password.</p>
              <div className="fg">
                <label className="fl2">Email address</label>
                <input className="fi2" type="email" placeholder="thabo@email.com" value={loginEmail}
                  onChange={e=>setLoginEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleForgotPassword()}/>
                {errors.loginEmail&&<div className="err">{errors.loginEmail}</div>}
              </div>
              <button className="bm bt" style={{marginBottom:10}} onClick={handleForgotPassword} disabled={loading}>
                {loading?<span className="spin"/>:'Send reset link →'}
              </button>
              <div className="as"><button onClick={()=>setScreen('login')}>← Back to login</button></div>
            </div>
          )}

          {/* FORGOT SENT */}
          {screen==='forgot-sent'&&(
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:56,marginBottom:16}}>📬</div>
              <div className="se" style={{justifyContent:'center'}}>Check your inbox</div>
              <h1 className="st">LINK<br/>SENT.</h1>
              <p className="ss">We sent a password reset link to <strong>{loginEmail}</strong>.</p>
              <div style={{background:'rgba(196,89,58,.06)',border:'1px solid rgba(196,89,58,.15)',borderRadius:8,padding:'12px 16px',fontSize:13,color:'var(--charcoal-l)',lineHeight:1.6,marginBottom:24,textAlign:'left'}}>
                💡 The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
              </div>
              <button className="bm bt" style={{marginBottom:10}} onClick={()=>setScreen('login')}>Back to login →</button>
              <div className="as">Didn&apos;t receive it? <button onClick={handleForgotPassword}>Resend link</button></div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}