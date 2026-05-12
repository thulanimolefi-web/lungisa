'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Tab = 'active' | 'history' | 'profile'

type BidData = {
  id: string
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
  bids: BidData[]
}

type HistoryJob = {
  id: string
  title: string
  category: string
  emoji: string
  area: string
  tradesperson: string
  price: number
  rating: number
  date: string
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
  const [acceptedBid, setAcceptedBid] = useState<Record<string,string>>({})
  const [paidJobs, setPaidJobs]     = useState<Record<string,boolean>>({})
  const [reviewJob, setReviewJob]   = useState<string|null>(null)
  const [rating, setRating]         = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [toasts, setToasts]         = useState<{id:number,msg:string,color:string}[]>([])
  const [profile, setProfile]       = useState<any>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(()=>{
    loadProfile()
    loadRealJobs()
    loadHistoryJobs()

    const channel = supabase
      .channel('home-bids')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bids'},()=>{
        loadRealJobs()
        toast('New bid received!','A tradesperson just bid on your job 🎉','#E8A020')
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'bids'},()=>{
        loadRealJobs()
      })
      .subscribe()

    return ()=>{ supabase.removeChannel(channel) }
  },[])

  async function loadProfile() {
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      if(session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id',session.user.id).single()
        if(data) setProfile(data)
      }
    } catch(e){ console.log('Profile error:',e) }
  }

  async function loadRealJobs() {
    setLoading(true)
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      if(!session?.user) { setLoading(false); return }

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          bids(
            id, amount, eta_label, note, status, created_at,
            profiles!tradesperson_id(
              full_name, avatar_url,
              tradesperson_profiles(trade_category, years_experience, rating_avg, jobs_completed)
            )
          )
        `)
        .eq('homeowner_id', session.user.id)
        .in('status',['open','bidding','accepted','in_progress'])
        .order('created_at',{ascending:false})

      if(!error && data) {
        const mapped: JobData[] = data.map((j:any,ji:number)=>({
          id:       j.id,
          title:    j.title,
          category: j.category.charAt(0).toUpperCase()+j.category.slice(1),
          emoji:    getCatEmoji(j.category),
          area:     `${j.area}, JHB`,
          urgency:  getUrgencyLabel(j.urgency),
          urgColor: getUrgencyColor(j.urgency),
          budget:   j.budget_max||0,
          status:   j.status,
          posted:   getTimeAgo(j.created_at),
          bids:     (j.bids||[]).map((b:any,bi:number)=>({
            id:        b.id,
            name:      b.profiles?.full_name||'Tradesperson',
            init:      (b.profiles?.full_name||'T').split(' ').map((n:string)=>n[0]).join('').substring(0,2).toUpperCase(),
            bg:        AVATAR_COLORS[(ji+bi)%AVATAR_COLORS.length],
            trade:     `${(b.profiles?.tradesperson_profiles?.trade_category||'tradesperson').charAt(0).toUpperCase()+(b.profiles?.tradesperson_profiles?.trade_category||'tradesperson').slice(1)} · ${b.profiles?.tradesperson_profiles?.years_experience||0} yrs`,
            rating:    '★★★★★',
            ratingNum: String(b.profiles?.tradesperson_profiles?.rating_avg||'New'),
            jobs:      b.profiles?.tradesperson_profiles?.jobs_completed||0,
            price:     b.amount,
            eta:       b.eta_label,
            status:    b.status,
            counterAmount: b.counter_amount||null,
            counterBy:     b.counter_by||null,
          }))
        }))
        setJobs(mapped)
        if(mapped.length>0&&!selectedJob) setSelectedJob(mapped[0])
      }
    } catch(e){ console.log('Load jobs error:',e) }
    setLoading(false)
  }

  async function loadHistoryJobs() {
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      if(!session?.user) return
      const { data, error } = await supabase
        .from('jobs')
        .select(`*, bids!inner(amount, profiles!tradesperson_id(full_name))`)
        .eq('homeowner_id', session.user.id)
        .eq('status','completed')
        .order('updated_at',{ascending:false})
      if(!error && data) {
        const mapped: HistoryJob[] = data.map((j:any)=>({
          id:          j.id,
          title:       j.title,
          category:    j.category,
          emoji:       getCatEmoji(j.category),
          area:        j.area,
          tradesperson:j.bids?.[0]?.profiles?.full_name||'Tradesperson',
          price:       j.bids?.[0]?.amount||0,
          rating:      5,
          date:        new Date(j.updated_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}),
        }))
        setHistoryJobs(mapped)
      }
    } catch(e){ console.log('History error:',e) }
  }

  function toast(msg:string,sub:string,color:string){
    const id=Date.now()
    setToasts(t=>[...t,{id,msg,color}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4500)
  }

  async function sendCounter(jobId:string, bidId:string, originalPrice:number){
    const amt = counterAmts[bidId]
    if(!amt||parseInt(amt)<1) return
    setCounterResp(r=>({...r,[bidId]:'sending'}))
    try {
      const { error } = await supabase.from('bids').update({
        counter_amount:  parseInt(amt),
        counter_by:      'homeowner',
        counter_message: `Homeowner counter-offered R${amt}`,
        status:          'countered',
      }).eq('id', bidId)
      if(error){ console.log('Counter error:', error); setCounterResp(r=>({...r,[bidId]:'error'})); return }
      setCounterResp(r=>({...r,[bidId]:'sent'}))
      // Email tradesperson
      const { data:{ session } } = await supabase.auth.getSession()
      const bid = jobs.find(j=>j.id===jobId)?.bids.find(b=>b.id===bidId)
      fetch('/api/send-email', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          type:           'counter_offer',
          bidId,
          counterAmount:  parseInt(amt),
          counterBy:      'homeowner',
          jobTitle:       jobs.find(j=>j.id===jobId)?.title||'Job',
          homeownerId:    session?.user?.id,
          tradespersonId: bidId,
        })
      }).catch(e=>console.log('Email error:',e))
      toast('Counter sent!',`Waiting for ${jobs.find(j=>j.id===jobId)?.bids.find(b=>b.id===bidId)?.name.split(' ')[0]} to respond`,'#E8A020')
    } catch(e){
      console.log('Counter error:', e)
      setCounterResp(r=>({...r,[bidId]:'error'}))
    }
  }

  async function acceptCounterFromTrade(jobId:string, bidId:string, amount:number, name:string){
    try {
      await supabase.from('bids').update({ status:'accepted', final_amount:amount }).eq('id', bidId)
      await supabase.from('bids').update({ status:'declined' }).eq('job_id', jobId).neq('id', bidId)
      await supabase.from('jobs').update({ status:'accepted' }).eq('id', jobId)
    } catch(e){ console.log('Accept counter error:', e) }
    setAcceptedBid(a=>({...a,[jobId]:bidId}))
    setJobs(j=>j.map(job=>job.id===jobId?{...job,status:'accepted'}:job))
    toast('Counter accepted!',`R${amount} agreed with ${name.split(' ')[0]} · Pay to confirm`,'#3DAA6A')
  }

  async function acceptBid(jobId:string, bidId:string, bidName:string){
    try {
      await supabase.from('bids').update({ status:'accepted' }).eq('id', bidId)
      await supabase.from('bids').update({ status:'declined' }).eq('job_id', jobId).neq('id', bidId)
      await supabase.from('jobs').update({ status:'accepted' }).eq('id', jobId)
      // Email tradesperson
      const { data:{ session } } = await supabase.auth.getSession()
      const bid = jobs.find(j=>j.id===jobId)?.bids.find(b=>b.id===bidId)
      fetch('/api/send-email', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          type:            'bid_accepted',
          bidId,
          amount:          bid?.price||0,
          jobTitle:        jobs.find(j=>j.id===jobId)?.title||'Job',
          tradespersonId:  bidId,
        })
      }).catch(e=>console.log('Email error:',e))
    } catch(e){ console.log('Accept bid error:', e) }
    setAcceptedBid(a=>({...a,[jobId]:bidId}))
    setJobs(j=>j.map(job=>job.id===jobId?{...job,status:'accepted'}:job))
    toast('Bid accepted!',`${bidName.split(' ')[0]} is on the way · Pay to confirm`,'#3DAA6A')
  }

  async function releasePayment(jobId:string, amount:number){
    const yoco = new (window as any).YocoSDK({
      publicKey: process.env.NEXT_PUBLIC_YOCO_PUBLIC_KEY||'pk_test_c70ac83fqWJLLjJdfd54',
    })
    yoco.showPopup({
      amountInCents: amount*100,
      currency: 'ZAR',
      name: 'Lungisa',
      description: `Payment for: ${jobs.find(j=>j.id===jobId)?.title}`,
      callback: async (result:any)=>{
        if(result.error){ toast('Payment failed',result.error.message,'#E24B4A'); return }
        try {
          await supabase.from('jobs').update({ status:'completed' }).eq('id', jobId)
          const bidId = acceptedBid[jobId]
          if(bidId) await supabase.from('bids').update({ status:'completed' }).eq('id', bidId)
          // Email both parties
          const { data:{ session } } = await supabase.auth.getSession()
          const job = jobs.find(j=>j.id===jobId)
          const bid = job?.bids.find(b=>b.id===bidId)
          fetch('/api/send-email', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              type:            'payment_confirmed',
              jobId,
              amount,
              homeownerId:     session?.user?.id,
              tradespersonId:  bidId,
            })
          }).catch(e=>console.log('Email error:',e))
        } catch(e){ console.log('Payment update error:', e) }
        setPaidJobs(p=>({...p,[jobId]:true}))
        setJobs(j=>j.map(job=>job.id===jobId?{...job,status:'completed'}:job))
        toast('Payment successful!','Job confirmed 🎉','#3DAA6A')
        setReviewJob(jobId)
        loadHistoryJobs()
      }
    })
  }

  async function submitReview(){
    try {
      const { data:{ session } } = await supabase.auth.getSession()
      if(session?.user && reviewJob) {
        const bidId = acceptedBid[reviewJob]
        const job = jobs.find(j=>j.id===reviewJob)
        const bid = job?.bids.find(b=>b.id===bidId)
        if(bid) {
          await supabase.from('reviews').insert({
            job_id:      reviewJob,
            reviewer_id: session.user.id,
            reviewee_id: bidId,
            rating,
            comment:     reviewText||null,
          })
        }
      }
    } catch(e){ console.log('Review error:', e) }
    setReviewJob(null)
    toast('Review submitted!','Thank you for your feedback','#C4593A')
  }

  const activeJobs  = jobs.filter(j=>j.status!=='completed')
  const allBids     = activeJobs.flatMap(j=>j.bids)
  const avgBidPrice = allBids.length>0 ? Math.round(allBids.reduce((s,b)=>s+b.price,0)/allBids.length) : 0
  const totalSpent  = historyJobs.reduce((s,j)=>s+j.price,0)
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
    .counter-resp{font-size:13px;padding:10px 14px;border-radius:6px;margin-top:6px;line-height:1.5}
    .resp-ok{background:rgba(61,170,106,.1);border:1px solid rgba(61,170,106,.2);color:#1a6e35}
    .resp-no{background:rgba(196,89,58,.08);border:1px solid rgba(196,89,58,.2);color:var(--terra-d)}
    .escrow-note{background:rgba(61,170,106,.08);border:1px solid rgba(61,170,106,.2);border-radius:8px;padding:14px 16px;font-size:13px;color:var(--charcoal-l);display:flex;align-items:flex-start;gap:10px;line-height:1.6;margin:16px 0}
    .pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .pay-btn{border:1.5px solid var(--cream-d);border-radius:8px;padding:14px;background:var(--white);cursor:pointer;text-align:center;transition:all .18s}
    .pay-btn:hover{border-color:var(--terra);background:rgba(196,89,58,.02)}
    .pay-lbl{font-family:var(--fc);font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--charcoal)}
    .pay-sub{font-size:11px;color:var(--charcoal-l);margin-top:2px}
    .empty-state{text-align:center;padding:80px 20px;color:var(--charcoal-l)}
    .hist-row{background:var(--white);border-radius:10px;border:1px solid var(--cream-d);padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px}
    .hist-ico{width:40px;height:40px;border-radius:10px;background:rgba(196,89,58,.1);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .hist-title{font-family:var(--fc);font-size:15px;font-weight:700;color:var(--charcoal);margin-bottom:2px}
    .hist-meta{font-size:12px;color:var(--charcoal-l)}
    .hist-price{font-family:var(--fd);font-size:22px;color:var(--terra);text-align:right}
    .hist-date{font-size:11px;color:var(--charcoal-l);text-align:right;margin-top:2px}
    .stars-row{display:flex;gap:6px;margin-bottom:16px}
    .star{font-size:28px;cursor:pointer;transition:transform .1s}
    .star:hover{transform:scale(1.2)}
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
    .spin{display:inline-block;width:20px;height:20px;border:2px solid var(--cream-d);border-top-color:var(--terra);border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    @media(max-width:900px){.sidenav{display:none}.stat-strip{grid-template-columns:1fr 1fr}.content{padding:20px 16px}.topbar{padding:0 16px}}
  `

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
              {id:'active', icon:'🏠', label:'Active Jobs', badge:activeJobs.filter(j=>j.bids.length>0).length},
              {id:'history',icon:'📋',label:'Job History', badge:historyJobs.length},
              {id:'profile',icon:'👤',label:'My Profile'},
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
            <span className="page-title">{tab==='active'?'ACTIVE JOBS':tab==='history'?'JOB HISTORY':'MY PROFILE'}</span>
            <button className="post-btn" onClick={()=>router.push('/post')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Post a Job
            </button>
          </div>

          <div className="content">

            {/* ACTIVE JOBS */}
            {tab==='active'&&(
              <>
                <div className="stat-strip">
                  {[
                    {eye:'Active jobs',   val:String(activeJobs.length),                              cls:'terra', delta:activeJobs.length>0?`${activeJobs.filter(j=>j.bids.length>0).length} receiving bids`:'Post your first job'},
                    {eye:'Total bids',    val:String(allBids.length),                                 cls:'',      delta:allBids.length>0?'Across all your jobs':'No bids yet'},
                    {eye:'Avg bid price', val:avgBidPrice>0?`R${avgBidPrice.toLocaleString()}`:'—',   cls:'green', delta:avgBidPrice>0?'Current average':'No bids yet'},
                    {eye:'Jobs completed',val:String(historyJobs.length),                             cls:'',      delta:historyJobs.length>0?`R${totalSpent.toLocaleString()} total spent`:'Complete your first job'},
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
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>
                    <div>
                      <div className="sec-hdr"><div className="sec-title">Your jobs</div></div>
                      {activeJobs.map(job=>(
                        <div key={job.id} className={`job-card ${selectedJob?.id===job.id?'selected':''}`} onClick={()=>setSelectedJob(job)}>
                          <div className="jc-top">
                            <div className="jc-urg" style={{background:job.urgColor}}/>
                            <div style={{flex:1,minWidth:0}}>
                              <div className="jc-cat">{job.emoji} {job.category}</div>
                              <div className="jc-title">{job.title}</div>
                              <div className="jc-meta">📍 {job.area} · Posted {job.posted}</div>
                            </div>
                            <div>
                              <div style={{fontFamily:'var(--fc)',fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',padding:'4px 10px',borderRadius:4,background:job.bids.length>0?'rgba(196,89,58,.1)':'rgba(0,0,0,.06)',color:job.bids.length>0?'var(--terra-d)':'var(--charcoal-l)'}}>
                                {job.bids.length>0?`${job.bids.length} bids`:'Waiting'}
                              </div>
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
                                {selectedJob.bids.map((bid,i)=>{
                                  const isAccepted=acceptedBid[selectedJob.id]===bid.id
                                  const isPaid=paidJobs[selectedJob.id]
                                  const resp=counterResp[bid.id]
                                  const isCounted = bid.status==='countered' && bid.counterBy==='homeowner'
                                  const tradeCountered = bid.status==='countered' && bid.counterBy==='tradesperson'
                                  return (
                                    <div key={bid.id} className={`bid-card ${isAccepted?'accepted':''}`}>
                                      <div className="bc-top">
                                        <div className="bc-ava" style={{background:bid.bg,cursor:'pointer'}} onClick={()=>router.push(`/tradesperson/${bid.id}`)}>{bid.init}</div>
                                        <div style={{flex:1}}>
                                          <div className="bc-name" style={{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--cream-dd)'}} onClick={()=>router.push(`/tradesperson/${bid.id}`)}>{bid.name}</div>
                                          <div className="bc-trade">{bid.trade}</div>
                                          <div className="bc-stars">★★★★★ <span style={{color:'var(--charcoal-l)',fontSize:11}}>{bid.ratingNum} · {bid.jobs} jobs</span></div>
                                        </div>
                                        <div>
                                          <div className="bc-price">R{bid.price}</div>
                                          <div className="bc-eta">ETA: {bid.eta}</div>
                                        </div>
                                      </div>

                                      {/* Tradesperson countered back */}
                                      {tradeCountered&&!isAccepted&&!acceptedBid[selectedJob.id]&&(
                                        <div style={{background:'rgba(232,160,32,.08)',border:'1px solid rgba(232,160,32,.2)',borderRadius:8,padding:'14px 16px',marginBottom:10}}>
                                          <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#E8A020',marginBottom:8}}>
                                            💬 {bid.name.split(' ')[0]} counter-offered
                                          </div>
                                          <div style={{fontFamily:'var(--fd)',fontSize:28,color:'var(--charcoal)',marginBottom:8}}>R{bid.counterAmount}</div>
                                          <div style={{fontSize:13,color:'var(--charcoal-l)',marginBottom:12,lineHeight:1.5}}>{bid.counterAmount&&bid.counterAmount<bid.price?`R${bid.price - bid.counterAmount} less than original bid`:''}</div>
                                          <div className="bc-actions">
                                            <button className="btn btn-green" onClick={()=>acceptCounterFromTrade(selectedJob.id,bid.id,bid.counterAmount||bid.price,bid.name)}>
                                              Accept R{bid.counterAmount}
                                            </button>
                                            <button className="btn btn-ghost" onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>
                                              Accept original R{bid.price}
                                            </button>
                                          </div>
                                          <div style={{marginTop:8}}>
                                            <div className="counter-row">
                                              <div className="counter-r">R</div>
                                              <input className="counter-in" type="number"
                                                placeholder="Your counter"
                                                value={counterAmts[bid.id]||''}
                                                onChange={e=>setCounterAmts(a=>({...a,[bid.id]:e.target.value}))}/>
                                            </div>
                                            <button className="btn btn-terra" onClick={()=>sendCounter(selectedJob.id,bid.id,bid.price)}>Counter again</button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Normal bid — no counter yet */}
                                      {!isAccepted&&!acceptedBid[selectedJob.id]&&!isCounted&&!tradeCountered&&(
                                        <>
                                          <div className="counter-row">
                                            <div className="counter-r">R</div>
                                            <input className="counter-in" type="number"
                                              placeholder={String(Math.round(bid.price*0.9))}
                                              value={counterAmts[bid.id]||''}
                                              onChange={e=>setCounterAmts(a=>({...a,[bid.id]:e.target.value}))}/>
                                          </div>
                                          <div className="bc-actions">
                                            <button className="btn btn-terra" onClick={()=>sendCounter(selectedJob.id,bid.id,bid.price)}>Counter-offer</button>
                                            <button className="btn btn-ghost" onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>Accept R{bid.price}</button>
                                          </div>
                                          {resp==='sending'&&<div style={{color:'var(--charcoal-l)',fontSize:13,marginTop:8}}>Sending counter...</div>}
                                          {resp==='sent'&&<div className="counter-resp resp-ok">✓ Counter sent to {bid.name.split(' ')[0]}. Waiting for response...</div>}
                                          {resp==='error'&&<div className="counter-resp resp-no">✗ Failed to send. Please try again.</div>}
                                        </>
                                      )}

                                      {/* Counter sent — waiting */}
                                      {isCounted&&!isAccepted&&(
                                        <div style={{background:'rgba(232,160,32,.06)',border:'1px solid rgba(232,160,32,.15)',borderRadius:8,padding:'12px 14px',fontSize:13,color:'var(--charcoal-l)',lineHeight:1.5}}>
                                          ⏳ Counter of <strong style={{color:'var(--charcoal)'}}>R{bid.counterAmount}</strong> sent to {bid.name.split(' ')[0]}. Waiting for response...
                                          <div style={{marginTop:8}}>
                                            <button className="btn btn-ghost" style={{fontSize:11,padding:'6px 12px'}} onClick={()=>acceptBid(selectedJob.id,bid.id,bid.name)}>
                                              Accept original R{bid.price} instead
                                            </button>
                                          </div>
                                        </div>
                                      )}

                                      {isAccepted&&!isPaid&&(
                                        <>
                                          <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--green)',marginBottom:10}}>✓ Bid accepted</div>
                                          <div className="escrow-note">🔒 Your payment will be held in escrow. <strong>{bid.name.split(' ')[0]}</strong> only gets paid when you confirm the job is complete.</div>
                                          <div className="pay-grid">
                                            <div className="pay-btn" onClick={()=>releasePayment(selectedJob.id, bid.price)}>
                                              <div className="pay-lbl">Pay by card</div>
                                              <div className="pay-sub">Visa · Mastercard</div>
                                            </div>
                                            <div className="pay-btn" onClick={()=>releasePayment(selectedJob.id, bid.price)}>
                                              <div className="pay-lbl">Pay by EFT</div>
                                              <div className="pay-sub">Instant via Ozow</div>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                      {isAccepted&&isPaid&&(
                                        <div style={{background:'rgba(61,170,106,.08)',border:'1px solid rgba(61,170,106,.2)',borderRadius:8,padding:'14px 16px',fontSize:13,color:'#1a6e35',lineHeight:1.5}}>
                                          ✓ Payment held in escrow. <strong>{bid.name.split(' ')[0]}</strong> is on the way.
                                          <div style={{marginTop:10}}>
                                            <button className="btn btn-green" onClick={()=>setReviewJob(selectedJob.id)}>Confirm job complete & release payment</button>
                                          </div>
                                        </div>
                                      )}
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

            {/* HISTORY */}
            {tab==='history'&&(
              <>
                {historyJobs.length>0&&(
                  <div style={{background:'var(--white)',borderRadius:10,border:'1px solid var(--cream-d)',padding:'20px 24px',marginBottom:20,display:'flex',gap:32}}>
                    {[
                      {label:'Total spent',     val:`R${totalSpent.toLocaleString()}`},
                      {label:'Jobs completed',  val:String(historyJobs.length)},
                      {label:'Avg job value',   val:historyJobs.length>0?`R${Math.round(totalSpent/historyJobs.length).toLocaleString()}`:'—'},
                    ].map(s=>(
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
                      <div className="hist-meta">{j.area} · {j.tradesperson} · {'★'.repeat(j.rating)}</div>
                    </div>
                    <div>
                      <div className="hist-price">R{j.price.toLocaleString()}</div>
                      <div className="hist-date">{j.date}</div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* PROFILE */}
            {tab==='profile'&&(
              <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--cream-d)',padding:32,maxWidth:560}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:20,borderBottom:'1px solid var(--cream-d)'}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:'var(--terra)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'var(--fd)',fontSize:28,color:'#fff'}}>{displayInitials}</div>
                  <div>
                    <div style={{fontFamily:'var(--fd)',fontSize:28,letterSpacing:1,color:'var(--charcoal)',lineHeight:1}}>{displayName.toUpperCase()}</div>
                    <div style={{fontSize:13,color:'var(--charcoal-l)',marginTop:4}}>Homeowner · {profile?.area||'Johannesburg'}</div>
                    <div style={{fontSize:13,color:'var(--terra)',marginTop:3}}>Member since {profile?.created_at?new Date(profile.created_at).toLocaleDateString('en-ZA',{month:'long',year:'numeric'}):'—'}</div>
                  </div>
                </div>
                {[
                  {label:'Email',          val:profile?.email||'—'},
                  {label:'Phone',          val:profile?.phone||'—'},
                  {label:'Area',           val:profile?.area||'—'},
                  {label:'Jobs posted',    val:String(jobs.length)},
                  {label:'Jobs completed', val:String(historyJobs.length)},
                ].map(r=>(
                  <div key={r.label} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--cream-d)'}}>
                    <span style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'var(--charcoal-l)'}}>{r.label}</span>
                    <span style={{fontSize:14,color:'var(--charcoal)',fontWeight:500}}>{r.val}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {reviewJob&&(
        <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)setReviewJob(null)}}>
          <div className="modal">
            <div className="modal-title">LEAVE A REVIEW</div>
            <p className="modal-sub">How did the job go? Your rating helps other homeowners and rewards great tradespeople.</p>
            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:10}}>Your rating</div>
            <div className="stars-row">
              {[1,2,3,4,5].map(n=>(
                <span key={n} className="star" onClick={()=>setRating(n)} style={{color:n<=rating?'#E8A020':'var(--cream-dd)'}}>★</span>
              ))}
            </div>
            <div style={{fontFamily:'var(--fc)',fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'var(--charcoal-l)',marginBottom:8}}>Comments (optional)</div>
            <textarea className="review-ta" placeholder="E.g. Arrived on time, fixed the pipe quickly, very professional..." value={reviewText} onChange={e=>setReviewText(e.target.value)}/>
            <div style={{display:'flex',gap:10}}>
              <button className="btn btn-terra" style={{flex:1,justifyContent:'center'}} onClick={submitReview}>Submit review</button>
              <button className="btn btn-ghost" onClick={()=>setReviewJob(null)}>Skip</button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
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
