import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client — bypasses all RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { action, userId, jobId, paymentId, disputeId, reason } = await req.json()

    switch(action) {

      case 'verify_tradesperson': {
        await supabase
          .from('tradesperson_profiles')
          .update({ id_verified: true, verification_status: 'verified', rejection_reason: null })
          .eq('id', userId)

        await supabase.from('notifications').insert({
          user_id: userId,
          type:    'id_verified',
          title:   '✅ Identity verified!',
          message: 'Your ID has been verified. Your verified badge is now visible on all your bids.',
          link:    '/dashboard',
          read:    false,
        })
        return NextResponse.json({ success: true })
      }

      case 'reject_tradesperson': {
        if(!reason?.trim()) return NextResponse.json({ error: 'Reason required' }, { status: 400 })
        await supabase
          .from('tradesperson_profiles')
          .update({ id_verified: false, verification_status: 'rejected', rejection_reason: reason })
          .eq('id', userId)

        await supabase.from('notifications').insert({
          user_id: userId,
          type:    'id_rejected',
          title:   'ID verification unsuccessful',
          message: `Your ID could not be verified. Reason: ${reason}. Please resubmit.`,
          link:    '/dashboard',
          read:    false,
        })
        return NextResponse.json({ success: true })
      }

      case 'release_payment': {
        await supabase.from('payments').update({ status: 'released' }).eq('id', paymentId)
        return NextResponse.json({ success: true })
      }

      case 'resolve_dispute_approve': {
        await supabase.from('job_disputes')
          .update({ status:'resolved', resolution_reason: reason||'Dispute resolved by Lungisa admin.' })
          .eq('id', disputeId)
        await supabase.from('jobs').update({ status:'completed' }).eq('id', jobId)
        const { data: job } = await supabase.from('jobs').select('title, homeowner_id').eq('id', jobId).single()
        const { data: bid } = await supabase.from('bids').select('tradesperson_id').eq('job_id', jobId).eq('status','accepted').single()
        const msg = reason||'Work confirmed complete — payment released to tradesperson.'
        if(job?.homeowner_id){
          await supabase.from('notifications').insert({
            user_id: job.homeowner_id, type:'dispute_resolved',
            title:'✓ Dispute resolved', read:false, link:'/home',
            message:`Dispute for "${job.title}" resolved. Decision: ${msg}`,
          })
        }
        if(bid?.tradesperson_id){
          await supabase.from('notifications').insert({
            user_id: bid.tradesperson_id, type:'dispute_resolved',
            title:'✓ Dispute resolved in your favour', read:false, link:'/dashboard',
            message:`Dispute for "${job?.title}" resolved. Decision: ${msg}`,
          })
        }
        return NextResponse.json({ success: true })
      }

      case 'resolve_dispute_reject': {
        await supabase.from('job_disputes')
          .update({ status:'resolved', resolution_reason: reason||'Dispute resolved by Lungisa admin.' })
          .eq('id', disputeId)
        await supabase.from('jobs').update({ status:'cancelled' }).eq('id', jobId)
        const { data: job } = await supabase.from('jobs').select('title, homeowner_id').eq('id', jobId).single()
        const { data: bid } = await supabase.from('bids').select('tradesperson_id').eq('job_id', jobId).eq('status','accepted').single()
        const msg = reason||'Job cancelled following dispute review.'
        if(job?.homeowner_id){
          await supabase.from('notifications').insert({
            user_id: job.homeowner_id, type:'dispute_resolved',
            title:'✓ Dispute resolved — job cancelled', read:false, link:'/home',
            message:`Dispute for "${job.title}" resolved. Decision: ${msg}`,
          })
        }
        if(bid?.tradesperson_id){
          await supabase.from('notifications').insert({
            user_id: bid.tradesperson_id, type:'dispute_resolved',
            title:'Dispute outcome — job cancelled', read:false, link:'/dashboard',
            message:`Dispute for "${job?.title}" resolved. Decision: ${msg}`,
          })
        }
        return NextResponse.json({ success: true })
      }

      case 'cancel_job': {
        await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', jobId)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

  } catch(error) {
    console.error('Admin action error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}