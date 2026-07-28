'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

const AREAS = [
  'Sandton','Fourways','Bryanston','Morningside','Rivonia','Sunninghill',
  'Paulshof','Kyalami','Halfway House','Woodmead','Kramerville',
  'Johannesburg CBD','Parktown','Rosebank','Melrose','Illovo','Hyde Park',
  'Northcliff','Auckland Park','Greenside','Linden','Victory Park',
  'Mayfair','Fordsburg','Newtown','Maboneng',
  'Randburg','Ferndale','Honeydew','Ruimsig','Florida','Krugersdorp',
  'Roodepoort','Northgate','Weltevredenpark','Constantia Kloof',
  'Strubensvalley','Radiokop','Wilgeheuwel',
  'Soweto','Lenasia','Ennerdale','Orange Farm','Alberton','Germiston',
  'Meyersdal','Glenvista','Bassonia','Kibler Park','Mulbarton',
  'Winchester Hills','Turffontein','Booysens','Ophirton',
  'Boksburg','Benoni','Brakpan','Springs','Edenvale','Bedfordview',
  'Kempton Park','Tembisa','Ekurhuleni','Vosloorus','Daveyton',
  'Katlehong','Thokoza','Nigel','Heidelberg','Duduza',
  'Midrand','Vorna Valley','Waterfall','Jukskei Park','Grand Central','Carlswald',
  'Pretoria Central','Centurion','Pretoria East','Pretoria North',
  'Pretoria West','Soshanguve','Mamelodi','Atteridgeville','Hatfield',
  'Menlyn','Lynnwood','Faerie Glen','Moreleta Park','Garsfontein',
  'Queenswood','Arcadia','Muckleneuk','Brooklyn','Groenkloof',
  'Montana','Gezina','Silverton','Eersterust','Watloo',
  'Irene','Rooihuiskraal','Olievenhoutbosch',
  'Randfontein','Westonaria','Carletonville','Fochville','Magaliesburg','Chamdor',
  'Vereeniging','Vanderbijlpark','Meyerton','Evaton','Sebokeng',
  'Sharpeville','Bophelong','Three Rivers',
]
import NotificationBell from '../components/NotificationBell'
import Messaging from '../components/Messaging'

type Tab = 'active' | 'history' | 'messages' | 'profile'

type BidData = {
  id: string
  tradespersonId: string
  name: string
  init: string
  bg: string
  trade: string
  rating: string
  ratingNum: string
  jobs: number
  price: number
  eta: string
  status: string
  counterAmount: number|null
  counterBy: string|null
  counterRound: number
  finalAmount: number|null
  counterUpdatedAt: string|null
  quoteRequested: boolean
}

type JobData = {
  id: string
  title: string
  category: string
  emoji: string
  area: string
  urgency: string
  urgColor: string
  budget: number
  status: string
  posted: string
  expiresAt: string|null
  bids: BidData[]
}

type HistoryJob = {
  id: string
  title: string
  category: string
  emoji: string
  area: string
  tradesperson: string
  tradespersonId: string
  price: number
  rating: number
  date: string
  status: string
}

type QuoteData = {
  labourAmount: number
  materialsEstimate: number
  notes: string | null
  status: string
  tradespersonId: string
  tradespersonName: string
  materialsCoveredBy: 'homeowner' | 'tradesperson'
}

const AVATAR_COLORS = ['#8B3A2A','#5A3A2A','#2A4A3A','#3A4A6A','#6A3A5A','#4A5A2A']

function getCatEmoji(cat:string){const m:Record<string,string>={plumbing:'🔧',electrical:'⚡',painting:'🎨',carpentry:'🪚',roofing:'🏠',tiling:'🚿',solar:'☀️',garden:'🌿',waterproofing:'💧',welding:'🔥',cleaning:'🧹',general:'🔩'};return m[cat]||'🔧'}
function getUrgencyLabel(u:string){const m:Record<string,string>={emergency:'Today — emergency',within_3_days:'Within 3 days',this_week:'This week',flexible:'Flexible'};return m[u]||'Flexible'}
function getUrgencyColor(u:string){const m:Record<string,string>={emergency:'#E24B4A',within_3_days:'#E8A020',this_week:'#3DAA6A',flexible:'#D4C9B4'};return m[u]||'#D4C9B4'}
function getTimeAgo(d:string){const diff=Date.now()-new Date(d).getTime();const mins=Math.floor(diff/60000);if(mins<60)return`${mins} min ago`;const hrs=Math.floor(mins/60);if(hrs<24)return`${hrs} hr${hrs>1?'s':''} ago`;return`${Math.floor(hrs/24)} day${Math.floor(hrs/24)>1?'s':''} ago`}

export default function HomeDashboard() {
  const router = useRouter()
  const [tab, setTab]               = useState<Tab>('active')
  const [jobs, setJobs]             = useState<JobData[]>([])
  const [historyJobs, setHistoryJobs] = useState<HistoryJob[]>([])
  const [selectedJob, setSelectedJob] = useState<JobData|null>(null)
  const [counterAmts, setCounterAmts] = useState<Record<string,string>>({})
  const [counterResp, setCounterResp] = useState<Record<string,string>>({})
  const [paidJobs, setPaidJobs]     = useState<Record<string,boolean>>({})
  const [reviewJob, setReviewJob]   = useState<string|null>(null)
  const [reviewTradespersonId, setReviewTradespersonId] = useState<string>('')
  const [rating, setRating]         = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [completions, setCompletions] = useState<Record<string,{id:string,report:string,completedAt:string,photos:string[]}>>({})
  // ── Quote state ──────────────────────────────────────────────────
  const [quotes, setQuotes]         = useState<Record<string, QuoteData>>({})
  const [requestingQuote, setRequestingQuote] = useState<Record<string,boolean>>({})
  // Quote request modal
  const [quoteModal, setQuoteModal]       = useState<{jobId:string,bidId:string,tradespersonId:string,tradespersonName:string}|null>(null)
  const [quoteMaterialsBy, setQuoteMaterialsBy] = useState<'homeowner'|'tradesperson'>('homeowner')
  const [quoteNotes, setQuoteNotes]       = useState('')
  // ── End quote state ──────────────────────────────────────────────
  const [disputeJob, setDisputeJob]   = useState<string|null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [submittingDispute, setSubmittingDispute] = useState(false)
  const [toasts, setToasts]         = useState<{id:number,msg:string,color:string}[]>([])
  const [profile, setProfile]       = useState<any>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({full_name:'', phone:'', area:''})
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [expiredJobs, setExpiredJobs] = useState<JobData[]>([])
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [loading, setLoading]       = useState(true)

  async function refreshAll() {
    setRefreshing(true)
    supabase.removeAllChannels()
    await Promise.all([loadRealJobs(true), loadHistoryJobs(), loadProfile()])
    setLastRefreshed(new Date())
    setRefreshing(false)
  }

  useEffect(()=>{
    const interval = setInterval(()=>{ loadRealJobs(true); loadHistoryJobs() }, 60000)
    return ()=>clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  useEffect(()=>{
    loadProfile()
    loadRealJobs()
    loadHistoryJobs()
    loadCompletions()

    const params = new URLSearchParams(window.location.search)
    if(params.get('payment') === 'success') {
      const jobId = params.get('jobId')
      toast('Payment confirmed! 🎉','Funds held in escrow · Tradesperson notified','#3DAA6A')
      if(jobId) setPaidJobs(p=>({...p,[jobId]:true}))
      window.history.replaceState({}, '', '/home')
      loadRealJobs(true)
    } else if(params.get('payment') === 'cancelled') {
      toast('Payment cancelled','No charge was made','#E8A020')
      window.history.replaceState({}, '', '/home')
    }

    const channel = supabase
      .channel('home-bids')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bids'},()=>{
        loadRealJobs(true)
        toast('New bid received!','A tradesperson just bid on your job 🎉','#E8A020')
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bids'},()=>{ loadRealJobs(true) })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'job_completions'},()=>{
        loadCompletions(); loadRealJobs(true)
        toast('Job marked complete!','Review the work and confirm or raise a dispute','#3DAA6A')
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'quotes'},()=>{
        loadQuotes()
        toast('Formal quote received!','A tradesperson submitted their labour + materials breakdown','#C4593A')
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'quotes'},()=>{ loadQuotes() })
      .subscribe()

    return ()=>{ supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])

  async function loadProfile() {
    try {
      const {data:{session}} = await supabase.auth.getSession()
      if(session?.user) {
        const {data} = await supabase.from('profiles').select('*').eq('id',session.user.id).single()
        if(data) { setProfile(data); setProfileForm({full_name:data.full_name||'',phone:data.phone||'',area:data.area||''}) }
      }
    } catch(e){ console.log('Profile error:',e) }
  }

  async function saveProfile() {
    if(!profileForm.full_name.trim()){ setProfileMsg('Name is required'); return }
    setSavingProfile(true); setProfileMsg('')
    try {
      const {data:{session}} = await supabase.auth.getSession()
      if(!session?.user) return
      const {error} = await supabase.from('profiles').update({full_name:profileForm.full_name.trim(),phone:profileForm.phone.trim(),area:profileForm.area.trim()}).eq('id',session.user.id)
      if(error){ setProfileMsg('Failed to save: '+error.message) }
      else { setProfile((p:any)=>({...p,...profileForm})); setEditingProfile(false); setProfileMsg('✓ Profile updated'); setTimeout(()=>setProfileMsg(''),3000) }
    } catch(e){ setProfileMsg('Something went wrong') }
    setSavingProfile(false)
  }

  async function loadRealJobs(silent = false) {
    if(!silent) setLoading(true)
    try {
      const {data:{session}} = await supabase.auth.getSession()
      if(!session?.user) { setLoading(false); return }

      const {data:jobsData, error:jobsErr} = await supabase
        .from('jobs').select('*').eq('homeowner_id',session.user.id)
        .not('status','in','("completed","expired","cancelled")').order('created_at',{ascending:false})

      if(jobsErr) { console.error('[home] Jobs fetch error:',jobsErr.message); setLoading(false); return }
      if(!jobsData) { setLoading(false); return }

      if(jobsData.length === 0) {
        if(!silent) { setJobs([]); setSelectedJob(null) }
        setLoading(false); return
      }

      const jobIds = jobsData.map((j:any) => j.id)

      const {data:bidsData} = await supabase
        .from('bids')
        .select('id,job_id,amount,counter_amount,counter_by,counter_round,final_amount,eta_label,note,status,created_at,updated_at,tradesperson_id,quote_requested')
        .in('job_id',jobIds).order('created_at',{ascending:true})

      const tpIds = Array.from(new Set((bidsData||[]).map((b:any)=>b.tradesperson_id)))
      let profileMap: Record<string,any> = {}
      if(tpIds.length > 0) {
        const {data:profiles} = await supabase
          .from('profiles').select('id,full_name,tradesperson_profiles(trade_category,years_experience,rating_avg,jobs_completed)').in('id',tpIds)
        if(profiles) { for(const p of profiles) profileMap[p.id] = p }
      }

      const mapped: JobData[] = jobsData.map((j:any, ji:number) => {
        const jobBids = (bidsData||[]).filter((b:any)=>b.job_id===j.id)
        return {
          id:j.id, title:j.title,
          category:j.category.charAt(0).toUpperCase()+j.category.slice(1),
          emoji:getCatEmoji(j.category), area:`${j.area}, JHB`,
          urgency:getUrgencyLabel(j.urgency), urgColor:getUrgencyColor(j.urgency),
          budget:j.budget_max||0, status:j.status,
          posted:getTimeAgo(j.created_at), expiresAt:j.expires_at||null,
          bids:jobBids.map((b:any,bi:number)=>{
            const tp = profileMap[b.tradesperson_id]
            const tpProfile = tp?.tradesperson_profiles
            return {
              id:b.id, tradespersonId:b.tradesperson_id,
              name:tp?.full_name||'Tradesperson',
              init:(tp?.full_name||'T').split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase(),
              bg:AVATAR_COLORS[(ji+bi)%AVATAR_COLORS.length],
              trade:`${(tpProfile?.trade_category||'tradesperson').charAt(0).toUpperCase()+(tpProfile?.trade_category||'tradesperson').slice(1)} · ${tpProfile?.years_experience||0} yrs`,
              rating:'★★★★★', ratingNum:String(tpProfile?.rating_avg||'New'),
              jobs:tpProfile?.jobs_completed||0, price:b.amount, eta:b.eta_label,
              status:b.status, counterAmount:b.counter_amount||null,
              counterBy:b.counter_by||null, counterRound:b.counter_round||0,
              finalAmount:b.final_amount||null, counterUpdatedAt:b.updated_at||null,
              quoteRequested:b.quote_requested||false,
            }
          })
        }
      })

      setJobs(mapped)
      setSelectedJob(prev=>{
        if(!prev) return mapped.length > 0 ? mapped[0] : null
        return mapped.find(j=>j.id===prev.id)||mapped[0]||null
      })
      // Load quotes after jobs so we have jobIds
      loadQuotesForJobs(jobIds)
    } catch(e){ console.error('Load jobs exception:',e) }
    setLoading(false)
  }

  async function loadQuotesForJobs(jobIds: string[]) {
    if(!jobIds.length) return
    try {
      const {data,error} = await supabase
        .from('quotes')
        .select('*, profiles!tradesperson_id(full_name)')
        .in('job_id', jobIds)
      if(!error && data) {
        const map: Record<string, QuoteData> = {}
        for(const q of data) {
          map[q.job_id] = {
            labourAmount:       q.labour_amount,
            materialsEstimate:  q.materials_estimate,
            notes:              q.notes,
            status:             q.status,
            tradespersonId:     q.tradesperson_id,
            tradespersonName:   (q as any).profiles?.full_name || 'Tradesperson',
            materialsCoveredBy: q.materials_covered_by || 'homeowner',
          }
        }
        setQuotes(map)
      }
    } catch(e){ console.log('Quotes load error:',e) }
  }

  async function loadQuotes() {
    const jobIds = jobs.map(j=>j.id)
    if(!jobIds.length) return
    loadQuotesForJobs(jobIds)
  }

  async function loadHistoryJobs() {
    try {
      const {data:{session}} = await supabase.auth.getSession()
      if(!session?.user) return
      const {data:jobsData,error} = await supabase
        .from('jobs').select('id,title,category,area,updated_at,status')
        .eq('homeowner_id',session.user.id)
        .in('status',['in_progress','completion_submitted','completed','disputed'])
        .order('updated_at',{ascending:false})
      if(error||!jobsData) return
      const jobIds = jobsData.map((j:any)=>j.id)
      const {data:bidsData} = await supabase
        .from('bids').select('job_id,amount,final_amount,tradesperson_id,profiles!tradesperson_id(full_name)')
        .in('job_id',jobIds).eq('status','accepted')
      const {data:reviewsData} = await supabase
        .from('reviews').select('job_id,rating').eq('reviewer_id',session.user.id).in('job_id',jobIds)
      setHistoryJobs(jobsData.map((j:any)=>{
        const bid = (bidsData||[]).find((b:any)=>b.job_id===j.id)
        const review = (reviewsData||[]).find((r:any)=>r.job_id===j.id)
        return {
          id:j.id, title:j.title, category:j.category, emoji:getCatEmoji(j.category),
          area:j.area, tradesperson:(bid as any)?.profiles?.full_name||'Tradesperson',
          tradespersonId:bid?.tradesperson_id||'',
          price: bid?.final_amount ? bid.final_amount/100 : bid?.amount ? bid.amount/100 : 0, rating:review?.rating||0,
          date:new Date(j.updated_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}),
          status:j.status,
        }
      }))
    } catch(e){ console.log('History error:',e) }
  }

  async function loadExpiredJobs() {
    try {
      const {data:{session}} = await supabase.auth.getSession()
      if(!session?.user) return
      const {data,error} = await supabase
        .from('jobs')
        .select('*')
        .eq('homeowner_id', session.user.id)
        .eq('status', 'expired')
        .order('expires_at', {ascending:false})
        .limit(10)
      if(!error && data) {
        setExpiredJobs(data.map((j:any) => ({
          id:j.id, title:j.title,
          category:j.category.charAt(0).toUpperCase()+j.category.slice(1),
          emoji:getCatEmoji(j.category), area:`${j.area}, JHB`,
          urgency:getUrgencyLabel(j.urgency), urgColor:getUrgencyColor(j.urgency),
          budget:j.budget_max||0, status:'expired',
          posted:getTimeAgo(j.created_at),
          expiresAt:j.expires_at||null,
          bids:[],
        })))
      }
    } catch(e){ console.log('Expired jobs error:',e) }
  }

  async function repostJob(job: JobData) {
    // Navigate to post page with pre-filled data via query params
    router.push(`/post?repost=${job.id}&title=${encodeURIComponent(job.title)}&category=${job.category.toLowerCase()}&area=${encodeURIComponent(job.area.replace(', JHB',''))}&budget=${job.budget}`)
  }

  async function loadCompletions() {
    try {
      const {data:{session}} = await supabase.auth.getSession()
      if(!session?.user) return
      const {data,error} = await supabase
        .from('job_completions')
        .select('id,job_id,completed_at,report,created_at,job_completion_photos(storage_url,sort_order)')
        .order('created_at',{ascending:false})
      if(!error && data) {
        const map: Record<string,any> = {}
        for(const c of data) {
          map[c.job_id] = {
            id:c.id, report:c.report, completedAt:c.completed_at,
            photos:(c.job_completion_photos||[]).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((p:any)=>p.storage_url),
          }
        }
        setCompletions(map)
      }
    } catch(e){ console.log('Completions load error:',e) }
  }

  function requestQuote(jobId:string, bidId:string, tradespersonId:string, tradespersonName:string) {
    // Open modal to ask about materials coverage first
    setQuoteModal({jobId, bidId, tradespersonId, tradespersonName})
    setQuoteMaterialsBy('homeowner')
    setQuoteNotes('')
  }

  async function sendQuoteRequest() {
    if(!quoteModal) return
    const {jobId, bidId, tradespersonId, tradespersonName} = quoteModal
    setRequestingQuote(r=>({...r,[bidId]:true}))
    setQuoteModal(null)
    try {
      await supabase.from('bids').update({
        quote_requested:    true,
        quote_materials_by: quoteMaterialsBy,
      }).eq('id',bidId)
      await supabase.from('quotes').upsert({
        job_id:              jobId,
        tradesperson_id:     tradespersonId,
        labour_amount:       0,
        materials_estimate:  0,
        status:              'requested',
        materials_covered_by: quoteMaterialsBy,
      },{onConflict:'job_id,tradesperson_id'})
      const {data:{session}} = await supabase.auth.getSession()
      const job = jobs.find(j=>j.id===jobId)
      fetch('/api/send-email',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          type:'quote_requested', jobId, jobTitle:job?.title||'Job',
          tradespersonId, homeownerId:session?.user?.id,
          materialsCoveredBy: quoteMaterialsBy,
        })
      }).catch(e=>console.log('Email error:',e))
      toast(`Quote requested from ${tradespersonName.split(' ')[0]}!`,
        quoteMaterialsBy==='homeowner'
          ? 'They will quote labour only — you cover materials'
          : 'They will quote an all-in price including materials',
        '#E8A020')
      loadRealJobs(true)
    } catch(e){ console.log('Request quote error:',e) }
    setRequestingQuote(r=>({...r,[bidId]:false}))
  }

  async function acceptQuote(jobId:string, bidId:string, tradespersonId:string) {
    try {
      const q = quotes[jobId]
      const escrowAmount = q?.materialsCoveredBy === 'tradesperson'
        ? (q.labourAmount + q.materialsEstimate)
        : q?.labourAmount
      await supabase.from('quotes').update({status:'accepted'}).eq('job_id',jobId).eq('tradesperson_id',tradespersonId)
      await supabase.from('bids').update({status:'accepted',amount:escrowAmount,final_amount:escrowAmount}).eq('id',bidId)
      await supabase.from('bids').update({status:'declined'}).eq('job_id',jobId).neq('id',bidId)
      await supabase.from('jobs').update({status:'accepted'}).eq('id',jobId)
      const {data:{session}} = await supabase.auth.getSession()
      fetch('/api/send-email',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type:'bid_accepted',bidId,amount:escrowAmount,jobTitle:jobs.find(j=>j.id===jobId)?.title||'Job',jobId,tradespersonId})
      }).catch(e=>console.log('Email error:',e))
      toast('Quote accepted!','Now pay to confirm the job','#3DAA6A')
      loadRealJobs(true); loadQuotes()
    } catch(e){ console.log('Accept quote error:',e) }
  }

  async function confirmJobComplete(jobId:string, bidId:string, amount:number) {
    try {
      const {data:{session}} = await supabase.auth.getSession()
      const job = jobs.find(j=>j.id===jobId)
      const acceptedBid = job?.bids.find(b=>b.id===bidId)
      const netAmount = Math.round(amount * 0.92 * 100) // 92% net in cents

      // Update job and bid status
      await supabase.from('jobs').update({status:'completed'}).eq('id',jobId)
      await supabase.from('bids').update({status:'accepted'}).eq('id',bidId)

      // Update payments table — mark as released, set payout pending
      await supabase.from('payments')
        .update({
          status:         'released',
          released_at:    new Date().toISOString(),
          payout_status:  'pending',
          net_amount:     netAmount,
        })
        .eq('job_id', jobId)

      // Create in-app notification for tradesperson
      if(acceptedBid?.tradespersonId) {
        try {
          await supabase.from('notifications').insert({
            user_id: acceptedBid.tradespersonId,
            type:    'payment_processing',
            title:   'Payment being processed',
            message: `Homeowner confirmed the job done. R${Math.round(amount*0.92).toLocaleString()} will be paid to your bank account within 24 hours.`,
            link:    '/dashboard',
            read:    false,
          })
        } catch(e) { console.log('Notif insert error:', e) }
      }

      // Email admin + tradesperson
      fetch('/api/send-email',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          type:             'payment_release_request',
          jobId,
          jobTitle:         job?.title||'Job',
          amount,
          netAmount:        Math.round(amount*0.92),
          homeownerId:      session?.user?.id,
          tradespersonId:   acceptedBid?.tradespersonId||bidId,
          tradespersonName: acceptedBid?.name||'Tradesperson',
        })
      }).catch(e=>console.log('Email error:',e))

      setPaidJobs(p=>({...p,[jobId]:true}))
      toast('Job confirmed done! 🎉','Payment will be processed to tradesperson within 24 hours','#3DAA6A')
      setReviewJob(jobId)
      setReviewTradespersonId(acceptedBid?.tradespersonId||'')
      loadRealJobs(true); loadHistoryJobs()
    } catch(e){ console.log('Confirm complete error:',e) }
  }

  async function raiseDispute(jobId:string) {
    if(!disputeReason.trim()) return
    setSubmittingDispute(true)
    try {
      const {data:{session}} = await supabase.auth.getSession()
      await supabase.from('job_disputes').insert({job_id:jobId,raised_by:session?.user?.id,reason:disputeReason,status:'open'})
      await supabase.from('jobs').update({status:'disputed'}).eq('id',jobId)
      fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'dispute_raised',jobId,reason:disputeReason,homeownerId:session?.user?.id})}).catch(e=>console.log('Email error:',e))
      toast('Dispute raised','Our team will review within 24 hours','#E8A020')
      setDisputeJob(null); setDisputeReason(''); loadRealJobs(true)
    } catch(e){ console.log('Dispute error:',e) }
    setSubmittingDispute(false)
  }

  function toast(msg:string, sub:string, color:string){
    const id=Date.now()
    setToasts(t=>[...t,{id,msg,color}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500)
  }

  async function sendCounter(jobId:string, bidId:string){
    const amt = counterAmts[bidId]
    if(!amt||parseInt(amt)<1) return
    const currentBid = jobs.find(j=>j.id===jobId)?.bids.find(b=>b.id===bidId)
    const currentRound = currentBid?.counterRound||0
    if(currentRound >= 3){ toast('Max rounds reached','You must accept or decline','#E24B4A'); return }
    setCounterResp(r=>({...r,[bidId]:'sending'}))
    try {
      const newRound = currentRound + 1
      const {error} = await supabase.from('bids').update({
        counter_amount:parseInt(amt), counter_by:'homeowner',
        counter_message:`Homeowner counter-offered R${amt} (round ${newRound})`,
        counter_round:newRound, status:'countered',
      }).eq('id',bidId)
      if(error){ setCounterResp(r=>({...r,[bidId]:'error'})); return }
      setCounterResp(r=>({...r,[bidId]:'sent'}))
      setCounterAmts(a=>({...a,[bidId]:''}))
      const tradeName = jobs.find(j=>j.id===jobId)?.bids.find(b=>b.id===bidId)?.name.split(' ')[0]||'the tradesperson'
      const {data:{session}} = await supabase.auth.getSession()
      const {data:jobData} = await supabase.from('jobs').select('homeowner_id').eq('id',jobId).single()
      fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'counter_offer',bidId,counterAmount:parseInt(amt),counterBy:'homeowner',jobTitle:jobs.find(j=>j.id===jobId)?.title||'Job',jobId,homeownerId:(jobData as any)?.homeowner_id||session?.user?.id,tradespersonId:currentBid?.tradespersonId||bidId})}).catch(e=>console.log('Email error:',e))
      toast(`Counter sent to ${tradeName}! (Round ${newRound}/3)`,'Waiting for their response','#E8A020')
    } catch(e){ setCounterResp(r=>({...r,[bidId]:'error'})) }
  }

  async function acceptCounterFromTrade(jobId:string, bidId:string, amount:number){
    try {
      await supabase.from('bids').update({status:'accepted',final_amount:amount}).eq('id',bidId)
      await supabase.from('bids').update({status:'declined'}).eq('job_id',jobId).neq('id',bidId)
      await supabase.from('jobs').update({status:'accepted'}).eq('id',jobId)
      toast('Counter accepted!','Now pay to confirm the job','#3DAA6A')
      loadRealJobs(true)
    } catch(e){ console.log('Accept counter error:',e) }
  }

  async function acceptBid(jobId:string, bidId:string, bidName:string){
    try {
      const bid = jobs.find(j=>j.id===jobId)?.bids.find(b=>b.id===bidId)
      const agreedAmount = bid?.counterAmount || bid?.price || 0
      await supabase.from('bids').update({status:'accepted',final_amount:agreedAmount}).eq('id',bidId)
      await supabase.from('bids').update({status:'declined'}).eq('job_id',jobId).neq('id',bidId)
      await supabase.from('jobs').update({status:'accepted'}).eq('id',jobId)
      const {data:{session}} = await supabase.auth.getSession()
      fetch('/api/send-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'bid_accepted',bidId,amount:agreedAmount,jobTitle:jobs.find(j=>j.id===jobId)?.title||'Job',jobId,tradespersonId:bid?.tradespersonId||bidId})}).catch(e=>console.log('Email error:',e))
      toast('Bid accepted!',`${bidName.split(' ')[0]} is confirmed · Pay to lock in`,'#3DAA6A')
      loadRealJobs(true)
    } catch(e){ console.log('Accept bid error:',e) }
  }

  async function releasePayment(jobId:string, amount:number){
    const job = jobs.find(j=>j.id===jobId)
    const acceptedBid = job?.bids.find(b=>b.status==='accepted'||b.status==='completed')
    try {
      const {data:{session}} = await supabase.auth.getSession()
      const res = await fetch('/api/charge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amountInCents:Math.round(amount*100),currency:'ZAR',jobId,jobTitle:job?.title||'Home repair',homeownerId:session?.user?.id,tradespersonId:acceptedBid?.tradespersonId||'',successUrl:`${window.location.origin}/home?payment=success&jobId=${jobId}`,cancelUrl:`${window.location.origin}/home?payment=cancelled`})})
      const data = await res.json()
      if(!res.ok||data.error){ toast('Payment error',data.error||'Please try again','#E24B4A'); return }
      if(data.redirectUrl){ window.location.href = data.redirectUrl }
      else if(data.success){ setPaidJobs(p=>({...p,[jobId]:true})); toast('Payment confirmed! 🎉','Funds held in escrow','#3DAA6A'); loadRealJobs(true) }
    } catch(e){ console.error('Payment error:',e); toast('Payment error','Please try again or contact support','#E24B4A') }
  }

  async function submitReview(){
    try {
      const {data:{session}} = await supabase.auth.getSession()
      if(!session?.user||!reviewJob) return
      let tradespersonId = reviewTradespersonId
      if(!tradespersonId) {
        const {data:bid} = await supabase.from('bids').select('tradesperson_id').eq('job_id',reviewJob).eq('status','accepted').single()
        tradespersonId = bid?.tradesperson_id||''
      }
      if(!tradespersonId){ toast('Could not identify tradesperson','Please contact support','#E24B4A'); setReviewJob(null); return }
      const {data:existing} = await supabase.from('reviews').select('id').eq('job_id',reviewJob).eq('reviewer_id',session.user.id).single()
      if(existing){ toast('Already reviewed','You have already left a review for this job','#E8A020'); setReviewJob(null); return }
      const {error:reviewErr} = await supabase.from('reviews').insert({job_id:reviewJob,reviewer_id:session.user.id,reviewee_id:tradespersonId,rating,comment:reviewText||null})
      if(reviewErr){ console.error('Review insert error:',reviewErr); toast('Could not save review','Please try again','#E24B4A'); return }
      const {data:allReviews} = await supabase.from('reviews').select('rating').eq('reviewee_id',tradespersonId)
      if(allReviews&&allReviews.length>0) {
        const count = allReviews.length
        const avg = allReviews.reduce((s:number,r:any)=>s+r.rating,0)/count
        const rounded = Math.round(avg*10)/10
        const {count:completedCount} = await supabase.from('bids').select('id',{count:'exact',head:true}).eq('tradesperson_id',tradespersonId).eq('status','completed')
        await supabase.from('tradesperson_profiles').update({rating_avg:rounded,rating_count:count,jobs_completed:completedCount||count}).eq('id',tradespersonId)
      }
      setHistoryJobs(h=>h.map(j=>j.id===reviewJob?{...j,rating}:j))
      toast('Review submitted ⭐','Thank you — this helps other homeowners','#C4593A')
    } catch(e){ console.error('Review error:',e); toast('Something went wrong','Please try again','#E24B4A') }
    setReviewJob(null); setReviewTradespersonId(''); setRating(5); setReviewText('')
  }

  const activeJobs  = jobs.filter(j=>!['completed','disputed','expired','cancelled'].includes(j.status))
  const allBids     = activeJobs.flatMap(j=>j.bids)
  const avgBidPrice = allBids.length>0?Math.round(allBids.reduce((s,b)=>s+b.price,0)/allBids.length):0
  const totalSpent  = historyJobs.filter(j=>j.status==='completed').reduce((s,j)=>s+j.price,0)
  const displayName = profile?.full_name||'—'
  const displayInitials = displayName.split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase()||'?'

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --terra:#C4593A;--terra-l:#E07A5F;--terra-d:#9E3E24;
      --cream:#F5F0E8;--cream-d:#EAE3D6;--cream-dd:#DDD5C5;
      --charcoal:#2C2C28;--charcoal-m:#3E3D38;--charcoal-l:#5A5952;
      --sand:#D4C9B4;--white:#FAFAF7;--green:#3DAA6A;--green-l:#52C47F;--amber:#E8A020;
      --fd:'Bebas Neue',sans-serif;--fc:'Barlow Condensed',sans-serif;--fb:'Barlow',sans-serif;
    }
    html,body{min-height:100%;font-family:var(--fb);background:var(--cream)}
    .shell{display:flex;min-height:100vh}
    .sidenav{width:240px;flex-shrink:0;background:var(--charcoal);display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,.05);position:sticky;top:0;height:100vh;overflow-y:auto}
    .sn-logo{padding:24px 20px 18px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:9px}
    .sn-hex{width:28px;height:28px;background:var(--terra);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sn-word{font-family:var(--fd);font-size:22px;letter-spacing:2px;color:var(--cream);text-decoration:none}
    .sn-profile{padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px}
    .sn-ava{width:42px;height:42px;border-radius:50%;background:var(--terra);display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:18px;color:#fff;border:2px solid rgba(196,89,58,.4);flex-shrink:0}
    .sn-name{font-family:var(--fc);font-size:14px;font-weight:700;color:var(--cream);line-height:1.2}
    .sn-sub{font-size:11px;color:rgba(245,240,232,.4);margin-top:2px}
    .sn-menu{flex:1;padding:10px 0}
    .sn-sec{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:rgba(245,240,232,.2);padding:12px 20px 4px}
    .sn-item{display:flex;align-items:center;gap:10px;padding:11px 20px;cursor:pointer;font-family:var(--fc);font-size:13px;font-weight:600;letter-spacing:.5px;color:rgba(245,240,232,.45);border-left:3px solid transparent;transition:all .15s}
    .sn-item:hover{color:rgba(245,240,232,.8);background:rgba(255,255,255,.03)}
    .sn-item.active{color:var(--cream);border-left-color:var(--terra);background:rgba(196,89,58,.08)}
    .sn-badge{margin-left:auto;background:var(--terra);color:#fff;font-family:var(--fc);font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px}
    .main{flex:1;overflow-x:hidden;background:var(--cream)}
    .topbar{background:var(--white);border-bottom:1px solid var(--cream-d);padding:0 32px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:40}
    .page-title{font-family:var(--fd);font-size:24px;letter-spacing:1.5px;color:var(--charcoal)}
    .topbar-right{display:flex;align-items:center;gap:10px}
    .post-btn{font-family:var(--fc);font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:var(--terra);color:#fff;border:none;padding:10px 22px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background .15s}
    .post-btn:hover{background:var(--terra-l)}
    .content{padding:28px 32px}
    .stat-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
    .stat-card{background:var(--white);border-radius:10px;border:1px solid var(--cream-d);padding:20px 22px}
    .stat-eye{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--charcoal-l);margin-bottom:8px}
    .stat-num{font-family:var(--fd);font-size:36px;letter-spacing:1px;line-height:1;color:var(--charcoal)}
    .stat-num.terra{color:var(--terra)}
    .stat-num.green{color:var(--green)}
    .stat-delta{font-size:11px;color:var(--charcoal-l);margin-top:5px;font-family:var(--fc);font-weight:500}
    .sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
    .sec-title{font-family:var(--fd);font-size:22px;letter-spacing:1.5px;color:var(--charcoal)}
    .job-card{background:var(--white);border-radius:12px;border:1.5px solid var(--cream-d);overflow:hidden;cursor:pointer;transition:all .2s;margin-bottom:12px}
    .job-card:hover{border-color:var(--terra-l);box-shadow:0 4px 20px rgba(196,89,58,.08)}
    .job-card.selected{border-color:var(--terra)}
    .jc-top{padding:18px 20px 14px;display:flex;align-items:flex-start;gap:12px}
    .jc-urg{width:4px;height:52px;border-radius:2px;flex-shrink:0;margin-top:2px}
    .jc-cat{font-family:var(--fc);font-size:9px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--charcoal-l);margin-bottom:4px}
    .jc-title{font-family:var(--fc);font-size:17px;font-weight:700;color:var(--charcoal);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .jc-meta{font-size:12px;color:var(--charcoal-l)}
    .jc-bot{padding:10px 20px;background:var(--cream);border-top:1px solid var(--cream-d);display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--charcoal-l)}
    .bid-count{font-family:var(--fc);font-size:13px;font-weight:700;color:var(--terra)}
    .detail-panel{background:var(--white);border-radius:12px;border:1.5px solid var(--cream-d);overflow:hidden}
    .dp-header{background:var(--charcoal);padding:24px 26px;position:relative;overflow:hidden}
    .dp-header::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 100% 50%,rgba(196,89,58,.15) 0%,transparent 60%);pointer-events:none}
    .dp-eye{font-family:var(--fc);font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--terra-l);margin-bottom:6px;position:relative;z-index:1}
    .dp-title{font-family:var(--fd);font-size:28px;letter-spacing:1px;color:var(--cream);line-height:1;position:relative;z-index:1}
    .dp-meta{font-size:13px;color:rgba(245,240,232,.5);margin-top:4px;position:relative;z-index:1}
    .dp-body{padding:24px 26px}
    .bid-card{background:var(--cream);border-radius:10px;border:1.5px solid var(--cream-d);padding:16px 18px;margin-bottom:12px;transition:all .2s}
    .bid-card:hover{border-color:var(--terra-l)}
    .bid-card.accepted{border-color:var(--green);background:rgba(61,170,106,.04)}
    .bc-top{display:flex;align-items:center;gap:14px;margin-bottom:12px}
    .bc-ava{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--fd);font-size:18px;color:#fff;flex-shrink:0}
    .bc-name{font-family:var(--fb);font-size:15px;font-weight:600;color:var(--charcoal);margin-bottom:2px}
    .bc-trade{font-size:12px;color:var(--charcoal-l);margin-bottom:3px}
    .bc-stars{font-size:12px;color:var(--amber)}
    .bc-price{font-family:var(--fd);font-size:28px;color:var(--charcoal);letter-spacing:.5px;line-height:1;margin-left:auto;text-align:right}
    .bc-eta{font-size:11px;color:var(--charcoal-l);text-align:right;margin-top:2px}
    .bc-actions{display:flex;gap:8px;flex-wrap:wrap}
    .counter-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}
    .counter-r{font-family:var(--fd);font-size:20px;color:var(--charcoal-l);background:var(--cream-d);border:1.5px solid var(--cream-dd);border-radius:6px 0 0 6px;padding:9px 12px;flex-shrink:0;border-right:none}
    .counter-in{flex:1;border:1.5px solid var(--cream-dd);border-radius:0 6px 6px 0;padding:9px 12px;font-family:var(--fd);font-size:20px;color:var(--charcoal);background:var(--white);outline:none;transition:border-color .2s}
    .counter-in:focus{border-color:var(--terra)}
    .btn{padding:10px 18px;border-radius:6px;font-family:var(--fc);font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border:none;transition:all .15s;display:flex;align-items:center;gap:6px}
    .btn-terra{background:var(--terra);color:#fff}
    .btn-terra:hover{background:var(--terra-l)}
    .btn-green{background:var(--green);color:#fff}
    .btn-green:hover{background:var(--green-l)}
    .btn-ghost{background:transparent;border:1.5px solid var(--cream-dd);color:var(--charcoal-l)}
    .btn-ghost:hover{border-color:var(--charcoal-l);color:var(--charcoal)}
    .escrow-note{background:rgba(61,170,106,.08);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:14px 16px;font-size:13px;color:var(--charcoal-l);display:flex;align-items:flex-start;gap:10px;line-height:1.6;margin:16px 0}
    .expired-card{background:var(--white);border-radius:10px;border:1.5px dashed var(--cream-dd);padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px;opacity:.75;transition:opacity .2s}
    .expired-card:hover{opacity:1}
    .empty-state{text-align:center;padding:80px 20px;color:var(--charcoal-l)}
    .hist-row{background:var(--white);border-radius:10px;border:1px solid var(--cream-d);padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px}
    .hist-ico{width:40px;height:40px;border-radius:10px;background:rgba(196,89,58,.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .hist-title{font-family:var(--fc);font-size:15px;font-weight:700;color:var(--charcoal);margin-bottom:2px}
    .hist-meta{font-size:12px;color:var(--charcoal-l)}
    .hist-price{font-family:var(--fd);font-size:22px;color:var(--terra);text-align:right}
    .hist-date{font-size:11px;color:var(--charcoal-l);text-align:right;margin-top:2px}
    .review-ta{width:100%;border:1.5px solid var(--cream-d);border-radius:8px;padding:12px 14px;font-family:var(--fb);font-size:14px;color:var(--charcoal);outline:none;resize:none;height:80px;line-height:1.55;transition:border-color .2s;margin-bottom:14px}
    .review-ta:focus{border-color:var(--terra)}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
    .modal{background:var(--white);border-radius:16px;border:1px solid var(--cream-d);width:100%;max-width:460px;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,.15)}
    .modal-title{font-family:var(--fd);font-size:32px;letter-spacing:1px;color:var(--charcoal);margin-bottom:6px}
    .modal-sub{font-size:14px;color:var(--charcoal-l);margin-bottom:24px;line-height:1.5}
    .toast-stack{position:fixed;bottom:24px;right:24px;z-index:200;pointer-events:none}
    .toast-item{background:var(--charcoal);border-radius:10px;border:1px solid rgba(255,255,255,.1);padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:10px;max-width:280px;animation:toastIn .3s ease both}
    @keyframes toastIn{from{opacity:0;transform:translateX(12px)}to{opacity:1;transform:translateX(0)}}
    .loading-state{display:flex;align-items:center;justify-content:center;padding:80px;color:var(--charcoal-l);font-family:var(--fc);font-size:13px;letter-spacing:1px;gap:12px}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .spin{display:inline-block;width:20px;height:20px;border:2px solid var(--cream-d);border-top-color:var(--terra);border-radius:50%;animation:spin .6s linear infinite}
    .spin-sm{display:inline-block;width:12px;height:12px;border:2px solid rgba(196,89,58,.3);border-top-color:var(--terra);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .quote-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(4px);animation:toastIn .2s ease}
    .quote-modal{background:var(--white);border-radius:16px;width:100%;max-width:480px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.2)}
    .quote-modal-head{background:var(--charcoal);padding:24px 28px}
    .quote-modal-body{padding:24px 28px}
    .materials-opt{border:1.5px solid var(--cream-d);border-radius:10px;padding:16px 18px;cursor:pointer;transition:all .2s;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start}
    .materials-opt:hover{border-color:var(--terra-l)}
    .materials-opt.selected{border-color:var(--terra);background:rgba(196,89,58,.04)}
    .materials-opt-radio{width:20px;height:20px;border-radius:50%;border:2px solid var(--cream-dd);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;transition:all .2s}
    .materials-opt.selected .materials-opt-radio{border-color:var(--terra);background:var(--terra)}
    .materials-opt.selected .materials-opt-radio::after{content:'';width:8px;height:8px;border-radius:50%;background:#fff;display:block}
    .materials-opt-title{font-family:var(--fc);font-size:14px;font-weight:700;color:var(--charcoal);margin-bottom:3px}
    .materials-opt-sub{font-size:12px;color:var(--charcoal-l);line-height:1.5}
    .quote-box{background:rgba(196,89,58,.04);border:1.5px solid rgba(196,89,58,.2);border-radius:10px;padding:16px 18px;margin-bottom:12px}
    .quote-box.received{background:rgba(61,170,106,.04);border-color:rgba(61,170,106,.25)}
    @media(max-width:900px){
      .sidenav{display:none}
      .stat-strip{grid-template-columns:1fr 1fr}
      .content{padding:16px}
      .topbar{padding:0 16px}
      .job-detail-grid{grid-template-columns:1fr!important}
      .modal{padding:20px!important;margin:8px!important;max-height:95vh!important;overflow-y:auto}
    }
    @media(max-width:600px){
      .stat-strip{grid-template-columns:1fr 1fr;gap:8px!important;margin-bottom:16px!important}
      .stat-card{padding:14px 16px!important}
      .stat-num{font-size:28px!important}
      .topbar{height:52px!important}
      .btn{padding:10px 14px!important;font-size:11px!important}
      .counter-row{flex-wrap:wrap}
    }
    .mobile-nav{display:none}
    @media(max-width:900px){
      .mobile-nav{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--charcoal);border-top:1px solid rgba(255,255,255,.08);z-index:50;height:60px;}
      .main{padding-bottom:60px}
    }
  `

  // ── Job Status Timeline ───────────────────────────────────────────
  function JobTimeline({ job, completionData, jobQuotes }: {
    job: JobData
    completionData: any
    jobQuotes: Record<string, any>
  }) {
    const acceptedBid = job.bids.find(b => b.status === 'accepted' || b.status === 'completed')
    type StepStatus = 'done' | 'active' | 'pending'
    type Step = { icon: string; label: string; sublabel: string; status: StepStatus }

    const steps: Step[] = [
      {
        icon: '📋',
        label: 'Job posted',
        sublabel: `Posted ${job.posted}`,
        status: 'done',
      },
      {
        icon: '💬',
        label: 'Bids received',
        sublabel: job.bids.length > 0
          ? `${job.bids.length} bid${job.bids.length !== 1 ? 's' : ''} received`
          : 'Waiting for bids',
        status: job.bids.length > 0 ? 'done' : 'active',
      },
      {
        icon: '📋',
        label: 'Quote & negotiation',
        sublabel: jobQuotes[job.id]?.status === 'accepted'
          ? 'Quote accepted'
          : jobQuotes[job.id]?.status === 'submitted'
          ? 'Quote received — review it'
          : jobQuotes[job.id]?.status === 'requested'
          ? 'Quote requested'
          : acceptedBid
          ? 'Bid accepted directly'
          : 'Pending',
        status: acceptedBid || jobQuotes[job.id]?.status === 'accepted' ? 'done'
          : jobQuotes[job.id] ? 'active' : 'pending',
      },
      {
        icon: '🔒',
        label: 'Payment in escrow',
        sublabel: ['in_progress','completion_submitted','completed','disputed'].includes(job.status)
          ? `R${(acceptedBid?.finalAmount || acceptedBid?.price || 0).toLocaleString()} secured`
          : 'Pay to lock in',
        status: ['in_progress','completion_submitted','completed','disputed'].includes(job.status)
          ? 'done'
          : acceptedBid ? 'active' : 'pending',
      },
      {
        icon: '⚙️',
        label: 'Work in progress',
        sublabel: completionData
          ? 'Work submitted for review'
          : job.status === 'in_progress'
          ? 'Tradesperson on the job'
          : 'Waiting to start',
        status: completionData || ['completion_submitted','completed','disputed'].includes(job.status)
          ? 'done'
          : job.status === 'in_progress' ? 'active' : 'pending',
      },
      {
        icon: '✅',
        label: 'Job confirmed done',
        sublabel: job.status === 'completed'
          ? 'Payment released'
          : job.status === 'disputed'
          ? 'Under dispute'
          : completionData
          ? 'Review and confirm below'
          : 'Pending completion',
        status: job.status === 'completed' || job.status === 'disputed'
          ? 'done'
          : completionData ? 'active' : 'pending',
      },
    ]

    const doneCount = steps.filter(s => s.status === 'done').length
    const pct = Math.round((doneCount / steps.length) * 100)

    return (
      <div style={{background:'var(--cream)',borderRadius:10,border:'1px solid var(--cream-d)',padding:'16px 18px',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:12,height:2,background:'var(--terra)',display:'inline-block'}}/>
            Job progress
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:80,height:4,background:'var(--cream-d)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:'var(--terra)',borderRadius:2,transition:'width .6s ease'}}/>
            </div>
            <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,color:'var(--terra)'}}>{pct}%</span>
          </div>
        </div>

        <div style={{position:'relative'}}>
          {/* Track line */}
          <div style={{position:'absolute',left:15,top:16,bottom:16,width:2,background:'var(--cream-d)',borderRadius:1,zIndex:0}}/>
          {/* Fill line */}
          <div style={{position:'absolute',left:15,top:16,width:2,borderRadius:1,zIndex:1,background:'linear-gradient(to bottom, var(--terra), #E07A5F)',height:`${pct}%`,transition:'height .6s ease'}}/>

          {steps.map((step, i) => (
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:i < steps.length-1 ? 16 : 0,position:'relative',zIndex:2}}>
              {/* Dot */}
              <div style={{
                width:32, height:32, borderRadius:'50%', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                background: step.status==='done' ? 'var(--terra)' : step.status==='active' ? 'rgba(196,89,58,.1)' : 'var(--cream-d)',
                border: `2px solid ${step.status==='done' ? 'var(--terra)' : step.status==='active' ? 'var(--terra)' : 'var(--cream-dd)'}`,
                transition: 'all .3s',
                boxShadow: step.status==='active' ? '0 0 0 4px rgba(196,89,58,.08)' : 'none',
              }}>
                {step.status === 'done' ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <span style={{fontSize:12, filter:step.status==='pending' ? 'grayscale(1) opacity(0.3)' : 'none'}}>{step.icon}</span>
                )}
              </div>
              {/* Label */}
              <div style={{flex:1, paddingTop:4}}>
                <div style={{
                  fontFamily:'var(--fc)', fontSize:13, fontWeight:700, letterSpacing:.3,
                  color: step.status==='pending' ? 'var(--cream-dd)' : step.status==='active' ? 'var(--terra)' : 'var(--charcoal)',
                  marginBottom:2, display:'flex', alignItems:'center', gap:6,
                }}>
                  {step.label}
                  {step.status === 'active' && (
                    <span style={{display:'inline-block',width:6,height:6,borderRadius:'50%',background:'var(--terra)',animation:'pulse 1.8s ease-in-out infinite'}}/>
                  )}
                </div>
                <div style={{fontSize:11, color:step.status==='pending' ? 'rgba(44,44,40,.2)' : 'var(--charcoal-l)', lineHeight:1.4}}>
                  {step.sublabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Disputed warning */}
        {job.status === 'disputed' && (
          <div style={{marginTop:14,background:'rgba(226,75,74,.06)',border:'1px solid rgba(226,75,74,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#E24B4A',lineHeight:1.5}}>
            ⚠ Dispute raised — our team is reviewing within 24 hours. Payment remains in escrow until resolved.
          </div>
        )}
        {/* Completion pending prompt */}
        {completionData && job.status !== 'completed' && job.status !== 'disputed' && (
          <div style={{marginTop:14,background:'rgba(61,170,106,.06)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#1a6e35',lineHeight:1.5}}>
            ✓ Work submitted — scroll down to review the report, photos and confirm completion.
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        {/* SIDEBAR */}
        <nav className="sidenav">
          <div className="sn-logo">
            <div className="sn-hex">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
            </div>
            <a href="/" className="sn-word">LUNGISA</a>
          </div>
          <div className="sn-profile">
            <div className="sn-ava">{displayInitials}</div>
            <div>
              <div className="sn-name">{displayName}</div>
              <div className="sn-sub">Homeowner · {profile?.area||'Johannesburg'}</div>
            </div>
          </div>
          <div className="sn-menu">
            <div className="sn-sec">My Jobs</div>
            {[
              {id:'active',  icon:'🏠', label:'Active Jobs', badge:activeJobs.filter(j=>j.bids.length>0).length},
              {id:'messages',icon:'💬', label:'Messages',    badge:0},
              {id:'history', icon:'📋', label:'Job History', badge:historyJobs.length},
              {id:'profile', icon:'👤', label:'My Profile'},
            ].map(item=>(
              <div key={item.id} className={`sn-item ${tab===item.id?'active':''}`} onClick={()=>setTab(item.id as Tab)}>
                <span style={{fontSize:14}}>{item.icon}</span>
                {item.label}
                {item.badge!==undefined&&item.badge>0&&<span className="sn-badge">{item.badge}</span>}
              </div>
            ))}
            <div className="sn-sec">Quick actions</div>
            <div className="sn-item" onClick={()=>router.push('/post')}>
              <span style={{fontSize:14}}>➕</span>Post a new job
            </div>
            <div className="sn-item" onClick={()=>router.push('/')}>
              <span style={{fontSize:14}}>🏡</span>Back to home
            </div>
          </div>
        </nav>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <span className="page-title">{tab==='active'?'ACTIVE JOBS':tab==='history'?'JOB HISTORY':tab==='messages'?'MESSAGES':'MY PROFILE'}</span>
            <div className="topbar-right">
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <button onClick={refreshAll} onDoubleClick={()=>window.location.reload()} disabled={refreshing}
                  style={{display:'flex',alignItems:'center',gap:5,background:'transparent',border:'1px solid var(--cream-d)',borderRadius:6,padding:'6px 10px',cursor:refreshing?'not-allowed':'pointer',color:'var(--charcoal-l)',opacity:refreshing?.6:1}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{animation:refreshing?'spin .6s linear infinite':'none'}}>
                    <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                  </svg>
                  <span style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{refreshing?'Syncing...':'Refresh'}</span>
                </button>
                <span style={{fontFamily:'var(--fc)',fontSize:8,color:'rgba(44,44,40,.35)',letterSpacing:.5}}>{lastRefreshed.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <button className="post-btn" onClick={()=>router.push('/post')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Post a Job
              </button>
              <NotificationBell theme="light" />
            </div>
          </div>

          <div className="content">

            {/* ── ACTIVE JOBS ─────────────────────────────────────── */}
            {tab==='active'&&(
              <>
                <div className="stat-strip">
                  {[
                    {eye:'Active jobs',    val:String(activeJobs.length),cls:'terra',delta:activeJobs.length>0?`${activeJobs.filter(j=>j.bids.length>0).length} receiving bids`:'Post your first job'},
                    {eye:'Total bids',     val:String(allBids.length),   cls:'',    delta:allBids.length>0?'Across all your jobs':'No bids yet'},
                    {eye:'Avg bid price',  val:avgBidPrice>0?`R${avgBidPrice.toLocaleString()}`:'—',cls:'green',delta:avgBidPrice>0?'Current average':'No bids yet'},
                    {eye:'Jobs completed', val:String(historyJobs.filter(j=>j.status==='completed').length),cls:'',delta:historyJobs.filter(j=>j.status==='completed').length>0?`R${totalSpent.toLocaleString()} total spent`:'Complete your first job'},
                  ].map(s=>(
                    <div key={s.eye} className="stat-card">
                      <div className="stat-eye">{s.eye}</div>
                      <div className={`stat-num ${s.cls}`}>{s.val}</div>
                      <div className="stat-delta">{s.delta}</div>
                    </div>
                  ))}
                </div>

                {loading?(
                  <div className="loading-state"><div className="spin"/><span>Loading your jobs...</span></div>
                ):activeJobs.length===0?(
                  <div className="empty-state">
                    <div style={{fontSize:48,marginBottom:16}}>🏠</div>
                    <div style={{fontFamily:'var(--fd)',fontSize:32,color:'var(--charcoal)',marginBottom:8,letterSpacing:1}}>No active jobs</div>
                    <p style={{fontSize:15,maxWidth:400,margin:'0 auto 28px',lineHeight:1.6}}>Post your first job and start receiving competitive bids from vetted tradespeople in your area.</p>
                    <button className="btn btn-terra" onClick={()=>router.push('/post')}>Post your first job →</button>
                  </div>
                ):(
                  <div className="job-detail-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>
                    <div>
                      <div className="sec-hdr"><div className="sec-title">Your jobs</div></div>
                      {activeJobs.map(job=>(
                        <div key={job.id} className={`job-card ${selectedJob?.id===job.id?'selected':''}`} onClick={()=>setSelectedJob(job)}>
                          <div className="jc-top">
                            <div className="jc-urg" style={{background:job.urgColor}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div className="jc-cat">{job.emoji} {job.category}</div>
                              <div className="jc-title">{job.title}</div>
                              <div className="jc-meta">📍 {job.area} · Posted {job.posted}
                                {job.expiresAt&&(()=>{
                                  const daysLeft=Math.ceil((new Date(job.expiresAt).getTime()-Date.now())/(1000*60*60*24))
                                  if(daysLeft<=0) return <span style={{marginLeft:8,color:'#E24B4A',fontFamily:'var(--fc)',fontSize:10,fontWeight:700,letterSpacing:1}}>⚠ Expires today</span>
                                  if(daysLeft<=3) return <span style={{marginLeft:8,color:'#E24B4A',fontFamily:'var(--fc)',fontSize:10,fontWeight:700,letterSpacing:1}}>⚠ Expires in {daysLeft}d</span>
                                  if(daysLeft<=7) return <span style={{marginLeft:8,color:'#E8A020',fontFamily:'var(--fc)',fontSize:10,fontWeight:700,letterSpacing:1}}>Expires in {daysLeft}d</span>
                                  return null
                                })()}
                              </div>
                            </div>
                            <div>
                              <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',padding:'4px 10px',borderRadius:4,background:job.bids.length>0?'rgba(196,89,58,.1)':'rgba(0,0,0,.06)',color:job.bids.length>0?'var(--terra-d)':'var(--charcoal-l)'}}>
                                {job.bids.length>0?`${job.bids.length} bids`:'Waiting'}
                              </div>
                              {/* Quote received indicator */}
                              {quotes[job.id]?.status==='submitted'&&(
                                <div style={{marginTop:4,fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',padding:'3px 8px',borderRadius:3,background:'rgba(196,89,58,.12)',color:'var(--terra)',textAlign:'center'}}>
                                  📋 Quote in
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="jc-bot">
                            <span>Budget: <strong>R{job.budget.toLocaleString()}</strong></span>
                            <span className="bid-count">{job.bids.length>0?`${job.bids.length} bid${job.bids.length!==1?'s':''} received`:'No bids yet'}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div>
                      {selectedJob?(
                        <div className="detail-panel">
                          <div className="dp-header">
                            <div className="dp-eye">{selectedJob.emoji} {selectedJob.category} · {selectedJob.area}</div>
                            <div className="dp-title">{selectedJob.title}</div>
                            <div className="dp-meta">Budget R{selectedJob.budget.toLocaleString()} · {selectedJob.urgency} · Posted {selectedJob.posted}</div>
                          </div>
                          <div className="dp-body">
                            {/* ── JOB STATUS TIMELINE ── */}
                            <JobTimeline job={selectedJob} completionData={completions[selectedJob.id]||null} jobQuotes={quotes}/>
                            {selectedJob.bids.length===0?(
                              <div style={{textAlign:'center',padding:'40px 0',color:'var(--charcoal-l)'}}>
                                <div style={{fontSize:32,marginBottom:12}}>⏳</div>
                                <div style={{fontFamily:'var(--fc)',fontSize:16,fontWeight:700,color:'var(--charcoal)',marginBottom:6}}>Waiting for bids</div>
                                <p style={{fontSize:13,lineHeight:1.6}}>Tradespeople in your area are being notified. First bids usually arrive within 5 minutes.</p>
                              </div>
                            ):(
                              <>
                                <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                                  <span style={{width:14,height:2,background:'var(--terra)',display:'inline-block'}}/>
                                  {selectedJob.bids.length} bid{selectedJob.bids.length!==1?'s':''} received
                                </div>

                                {selectedJob.bids.map((bid)=>{
                                  const isPaid             = ['in_progress','completion_submitted','completed','disputed'].includes(selectedJob.status)
                                  const isAccepted         = bid.status==='accepted'||bid.status==='completed'
                                  const isDeclined         = bid.status==='declined'
                                  const homeownerCountered = bid.status==='countered'&&bid.counterBy==='homeowner'
                                  const tradeCountered     = bid.status==='countered'&&bid.counterBy==='tradesperson'
                                  const isOpen             = !isAccepted&&!isDeclined&&!homeownerCountered&&!tradeCountered
                                  const jobHasAccepted     = selectedJob.bids.some(b=>b.status==='accepted'||b.status==='completed')
                                  const jobQuote           = quotes[selectedJob.id]
                                  const bidHasQuote        = jobQuote?.tradespersonId===bid.tradespersonId
                                  if(isDeclined&&jobHasAccepted) return null

                                  return (
                                    <div key={bid.id} className={`bid-card ${isAccepted?'accepted':''}`}>
                                      <div className="bc-top">
                                        <div className="bc-ava" style={{background:bid.bg,cursor:'pointer'}} onClick={()=>router.push(`/tradesperson/${bid.tradespersonId}`)}>{bid.init}</div>
                                        <div style={{flex:1}}>
                                          <div className="bc-name" style={{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--cream-dd)'}} onClick={()=>router.push(`/tradesperson/${bid.tradespersonId}`)}>{bid.name}</div>
                                          <div className="bc-trade">{bid.trade}</div>
                                          <div className="bc-stars">★★★★★ <span style={{color:'var(--charcoal-l)',fontSize:11}}>{bid.ratingNum} · {bid.jobs} jobs</span></div>
                                        </div>
                                        <div>
                                          <div className="bc-price">
                                            R{isPaid&&bid.finalAmount ? bid.finalAmount.toLocaleString() : bid.price.toLocaleString()}
                                          </div>
                                          {isPaid&&bid.finalAmount&&bid.finalAmount!==bid.price&&(
                                            <div style={{fontSize:10,color:'rgba(44,44,40,.4)',textDecoration:'line-through',textAlign:'right',marginTop:1}}>R{bid.price}</div>
                                          )}
                                          <div className="bc-eta">ETA: {bid.eta}</div>
                                        </div>
                                      </div>

                                      {/* ── QUOTE RECEIVED ── */}
                                      {bidHasQuote&&jobQuote.status==='submitted'&&isOpen&&!jobHasAccepted&&(
                                        <div className="quote-box received">
                                          {/* Header */}
                                          <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#1a6e35',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                            Formal quote from {bid.name.split(' ')[0]}
                                          </div>
                                          {/* Quote type badge */}
                                          <div style={{display:'inline-flex',alignItems:'center',gap:5,background:jobQuote.materialsCoveredBy==='tradesperson'?'rgba(196,89,58,.1)':'rgba(61,170,106,.08)',border:`1px solid ${jobQuote.materialsCoveredBy==='tradesperson'?'rgba(196,89,58,.25)':'rgba(61,170,106,.2)'}`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600,color:jobQuote.materialsCoveredBy==='tradesperson'?'var(--terra-d)':'#1a6e35',marginBottom:14}}>
                                            {jobQuote.materialsCoveredBy==='tradesperson'?'📦 All-in quote':'🏪 Labour only quote'}
                                          </div>

                                          {jobQuote.materialsCoveredBy==='homeowner' ? (
                                            // ── FLOW A: Labour only ─────────────────────────────────
                                            <>
                                              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                                                {/* Labour box */}
                                                <div style={{background:'var(--white)',borderRadius:8,padding:'12px 14px',border:'2px solid rgba(61,170,106,.3)'}}>
                                                  <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#1a6e35',marginBottom:4}}>Labour charge</div>
                                                  <div style={{fontFamily:'var(--fd)',fontSize:28,color:'var(--terra)',lineHeight:1}}>R{jobQuote.labourAmount.toLocaleString()}</div>
                                                  <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
                                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#3DAA6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                    <span style={{fontSize:10,color:'#1a6e35',fontWeight:600}}>Goes into escrow</span>
                                                  </div>
                                                </div>
                                                {/* Materials box */}
                                                <div style={{background:'rgba(232,160,32,.04)',borderRadius:8,padding:'12px 14px',border:'1.5px dashed rgba(232,160,32,.4)'}}>
                                                  <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'#854F0B',marginBottom:4}}>Materials est.</div>
                                                  <div style={{fontFamily:'var(--fd)',fontSize:28,color:'var(--charcoal)',lineHeight:1}}>~R{jobQuote.materialsEstimate.toLocaleString()}</div>
                                                  <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
                                                    <span style={{fontSize:10,color:'#854F0B',fontWeight:600}}>⚠ You pay separately</span>
                                                  </div>
                                                </div>
                                              </div>
                                              {/* Cost summary */}
                                              <div style={{background:'var(--white)',borderRadius:8,border:'1px solid var(--cream-d)',padding:'10px 14px',marginBottom:12}}>
                                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,fontSize:12,color:'var(--charcoal-l)'}}>
                                                  <span>Labour (into escrow)</span>
                                                  <span style={{fontWeight:600,color:'var(--charcoal)'}}>R{jobQuote.labourAmount.toLocaleString()}</span>
                                                </div>
                                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12,color:'var(--charcoal-l)'}}>
                                                  <span>Materials (you pay supplier)</span>
                                                  <span style={{fontWeight:600,color:'#854F0B'}}>~R{jobQuote.materialsEstimate.toLocaleString()}</span>
                                                </div>
                                                <div style={{borderTop:'1px solid var(--cream-d)',paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                                                  <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,letterSpacing:.5,color:'var(--charcoal)'}}>Estimated total job cost</span>
                                                  <span style={{fontFamily:'var(--fd)',fontSize:18,color:'var(--charcoal)'}}>~R{(jobQuote.labourAmount+jobQuote.materialsEstimate).toLocaleString()}</span>
                                                </div>
                                              </div>
                                              <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.2)',borderRadius:6,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#854F0B',lineHeight:1.6}}>
                                                💡 You will pay <strong>R{jobQuote.labourAmount.toLocaleString()}</strong> to Lungisa (held in escrow). Buy materials separately — the tradesperson will guide you on what to get.
                                              </div>
                                            </>
                                          ) : (
                                            // ── FLOW B: All-in (tradesperson supplies materials) ────
                                            <>
                                              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                                                {/* Labour box */}
                                                <div style={{background:'var(--white)',borderRadius:8,padding:'12px 14px',border:'1px solid var(--cream-d)'}}>
                                                  <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:4}}>Labour</div>
                                                  <div style={{fontFamily:'var(--fd)',fontSize:24,color:'var(--charcoal)',lineHeight:1}}>R{jobQuote.labourAmount.toLocaleString()}</div>
                                                  <div style={{fontSize:10,color:'var(--charcoal-l)',marginTop:3}}>Included in total</div>
                                                </div>
                                                {/* Materials box */}
                                                <div style={{background:'var(--white)',borderRadius:8,padding:'12px 14px',border:'1px solid var(--cream-d)'}}>
                                                  <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:4}}>Materials</div>
                                                  <div style={{fontFamily:'var(--fd)',fontSize:24,color:'var(--charcoal)',lineHeight:1}}>R{jobQuote.materialsEstimate.toLocaleString()}</div>
                                                  <div style={{fontSize:10,color:'var(--charcoal-l)',marginTop:3}}>Included in total</div>
                                                </div>
                                              </div>
                                              {/* Total escrow box */}
                                              <div style={{background:'rgba(196,89,58,.06)',border:'2px solid rgba(196,89,58,.25)',borderRadius:8,padding:'12px 16px',marginBottom:12}}>
                                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                                                  <div>
                                                    <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--terra-d)',marginBottom:2}}>Total into escrow</div>
                                                    <div style={{fontSize:11,color:'var(--charcoal-l)'}}>Everything included — nothing more to pay</div>
                                                  </div>
                                                  <div style={{fontFamily:'var(--fd)',fontSize:32,color:'var(--terra)'}}>R{(jobQuote.labourAmount+jobQuote.materialsEstimate).toLocaleString()}</div>
                                                </div>
                                                <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#1a6e35',fontWeight:600}}>
                                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                                  Held in escrow · Released only when you confirm job done
                                                </div>
                                              </div>
                                              <div style={{background:'rgba(61,170,106,.06)',border:'1px solid rgba(61,170,106,.15)',borderRadius:6,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#1a6e35',lineHeight:1.6}}>
                                                ✓ All-in price. The tradesperson supplies and pays for materials. You pay one amount — <strong>R{(jobQuote.labourAmount+jobQuote.materialsEstimate).toLocaleString()}</strong> — into escrow.
                                              </div>
                                            </>
                                          )}

                                          {/* Notes */}
                                          {jobQuote.notes&&(
                                            <div style={{background:'var(--white)',borderRadius:8,padding:'10px 12px',border:'1px solid var(--cream-d)',marginBottom:12,fontSize:13,color:'var(--charcoal-l)',lineHeight:1.6}}>
                                              <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:4}}>Tradesperson notes</div>
                                              {jobQuote.notes}
                                            </div>
                                          )}

                                          {/* Accept buttons */}
                                          <div style={{display:'flex',gap:8}}>
                                            <button className="btn btn-green" style={{flex:1,justifyContent:'center'}}
                                              onClick={()=>acceptQuote(selectedJob.id,bid.id,bid.tradespersonId)}>
                                              {jobQuote.materialsCoveredBy==='tradesperson'
                                                ? `✓ Accept all-in — R${(jobQuote.labourAmount+jobQuote.materialsEstimate).toLocaleString()} into escrow`
                                                : `✓ Accept labour quote — R${jobQuote.labourAmount.toLocaleString()} into escrow`}
                                            </button>
                                            <button className="btn btn-ghost" onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>
                                              Use original R{bid.price}
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {/* ── QUOTE REQUESTED — WAITING ── */}
                                      {bidHasQuote&&jobQuote.status==='requested'&&isOpen&&!jobHasAccepted&&(
                                        <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:8,padding:'12px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:10,fontSize:13,color:'var(--charcoal-l)'}}>
                                          <div className="spin-sm"/>
                                          Formal quote requested — waiting for {bid.name.split(' ')[0]} to submit their breakdown...
                                        </div>
                                      )}

                                      {/* ── TRADESPERSON COUNTERED ── */}
                                      {tradeCountered&&!jobHasAccepted&&(
                                        <div style={{background:'rgba(232,160,32,.08)',border:'1px solid rgba(232,160,32,.25)',borderRadius:8,padding:'14px 16px',marginBottom:10}}>
                                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                                            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#E8A020'}}>
                                              💬 {bid.name.split(' ')[0]} countered back
                                            </div>
                                            <div style={{display:'flex',gap:4,alignItems:'center'}}>
                                              {[1,2,3].map(n=>(<div key={n} style={{width:20,height:6,borderRadius:3,background:n<=bid.counterRound?'#E8A020':'rgba(232,160,32,.2)'}}/>))}
                                              <span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,color:'rgba(232,160,32,.7)',letterSpacing:1,marginLeft:4}}>ROUND {bid.counterRound}/3</span>
                                            </div>
                                          </div>
                                          <div style={{fontFamily:'var(--fd)',fontSize:28,color:'var(--charcoal)',marginBottom:4}}>R{bid.counterAmount}</div>
                                          {bid.counterAmount&&bid.counterAmount<bid.price&&(<div style={{fontSize:13,color:'var(--charcoal-l)',marginBottom:12}}>R{bid.price-bid.counterAmount} less than original</div>)}
                                          <div className="bc-actions" style={{marginBottom:10}}>
                                            <button className="btn btn-green" onClick={()=>acceptCounterFromTrade(selectedJob.id,bid.id,bid.counterAmount||bid.price)}>✓ Accept R{bid.counterAmount}</button>
                                            <button className="btn btn-ghost" onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>Accept original R{bid.price}</button>
                                          </div>
                                          {bid.counterRound < 3 ? (
                                            <div style={{borderTop:'1px solid var(--cream-dd)',paddingTop:10}}>
                                              <div style={{fontSize:12,color:'var(--charcoal-l)',marginBottom:6}}>Or counter back ({3-bid.counterRound} round{3-bid.counterRound!==1?'s':''} left):</div>
                                              <div className="counter-row">
                                                <div className="counter-r">R</div>
                                                <input className="counter-in" type="number" placeholder="Your amount" value={counterAmts[bid.id]||''} onChange={e=>setCounterAmts(a=>({...a,[bid.id]:e.target.value}))}/>
                                              </div>
                                              <button className="btn btn-terra" onClick={()=>sendCounter(selectedJob.id,bid.id)}>Send counter</button>
                                            </div>
                                          ) : (
                                            <div style={{borderTop:'1px solid var(--cream-dd)',paddingTop:10,fontSize:12,color:'#E24B4A',fontFamily:'var(--fc)',fontWeight:600}}>⚠ Maximum 3 rounds reached — you must accept or decline.</div>
                                          )}
                                        </div>
                                      )}

                                      {/* ── HOMEOWNER COUNTERED ── */}
                                      {homeownerCountered&&(
                                        <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:8,padding:'12px 14px',lineHeight:1.5}}>
                                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                                            <div style={{fontSize:13,color:'var(--charcoal-l)'}}>⏳ Counter of <strong>R{bid.counterAmount}</strong> sent to {bid.name.split(' ')[0]}</div>
                                            <div style={{display:'flex',gap:4,alignItems:'center'}}>
                                              {[1,2,3].map(n=>(<div key={n} style={{width:16,height:5,borderRadius:3,background:n<=bid.counterRound?'#E8A020':'rgba(232,160,32,.2)'}}/>))}
                                              <span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,color:'rgba(232,160,32,.7)',letterSpacing:1,marginLeft:3}}>{bid.counterRound}/3</span>
                                            </div>
                                          </div>
                                          <button className="btn btn-ghost" style={{fontSize:11,padding:'6px 12px'}} onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>Accept original R{bid.price} instead</button>
                                        </div>
                                      )}

                                      {/* ── OPEN BID — counter / accept / request quote ── */}
                                      {isOpen&&!jobHasAccepted&&!bidHasQuote&&(
                                        <>
                                          {bid.counterRound < 3 ? (
                                            <>
                                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                                                <div style={{fontSize:12,color:'var(--charcoal-l)'}}>Counter-offer or accept as-is:</div>
                                                {bid.counterRound > 0 && (
                                                  <div style={{display:'flex',gap:3,alignItems:'center'}}>
                                                    {[1,2,3].map(n=>(<div key={n} style={{width:14,height:4,borderRadius:2,background:n<=bid.counterRound?'#E8A020':'rgba(196,89,58,.15)'}}/>))}
                                                    <span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,color:'var(--charcoal-l)',letterSpacing:.5,marginLeft:3}}>{bid.counterRound}/3 rounds</span>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="counter-row">
                                                <div className="counter-r">R</div>
                                                <input className="counter-in" type="number" placeholder={String(Math.round(bid.price*0.92))} value={counterAmts[bid.id]||''} onChange={e=>setCounterAmts(a=>({...a,[bid.id]:e.target.value}))}/>
                                              </div>
                                              <div className="bc-actions">
                                                <button className="btn btn-terra" onClick={()=>sendCounter(selectedJob.id,bid.id)}>
                                                  Send counter {bid.counterRound>0?`(${3-bid.counterRound} left)`:''}
                                                </button>
                                                <button className="btn btn-ghost" onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>Accept R{bid.price}</button>
                                              </div>
                                            </>
                                          ) : (
                                            <div style={{background:'rgba(226,75,74,.06)',border:'1px solid rgba(226,75,74,.15)',borderRadius:8,padding:'12px 14px',marginBottom:10}}>
                                              <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'#E24B4A',marginBottom:8}}>⚠ Max counter-offer rounds reached</div>
                                              <div className="bc-actions">
                                                <button className="btn btn-green" onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>✓ Accept R{bid.counterAmount||bid.price}</button>
                                                <button className="btn btn-ghost" onClick={async()=>{ await supabase.from('bids').update({status:'declined'}).eq('id',bid.id); toast('Bid declined','The tradesperson has been notified','#E24B4A'); loadRealJobs(true) }}>✗ Decline</button>
                                              </div>
                                            </div>
                                          )}

                                          {/* ── REQUEST FORMAL QUOTE button ── */}
                                          <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--cream-dd)'}}>
                                            <button
                                              className="btn btn-ghost"
                                              style={{width:'100%',justifyContent:'center',fontSize:11,color:'var(--terra)',borderColor:'rgba(196,89,58,.25)',gap:6,padding:'10px 14px'}}
                                              disabled={requestingQuote[bid.id]}
                                              onClick={()=>requestQuote(selectedJob.id,bid.id,bid.tradespersonId,bid.name)}>
                                              {requestingQuote[bid.id]?(
                                                <><div className="spin-sm"/>Requesting...</>
                                              ):(
                                                <>
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                  Request formal quote (labour + materials)
                                                </>
                                              )}
                                            </button>
                                            <div style={{fontSize:10,color:'var(--charcoal-l)',textAlign:'center',marginTop:5,fontStyle:'italic'}}>
                                              Ask {bid.name.split(' ')[0]} to break down labour vs materials before you accept
                                            </div>
                                          </div>

                                          {counterResp[bid.id]==='sending'&&<div style={{color:'var(--charcoal-l)',fontSize:13,marginTop:8}}>Sending...</div>}
                                          {counterResp[bid.id]==='error'&&<div style={{background:'rgba(196,89,58,.08)',border:'1px solid rgba(196,89,58,.2)',borderRadius:6,padding:'10px 14px',fontSize:13,color:'var(--terra-d)',marginTop:6}}>✗ Failed to send. Please try again.</div>}
                                        </>
                                      )}

                                      {/* ── ACCEPTED → PAY ── */}
                                      {isAccepted&&!isPaid&&(()=>{
                                        const agreedAmount = bid.finalAmount||bid.counterAmount||bid.price
                                        return (
                                          <>
                                            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--green)',marginBottom:10}}>✓ Quote accepted — pay to confirm</div>

                                            {/* Payment breakdown receipt */}
                                            {(() => {
                                              const q = quotes[selectedJob.id]
                                              const isAllIn = q?.materialsCoveredBy === 'tradesperson'
                                              const isLabourOnly = q?.materialsCoveredBy === 'homeowner' && q?.labourAmount > 0
                                              if(isLabourOnly) return (
                                                <div style={{background:'var(--white)',borderRadius:8,border:'1px solid var(--cream-d)',padding:'12px 16px',marginBottom:12}}>
                                                  <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:10}}>Payment summary</div>
                                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                                                    <span style={{color:'var(--charcoal-l)'}}>Labour (Lungisa escrow)</span>
                                                    <span style={{fontWeight:700,color:'var(--terra)'}}>R{q.labourAmount.toLocaleString()}</span>
                                                  </div>
                                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:13}}>
                                                    <span style={{color:'var(--charcoal-l)'}}>Materials (you pay supplier)</span>
                                                    <span style={{fontWeight:700,color:'#854F0B'}}>~R{q.materialsEstimate.toLocaleString()}</span>
                                                  </div>
                                                  <div style={{borderTop:'1px solid var(--cream-d)',paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                                                    <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,color:'var(--charcoal)'}}>Estimated total job</span>
                                                    <span style={{fontFamily:'var(--fd)',fontSize:18,color:'var(--charcoal)'}}>~R{(q.labourAmount+q.materialsEstimate).toLocaleString()}</span>
                                                  </div>
                                                  <div style={{marginTop:8,fontSize:11,color:'#854F0B',background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:6,padding:'6px 10px'}}>
                                                    ⚠ You pay the R{q.materialsEstimate.toLocaleString()} materials cost separately to the supplier — not through Lungisa.
                                                  </div>
                                                </div>
                                              )
                                              if(isAllIn) return (
                                                <div style={{background:'var(--white)',borderRadius:8,border:'1px solid var(--cream-d)',padding:'12px 16px',marginBottom:12}}>
                                                  <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:10}}>Payment summary</div>
                                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                                                    <span style={{color:'var(--charcoal-l)'}}>Labour</span>
                                                    <span style={{color:'var(--charcoal)'}}>R{q.labourAmount.toLocaleString()}</span>
                                                  </div>
                                                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10,fontSize:13}}>
                                                    <span style={{color:'var(--charcoal-l)'}}>Materials (tradesperson supplies)</span>
                                                    <span style={{color:'var(--charcoal)'}}>R{q.materialsEstimate.toLocaleString()}</span>
                                                  </div>
                                                  <div style={{borderTop:'1px solid var(--cream-d)',paddingTop:8,display:'flex',justifyContent:'space-between'}}>
                                                    <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,color:'var(--charcoal)'}}>Total into escrow</span>
                                                    <span style={{fontFamily:'var(--fd)',fontSize:20,color:'var(--terra)'}}>R{agreedAmount.toLocaleString()}</span>
                                                  </div>
                                                  <div style={{marginTop:8,fontSize:11,color:'#1a6e35',background:'rgba(61,170,106,.06)',border:'1px solid rgba(61,170,106,.15)',borderRadius:6,padding:'6px 10px'}}>
                                                    ✓ All-in price. Nothing more to pay after this.
                                                  </div>
                                                </div>
                                              )
                                              // No quote — direct bid acceptance
                                              return (
                                                <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:10}}>
                                                  <div style={{fontFamily:'var(--fd)',fontSize:32,color:'var(--terra)'}}>R{agreedAmount.toLocaleString()}</div>
                                                  {agreedAmount!==bid.price&&(<div style={{fontSize:12,color:'var(--charcoal-l)',textDecoration:'line-through'}}>R{bid.price}</div>)}
                                                  <div style={{fontSize:12,color:'var(--charcoal-l)'}}>agreed amount</div>
                                                </div>
                                              )
                                            })()}
                                            <div className="escrow-note">🔒 Your payment is held in escrow. <strong>{bid.name.split(' ')[0]}</strong> only gets paid once you confirm the job is done.</div>
                                            <div onClick={()=>releasePayment(selectedJob.id,agreedAmount)}
                                              style={{border:'1.5px solid var(--cream-d)',borderRadius:8,padding:'14px',background:'var(--white)',cursor:'pointer',textAlign:'center',transition:'all .18s',marginTop:8}}
                                              onMouseEnter={e=>(e.currentTarget.style.borderColor='#C4593A')}
                                              onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--cream-d)')}>
                                              <div style={{fontFamily:'var(--fc)',fontSize:13,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--charcoal)',marginBottom:3}}>Pay by card</div>
                                              <div style={{fontSize:11,color:'var(--charcoal-l)'}}>Visa · Mastercard · Google Pay</div>
                                              <div style={{marginTop:6,display:'flex',alignItems:'center',justifyContent:'center',gap:4}}>
                                                <span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:600,letterSpacing:1,color:'rgba(44,44,40,.4)'}}>Secured by</span>
                                                <span style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:800,color:'#00B2FF',letterSpacing:.5}}>YOCO</span>
                                              </div>
                                            </div>
                                          </>
                                        )
                                      })()}

                                      {/* ── PAID → JOB IN PROGRESS / COMPLETION ── */}
                                      {isAccepted&&isPaid&&(()=>{
                                        const completion = completions[selectedJob.id]
                                        const agreedAmount = bid.finalAmount||bid.counterAmount||bid.price
                                        if(!completion) return (
                                          <div style={{background:'rgba(61,170,106,.06)',border:'1px solid rgba(61,170,106,.15)',borderRadius:8,padding:'14px 16px',lineHeight:1.5}}>
                                            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--green)',marginBottom:8}}>✓ Payment in escrow — job in progress</div>
                                            <p style={{fontSize:13,color:'var(--charcoal-l)',lineHeight:1.6,margin:0}}><strong>{bid.name.split(' ')[0]}</strong> will mark the job complete with photos when done. You&apos;ll be notified to confirm.</p>
                                          </div>
                                        )
                                        return (
                                          <div style={{background:'rgba(61,170,106,.06)',border:'2px solid rgba(61,170,106,.3)',borderRadius:10,padding:'16px 18px'}}>
                                            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',color:'var(--green)',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                              {bid.name.split(' ')[0]} marked this job complete
                                            </div>
                                            <div style={{background:'var(--white)',borderRadius:8,padding:'12px 14px',marginBottom:12,border:'1px solid var(--cream-d)'}}>
                                              <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:4}}>Date completed</div>
                                              <div style={{fontSize:13,color:'var(--charcoal)',marginBottom:10}}>{new Date(completion.completedAt).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
                                              <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:4}}>What was done</div>
                                              <div style={{fontSize:13,color:'var(--charcoal)',lineHeight:1.6}}>{completion.report}</div>
                                            </div>
                                            {completion.photos.length>0&&(
                                              <div style={{marginBottom:14}}>
                                                <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:8}}>Photos ({completion.photos.length})</div>
                                                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                                                  {completion.photos.map((url,i)=>(
                                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{width:72,height:72,borderRadius:8,overflow:'hidden',display:'block',border:'2px solid rgba(61,170,106,.3)',flexShrink:0}}>
                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                      <img src={url} alt={`Completion photo ${i+1}`} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                                                    </a>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderTop:'1px solid var(--cream-d)',borderBottom:'1px solid var(--cream-d)',marginBottom:14}}>
                                              <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'var(--charcoal-l)'}}>Amount to release</span>
                                              <span style={{fontFamily:'var(--fd)',fontSize:24,color:'var(--terra)'}}>R{agreedAmount.toLocaleString()}</span>
                                            </div>
                                            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8}}>
                                              <button className="btn btn-green" style={{justifyContent:'center'}} onClick={()=>confirmJobComplete(selectedJob.id,bid.id,agreedAmount)}>✓ Confirm job done &amp; release payment</button>
                                              <button className="btn btn-ghost" style={{color:'#E24B4A',borderColor:'rgba(226,75,74,.3)',fontSize:11,padding:'10px 14px',whiteSpace:'nowrap'}} onClick={()=>setDisputeJob(selectedJob.id)}>✗ Raise dispute</button>
                                            </div>
                                          </div>
                                        )
                                      })()}

                                      {/* ── COMPLETION SUBMITTED ── */}
                                      {isAccepted&&isPaid&&completions[selectedJob.id]&&selectedJob.status==='completion_submitted'&&(
                                        <div style={{background:'rgba(232,160,32,.08)',border:'1px solid rgba(232,160,32,.2)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'#E8A020',lineHeight:1.5,marginTop:8}}>
                                          ⏳ Completion submitted — waiting for your confirmation to release R{Math.round((bid.finalAmount||bid.price)*0.92).toLocaleString()}.
                                        </div>
                                      )}

                                      {/* ── DECLINED ── */}
                                      {isDeclined&&(<div style={{background:'rgba(226,75,74,.06)',border:'1px solid rgba(226,75,74,.15)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'rgba(226,75,74,.7)',lineHeight:1.5}}>✗ Not accepted this time.</div>)}
                                    </div>
                                  )
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      ):(
                        <div style={{background:'var(--white)',borderRadius:12,border:'1.5px solid var(--cream-d)',padding:40,textAlign:'center',color:'var(--charcoal-l)'}}>
                          <div style={{fontSize:32,marginBottom:12}}>👆</div>
                          <p style={{fontSize:14}}>Select a job to see its bids</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── EXPIRED JOBS ──────────────────────────────────── */}
            {expiredJobs.length>0&&(
              <div style={{marginTop:28}}>
                <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                  <span style={{width:12,height:2,background:'var(--cream-dd)',display:'inline-block'}}/>
                  Expired jobs — not receiving bids
                </div>
                {expiredJobs.map(job=>(
                  <div key={job.id} className="expired-card">
                    <div style={{width:38,height:38,borderRadius:10,background:'rgba(0,0,0,.05)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>{job.emoji}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:'var(--fc)',fontSize:14,fontWeight:700,color:'var(--charcoal)',marginBottom:2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{job.title}</div>
                      <div style={{fontSize:12,color:'var(--charcoal-l)'}}>📍 {job.area} · Expired {job.expiresAt?new Date(job.expiresAt).toLocaleDateString('en-ZA',{day:'numeric',month:'short'}):''}</div>
                    </div>
                    <button
                      onClick={()=>repostJob(job)}
                      style={{flexShrink:0,background:'transparent',border:'1.5px solid var(--cream-dd)',borderRadius:6,padding:'7px 14px',fontFamily:'var(--fc)',fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:'var(--charcoal-l)',cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap'}}
                      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='var(--terra)';(e.currentTarget as HTMLButtonElement).style.color='var(--terra)'}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='var(--cream-dd)';(e.currentTarget as HTMLButtonElement).style.color='var(--charcoal-l)'}}>
                      ↻ Re-post
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ── HISTORY ─────────────────────────────────────────── */}
            {tab==='history'&&(
              <>
                {historyJobs.length>0&&(
                  <div style={{background:'var(--white)',borderRadius:10,border:'1px solid var(--cream-d)',padding:'20px 24px',marginBottom:20,display:'flex',gap:32}}>
                    {[{label:'Total spent',val:`R${totalSpent.toLocaleString()}`},{label:'Jobs completed',val:String(historyJobs.length)},{label:'Avg job value',val:historyJobs.length>0?`R${Math.round(totalSpent/historyJobs.length).toLocaleString()}`:'—'}].map(s=>(
                      <div key={s.label}>
                        <div style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:6}}>{s.label}</div>
                        <div style={{fontFamily:'var(--fd)',fontSize:28,color:'var(--terra)'}}>{s.val}</div>
                      </div>
                    ))}
                  </div>
                )}
                {historyJobs.length===0?(
                  <div className="empty-state">
                    <div style={{fontSize:48,marginBottom:16}}>📋</div>
                    <div style={{fontFamily:'var(--fd)',fontSize:32,color:'var(--charcoal)',marginBottom:8,letterSpacing:1}}>No completed jobs yet</div>
                    <p style={{fontSize:15,maxWidth:400,margin:'0 auto',lineHeight:1.6}}>Your completed jobs and payment history will appear here.</p>
                  </div>
                ):historyJobs.map(j=>(
                  <div key={j.id} className="hist-row">
                    <div className="hist-ico">{j.emoji}</div>
                    <div style={{flex:1}}>
                      <div className="hist-title">{j.title}</div>
                      <div className="hist-meta">{j.area} · {j.tradesperson}</div>
                      <div style={{marginTop:5,display:'flex',alignItems:'center',gap:8}}>
                        {j.status==='completed'&&(<span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:'rgba(61,170,106,.1)',border:'1px solid rgba(61,170,106,.2)',color:'#1a6e35',padding:'2px 8px',borderRadius:3}}>✓ Completed</span>)}
                        {j.status==='in_progress'&&(<span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:'rgba(46,127,212,.1)',border:'1px solid rgba(46,127,212,.2)',color:'#1a4e8e',padding:'2px 8px',borderRadius:3}}>⚙ In progress</span>)}
                        {j.status==='completion_submitted'&&(<span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:'rgba(232,160,32,.1)',border:'1px solid rgba(232,160,32,.2)',color:'#b87a00',padding:'2px 8px',borderRadius:3}}>⏳ Awaiting confirmation</span>)}
                        {j.status==='disputed'&&(<span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:700,letterSpacing:1,textTransform:'uppercase',background:'rgba(226,75,74,.1)',border:'1px solid rgba(226,75,74,.2)',color:'#c0392b',padding:'2px 8px',borderRadius:3}}>⚠ Disputed</span>)}
                        {j.status==='completed'&&(j.rating>0?(
                          <span style={{color:'#E8A020',fontSize:13}}>{'★'.repeat(j.rating)}{'☆'.repeat(5-j.rating)}</span>
                        ):(
                          <span onClick={()=>{setReviewJob(j.id);setReviewTradespersonId(j.tradespersonId);setRating(5);setReviewText('')}} style={{fontSize:12,color:'var(--terra)',fontFamily:'var(--fc)',fontWeight:600,letterSpacing:.5,cursor:'pointer',textDecoration:'underline'}}>⭐ Leave a review</span>
                        ))}
                        {j.status==='completion_submitted'&&(<span onClick={()=>{setSelectedJob(jobs.find(x=>x.id===j.id)||null);setTab('active')}} style={{fontSize:12,color:'var(--terra)',fontFamily:'var(--fc)',fontWeight:600,letterSpacing:.5,cursor:'pointer',textDecoration:'underline'}}>→ Review &amp; confirm</span>)}
                      </div>
                    </div>
                    <div>
                      <div className="hist-price">R{j.price.toLocaleString()}</div>
                      <div className="hist-date">{j.date}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* ── MESSAGES ────────────────────────────────────────── */}
            {tab==='messages'&&(
              <div style={{height:'calc(100vh - 120px)',minHeight:500}}>
                <Messaging theme="light" />
              </div>
            )}

            {/* ── PROFILE ─────────────────────────────────────────── */}
            {tab==='profile'&&(
              <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--cream-d)',padding:32,maxWidth:560}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:20,borderBottom:'1px solid var(--cream-d)'}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:'var(--terra)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--fd)',fontSize:28,color:'#fff'}}>{displayInitials}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'var(--fd)',fontSize:28,letterSpacing:1,color:'var(--charcoal)',lineHeight:1}}>{(profile?.full_name||'').toUpperCase()}</div>
                    <div style={{fontSize:13,color:'var(--charcoal-l)',marginTop:4}}>Homeowner · {profile?.area||'Johannesburg'}</div>
                    <div style={{fontSize:13,color:'var(--terra)',marginTop:3}}>Member since {profile?.created_at?new Date(profile.created_at).toLocaleDateString('en-ZA',{month:'long',year:'numeric'}):'—'}</div>
                  </div>
                  <button onClick={()=>setEditingProfile((e:boolean)=>!e)} style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',background:editingProfile?'rgba(226,75,74,.08)':'rgba(196,89,58,.08)',color:editingProfile?'#E24B4A':'var(--terra)',border:`1px solid ${editingProfile?'rgba(226,75,74,.2)':'rgba(196,89,58,.2)'}`,padding:'7px 14px',borderRadius:6,cursor:'pointer'}}>
                    {editingProfile?'✕ Cancel':'✎ Edit'}
                  </button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
                  {[{label:'Jobs posted',val:String(jobs.length)},{label:'Jobs completed',val:String(historyJobs.length)}].map(s=>(
                    <div key={s.label} style={{background:'var(--cream)',borderRadius:8,padding:'12px 16px',textAlign:'center'}}>
                      <div style={{fontFamily:'var(--fd)',fontSize:28,color:'var(--terra)',letterSpacing:1}}>{s.val}</div>
                      <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginTop:4}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {editingProfile?(
                  <div>
                    {[{label:'Full name *',key:'full_name',type:'text',placeholder:'Your full name'},{label:'Phone number',key:'phone',type:'tel',placeholder:'e.g. 0821234567'}].map((f:any)=>(
                      <div key={f.key} style={{marginBottom:14}}>
                        <label style={{display:'block',fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:6}}>{f.label}</label>
                        <input type={f.type} value={(profileForm as any)[f.key]} onChange={e=>setProfileForm((p:any)=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={{width:'100%',border:'1.5px solid var(--cream-d)',borderRadius:8,padding:'11px 14px',fontFamily:'var(--fb)',fontSize:14,color:'var(--charcoal)',outline:'none',background:'#fff'}}/>
                      </div>
                    ))}
                    <div style={{marginBottom:20}}>
                      <label style={{display:'block',fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:6}}>Area</label>
                      <select value={profileForm.area} onChange={e=>setProfileForm((p:any)=>({...p,area:e.target.value}))} style={{width:'100%',border:'1.5px solid var(--cream-d)',borderRadius:8,padding:'11px 14px',fontFamily:'var(--fb)',fontSize:14,color:'var(--charcoal)',outline:'none',background:'#fff'}}>
                        <option value="">Select your area</option>
                        {AREAS.map((a:string)=><option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    {profileMsg&&(<div style={{padding:'10px 14px',borderRadius:6,fontSize:13,marginBottom:14,background:profileMsg.startsWith('✓')?'rgba(61,170,106,.08)':'rgba(226,75,74,.08)',color:profileMsg.startsWith('✓')?'#3DAA6A':'#E24B4A',border:`1px solid ${profileMsg.startsWith('✓')?'rgba(61,170,106,.2)':'rgba(226,75,74,.2)'}`}}>{profileMsg}</div>)}
                    <button onClick={saveProfile} disabled={savingProfile} style={{width:'100%',background:'var(--terra)',color:'#fff',border:'none',padding:'13px',borderRadius:8,fontFamily:'var(--fc)',fontSize:13,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',cursor:savingProfile?'not-allowed':'pointer',opacity:savingProfile?.6:1}}>{savingProfile?'Saving...':'Save changes'}</button>
                  </div>
                ):(
                  <div>
                    {[{label:'Email',val:profile?.email||'—'},{label:'Phone',val:profile?.phone||'—'},{label:'Area',val:profile?.area||'—'}].map((r:any)=>(
                      <div key={r.label} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--cream-d)'}}>
                        <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)'}}>{r.label}</span>
                        <span style={{fontSize:14,color:'var(--charcoal)',fontWeight:500}}>{r.val}</span>
                      </div>
                    ))}
                    <div style={{marginTop:16,fontSize:12,color:'var(--charcoal-l)',textAlign:'center'}}>Click <strong>✎ Edit</strong> to update your details</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── QUOTE REQUEST MODAL ──────────────────────────────────── */}
      {quoteModal&&(
        <div className="quote-modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setQuoteModal(null)}}>
          <div className="quote-modal">
            <div className="quote-modal-head">
              <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'rgba(245,240,232,.4)',marginBottom:6}}>
                Request formal quote
              </div>
              <div style={{fontFamily:'var(--fd)',fontSize:26,letterSpacing:1,color:'#F5F0E8',lineHeight:1,marginBottom:4}}>
                {quoteModal.tradespersonName.split(' ')[0].toUpperCase()}
              </div>
              <div style={{fontSize:13,color:'rgba(245,240,232,.45)'}}>
                One quick question before we send the request
              </div>
            </div>
            <div className="quote-modal-body">
              <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:14}}>
                Who will cover materials?
              </div>

              <div className={`materials-opt${quoteMaterialsBy==='homeowner'?' selected':''}`}
                onClick={()=>setQuoteMaterialsBy('homeowner')}>
                <div className="materials-opt-radio"/>
                <div>
                  <div className="materials-opt-title">🏪 I&apos;ll buy materials myself</div>
                  <div className="materials-opt-sub">
                    Tradesperson quotes <strong>labour only</strong>. You buy materials separately from the hardware store. Labour amount goes into escrow.
                  </div>
                </div>
              </div>

              <div className={`materials-opt${quoteMaterialsBy==='tradesperson'?' selected':''}`}
                onClick={()=>setQuoteMaterialsBy('tradesperson')}>
                <div className="materials-opt-radio"/>
                <div>
                  <div className="materials-opt-title">📦 Tradesperson supplies everything</div>
                  <div className="materials-opt-sub">
                    Tradesperson quotes an <strong>all-in price</strong> including materials. Full amount goes into escrow.
                  </div>
                </div>
              </div>

              <div style={{marginTop:16,marginBottom:16}}>
                <label style={{display:'block',fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:6}}>
                  Scope notes <span style={{fontWeight:400,fontSize:10,textTransform:'none',letterSpacing:0,color:'var(--sand)'}}>optional</span>
                </label>
                <textarea
                  value={quoteNotes}
                  onChange={e=>setQuoteNotes(e.target.value)}
                  placeholder="Any specific details for the tradesperson to know before quoting..."
                  style={{width:'100%',border:'1.5px solid var(--cream-d)',borderRadius:8,padding:'10px 14px',fontFamily:'var(--fb)',fontSize:14,color:'var(--charcoal)',outline:'none',resize:'none',height:70,lineHeight:1.55}}
                />
              </div>

              <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--charcoal-l)',lineHeight:1.6,marginBottom:16}}>
                💡 {quoteMaterialsBy==='homeowner'
                  ? 'Labour is the key differentiator. You can compare labour quotes from multiple tradespeople — materials cost is the same regardless of who you choose.'
                  : 'An all-in quote covers everything. The full amount will be held in escrow until you confirm the job is done.'}
              </div>

              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-terra" style={{flex:1,justifyContent:'center'}} onClick={sendQuoteRequest}>
                  Send quote request →
                </button>
                <button className="btn btn-ghost" onClick={()=>setQuoteModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ────────────────────────────────────────────── */}
      {reviewJob&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setReviewJob(null);setReviewTradespersonId('')}}}>
          <div className="modal">
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(61,170,106,.12)',border:'2px solid rgba(61,170,106,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:24}}>✓</div>
              <div className="modal-title">LEAVE A REVIEW</div>
              <p className="modal-sub" style={{marginBottom:0}}>Your review helps other homeowners and rewards great tradespeople.</p>
            </div>
            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:10}}>Your rating</div>
            <div style={{display:'flex',gap:6,marginBottom:6,justifyContent:'center'}}>
              {[1,2,3,4,5].map(n=>(
                <span key={n} onClick={()=>setRating(n)}
                  style={{color:n<=rating?'#E8A020':'var(--cream-dd)',fontSize:36,cursor:'pointer',transition:'transform .1s',display:'inline-block'}}
                  onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.2)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>★</span>
              ))}
            </div>
            <div style={{textAlign:'center',fontFamily:'var(--fc)',fontSize:13,fontWeight:700,letterSpacing:.5,marginBottom:20,color:rating>=4?'#3DAA6A':rating===3?'#E8A020':'#E24B4A'}}>
              {rating===5?'Excellent — highly recommend!':rating===4?'Good — would use again':rating===3?'Average — job got done':rating===2?'Below expectations':'Poor — would not recommend'}
            </div>
            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:8}}>Comments <span style={{fontWeight:400,fontSize:10,textTransform:'none',letterSpacing:0,color:'var(--sand)'}}>optional</span></div>
            <textarea className="review-ta" placeholder="E.g. Arrived on time, fixed the pipe quickly, very professional..." value={reviewText} onChange={e=>setReviewText(e.target.value)} maxLength={300}/>
            <div style={{fontSize:11,color:'var(--sand)',textAlign:'right',marginBottom:16}}>{300-reviewText.length} chars left</div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-terra" style={{flex:1,justifyContent:'center'}} onClick={submitReview}>⭐ Submit review</button>
              <button className="btn btn-ghost" onClick={()=>{setReviewJob(null);setReviewTradespersonId('')}}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DISPUTE MODAL ───────────────────────────────────────────── */}
      {disputeJob&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget){setDisputeJob(null);setDisputeReason('')}}}>
          <div className="modal">
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(226,75,74,.1)',border:'1px solid rgba(226,75,74,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>⚠</div>
              <div>
                <div className="modal-title" style={{fontSize:26,marginBottom:2}}>RAISE A DISPUTE</div>
                <div style={{fontSize:13,color:'var(--charcoal-l)'}}>Tell us what wasn&apos;t done or wasn&apos;t done correctly.</div>
              </div>
            </div>
            <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--charcoal-l)',lineHeight:1.6,marginBottom:16}}>
              📋 <strong>What happens next:</strong> The Lungisa team will review within 24 hours. Payment stays in escrow until resolved.
            </div>
            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:8}}>What was the issue? *</div>
            <textarea className="review-ta" style={{height:100,marginBottom:4}} placeholder="E.g. The pipe was patched but is still leaking..." value={disputeReason} onChange={e=>setDisputeReason(e.target.value)}/>
            <div style={{fontSize:11,color:'var(--charcoal-l)',marginBottom:16}}>Be specific — this helps us resolve faster.</div>
            <div style={{display:'flex',gap:10}}>
              <button className="btn" style={{flex:1,justifyContent:'center',background:submittingDispute?'rgba(226,75,74,.4)':'#E24B4A',color:'#fff',border:'none',cursor:submittingDispute?'not-allowed':'pointer'}} onClick={()=>raiseDispute(disputeJob!)} disabled={submittingDispute||!disputeReason.trim()}>
                {submittingDispute?'Submitting...':'Submit dispute'}
              </button>
              <button className="btn btn-ghost" onClick={()=>{setDisputeJob(null);setDisputeReason('')}}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE NAV ──────────────────────────────────────────────── */}
      <nav className="mobile-nav">
        {[
          {id:'active', icon:'🏠',label:'Jobs',    badge:activeJobs.filter(j=>j.bids.length>0).length},
          {id:'messages',icon:'💬',label:'Messages',badge:0},
          {id:'history', icon:'📋',label:'History', badge:0},
          {id:'profile', icon:'👤',label:'Profile', badge:0},
        ].map(item=>(
          <div key={item.id} onClick={()=>setTab(item.id as Tab)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:3,cursor:'pointer',position:'relative',color:tab===item.id?'var(--terra-l)':'rgba(245,240,232,.4)',transition:'color .15s'}}>
            {item.badge>0&&(<div style={{position:'absolute',top:6,right:'25%',width:16,height:16,borderRadius:'50%',background:'var(--terra)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--fc)',fontSize:9,fontWeight:700,color:'#fff'}}>{item.badge}</div>)}
            <span style={{fontSize:20}}>{item.icon}</span>
            <span style={{fontFamily:'var(--fc)',fontSize:9,fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{item.label}</span>
            {tab===item.id&&<div style={{position:'absolute',top:0,left:'25%',right:'25%',height:2,background:'var(--terra)',borderRadius:1}}/>}
          </div>
        ))}
      </nav>

      {/* ── TOASTS ──────────────────────────────────────────────────── */}
      <div className="toast-stack">
        {toasts.map(t=>(
          <div key={t.id} className="toast-item">
            <div style={{width:8,height:8,borderRadius:'50%',background:t.color,flexShrink:0}}/>
            <div style={{fontFamily:'var(--fc)',fontSize:12,fontWeight:700,color:'var(--cream)'}}>{t.msg}</div>
          </div>
        ))}
      </div>
    </>
  )
}