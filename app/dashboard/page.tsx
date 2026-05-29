'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NotificationBell from '../components/NotificationBell'
import VerificationBadge from '../components/VerificationBadge'
import Messaging from '../components/Messaging'

type View = 'feed' | 'bids' | 'earnings' | 'messages' | 'profile'
type Bid = {
  id: string
  job: string
  loc: string
  price: number
  status: string
  time: string
  counterAmount: number|null
  counterBy: string|null
  counterRound: number
  counterUpdatedAt: string|null
  jobId: string
  jobStatus: string
}
// ── Added media to Job type ──────────────────────────────────────
type JobMedia = {
  url: string
  type: 'image' | 'video'
}
type Job = {
  id: any; cat: string; emoji: string; urgency: string; urgencyLabel: string; urgColor: string
  title: string; loc: string; dist: string; budget: string; budgetNum: number; desc: string
  time: string; photos: number; bids: number
  tags: {label:string,color:string,text:string}[]
  timing: string; submitted: boolean; submitPrice: number
  media: JobMedia[]
}

function getCatEmoji(cat:string){const m:Record<string,string>={plumbing:'🔧',electrical:'⚡',painting:'🎨',carpentry:'🪚',roofing:'🏠',tiling:'🚿',solar:'☀️',landscaping:'🌿',waterproofing:'💧',welding:'🔥',cleaning:'🧹',general:'🔩',moving:'🚛','pest control':'🐛','appliance repair':'🔌','air conditioning':'❄️',security:'🔐',paving:'🧱',plastering:'🏗️'};return m[cat?.toLowerCase()]||'🔧'}
function getUrgencyLabel(u:string){const m:Record<string,string>={emergency:'Today — emergency',within_3_days:'Within 3 days',this_week:'This week',flexible:'Flexible'};return m[u]||'Flexible'}
function getUrgencyColor(u:string){const m:Record<string,string>={emergency:'#E24B4A',within_3_days:'#E8A020',this_week:'#3DAA6A',flexible:'#D4C9B4'};return m[u]||'#D4C9B4'}
function getTimeAgo(d:string){const diff=Date.now()-new Date(d).getTime();const mins=Math.floor(diff/60000);if(mins<60)return`${mins} min ago`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs} hr${hrs>1?'s':''} ago`;return`${Math.floor(hrs/24)} day${Math.floor(hrs/24)>1?'s':''} ago`}
function getJobTags(j:any){const t=[];if(j.urgency==='emergency')t.push({label:'Urgent',color:'rgba(226,75,74,.12)',text:'#f08080'});if((j.photo_count||0)>0)t.push({label:`${j.photo_count} Photo${j.photo_count>1?'s':''}`,color:'rgba(46,127,212,.1)',text:'#6aaee8'});if((j.bid_count||0)>0)t.push({label:`${j.bid_count} bids placed`,color:'rgba(255,255,255,.06)',text:'rgba(245,240,232,.45)'});if((j.bid_count||0)===0)t.push({label:'New',color:'rgba(196,89,58,.15)',text:'#E07A5F'});return t}

function DashboardInner() {
  const [view, setView]           = useState<View>('feed')
  const [jobs, setJobs]           = useState<Job[]>([])
  const [isOnline, setIsOnline]   = useState(true)
  const [modalJob, setModalJob]   = useState<Job|null>(null)
  const [modalMedia, setModalMedia] = useState<JobMedia[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string|null>(null)
  const [lightboxType, setLightboxType] = useState<'image'|'video'>('image')
  const [bidPrice, setBidPrice]   = useState('')
  const [bidEta, setBidEta]       = useState('30 mins')
  const [bidNote, setBidNote]     = useState('')
  const [myBids, setMyBids]       = useState<Bid[]>([])
  const [filter, setFilter]       = useState('all')
  const [toasts, setToasts]       = useState<{id:number,title:string,sub:string,alert:boolean}[]>([])
  const [profile, setProfile]     = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [earnings, setEarnings]   = useState({thisWeek:0,totalJobs:0,avgJobValue:0,inEscrow:0})
  const [counterInputs, setCounterInputs] = useState<Record<string,string>>({})
  // Job completion flow
  const [completionJobId, setCompletionJobId] = useState<string|null>(null)
  const [completionBidId, setCompletionBidId] = useState<string|null>(null)
  const [completionReport, setCompletionReport] = useState('')
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0])
  const [completionPhotos, setCompletionPhotos] = useState<{url:string,name:string,type:'image'|'video'}[]>([])
  const [uploadingCompletion, setUploadingCompletion] = useState(false)
  const [submittingCompletion, setSubmittingCompletion] = useState(false)
  const [submittedCompletions, setSubmittedCompletions] = useState<Set<string>>(new Set())
  // Banking details
  const [banking, setBanking] = useState<{
    bank_name:string, account_holder:string,
    account_number:string, account_type:string, branch_code:string
  }|null>(null)
  const [bankingForm, setBankingForm] = useState({
    bank_name:'', account_holder:'', account_number:'', account_type:'current', branch_code:''
  })
  const [savingBanking, setSavingBanking] = useState(false)
  const [bankingMsg, setBankingMsg] = useState('')
  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({full_name:'', phone:'', service_areas:[] as string[], trade_category:''})
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  const ETAS = ['30 mins','1 hour','2 hours','Half day','Tomorrow']

  const searchParams = useSearchParams()
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  async function refreshAll() {
    setRefreshing(true)
    // Re-establish realtime channel in case it dropped
    supabase.removeAllChannels()
    // Hard reload all data
    await Promise.all([
      loadRealJobs(),
      loadMyBids(),
      loadEarnings(),
      loadProfile(),
    ])
    setLastRefreshed(new Date())
    setRefreshing(false)
  }

  // Auto-refresh every 60 seconds
  useEffect(()=>{
    const interval = setInterval(()=>{
      loadRealJobs()
      loadMyBids()
    }, 60000)
    return ()=>clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    // Auto-open profile tab if redirected from signup with verify=1
    if(searchParams.get('verify')==='1') setView('profile')

    loadProfile()
    loadRealJobs()
    loadMyBids()
    loadEarnings()
    loadBanking()

    const channel = supabase
      .channel('dashboard-jobs')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'jobs'},()=>{
        loadRealJobs()
        toast('New job posted!','A new job just appeared in your area',true)
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bids'},()=>{
        loadMyBids()
      })
      .subscribe()

    return ()=>{ supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  async function loadProfile(){
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(session?.user){
        const {data}=await supabase
          .from('profiles')
          .select(`*, tradesperson_profiles(trade_category,service_areas,years_experience,rating_avg,rating_count,jobs_completed,id_verified,verification_status,is_founding_member)`)
          .eq('id',session.user.id)
          .single()
        if(data){
          setProfile(data)
          setProfileForm({
            full_name:      data.full_name||'',
            phone:          data.phone||'',
            service_areas:  data.tradesperson_profiles?.service_areas||[],
            trade_category: data.tradesperson_profiles?.trade_category||'',
          })
        }
      }
    }catch(e){console.log('Profile error:',e)}
  }

  async function saveProfile(){
    if(!profileForm.full_name.trim()){ setProfileMsg('Name is required'); return }
    setSavingProfile(true)
    setProfileMsg('')
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user) return
      // Update profiles table
      const {error:e1}=await supabase
        .from('profiles')
        .update({ full_name: profileForm.full_name.trim(), phone: profileForm.phone.trim() })
        .eq('id', session.user.id)
      // Update service_areas and trade_category on tradesperson_profiles
      const {error:e2}=await supabase
        .from('tradesperson_profiles')
        .update({
          service_areas:  profileForm.service_areas,
          trade_category: profileForm.trade_category.toLowerCase(),
        })
        .eq('id', session.user.id)
      if(e1||e2){ setProfileMsg('Failed to save: '+(e1?.message||e2?.message)) }
      else{
        setProfile((p:any)=>({...p,
          full_name: profileForm.full_name,
          phone:     profileForm.phone,
          tradesperson_profiles:{
            ...p.tradesperson_profiles,
            service_areas:  profileForm.service_areas,
            trade_category: profileForm.trade_category,
          }
        }))
        setEditingProfile(false)
        setProfileMsg('✓ Profile updated')
        setTimeout(()=>setProfileMsg(''),3000)
      }
    }catch(e){ setProfileMsg('Something went wrong') }
    setSavingProfile(false)
  }

  async function loadRealJobs(){
    setLoading(true)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user){ setLoading(false); return }

      const {data:tp}=await supabase
        .from('tradesperson_profiles')
        .select('trade_category, service_areas')
        .eq('id',session.user.id)
        .single()

      console.log('[feed] profile:', tp?.trade_category, tp?.service_areas)

      // Get already-bid job IDs first
      const {data:myBids}=await supabase
        .from('bids')
        .select('job_id')
        .eq('tradesperson_id', session.user.id)
      const bidJobIds = new Set((myBids||[]).map((b:any)=>b.job_id))

      // Fetch ALL open/bidding jobs — exclude expired
      const {data,error}=await supabase
        .from('jobs')
        .select('id,title,category,area,urgency,budget_max,description,created_at,status,bid_count,homeowner_id,preferred_time,expires_at')
        .in('status',['open','bidding'])
        .or('expires_at.is.null,expires_at.gt.'+new Date().toISOString())
        .order('created_at',{ascending:false})

      console.log('[feed] raw jobs:', data?.length, error?.message)

      if(!error&&data){
        const category = (tp?.trade_category||'').toLowerCase().trim()
        const areas    = (tp?.service_areas||[]).map((a:string)=>a.toLowerCase().trim()).filter(Boolean)

        const filtered = data.filter((j:any)=>{
          // Skip already-bid jobs
          if(bidJobIds.has(j.id)) return false
          // Category check — lowercase both sides
          const jCat = (j.category||'').toLowerCase().trim()
          if(category && jCat !== category) return false
          // Area check — lowercase both sides, skip if no areas set
          if(areas.length > 0){
            const jArea = (j.area||'').toLowerCase().trim()
            if(!areas.includes(jArea)) return false
          }
          return true
        })

        console.log('[feed] filtered:', filtered.length)

        // Get photo counts
        const jobIds = filtered.map((j:any)=>j.id)
        const {data:photoCounts} = jobIds.length > 0 ? await supabase
          .from('job_photos').select('job_id').in('job_id', jobIds) : {data:[]}
        const photoMap: Record<string,number> = {}
        for(const p of (photoCounts||[])) photoMap[p.job_id] = (photoMap[p.job_id]||0)+1

        setJobs(filtered.map((j:any)=>({
          id:           j.id,
          cat:          j.category.charAt(0).toUpperCase()+j.category.slice(1),
          emoji:        getCatEmoji(j.category),
          urgency:      j.urgency,
          urgencyLabel: getUrgencyLabel(j.urgency),
          urgColor:     getUrgencyColor(j.urgency),
          title:        j.title,
          loc:          `${j.area}, JHB`,
          dist:         'Nearby',
          budget:       j.budget_max?`R${j.budget_max.toLocaleString()}`:'Open',
          budgetNum:    j.budget_max||0,
          desc:         j.description,
          time:         `Posted ${getTimeAgo(j.created_at)}`,
          photos:       photoMap[j.id]||0,
          bids:         j.bid_count||0,
          tags:         getJobTags(j),
          timing:       j.preferred_time||'Flexible',
          submitted:    false,
          submitPrice:  0,
          media:        [],
        })))
      }
    }catch(e){console.log('[feed] error:',e)}
    setLoading(false)
  }

  async function loadMyBids(){
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user) return
      const {data,error}=await supabase
        .from('bids')
        .select('*, jobs(id, title, area, status), updated_at')
        .eq('tradesperson_id',session.user.id)
        .order('created_at',{ascending:false})
      if(!error&&data){
        setMyBids(data.map((b:any)=>({
          id:            b.id,
          job:           b.jobs?.title||'Job',
          loc:           b.jobs?.area||'JHB',
          price:         b.amount,
          status:        (b.status||'pending').toLowerCase(),
          jobStatus:     b.jobs?.status||'open',
          time:          getTimeAgo(b.created_at),
          counterAmount: b.counter_amount||null,
          counterBy:     b.counter_by||null,
          counterRound:  b.counter_round||0,
          counterUpdatedAt: b.updated_at||null,
          jobId:         b.jobs?.id||b.job_id,
        })))
      }
    }catch(e){console.log('Bids error:',e)}
  }

  async function loadEarnings(){
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user) return
      const {data}=await supabase.from('payments').select('*').eq('tradesperson_id',session.user.id)
      if(data){
        const released=data.filter((p:any)=>p.status==='released')
        const held=data.filter((p:any)=>p.status==='held')
        const weekAgo=Date.now()-7*24*60*60*1000
        const thisWeek=released.filter((p:any)=>new Date(p.created_at).getTime()>weekAgo)
        setEarnings({
          thisWeek:    thisWeek.reduce((s:number,p:any)=>s+p.net_amount,0),
          totalJobs:   released.length,
          avgJobValue: released.length>0?Math.round(released.reduce((s:number,p:any)=>s+p.net_amount,0)/released.length):0,
          inEscrow:    held.reduce((s:number,p:any)=>s+p.net_amount,0),
        })
      }
    }catch(e){console.log('Earnings error:',e)}
  }

  async function loadBanking(){
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user) return
      const {data}=await supabase
        .from('banking_details')
        .select('*')
        .eq('tradesperson_id',session.user.id)
        .single()
      if(data){
        setBanking(data)
        setBankingForm({
          bank_name:      data.bank_name,
          account_holder: data.account_holder,
          account_number: data.account_number,
          account_type:   data.account_type,
          branch_code:    data.branch_code,
        })
      }
    }catch(e){ /* no banking details yet — fine */ }
  }

  async function saveBanking(){
    const {bank_name,account_holder,account_number,account_type,branch_code} = bankingForm
    if(!bank_name||!account_holder||!account_number||!branch_code){
      setBankingMsg('Please fill in all required fields')
      return
    }
    setSavingBanking(true)
    setBankingMsg('')
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(!session?.user) return
      const payload = {
        tradesperson_id: session.user.id,
        bank_name, account_holder, account_number, account_type, branch_code,
        updated_at: new Date().toISOString(),
      }
      const {error} = await supabase
        .from('banking_details')
        .upsert(payload, {onConflict:'tradesperson_id'})
      if(error){ setBankingMsg('Failed to save: '+error.message) }
      else {
        setBanking(bankingForm as any)
        setBankingMsg('✓ Banking details saved')
        setTimeout(()=>setBankingMsg(''),3000)
      }
    }catch(e){ setBankingMsg('Something went wrong') }
    setSavingBanking(false)
  }

  // ── Load job media when opening bid modal ────────────────────────
  async function openModal(job:Job){
    setModalJob(job)
    setBidPrice('')
    setBidNote('')
    setBidEta('30 mins')
    setModalMedia([])

    // Always fetch photos/videos for this job
    setMediaLoading(true)
    try{
      const {data, error} = await supabase
        .from('job_photos')
        .select('storage_url, file_type, sort_order')
        .eq('job_id', job.id)
        .order('sort_order', {ascending:true})
      if(!error && data && data.length > 0){
        setModalMedia(data.map((m:any)=>({
          url:  m.storage_url,
          type: (m.file_type||'image') as 'image'|'video',
        })))
      }
    }catch(e){ console.log('Media load error:',e) }
    setMediaLoading(false)
  }

  function toast(title:string,sub:string,alert:boolean){
    const id=Date.now()
    setToasts(t=>[...t,{id,title,sub,alert}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500)
  }

  async function withdrawBid(bidId:string, jobId:string){
    try{
      await supabase.from('bids').delete().eq('id', bidId)
      // Reset job to open if no bids remain
      const {data:remaining} = await supabase
        .from('bids').select('id').eq('job_id', jobId)
      if(!remaining || remaining.length === 0){
        await supabase.from('jobs').update({ status:'open', bid_count:0 }).eq('id', jobId)
      } else {
        await supabase.from('jobs').update({ bid_count: remaining.length }).eq('id', jobId)
      }
      toast('Bid withdrawn','Your bid has been removed',false)
      loadMyBids()
    }catch(e){ console.log('Withdraw error:',e) }
  }

  async function acceptCounter(bid:Bid){
    const amount=bid.counterAmount!
    try{
      await supabase.from('bids').update({ status:'accepted', final_amount:amount }).eq('id',bid.id)
      await supabase.from('bids').update({ status:'declined' }).eq('job_id',bid.jobId).neq('id',bid.id)
      await supabase.from('jobs').update({ status:'accepted' }).eq('id',bid.jobId)
      toast('Counter accepted!',`R${amount} agreed · Homeowner will pay to confirm`,false)
      loadMyBids()
    }catch(e){ console.log('Accept counter error:',e) }
  }

  async function declineCounter(bid:Bid){
    try{
      await supabase.from('bids').update({ status:'declined' }).eq('id',bid.id)
      toast('Counter declined','Homeowner has been notified',false)
      loadMyBids()
    }catch(e){ console.log('Decline counter error:',e) }
  }

  async function sendBackCounter(bid:Bid){
    const raw=counterInputs[bid.id]
    const amount=parseInt(raw||'0')
    if(!amount||amount<1) return
    if(bid.counterRound >= 3){
      toast('Max rounds reached','You must accept or decline — no more counters allowed',false)
      return
    }
    try{
      const newRound = bid.counterRound + 1
      await supabase.from('bids').update({
        counter_amount:  amount,
        counter_by:      'tradesperson',
        counter_message: `Tradesperson counter-offered R${amount} (round ${newRound})`,
        counter_round:   newRound,
        status:          'countered',
      }).eq('id',bid.id)
      const {data:{session}}=await supabase.auth.getSession()
      const {data:jobData}=await supabase.from('jobs').select('homeowner_id').eq('id',bid.jobId).single()
      fetch('/api/send-email',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          type:'counter_offer',bidId:bid.id,counterAmount:amount,
          counterBy:'tradesperson',jobTitle:bid.job,
          jobId:bid.jobId,
          homeownerId:(jobData as any)?.homeowner_id,
          tradespersonId:session?.user?.id,
        })
      }).catch(e=>console.log('Email error:',e))
      setCounterInputs(c=>({...c,[bid.id]:''}))
      toast(`Counter sent! (Round ${newRound}/3)`,`R${amount} sent to homeowner`,false)
      loadMyBids()
    }catch(e){ console.log('Counter back error:',e) }
  }

  async function uploadCompletionPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if(!file) return
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')
    // Max 4 images + 1 video
    const currentVideos = completionPhotos.filter(p=>p.type==='video').length
    const currentImages = completionPhotos.filter(p=>p.type==='image').length
    if(isVideo && currentVideos >= 1) { toast('Max 1 video','Remove the existing video to add a new one',false); return }
    if(isImage && currentImages >= 4) { toast('Max 4 photos','You can add up to 4 photos',false); return }
    const maxSize = isVideo ? 50*1024*1024 : 10*1024*1024
    if(file.size > maxSize) { toast('File too large',isVideo?'Max 50MB for video':'Max 10MB per photo',false); return }
    setUploadingCompletion(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `job-completions/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { data, error } = await supabase.storage
        .from('job-photos')
        .upload(path, file, { cacheControl:'3600', upsert:false, contentType: file.type })
      if(!error && data) {
        const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(data.path)
        setCompletionPhotos(prev => [...prev, { url: urlData.publicUrl, name: file.name, type: isVideo?'video':'image' }])
      } else {
        toast('Upload failed', error?.message||'Try again', false)
      }
    } catch(e) { console.log('Upload error:', e) }
    setUploadingCompletion(false)
    if(e.target) e.target.value = ''
  }

  async function submitCompletion() {
    if(!completionReport.trim()) { toast('Please add a report','Describe what was repaired',false); return }
    if(!completionJobId || !completionBidId) return
    setSubmittingCompletion(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      if(!session?.user) return

      // 1. Insert completion record
      const { data: completion, error } = await supabase
        .from('job_completions')
        .insert({
          job_id:          completionJobId,
          tradesperson_id: session.user.id,
          completed_at:    completionDate,
          report:          completionReport,
        })
        .select('id')
        .single()

      if(error) { toast('Failed to submit','Please try again',false); setSubmittingCompletion(false); return }

      // 2. Insert completion photos
      if(completionPhotos.length > 0 && completion) {
        await supabase.from('job_completion_photos').insert(
          completionPhotos.map((p, i) => ({
            completion_id: completion.id,
            storage_url:   p.url,
            file_type:     p.type,
            sort_order:    i,
          }))
        )
      }

      // 3. Update job status to completion_submitted
      await supabase.from('jobs').update({ status:'completion_submitted' }).eq('id', completionJobId)

      // 4. Notify homeowner
      const { data: jobData } = await supabase
        .from('jobs')
        .select('homeowner_id, title')
        .eq('id', completionJobId)
        .single()

      if(jobData) {
        fetch('/api/send-email', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            type:          'job_completion_submitted',
            jobId:         completionJobId,
            jobTitle:      jobData.title,
            homeownerId:   jobData.homeowner_id,
            tradespersonId: session.user.id,
            report:        completionReport,
            completedAt:   completionDate,
          })
        }).catch(e => console.log('Email error:',e))
      }

      // 5. Mark locally as submitted
      setSubmittedCompletions(prev => new Set(Array.from(prev).concat(completionJobId!)))
      toast('Job marked complete! ✓','Homeowner has been notified to confirm and release payment',false)

      // Reset
      setCompletionJobId(null)
      setCompletionBidId(null)
      setCompletionReport('')
      setCompletionDate(new Date().toISOString().split('T')[0])
      setCompletionPhotos([])
      loadMyBids()
    } catch(e) { console.log('Submit completion error:', e) }
    setSubmittingCompletion(false)
  }

  async function submitBid(){
    if(!bidPrice||parseInt(bidPrice)<100||!modalJob) return
    const price=parseInt(bidPrice)
    try{
      const {data:{session}}=await supabase.auth.getSession()
      if(session?.user){
        const {error}=await supabase.from('bids').insert({
          job_id:          modalJob.id,
          tradesperson_id: session.user.id,
          amount:          price,
          eta_label:       bidEta,
          note:            bidNote||null,
          status:          'pending',
        })
        if(error){
          if(error.code==='23505'){
            toast('Already bid on this job','Manage your existing bid in My Bids',false)
            setJobs(j=>j.map(x=>x.id===modalJob.id?{...x,submitted:true}:x))
            setModalJob(null); setModalMedia([])
          } else {
            toast('Error submitting bid',error.message,false)
          }
          return
        }
        await supabase.from('jobs').update({ status:'bidding' }).eq('id',modalJob.id)
        fetch('/api/send-email',{
          method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({jobId:modalJob.id,amount:price,eta:bidEta,tradespersonId:session.user.id})
        }).catch(e=>console.log('Email error:',e))
      }
    }catch(e){console.log('Bid error:',e)}
    setJobs(j=>j.map(x=>x.id===modalJob.id?{...x,submitted:true,submitPrice:price}:x))
    toast('Bid submitted!',`R${price} on ${modalJob.title}`,false)
    setModalJob(null)
    setModalMedia([])
    loadMyBids()
  }

  const visibleJobs=jobs.filter(j=>{
    if(filter==='urgent') return j.urgency==='today'||j.urgency==='emergency'
    if(filter==='new') return j.bids===0&&!j.submitted
    return true
  })

  const countersPending=myBids.filter(b=>b.status==='countered'&&b.counterBy==='homeowner')

  const displayName=profile?.full_name||'—'
  const displayTrade=profile?.tradesperson_profiles?.trade_category
    ?profile.tradesperson_profiles.trade_category.charAt(0).toUpperCase()+profile.tradesperson_profiles.trade_category.slice(1)
    :'Tradesperson'
  const displayInitials=displayName.split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase()||'?'
  const displayRating=profile?.tradesperson_profiles?.rating_avg>0?`★ ${profile.tradesperson_profiles.rating_avg}`:'New'
  const displayJobs=profile?.tradesperson_profiles?.jobs_completed||0
  const isVerified=profile?.tradesperson_profiles?.id_verified===true

  const S={
    shell:{display:'flex',minHeight:'100vh',fontFamily:"'Barlow',sans-serif",background:'#1A1A16'},
    sidenav:{width:220,flexShrink:0,background:'#111110',display:'flex',flexDirection:'column' as const,borderRight:'1px solid rgba(255,255,255,.05)',position:'sticky' as const,top:0,height:'100vh',overflowY:'auto' as const},
    snLogo:{padding:'22px 20px 18px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:9},
    snHex:{width:28,height:28,background:'#C4593A',clipPath:'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',display:'flex',alignItems:'center',justifyContent:'center'},
    snWord:{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:2,color:'#F5F0E8',textDecoration:'none'},
    snProfile:{padding:'18px 20px',borderBottom:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:10},
    snAvatar:{width:40,height:40,borderRadius:'50%',background:'#9E3E24',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:'#fff',flexShrink:0,border:'2px solid rgba(196,89,58,.3)'},
    snName:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,color:'#F5F0E8',lineHeight:1.2},
    snTrade:{fontSize:11,color:'rgba(245,240,232,.4)'},
    snRating:{fontSize:11,color:'#E8A020',marginTop:2},
    snItem:(active:boolean)=>({display:'flex',alignItems:'center',gap:10,padding:'10px 20px',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:600,letterSpacing:.5,color:active?'#F5F0E8':'rgba(245,240,232,.45)',borderLeft:`3px solid ${active?'#C4593A':'transparent'}`,background:active?'rgba(196,89,58,.08)':'transparent',transition:'all .15s'}),
    snSection:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase' as const,color:'rgba(245,240,232,.2)',padding:'12px 20px 4px'},
    onlineToggle:(on:boolean)=>({display:'flex',alignItems:'center',justifyContent:'space-between',background:on?'rgba(61,170,106,.08)':'rgba(255,255,255,.04)',border:`1px solid ${on?'rgba(61,170,106,.2)':'rgba(255,255,255,.1)'}`,borderRadius:8,padding:'10px 12px',cursor:'pointer'}),
    onlineLabel:(on:boolean)=>({fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:.5,color:on?'rgba(61,170,106,.9)':'rgba(245,240,232,.3)'}),
    topbar:{background:'#111110',borderBottom:'1px solid rgba(255,255,255,.05)',padding:'0 28px',height:58,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky' as const,top:0,zIndex:40},
    pageTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1.5,color:'#F5F0E8'},
    content:{padding:'24px 28px'},
    statStrip:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:24},
    statCard:{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px'},
    statEye:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase' as const,color:'rgba(245,240,232,.35)',marginBottom:8},
    secHeader:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14},
    secTitle:{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1.5,color:'#F5F0E8',display:'flex',alignItems:'center',gap:10},
    filterChip:(sel:boolean)=>({fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase' as const,color:sel?'#E07A5F':'rgba(245,240,232,.4)',background:sel?'rgba(196,89,58,.08)':'rgba(255,255,255,.04)',border:`1px solid ${sel?'rgba(196,89,58,.3)':'rgba(255,255,255,.08)'}`,padding:'6px 12px',borderRadius:4,cursor:'pointer',transition:'all .15s'}),
    jobCard:{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',overflow:'hidden',transition:'border-color .2s',marginBottom:12,cursor:'pointer'},
    urgBar:(color:string)=>({width:4,height:52,borderRadius:2,background:color,flexShrink:0}),
    bidNowBtn:(sub:boolean)=>({fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,background:sub?'rgba(61,170,106,.2)':'#C4593A',color:sub?'rgba(61,170,106,.9)':'#fff',border:'none',padding:'8px 18px',borderRadius:6,cursor:sub?'default':'pointer',transition:'all .15s'}),
    overlay:{position:'fixed' as const,inset:0,background:'rgba(0,0,0,.75)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20},
    modal:{background:'#222220',borderRadius:16,border:'1px solid rgba(255,255,255,.1)',width:'100%',maxWidth:560,maxHeight:'92vh',overflowY:'auto' as const},
    mHeader:{padding:'22px 26px 18px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16},
    mBody:{padding:'22px 26px'},
    mFooter:{padding:'14px 26px 22px',display:'flex',gap:10},
    detailRow:{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,.05)',fontSize:13},
    drLabel:{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase' as const,color:'rgba(245,240,232,.35)',minWidth:80,flexShrink:0,paddingTop:1},
    descBox:{background:'rgba(255,255,255,.04)',borderRadius:8,border:'1px solid rgba(255,255,255,.06)',padding:'12px 14px',fontSize:13,color:'rgba(245,240,232,.7)',lineHeight:1.65,margin:'10px 0'},
    priceWrap:{display:'flex',alignItems:'center',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.12)',borderRadius:10,overflow:'hidden',marginBottom:14},
    priceR:{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',padding:'12px 16px',background:'rgba(255,255,255,.04)',borderRight:'1px solid rgba(255,255,255,.08)'},
    priceInput:{flex:1,background:'transparent',border:'none',outline:'none',fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#F5F0E8',padding:'12px 16px',letterSpacing:1},
    etaChips:{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:14},
    etaChip:(sel:boolean)=>({border:`1px solid ${sel?'#C4593A':'rgba(255,255,255,.1)'}`,borderRadius:6,padding:'8px 14px',cursor:'pointer',fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,color:sel?'#E07A5F':'rgba(245,240,232,.5)',background:sel?'rgba(196,89,58,.12)':'rgba(255,255,255,.04)',transition:'all .15s'}),
    bidNoteInput:{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:'10px 14px',fontFamily:"'Barlow',sans-serif",fontSize:13,color:'#F5F0E8',outline:'none',resize:'none' as const,height:80,lineHeight:1.55},
    earningsPreview:{background:'rgba(61,170,106,.07)',border:'1px solid rgba(61,170,106,.18)',borderRadius:8,padding:'12px 14px',marginTop:12,display:'flex',justifyContent:'space-between',alignItems:'center'},
    btn:(variant:'terra'|'ghost')=>({padding:'12px 22px',borderRadius:8,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' as const,cursor:'pointer',border:'none',background:variant==='terra'?'#C4593A':'rgba(255,255,255,.06)',color:variant==='ghost'?'rgba(245,240,232,.6)':'#fff',flex:variant!=='ghost'?1:undefined,display:'flex',alignItems:'center',justifyContent:'center' as const,gap:8,transition:'all .15s'}),
  }

  const viewTitles:Record<View,string>={feed:'JOB FEED',bids:'MY BIDS',earnings:'EARNINGS',messages:'MESSAGES',profile:'MY PROFILE'}
  const navItems=[
    {view:'feed'     as View,icon:'🏠',label:'Job Feed',  badge:jobs.filter(j=>!j.submitted).length},
    {view:'bids'     as View,icon:'💸',label:'My Bids',   badge:countersPending.length>0?countersPending.length:myBids.length},
    {view:'messages' as View,icon:'💬',label:'Messages',  badge:0},
    {view:'earnings' as View,icon:'📈',label:'Earnings'},
    {view:'profile'  as View,icon:'👤',label:'My Profile'},
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        input::placeholder,textarea::placeholder{color:rgba(245,240,232,.25)}
        @keyframes bidIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .bid-in{animation:bidIn .4s ease both}
        .toast-in{animation:toastIn .3s ease both}
        .online-dot{animation:pulse 1.8s infinite}
        .spin{display:inline-block;width:20px;height:20px;border:2px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
        .media-thumb{cursor:pointer;transition:transform .15s,opacity .15s}
        .media-thumb:hover{transform:scale(1.04);opacity:.9}
        @media(max-width:900px){
          .sidenav{display:none!important}
          .stat-strip{grid-template-columns:1fr 1fr!important}
          .mobile-dash-nav{display:flex!important}
          .dash-main{padding-bottom:60px!important}
        }
        @media(max-width:600px){
          .stat-strip{grid-template-columns:1fr 1fr!important;gap:8px!important;margin-bottom:16px!important}
          .stat-card{padding:14px 16px!important}
          .bid-in .bc-top{flex-wrap:wrap}
        }
        .mobile-dash-nav{
          display:none;position:fixed;bottom:0;left:0;right:0;
          background:#111110;border-top:1px solid rgba(255,255,255,.08);
          z-index:50;height:60px;
        }
      `}</style>

      <div style={S.shell}>
        {/* SIDEBAR */}
        <nav style={S.sidenav} className="sidenav">
          <div style={S.snLogo}>
            <div style={S.snHex}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <a href="/" style={S.snWord}>LUNGISA</a>
          </div>
          <div style={S.snProfile}>
            <div style={{position:'relative',flexShrink:0}}>
              <div style={S.snAvatar}>{displayInitials}</div>
              {isVerified&&(
                <div style={{position:'absolute',bottom:-2,right:-2,width:14,height:14,borderRadius:'50%',background:'#3DAA6A',border:'2px solid #111110',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={S.snName}>{displayName}</div>
              <div style={S.snTrade}>{displayTrade}</div>
              <div style={S.snRating}>{displayRating} · {displayJobs} jobs</div>
              {profile?.tradesperson_profiles?.is_founding_member&&(
                <div style={{marginTop:5,display:'inline-flex',alignItems:'center',gap:4,background:'rgba(196,89,58,.12)',border:'1px solid rgba(196,89,58,.25)',borderRadius:4,padding:'2px 7px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#E07A5F'}}>
                  🔨 Founding Member
                </div>
              )}
              <div style={{marginTop:5}}><VerificationBadge variant="compact" /></div>
            </div>
          </div>
          <div style={{flex:1,padding:'10px 0'}}>
            <div style={S.snSection}>Main</div>
            {navItems.map(item=>(
              <div key={item.view} style={S.snItem(view===item.view)} onClick={()=>setView(item.view)}>
                <span style={{fontSize:14}}>{item.icon}</span>
                {item.label}
                {item.badge!==undefined&&item.badge>0&&(
                  <span style={{marginLeft:'auto',background:countersPending.length>0&&item.view==='bids'?'#E8A020':'#C4593A',color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10}}>
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div style={{padding:'14px 18px',borderTop:'1px solid rgba(255,255,255,.05)'}}>
            <div style={S.onlineToggle(isOnline)} onClick={()=>setIsOnline(o=>!o)}>
              <span style={S.onlineLabel(isOnline)}>{isOnline?'Online — receiving jobs':'Offline'}</span>
              <div className={isOnline?'online-dot':''} style={{width:8,height:8,borderRadius:'50%',background:isOnline?'#3DAA6A':'rgba(255,255,255,.2)'}}/>
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <div className="dash-main" style={{flex:1,overflowX:'hidden'}}>
          <div style={S.topbar}>
            <span style={S.pageTitle}>{viewTitles[view]}</span>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {/* Refresh button — single click reloads data, double click hard reloads page */}
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <button onClick={refreshAll} onDoubleClick={()=>window.location.reload()} disabled={refreshing}
                  title={`Last updated: ${lastRefreshed.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})} · Double-click for full page reload`}
                  style={{display:'flex',alignItems:'center',gap:5,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'6px 12px',cursor:refreshing?'not-allowed':'pointer',color:'rgba(245,240,232,.6)',transition:'all .15s',opacity:refreshing?.6:1}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    style={{animation:refreshing?'spin .6s linear infinite':'none'}}>
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>
                    {refreshing?'Syncing...':'Refresh'}
                  </span>
                </button>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:8,color:'rgba(245,240,232,.25)',letterSpacing:.5}}>
                  {lastRefreshed.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}
                </span>
              </div>
              <NotificationBell theme="dark" />
            </div>
          </div>

          {/* JOB FEED */}
          {view==='feed'&&(
            <div style={S.content}>

              {/* ── FOUNDING MEMBER BANNER ─────────────────────── */}
              {profile?.tradesperson_profiles?.is_founding_member&&(
                <div style={{background:'linear-gradient(135deg,#2C1810 0%,#1A1A16 100%)',border:'1px solid rgba(196,89,58,.4)',borderRadius:14,padding:'20px 24px',marginBottom:20,position:'relative',overflow:'hidden'}}>
                  {/* Background texture */}
                  <div style={{position:'absolute',top:-20,right:-20,fontSize:80,opacity:.06,transform:'rotate(15deg)'}}>🔨</div>
                  <div style={{position:'absolute',bottom:-20,right:60,fontSize:60,opacity:.04,transform:'rotate(-10deg)'}}>🔨</div>

                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <span style={{fontSize:22}}>🔨</span>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:2,color:'#E07A5F'}}>
                          FOUNDING MEMBER
                        </div>
                        <div style={{background:'rgba(196,89,58,.2)',border:'1px solid rgba(196,89,58,.4)',borderRadius:100,padding:'2px 10px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#E07A5F'}}>
                          Pre-launch
                        </div>
                      </div>
                      <p style={{fontSize:13,color:'rgba(245,240,232,.65)',lineHeight:1.6,marginBottom:12,maxWidth:480}}>
                        You&apos;re one of the <strong style={{color:'#E07A5F'}}>first 100 tradespeople</strong> on Lungisa. This badge is permanently yours — only 100 will ever exist. It appears on every bid you place, giving homeowners confidence to choose you over tradespeople who joined later.
                      </p>
                      <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:'#3DAA6A'}}/>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,color:'rgba(245,240,232,.5)',letterSpacing:.5}}>Permanent badge on your profile</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:'#3DAA6A'}}/>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,color:'rgba(245,240,232,.5)',letterSpacing:.5}}>Priority job notifications at launch</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:6,height:6,borderRadius:'50%',background:'#E8A020'}}/>
                          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,color:'rgba(232,160,32,.7)',letterSpacing:.5}}>🚀 Launch: 10 June 2026</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Referral teaser */}
                  <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid rgba(196,89,58,.15)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(232,160,32,.8)',marginBottom:4}}>
                        🎁 Coming soon — Founding Member Referral Rewards
                      </div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.4)',lineHeight:1.5}}>
                        Refer fellow tradespeople to Lungisa and earn rewards when they complete their first job. Exclusive to founding members. Details dropping at launch.
                      </div>
                    </div>
                    <div style={{background:'rgba(232,160,32,.08)',border:'1px solid rgba(232,160,32,.2)',borderRadius:6,padding:'6px 14px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#E8A020',whiteSpace:'nowrap',flexShrink:0}}>
                      Coming 10 June
                    </div>
                  </div>
                </div>
              )}

              {/* ── VERIFICATION PUSH ──────────────────────────── */}
              {profile?.tradesperson_profiles?.verification_status!=='verified'&&profile?.tradesperson_profiles?.verification_status!=='pending'&&(
                <div style={{background:'rgba(196,89,58,.06)',border:'1px solid rgba(196,89,58,.25)',borderRadius:10,padding:'16px 20px',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <span style={{fontSize:20,flexShrink:0}}>🪪</span>
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:.5,color:'#F5F0E8',marginBottom:3}}>
                        Verify your ID to unlock more jobs
                      </div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.5)',lineHeight:1.5}}>
                        Verified tradespeople win bids at <strong style={{color:'#E07A5F'}}>2x the rate</strong> of unverified ones. Takes less than 2 minutes.
                      </div>
                    </div>
                  </div>
                  <button onClick={()=>setView('profile')}
                    style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 20px',borderRadius:6,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap'}}>
                    Verify now →
                  </button>
                </div>
              )}

              {/* Pending verification — show different message */}
              {profile?.tradesperson_profiles?.verification_status==='pending'&&(
                <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.2)',borderRadius:10,padding:'14px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:18}}>⏳</span>
                  <div style={{fontSize:12,color:'rgba(232,160,32,.8)',lineHeight:1.5}}>
                    <strong>ID verification in progress</strong> — the Lungisa team is reviewing your documents. Usually under 24 hours. You&apos;ll get a notification when it&apos;s done.
                  </div>
                </div>
              )}
              <div style={{...S.statStrip}} className="stat-strip">
                {[
                  {label:'This week',   val:earnings.thisWeek>0?`R${earnings.thisWeek.toLocaleString()}`:'R0',          color:'#52C47F',delta:earnings.thisWeek>0?'Earned this week':'Complete your first job'},
                  {label:'Bids placed', val:String(myBids.length),                                                       color:'#E07A5F',delta:myBids.length>0?`${myBids.filter(b=>b.status==='accepted').length} accepted`:'Start bidding on jobs'},
                  {label:'Win rate',    val:myBids.length>0?`${Math.round((myBids.filter(b=>b.status==='accepted').length/myBids.length)*100)}%`:'—',color:'#E8A020',delta:myBids.length>0?'Acceptance rate':'No bids yet'},
                  {label:'Rating',      val:profile?.tradesperson_profiles?.rating_avg>0?String(profile.tradesperson_profiles.rating_avg):'New',color:'#F5F0E8',delta:profile?.tradesperson_profiles?.rating_count>0?`${profile.tradesperson_profiles.rating_count} reviews`:'No reviews yet'},
                ].map(s=>(
                  <div key={s.label} style={S.statCard}>
                    <div style={S.statEye}>{s.label}</div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:36,letterSpacing:1,lineHeight:1,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:11,color:'rgba(245,240,232,.35)',marginTop:6,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:500}}>{s.delta}</div>
                  </div>
                ))}
              </div>

              <div style={S.secHeader}>
                <div style={S.secTitle}>
                  Open Jobs
                  {!loading&&<span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,letterSpacing:1.5,background:visibleJobs.length>0?'rgba(196,89,58,.15)':'rgba(255,255,255,.06)',color:visibleJobs.length>0?'#E07A5F':'rgba(245,240,232,.3)',border:`1px solid ${visibleJobs.length>0?'rgba(196,89,58,.25)':'rgba(255,255,255,.08)'}`,padding:'3px 10px',borderRadius:4}}>{visibleJobs.length} near you</span>}
                </div>
                <div style={{display:'flex',gap:8}}>
                  {['all','urgent','new'].map(f=>(
                    <div key={f} style={S.filterChip(filter===f)} onClick={()=>setFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</div>
                  ))}
                </div>
              </div>

              {loading?(
                <div style={{textAlign:'center',padding:'60px',color:'rgba(245,240,232,.4)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:1,display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
                  <div className="spin"/> Loading jobs...
                </div>
              ):visibleJobs.length===0?(
                <div style={{textAlign:'center',padding:'60px 20px',color:'rgba(245,240,232,.3)'}}>
                  <div style={{fontSize:40,marginBottom:16}}>🔍</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',marginBottom:8}}>No jobs right now</div>
                  <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,lineHeight:1.6}}>New jobs are posted daily. Check back soon or{' '}
                    <span style={{color:'#E07A5F',cursor:'pointer'}} onClick={loadRealJobs}>refresh</span>.
                  </p>
                </div>
              ):visibleJobs.map(job=>(
                <div key={String(job.id)} style={S.jobCard} className="bid-in">
                  <div style={{display:'flex',alignItems:'center',gap:14,padding:'18px 20px 12px'}} onClick={()=>openModal(job)}>
                    <div style={S.urgBar(job.urgColor)}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:4}}>{job.emoji} {job.cat}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:17,fontWeight:700,color:'#F5F0E8',marginBottom:3,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{job.title}</div>
                      <div style={{fontSize:12,color:'rgba(245,240,232,.45)'}}>📍 {job.loc}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:'#E07A5F',letterSpacing:.5,lineHeight:1}}>{job.budget}</div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:500,letterSpacing:1,textTransform:'uppercase',color:'rgba(245,240,232,.3)'}}>Budget</div>
                      <div style={{fontSize:11,color:'rgba(245,240,232,.3)',marginTop:3}}>{job.time}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',padding:'10px 20px',background:'rgba(255,255,255,.02)',borderTop:'1px solid rgba(255,255,255,.04)',gap:8}}>
                    {job.tags.map(t=>(
                      <span key={t.label} style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',padding:'3px 8px',borderRadius:3,background:t.color,color:t.text}}>{t.label}</span>
                    ))}
                    <div style={{flex:1}}/>
                    <button style={S.bidNowBtn(job.submitted)} onClick={()=>!job.submitted&&openModal(job)}>
                      {job.submitted?'✓ Bid submitted':'Bid Now'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MY BIDS */}
          {view==='bids'&&(
            <div style={S.content}>
              {countersPending.length>0&&(
                <div style={{background:'rgba(232,160,32,.1)',border:'1px solid rgba(232,160,32,.3)',borderRadius:8,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#E8A020'}}>
                  <span style={{fontSize:18}}>⚡</span>
                  <strong>{countersPending.length} counter-offer{countersPending.length>1?'s':''} waiting for your response</strong>
                </div>
              )}

              {myBids.length===0?(
                <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(245,240,232,.3)'}}>
                  <div style={{fontSize:40,marginBottom:16}}>💸</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',marginBottom:8}}>No bids yet</div>
                  <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,lineHeight:1.6,marginBottom:20}}>Go to the Job Feed and start bidding on jobs near you.</p>
                  <button style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 24px',borderRadius:6,cursor:'pointer'}} onClick={()=>setView('feed')}>Browse jobs →</button>
                </div>
              ):myBids.map((b)=>{
                const homeownerCountered=b.status==='countered'&&b.counterBy==='homeowner'
                const iSentCounter      =b.status==='countered'&&b.counterBy==='tradesperson'
                const isAccepted        =b.status==='accepted'
                const isDeclined        =b.status==='declined'
                const isCompleted       =b.status==='completed'||b.jobStatus==='completed'
                const isInEscrow        =['in_progress','completion_submitted'].includes(b.jobStatus)
                const isCompletionSubmitted = b.jobStatus==='completion_submitted'
                // Check if counter is expired (48h)
                const counterAge = b.counterUpdatedAt
                  ? (Date.now() - new Date(b.counterUpdatedAt).getTime()) / (1000*60*60)
                  : 0
                const isCounterExpired = (homeownerCountered||iSentCounter) && counterAge > 48

                return (
                  <div key={b.id} style={{
                    background:'#222220',borderRadius:10,
                    border:`1px solid ${homeownerCountered?'rgba(232,160,32,.4)':isAccepted?'rgba(61,170,106,.25)':isDeclined?'rgba(226,75,74,.2)':'rgba(255,255,255,.06)'}`,
                    padding:'16px 20px',marginBottom:12,
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:homeownerCountered||iSentCounter||isAccepted||isDeclined||isCompleted?12:0}}>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:'#F5F0E8',marginBottom:2}}>{b.job}</div>
                        <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>{b.loc} · {b.time}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'#E07A5F'}}>R{b.price}</div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1,textTransform:'uppercase',
                          color:isCompleted?'#3DAA6A':isAccepted||isInEscrow?'#3DAA6A':isDeclined?'#f08080':isCounterExpired?'#E24B4A':homeownerCountered?'#E8A020':iSentCounter?'rgba(232,160,32,.6)':'rgba(245,240,232,.4)'}}>
                          {isCompleted?'✓ Completed & paid':isCompletionSubmitted?'⏳ Awaiting homeowner confirmation':isInEscrow?'🔒 In escrow — complete the job':isAccepted&&!isInEscrow?'✓ Accepted — awaiting payment':isCounterExpired?'⚠ Counter expired — bid again':homeownerCountered?'⚡ Counter received':iSentCounter?'⏳ Counter sent':isDeclined?'Declined':'Pending'}
                        </div>
                      </div>
                    </div>

                    {homeownerCountered&&(
                      <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.2)',borderRadius:8,padding:'14px 16px'}}>
                        {/* Round indicator */}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#E8A020'}}>
                            Homeowner counter-offered
                          </div>
                          <div style={{display:'flex',gap:4,alignItems:'center'}}>
                            {[1,2,3].map(n=>(
                              <div key={n} style={{width:18,height:5,borderRadius:3,background:n<=b.counterRound?'#E8A020':'rgba(232,160,32,.2)'}}/>
                            ))}
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:700,color:'rgba(232,160,32,.6)',letterSpacing:1,marginLeft:3}}>
                              ROUND {b.counterRound}/3
                            </span>
                          </div>
                        </div>
                        <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
                          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,color:'#F5F0E8'}}>R{b.counterAmount}</div>
                          <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>vs your bid of R{b.price}</div>
                        </div>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                          <button onClick={()=>acceptCounter(b)}
                            style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#3DAA6A',color:'#fff',border:'none',padding:'10px 18px',borderRadius:6,cursor:'pointer',flex:1}}>
                            ✓ Accept R{b.counterAmount}
                          </button>
                          <button onClick={()=>declineCounter(b)}
                            style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'rgba(226,75,74,.1)',color:'#f08080',border:'1px solid rgba(226,75,74,.2)',padding:'10px 18px',borderRadius:6,cursor:'pointer'}}>
                            ✗ Decline
                          </button>
                        </div>
                        {/* Counter back only if under 3 rounds */}
                        {b.counterRound < 3 ? (
                          <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:12}}>
                            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:8}}>
                              Or counter back ({3-b.counterRound} round{3-b.counterRound!==1?'s':''} left):
                            </div>
                            <div style={{display:'flex',alignItems:'stretch'}}>
                              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'rgba(245,240,232,.3)',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:'6px 0 0 6px',padding:'10px 14px',flexShrink:0,borderRight:'none',display:'flex',alignItems:'center'}}>R</div>
                              <input type="number"
                                placeholder={b.counterAmount?String(Math.round((b.price+b.counterAmount)/2)):String(Math.round(b.price*0.95))}
                                value={counterInputs[b.id]||''}
                                onChange={e=>setCounterInputs(c=>({...c,[b.id]:e.target.value}))}
                                style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:0,padding:'10px 12px',fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:'#F5F0E8',outline:'none',borderLeft:'none',borderRight:'none'}}/>
                              <button onClick={()=>sendBackCounter(b)}
                                style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 16px',borderRadius:'0 6px 6px 0',cursor:'pointer',flexShrink:0}}>
                                Counter
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:12,fontSize:12,color:'#f08080',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,letterSpacing:.5}}>
                            ⚠ Maximum 3 rounds reached — you must accept or decline.
                          </div>
                        )}
                      </div>
                    )}
                    {iSentCounter&&(
                      <div style={{background:'rgba(196,89,58,.06)',border:'1px solid rgba(196,89,58,.15)',borderRadius:8,padding:'12px 14px',lineHeight:1.5}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                          <div style={{fontSize:13,color:'rgba(245,240,232,.6)'}}>
                            ⏳ Counter of <strong style={{color:'#F5F0E8'}}>R{b.counterAmount}</strong> sent. Waiting for homeowner...
                          </div>
                          <div style={{display:'flex',gap:3,alignItems:'center'}}>
                            {[1,2,3].map(n=>(
                              <div key={n} style={{width:14,height:4,borderRadius:2,background:n<=b.counterRound?'#C4593A':'rgba(196,89,58,.2)'}}/>
                            ))}
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:700,color:'rgba(196,89,58,.6)',letterSpacing:1,marginLeft:3}}>
                              {b.counterRound}/3
                            </span>
                          </div>
                        </div>
                        {b.counterRound===3&&(
                          <div style={{fontSize:11,color:'rgba(245,240,232,.4)',marginTop:4}}>
                            This is the final round — homeowner must accept or decline.
                          </div>
                        )}
                      </div>
                    )}
                    {/* ACCEPTED — waiting for homeowner to pay */}
                    {isAccepted&&!isInEscrow&&!isCompleted&&(
                      <div style={{background:'rgba(61,170,106,.06)',border:'1px solid rgba(61,170,106,.15)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'rgba(61,170,106,.8)',lineHeight:1.5}}>
                        ✓ Bid accepted — waiting for homeowner to make payment into escrow.
                      </div>
                    )}

                    {/* IN ESCROW — show mark complete button */}
                    {isInEscrow&&!isCompletionSubmitted&&!submittedCompletions.has(b.jobId)&&(
                      <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.25)',borderRadius:8,padding:'14px 16px'}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#3DAA6A',marginBottom:8}}>
                          🔒 R{Math.round(b.price*0.95).toLocaleString()} in escrow — complete the job to get paid
                        </div>
                        <p style={{fontSize:13,color:'rgba(245,240,232,.6)',lineHeight:1.6,marginBottom:12}}>
                          Once done, submit your completion report with photos. The homeowner confirms and your payment is released.
                        </p>
                        <button
                          onClick={()=>{setCompletionJobId(b.jobId);setCompletionBidId(b.id)}}
                          style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#3DAA6A',color:'#fff',border:'none',padding:'11px 20px',borderRadius:6,cursor:'pointer',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                          📋 Mark job as complete
                        </button>
                      </div>
                    )}

                    {/* COMPLETION SUBMITTED — awaiting homeowner */}
                    {(isCompletionSubmitted||submittedCompletions.has(b.jobId))&&!isCompleted&&(
                      <div style={{background:'rgba(232,160,32,.08)',border:'1px solid rgba(232,160,32,.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#E8A020',lineHeight:1.5}}>
                        ⏳ Completion report submitted — waiting for homeowner to confirm and release R{Math.round(b.price*0.95).toLocaleString()} to you.
                      </div>
                    )}

                    {/* DECLINED */}
                    {isDeclined&&(<div style={{background:'rgba(226,75,74,.06)',border:'1px solid rgba(226,75,74,.15)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'rgba(226,75,74,.7)',lineHeight:1.5}}>✗ Not accepted this time. Keep bidding on new jobs.</div>)}

                    {/* PENDING — show withdraw option */}
                    {!homeownerCountered&&!iSentCounter&&!isAccepted&&!isDeclined&&!isCompleted&&!isInEscrow&&(
                      <div style={{display:'flex',justifyContent:'flex-end',marginTop:4,gap:8,alignItems:'center'}}>
                        <span style={{fontSize:11,color:'rgba(245,240,232,.25)',fontFamily:"'Barlow Condensed',sans-serif"}}>
                          Changed your mind?
                        </span>
                        <button
                          onClick={()=>{ if(window.confirm('Withdraw this bid? This cannot be undone.')) withdrawBid(b.id, b.jobId) }}
                          style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:1,textTransform:'uppercase',background:'transparent',border:'1px solid rgba(226,75,74,.2)',color:'rgba(226,75,74,.5)',padding:'5px 12px',borderRadius:4,cursor:'pointer',transition:'all .15s'}}
                          onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(226,75,74,.5)';e.currentTarget.style.color='#E24B4A'}}
                          onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(226,75,74,.2)';e.currentTarget.style.color='rgba(226,75,74,.5)'}}>
                          ✕ Withdraw bid
                        </button>
                      </div>
                    )}

                    {/* COMPLETED — payment released */}
                    {isCompleted&&(
                      <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'rgba(61,170,106,.9)',lineHeight:1.5}}>
                        ✓ Job complete · R{Math.round(b.price*0.95).toLocaleString()} payment released to your account · Check Earnings tab
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* EARNINGS */}
          {view==='earnings'&&(
            <div style={S.content}>
              {earnings.totalJobs===0&&myBids.filter(b=>b.jobStatus==='completed').length===0?(
                <div style={{textAlign:'center',padding:'80px 20px',color:'rgba(245,240,232,.3)'}}>
                  <div style={{fontSize:40,marginBottom:16}}>📈</div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'rgba(245,240,232,.4)',marginBottom:8,letterSpacing:1}}>No earnings yet</div>
                  <p style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,lineHeight:1.6,marginBottom:20}}>Complete your first job to start seeing earnings here.</p>
                  <button style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:'#C4593A',color:'#fff',border:'none',padding:'10px 24px',borderRadius:6,cursor:'pointer'}} onClick={()=>setView('feed')}>Find jobs →</button>
                </div>
              ):(
                <>
                  {/* Summary stats */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:20}}>
                    <div style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:6}}>Total earned</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:'#52C47F',letterSpacing:1,lineHeight:1}}>
                        R{myBids.filter(b=>b.jobStatus==='completed').reduce((s,b)=>s+Math.round(b.price*0.95),0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:6}}>Jobs completed</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:'#E07A5F',letterSpacing:1,lineHeight:1}}>
                        {myBids.filter(b=>b.jobStatus==='completed').length}
                      </div>
                    </div>
                    <div style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:6}}>In escrow</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:'#E8A020',letterSpacing:1,lineHeight:1}}>
                        R{myBids.filter(b=>['in_progress','completion_submitted'].includes(b.jobStatus)).reduce((s,b)=>s+Math.round(b.price*0.95),0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'18px 20px'}}>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:6}}>Rating</div>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:40,color:'#F5F0E8',letterSpacing:1,lineHeight:1}}>
                        {profile?.tradesperson_profiles?.rating_avg>0?`★${profile.tradesperson_profiles.rating_avg}`:'New'}
                      </div>
                    </div>
                  </div>

                  {/* Completed jobs list */}
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.3)',marginBottom:12}}>
                    Completed jobs
                  </div>
                  {myBids.filter(b=>['completed','in_progress','completion_submitted'].includes(b.jobStatus)).length===0?(
                    <div style={{fontSize:13,color:'rgba(245,240,232,.3)',padding:'20px 0'}}>No completed jobs yet.</div>
                  ):myBids.filter(b=>['completed','in_progress','completion_submitted'].includes(b.jobStatus)).map(b=>(
                    <div key={b.id} style={{background:'#222220',borderRadius:10,border:'1px solid rgba(255,255,255,.06)',padding:'16px 18px',marginBottom:10,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:'#F5F0E8',marginBottom:3}}>{b.job}</div>
                        <div style={{fontSize:12,color:'rgba(245,240,232,.4)'}}>📍 {b.loc} · {b.time}</div>
                        <div style={{marginTop:6}}>
                          {b.jobStatus==='completed'&&(
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:'rgba(61,170,106,.12)',border:'1px solid rgba(61,170,106,.2)',color:'#3DAA6A',padding:'2px 8px',borderRadius:3}}>✓ Paid</span>
                          )}
                          {b.jobStatus==='completion_submitted'&&(
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:'rgba(232,160,32,.1)',border:'1px solid rgba(232,160,32,.2)',color:'#E8A020',padding:'2px 8px',borderRadius:3}}>⏳ Awaiting confirmation</span>
                          )}
                          {b.jobStatus==='in_progress'&&(
                            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:'rgba(46,127,212,.1)',border:'1px solid rgba(46,127,212,.2)',color:'#5B9BD5',padding:'2px 8px',borderRadius:3}}>🔒 In escrow</span>
                          )}
                        </div>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:b.jobStatus==='completed'?'#52C47F':'#E8A020',letterSpacing:1}}>
                          R{Math.round(b.price*0.95).toLocaleString()}
                        </div>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:'rgba(245,240,232,.3)',letterSpacing:.5}}>
                          after 5% commission
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* MESSAGES */}
          {view==='messages'&&(
            <div style={{padding:'24px 28px',height:'calc(100vh - 58px)',boxSizing:'border-box'}}>
              <Messaging theme="dark" />
            </div>
          )}

          {/* PROFILE */}
          {view==='profile'&&(
            <div style={S.content}>
              <VerificationBadge variant="full" />

              {/* Profile card */}
              <div style={{background:'#222220',borderRadius:12,border:'1px solid rgba(255,255,255,.06)',padding:28,marginBottom:16}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:24,paddingBottom:20,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
                  <div style={{position:'relative',flexShrink:0}}>
                    <div style={{width:64,height:64,borderRadius:'50%',background:'#9E3E24',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:'#fff',border:'3px solid rgba(196,89,58,.3)'}}>{displayInitials}</div>
                    {isVerified&&(<div style={{position:'absolute',bottom:0,right:0,width:20,height:20,borderRadius:'50%',background:'#3DAA6A',border:'3px solid #222220',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:'#F5F0E8',lineHeight:1}}>{displayName.toUpperCase()}</div>
                      {isVerified&&(<span style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(61,170,106,.12)',border:'1px solid rgba(61,170,106,.25)',borderRadius:4,padding:'3px 8px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#3DAA6A'}}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Verified</span>)}
                      {profile?.tradesperson_profiles?.is_founding_member&&(
                        <span style={{display:'inline-flex',alignItems:'center',gap:4,background:'rgba(196,89,58,.12)',border:'1px solid rgba(196,89,58,.3)',borderRadius:4,padding:'3px 8px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#E07A5F'}}>
                          🔨 Founding Member
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:13,color:'rgba(245,240,232,.5)'}}>{displayTrade} · {profile?.tradesperson_profiles?.years_experience||0} yrs experience</div>
                    <div style={{fontSize:13,color:'#E8A020',marginTop:3}}>{displayRating} · {displayJobs} completed jobs</div>
                  </div>
                  <button onClick={()=>setEditingProfile((e:boolean)=>!e)}
                    style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:editingProfile?'rgba(226,75,74,.08)':'rgba(196,89,58,.08)',color:editingProfile?'#E24B4A':'#E07A5F',border:`1px solid ${editingProfile?'rgba(226,75,74,.2)':'rgba(196,89,58,.2)'}`,padding:'7px 14px',borderRadius:6,cursor:'pointer',flexShrink:0}}>
                    {editingProfile?'✕ Cancel':'✎ Edit'}
                  </button>
                </div>

                {editingProfile?(
                  <div>
                    {[
                      {label:'Full name *',key:'full_name',type:'text',placeholder:'Your full name'},
                      {label:'Phone number',key:'phone',type:'tel',placeholder:'e.g. 0821234567'},
                    ].map((f:any)=>(
                      <div key={f.key} style={{marginBottom:14}}>
                        <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>{f.label}</label>
                        <input type={f.type} value={(profileForm as any)[f.key]}
                          onChange={e=>setProfileForm((p:any)=>({...p,[f.key]:e.target.value}))}
                          placeholder={f.placeholder}
                          style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'#F5F0E8',outline:'none'}}/>
                      </div>
                    ))}

                    {/* Trade category */}
                    <div style={{marginBottom:14}}>
                      <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                        Trade / Skill *
                      </label>
                      <select
                        value={profileForm.trade_category}
                        onChange={e=>setProfileForm((p:any)=>({...p,trade_category:e.target.value}))}
                        style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'#F5F0E8',outline:'none'}}>
                        <option value="">Select your trade</option>
                        {['Plumbing','Electrical','Painting','Carpentry','Roofing','Tiling',
                          'Solar','Landscaping','Waterproofing','Welding','Cleaning','General',
                          'Moving','Pest Control','Appliance Repair','Air Conditioning',
                          'Security','Paving','Plastering'].map(t=>(
                          <option key={t} value={t.toLowerCase()}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {/* Service areas multi-select */}
                    <div style={{marginBottom:20}}>
                      <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                        Service areas ({profileForm.service_areas.length} selected)
                      </label>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,maxHeight:200,overflowY:'auto',background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.1)',borderRadius:8,padding:10}}>
                        {['Sandton','Fourways','Bryanston','Randburg','Roodepoort','Midrand','Soweto',
                          'Johannesburg CBD','Rosebank','Melrose','Kempton Park','Edenvale','Germiston',
                          'Boksburg','Benoni','Pretoria Central','Centurion','Pretoria East','Pretoria North',
                          'Menlyn','Lynnwood','Vereeniging','Vanderbijlpark','Alberton'].map((area:string)=>{
                          const sel = profileForm.service_areas.includes(area)
                          return (
                            <div key={area} onClick={()=>setProfileForm((p:any)=>({
                              ...p,
                              service_areas: sel
                                ? p.service_areas.filter((a:string)=>a!==area)
                                : [...p.service_areas, area]
                            }))}
                              style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:.5,padding:'5px 10px',borderRadius:4,cursor:'pointer',
                                background:sel?'rgba(196,89,58,.2)':'rgba(255,255,255,.05)',
                                border:`1px solid ${sel?'rgba(196,89,58,.4)':'rgba(255,255,255,.1)'}`,
                                color:sel?'#E07A5F':'rgba(245,240,232,.5)',transition:'all .15s'}}>
                              {area}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {profileMsg&&(
                      <div style={{padding:'10px 14px',borderRadius:6,fontSize:13,marginBottom:14,
                        background:profileMsg.startsWith('✓')?'rgba(61,170,106,.1)':'rgba(226,75,74,.08)',
                        color:profileMsg.startsWith('✓')?'#3DAA6A':'#f08080',
                        border:`1px solid ${profileMsg.startsWith('✓')?'rgba(61,170,106,.2)':'rgba(226,75,74,.2)'}`}}>
                        {profileMsg}
                      </div>
                    )}
                    <button onClick={saveProfile} disabled={savingProfile}
                      style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:savingProfile?'rgba(196,89,58,.4)':'#C4593A',color:'#fff',border:'none',padding:'13px',borderRadius:8,cursor:savingProfile?'not-allowed':'pointer',width:'100%',marginTop:4}}>
                      {savingProfile?'Saving...':'Save changes'}
                    </button>
                  </div>
                ):(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                    {[
                      {label:'Email',val:profile?.email||'—'},
                      {label:'Phone',val:profile?.phone||'—'},
                      {label:'Service areas',val:profile?.tradesperson_profiles?.service_areas?.join(' · ')||profile?.area||'—'},
                      {label:'Member since',val:profile?.created_at?new Date(profile.created_at).toLocaleDateString('en-ZA',{month:'long',year:'numeric'}):'—'},
                    ].map(r=>(
                      <div key={r.label}>
                        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.35)',marginBottom:5}}>{r.label}</div>
                        <div style={{fontSize:13,color:'rgba(245,240,232,.75)'}}>{r.val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Banking details card */}
              <div style={{background:'#222220',borderRadius:12,border:`1px solid ${banking?'rgba(61,170,106,.25)':'rgba(255,255,255,.06)'}`,padding:28}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingBottom:16,borderBottom:'1px solid rgba(255,255,255,.06)'}}>
                  <div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:1,color:'#F5F0E8',marginBottom:4}}>
                      Banking Details
                    </div>
                    <div style={{fontSize:12,color:'rgba(245,240,232,.4)',lineHeight:1.5}}>
                      Required for payment release. Your details are encrypted and only used to process your earnings.
                    </div>
                  </div>
                  {banking&&(
                    <span style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(61,170,106,.12)',border:'1px solid rgba(61,170,106,.25)',borderRadius:6,padding:'5px 10px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#3DAA6A',flexShrink:0}}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Saved
                    </span>
                  )}
                </div>

                {/* Warning if not saved */}
                {!banking&&(
                  <div style={{background:'rgba(232,160,32,.08)',border:'1px solid rgba(232,160,32,.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#E8A020',lineHeight:1.6,marginBottom:20,display:'flex',gap:10}}>
                    <span style={{flexShrink:0}}>⚠</span>
                    <span>You haven&apos;t added banking details yet. You must add them before you can receive payment for completed jobs.</span>
                  </div>
                )}

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  {/* Bank name */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                      Bank name *
                    </label>
                    <select
                      value={bankingForm.bank_name}
                      onChange={e=>setBankingForm(f=>({...f,bank_name:e.target.value}))}
                      style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'#F5F0E8',outline:'none'}}>
                      <option value="">Select your bank</option>
                      {['Absa','African Bank','Capitec Bank','Discovery Bank','FNB','Investec','Nedbank','Old Mutual','Sasfin','Standard Bank','TymeBank','Ubank'].map(b=>(
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Account holder */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                      Account holder name *
                    </label>
                    <input
                      type="text"
                      value={bankingForm.account_holder}
                      onChange={e=>setBankingForm(f=>({...f,account_holder:e.target.value}))}
                      placeholder="Full name as it appears on your bank account"
                      style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'#F5F0E8',outline:'none'}}
                    />
                  </div>

                  {/* Account number */}
                  <div>
                    <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                      Account number *
                    </label>
                    <input
                      type="text"
                      value={bankingForm.account_number}
                      onChange={e=>setBankingForm(f=>({...f,account_number:e.target.value.replace(/\D/g,'')}))}
                      placeholder="e.g. 1234567890"
                      maxLength={16}
                      style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,color:'#F5F0E8',outline:'none',letterSpacing:2}}
                    />
                  </div>

                  {/* Account type */}
                  <div>
                    <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                      Account type *
                    </label>
                    <select
                      value={bankingForm.account_type}
                      onChange={e=>setBankingForm(f=>({...f,account_type:e.target.value}))}
                      style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'#F5F0E8',outline:'none'}}>
                      <option value="current">Current account</option>
                      <option value="savings">Savings account</option>
                      <option value="transmission">Transmission account</option>
                    </select>
                  </div>

                  {/* Branch code */}
                  <div>
                    <label style={{display:'block',fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                      Branch code *
                    </label>
                    <input
                      type="text"
                      value={bankingForm.branch_code}
                      onChange={e=>setBankingForm(f=>({...f,branch_code:e.target.value.replace(/\D/g,'')}))}
                      placeholder="e.g. 632005"
                      maxLength={9}
                      style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow Condensed',sans-serif",fontSize:16,color:'#F5F0E8',outline:'none',letterSpacing:2}}
                    />
                  </div>

                  {/* Universal branch code helper */}
                  <div style={{gridColumn:'1/-1',fontSize:11,color:'rgba(245,240,232,.25)',lineHeight:1.6}}>
                    💡 Universal branch codes: Absa 632005 · Capitec 470010 · FNB 250655 · Nedbank 198765 · Standard Bank 051001 · TymeBank 678910
                  </div>
                </div>

                {/* Message */}
                {bankingMsg&&(
                  <div style={{marginTop:14,padding:'10px 14px',borderRadius:6,fontSize:13,fontFamily:"'Barlow Condensed',sans-serif",fontWeight:600,
                    background:bankingMsg.startsWith('✓')?'rgba(61,170,106,.1)':'rgba(226,75,74,.08)',
                    border:bankingMsg.startsWith('✓')?'1px solid rgba(61,170,106,.2)':'1px solid rgba(226,75,74,.2)',
                    color:bankingMsg.startsWith('✓')?'#3DAA6A':'#f08080',
                  }}>
                    {bankingMsg}
                  </div>
                )}

                <button
                  onClick={saveBanking}
                  disabled={savingBanking}
                  style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:savingBanking?'rgba(196,89,58,.4)':'#C4593A',color:'#fff',border:'none',padding:'13px',borderRadius:8,cursor:savingBanking?'not-allowed':'pointer',width:'100%',marginTop:16,display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'background .15s'}}>
                  {savingBanking?'Saving...':'Save banking details'}
                </button>

                <div style={{marginTop:12,fontSize:11,color:'rgba(245,240,232,.2)',textAlign:'center',lineHeight:1.6}}>
                  🔒 Your banking details are encrypted and stored securely. They are only used to process your Lungisa earnings.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BID MODAL ─────────────────────────────────────────────── */}
      {modalJob&&(
        <div style={S.overlay} onClick={e=>{if(e.target===e.currentTarget){setModalJob(null);setModalMedia([])}}}>
          <div style={S.modal}>
            {/* Header */}
            <div style={S.mHeader}>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2.5,textTransform:'uppercase',color:'#E07A5F',marginBottom:6}}>{modalJob.emoji} {modalJob.cat} · {modalJob.loc}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:1,color:'#F5F0E8',lineHeight:1}}>{modalJob.title}</div>
                <div style={{fontSize:13,color:'rgba(245,240,232,.5)',marginTop:4}}>{modalJob.time} · {modalJob.bids} bid{modalJob.bids!==1?'s':''}</div>
              </div>
              <div onClick={()=>{setModalJob(null);setModalMedia([])}} style={{width:32,height:32,borderRadius:6,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,color:'rgba(245,240,232,.5)',flexShrink:0}}>✕</div>
            </div>

            <div style={S.mBody}>
              {/* Job details */}
              {[['Budget',modalJob.budget],['Urgency',modalJob.urgencyLabel],['Location',modalJob.loc],['Timing',modalJob.timing]].map(([l,v])=>(
                <div key={l} style={S.detailRow}><span style={S.drLabel}>{l}</span><span style={{color:'rgba(245,240,232,.8)',fontSize:13}}>{v}</span></div>
              ))}
              <div style={S.descBox}>{modalJob.desc}</div>

              {/* ── MEDIA SECTION ─────────────────────────────────── */}
              {modalJob.photos > 0 && (
                <div style={{marginBottom:18}}>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:14,height:2,background:'#C4593A',display:'inline-block'}}/>
                    Job Photos &amp; Video
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:'rgba(245,240,232,.3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>— review before bidding</span>
                  </div>

                  {mediaLoading ? (
                    <div style={{display:'flex',alignItems:'center',gap:8,padding:'16px 0',color:'rgba(245,240,232,.4)',fontFamily:"'Barlow Condensed',sans-serif",fontSize:12}}>
                      <div className="spin" style={{width:14,height:14}}/>Loading media...
                    </div>
                  ) : modalMedia.length === 0 ? (
                    <div style={{fontSize:12,color:'rgba(245,240,232,.25)',padding:'8px 0',fontStyle:'italic'}}>
                      Media unavailable
                    </div>
                  ) : (
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      {modalMedia.map((m,i)=>(
                        <div key={i} className="media-thumb"
                          onClick={()=>{setLightboxUrl(m.url);setLightboxType(m.type)}}
                          style={{width:86,height:86,borderRadius:8,overflow:'hidden',position:'relative',border:'2px solid rgba(255,255,255,.1)',background:'#111',flexShrink:0}}>
                          {m.type==='video' ? (
                            <>
                              <video src={m.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>
                              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.4)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <div style={{width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,.9)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                  <span style={{fontSize:10,marginLeft:2}}>▶</span>
                                </div>
                              </div>
                              <div style={{position:'absolute',bottom:3,left:3,background:'rgba(0,0,0,.7)',borderRadius:3,padding:'1px 5px',fontSize:8,color:'rgba(255,255,255,.8)',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>VIDEO</div>
                            </>
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={m.url} alt={`Job photo ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          )}
                          {/* Expand icon */}
                          <div style={{position:'absolute',top:3,right:3,background:'rgba(0,0,0,.6)',borderRadius:3,padding:2,opacity:0.7}}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{fontSize:11,color:'rgba(245,240,232,.25)',marginTop:8,fontStyle:'italic'}}>
                    Tap any photo to view full size
                  </div>
                </div>
              )}

              {/* Bid form */}
              {!modalJob.submitted?(
                <>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',margin:'18px 0 10px',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{width:14,height:2,background:'#C4593A',display:'inline-block'}}/>Your bid
                  </div>
                  <div style={S.priceWrap}>
                    <div style={S.priceR}>R</div>
                    <input style={S.priceInput} type="number" placeholder="750" value={bidPrice} onChange={e=>setBidPrice(e.target.value)}/>
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:10}}>Estimated arrival</div>
                  <div style={S.etaChips}>
                    {ETAS.map(e=><div key={e} style={S.etaChip(bidEta===e)} onClick={()=>setBidEta(e)}>{e}</div>)}
                  </div>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:8}}>Message (optional)</div>
                  <textarea style={S.bidNoteInput} placeholder="E.g. I carry all replacement parts and can be there in 30 mins..." value={bidNote} onChange={e=>setBidNote(e.target.value)}/>
                  <div style={S.earningsPreview}>
                    <div>
                      <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:600,color:'rgba(61,170,106,.7)'}}>You&apos;ll earn</div>
                      <div style={{fontSize:10,color:'rgba(61,170,106,.5)',marginTop:1}}>after 5% Lungisa commission</div>
                    </div>
                    <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,color:'#52C47F',letterSpacing:.5}}>
                      {bidPrice?`R ${Math.round(parseInt(bidPrice)*0.95).toLocaleString()}`:'—'}
                    </div>
                  </div>
                </>
              ):(
                <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,marginTop:12}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(61,170,106,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✓</div>
                  <div style={{fontSize:13,color:'rgba(245,240,232,.75)',lineHeight:1.4}}>
                    Bid submitted — <strong style={{color:'#52C47F'}}>R{modalJob.submitPrice}</strong>. Homeowner notified.
                  </div>
                </div>
              )}
            </div>

            {!modalJob.submitted&&(
              <div style={S.mFooter}>
                <button style={S.btn('ghost')} onClick={()=>{setModalJob(null);setModalMedia([])}}>Cancel</button>
                <button style={S.btn('terra')} onClick={submitBid}>Submit Bid →</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIGHTBOX — full size photo/video viewer ──────────────── */}
      {lightboxUrl&&(
        <div
          onClick={()=>setLightboxUrl(null)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,animation:'fadeIn .2s ease'}}>
          <div onClick={e=>e.stopPropagation()} style={{position:'relative',maxWidth:'90vw',maxHeight:'85vh'}}>
            {lightboxType==='video' ? (
              <video src={lightboxUrl} controls autoPlay
                style={{maxWidth:'90vw',maxHeight:'85vh',borderRadius:10,boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}/>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={lightboxUrl} alt="Job photo" style={{maxWidth:'90vw',maxHeight:'85vh',borderRadius:10,objectFit:'contain',boxShadow:'0 20px 60px rgba(0,0,0,.5)'}}/>
            )}
            <button onClick={()=>setLightboxUrl(null)}
              style={{position:'absolute',top:-14,right:-14,width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.12)',border:'1px solid rgba(255,255,255,.2)',color:'#fff',fontSize:16,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>
              ✕
            </button>
          </div>
          <div style={{position:'absolute',bottom:20,left:0,right:0,textAlign:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:'rgba(255,255,255,.3)',letterSpacing:1}}>
            Click anywhere to close
          </div>
        </div>
      )}

      {/* ── JOB COMPLETION MODAL ──────────────────────────────────── */}
      {completionJobId&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e=>{if(e.target===e.currentTarget){setCompletionJobId(null);setCompletionPhotos([])}}}>
          <div style={{background:'#222220',borderRadius:16,border:'1px solid rgba(255,255,255,.1)',width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto'}}>
            {/* Header */}
            <div style={{padding:'22px 26px 18px',borderBottom:'1px solid rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#3DAA6A',marginBottom:4}}>
                  ✓ Mark job complete
                </div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,color:'#F5F0E8',lineHeight:1}}>
                  Submit completion report
                </div>
              </div>
              <div onClick={()=>{setCompletionJobId(null);setCompletionPhotos([])}}
                style={{width:32,height:32,borderRadius:6,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:16,color:'rgba(245,240,232,.5)'}}>✕</div>
            </div>

            <div style={{padding:'22px 26px'}}>
              {/* Info note */}
              <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'rgba(61,170,106,.85)',lineHeight:1.6,marginBottom:20}}>
                🔒 Once the homeowner confirms your report, payment will be released from escrow to you.
              </div>

              {/* Date completed */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:8}}>
                Date completed *
              </div>
              <input
                type="date"
                value={completionDate}
                onChange={e=>setCompletionDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'11px 14px',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'#F5F0E8',outline:'none',marginBottom:16,colorScheme:'dark'}}
              />

              {/* Report */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:8}}>
                What was repaired / done * <span style={{fontWeight:400,fontSize:9,textTransform:'none',letterSpacing:0,color:'rgba(245,240,232,.25)'}}>be specific</span>
              </div>
              <textarea
                value={completionReport}
                onChange={e=>setCompletionReport(e.target.value)}
                placeholder="E.g. Replaced the burst 22mm copper pipe under the kitchen sink. Fitted new isolation valve. Tested for leaks — all clear. Cleared work area."
                maxLength={500}
                style={{width:'100%',background:'rgba(255,255,255,.05)',border:'1.5px solid rgba(255,255,255,.1)',borderRadius:8,padding:'12px 14px',fontFamily:"'Barlow',sans-serif",fontSize:14,color:'#F5F0E8',outline:'none',resize:'none',height:110,lineHeight:1.6,marginBottom:4}}
              />
              <div style={{fontSize:10,color:'rgba(245,240,232,.25)',textAlign:'right',marginBottom:16}}>{500-completionReport.length} chars left</div>

              {/* Photo/Video upload */}
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:8}}>
                Photos & video <span style={{fontWeight:400,fontSize:9,textTransform:'none',letterSpacing:0,color:'rgba(245,240,232,.25)'}}>up to 4 photos + 1 video · strongly recommended</span>
              </div>

              {/* Media grid */}
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                {completionPhotos.map((p,i)=>(
                  <div key={i} style={{width:80,height:80,borderRadius:8,overflow:'hidden',position:'relative',border:`2px solid ${p.type==='video'?'rgba(46,127,212,.4)':'rgba(61,170,106,.3)'}`,flexShrink:0,background:'#111'}}>
                    {p.type==='video'?(
                      <>
                        <video src={p.url} style={{width:'100%',height:'100%',objectFit:'cover'}} muted playsInline/>
                        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.35)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(255,255,255,.9)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <span style={{fontSize:9,marginLeft:2}}>▶</span>
                          </div>
                        </div>
                        <div style={{position:'absolute',bottom:2,left:2,background:'rgba(46,127,212,.85)',borderRadius:3,padding:'1px 5px',fontSize:8,color:'#fff',fontFamily:"'Barlow Condensed',sans-serif",fontWeight:700}}>
                          VIDEO
                        </div>
                      </>
                    ):(
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt={`Completion ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    )}
                    <button
                      onClick={()=>setCompletionPhotos(prev=>prev.filter((_,j)=>j!==i))}
                      style={{position:'absolute',top:3,right:3,background:'rgba(0,0,0,.8)',border:'none',borderRadius:'50%',width:20,height:20,cursor:'pointer',color:'#fff',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload buttons */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                {/* Photo upload */}
                {completionPhotos.filter(p=>p.type==='image').length < 4 && (
                  <label style={{borderRadius:8,border:'2px dashed rgba(61,170,106,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',position:'relative',padding:'10px',transition:'border-color .2s',background:'rgba(61,170,106,.04)'}}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(61,170,106,.5)')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(61,170,106,.3)')}>
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      onChange={uploadCompletionPhoto}
                      style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
                    <span style={{fontSize:16}}>📷</span>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,color:'rgba(61,170,106,.7)',letterSpacing:.5}}>
                      Add photo ({completionPhotos.filter(p=>p.type==='image').length}/4)
                    </span>
                  </label>
                )}
                {/* Video upload */}
                {completionPhotos.filter(p=>p.type==='video').length < 1 && (
                  <label style={{borderRadius:8,border:'2px dashed rgba(46,127,212,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:8,cursor:'pointer',position:'relative',padding:'10px',transition:'border-color .2s',background:'rgba(46,127,212,.04)'}}
                    onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(46,127,212,.5)')}
                    onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(46,127,212,.3)')}>
                    <input type="file" accept="video/mp4,video/mov,video/quicktime,video/*"
                      onChange={uploadCompletionPhoto}
                      style={{position:'absolute',inset:0,opacity:0,cursor:'pointer',width:'100%',height:'100%'}}/>
                    {uploadingCompletion?(
                      <div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.2)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite'}}/>
                    ):(
                      <>
                        <span style={{fontSize:16}}>🎥</span>
                        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:600,color:'rgba(46,127,212,.7)',letterSpacing:.5}}>
                          Add video (1 max)
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {completionPhotos.length === 0 && (
                <div style={{fontSize:11,color:'rgba(245,240,232,.25)',fontStyle:'italic',marginBottom:12}}>
                  Photos and video help the homeowner verify the work was done. Jobs with media are confirmed faster.
                </div>
              )}

              {/* Submit */}
              <button
                onClick={submitCompletion}
                disabled={submittingCompletion||!completionReport.trim()}
                style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,letterSpacing:2,textTransform:'uppercase',background:submittingCompletion||!completionReport.trim()?'rgba(61,170,106,.3)':'#3DAA6A',color:'#fff',border:'none',padding:'14px',borderRadius:8,cursor:submittingCompletion||!completionReport.trim()?'not-allowed':'pointer',width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'background .15s'}}>
                {submittingCompletion?(
                  <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin .6s linear infinite'}}/>Submitting...</>
                ):(
                  '✓ Submit completion report →'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-dash-nav">
        {navItems.map(item=>(
          <div key={item.view} onClick={()=>setView(item.view)}
            style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,cursor:'pointer',position:'relative',
              color:view===item.view?'#E07A5F':'rgba(245,240,232,.4)',transition:'color .15s'}}>
            {item.badge!==undefined&&item.badge>0&&(
              <div style={{position:'absolute',top:6,right:'22%',width:16,height:16,borderRadius:'50%',background:countersPending.length>0&&item.view==='bids'?'#E8A020':'#C4593A',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:700,color:'#fff'}}>
                {item.badge > 9 ? '9+' : item.badge}
              </div>
            )}
            <span style={{fontSize:20}}>{item.icon}</span>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{item.label}</span>
            {view===item.view&&<div style={{position:'absolute',top:0,left:'20%',right:'20%',height:2,background:'#C4593A',borderRadius:1}}/>}
          </div>
        ))}
      </nav>

      {/* TOASTS */}
      <div style={{position:'fixed',top:70,right:20,zIndex:200,pointerEvents:'none'}}>
        {toasts.map(t=>(
          <div key={t.id} className="toast-in" style={{background:'#2C2C28',borderRadius:10,border:'1px solid rgba(255,255,255,.1)',padding:'12px 16px',marginBottom:8,display:'flex',alignItems:'flex-start',gap:10,maxWidth:280}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:t.alert?'#E8A020':'#C4593A',marginTop:4,flexShrink:0}}/>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,fontWeight:700,color:'#F5F0E8',marginBottom:1}}>{t.title}</div>
              <div style={{fontSize:11,color:'rgba(245,240,232,.45)',lineHeight:1.4}}>{t.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#1A1A16'}}><div style={{width:20,height:20,border:'2px solid rgba(255,255,255,.1)',borderTopColor:'#C4593A',borderRadius:'50%'}}/></div>}>
      <DashboardInner />
    </Suspense>
  )
}