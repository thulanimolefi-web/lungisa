'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Bare } from '../components/rec-ui'

// Return page after a Yoco card payment on a job record. Carries only the record reference.
function PaidInner() {
  const sp = useSearchParams()
  const ref = (sp.get('ref') || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 12)
  const cancelled = sp.get('cancelled') === '1'
  return (
    <Bare>
      <h1 className="rx-h1">{cancelled ? 'Payment cancelled' : 'Thank you'}</h1>
      {cancelled
        ? <p>No money was taken. Open the link the tradesperson sent you to try again.</p>
        : <p>Your card payment{ref ? ` for job #${ref}` : ''} is being confirmed. Open the link the tradesperson sent you to see it on the job record. It can take a minute to show.</p>}
      <p className="rx-muted">Card payments are processed securely by Yoco.</p>
    </Bare>
  )
}

export default function PaidPage() {
  return <Suspense fallback={null}><PaidInner /></Suspense>
}
