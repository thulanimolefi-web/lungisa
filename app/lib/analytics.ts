// Thin wrapper around GA4's gtag so the rest of the app can fire events
// without caring whether analytics is actually configured yet. Safe to call
// anywhere, anytime — it's a no-op until NEXT_PUBLIC_GA_MEASUREMENT_ID is
// set in .env and the gtag script (see app/layout.tsx) has loaded.
export function trackEvent(name: string, params: Record<string, any> = {}) {
  try {
    if (typeof window === 'undefined') return
    const w = window as any
    if (typeof w.gtag !== 'function') return
    w.gtag('event', name, params)
  } catch (e) {
    // Analytics must never break the app it's measuring.
  }
}

// Canonical event names used across the funnel — keep these in sync with
// wherever they're fired so GA4 reports stay meaningful.
export const AnalyticsEvents = {
  HERO_CTA_CLICK:    'hero_cta_click',
  ROLE_SELECTED:     'role_selected',
  SIGNUP_COMPLETED:  'signup_completed',
  JOB_POSTED:        'job_posted',
  BID_SUBMITTED:     'bid_submitted',
  JOB_COMPLETED:     'job_completed',
} as const
