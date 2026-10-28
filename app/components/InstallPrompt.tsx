'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { trackEvent } from '../lib/analytics'

/**
 * InstallPrompt
 * "Add Lungisa to your home screen" sheet.
 *
 * - Mounted once in app/layout.tsx so it can catch the browser's
 *   `beforeinstallprompt` event, which fires early (before the user has
 *   reached the dashboard) and only once.
 * - Auto-opens the first time a signed-in user lands on /home or /dashboard.
 *   After "Not now" it comes back after 3 days, at most 3 times in total.
 * - Never shows when the app is already installed / running standalone.
 * - Android Chrome: native one-tap install. iPhone: step-by-step guide
 *   (Apple does not allow one-tap install). In-app browsers (TikTok,
 *   Instagram, Facebook, WhatsApp...) cannot install, so we say so.
 * - Anything can open it manually via:
 *     window.dispatchEvent(new Event('lungisa:open-install'))
 */

const STORE_KEY = 'lz_install_v1'
const MAX_ASKS = 3
const WAIT_MS = 3 * 24 * 60 * 60 * 1000
const AUTO_PATHS = ['/home', '/dashboard']

type Stored = { asks: number; last: number; installed: boolean; never: boolean }
type Mode = 'native' | 'ios' | 'manual' | 'inapp'

function readStore(): Stored {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return { asks: 0, last: 0, installed: false, never: false, ...JSON.parse(raw) }
  } catch (e) {}
  return { asks: 0, last: 0, installed: false, never: false }
}

function writeStore(patch: Partial<Stored>) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...patch }))
  } catch (e) {}
}

function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )
  } catch (e) {
    return false
  }
}

function detect() {
  const ua = navigator.userAgent || ''
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && (navigator as any).maxTouchPoints > 1)
  const isAndroid = /Android/i.test(ua)
  const inApp =
    /FBAN|FBAV|FB_IAB|Instagram|TikTok|musical_ly|BytedanceWebview|Bytedance|Snapchat|Line\/|MicroMessenger|Twitter|WhatsApp/i.test(ua) ||
    (isAndroid && /; wv\)/.test(ua))
  return { isIOS, isAndroid, inApp, isMobile: isIOS || isAndroid }
}

export default function InstallPrompt() {
  const pathname = usePathname()
  const router = useRouter()
  const deferred = useRef<any>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('manual')
  const [copied, setCopied] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const autoDone = useRef(false)

  // Installed app opened from the home screen: skip the marketing page and
  // go straight to the right dashboard (or to sign in).
  useEffect(() => {
    if (pathname !== '/' || !isStandalone()) return
    let alive = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!alive) return
        if (!data?.session) { router.replace('/auth'); return }
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', data.session.user.id).single()
        if (!alive) return
        router.replace(profile?.role === 'tradesperson' ? '/dashboard' : '/home')
      } catch (e) {}
    })()
    return () => { alive = false }
  }, [pathname, router])

  // Capture the native install event + the "installed" event
  useEffect(() => {
    function onBefore(e: Event) {
      e.preventDefault()
      deferred.current = e
    }
    function onInstalled() {
      deferred.current = null
      writeStore({ installed: true })
      trackEvent('app_installed')
      setOpen(false)
    }
    window.addEventListener('beforeinstallprompt', onBefore)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  // Is someone signed in?
  useEffect(() => {
    let alive = true
    try {
      supabase.auth.getSession().then(({ data }) => {
        if (alive) setSignedIn(!!data?.session)
      })
    } catch (e) {}
    return () => { alive = false }
  }, [pathname])

  function chooseMode(): Mode {
    const d = detect()
    if (d.inApp) return 'inapp'
    if (deferred.current) return 'native'
    if (d.isIOS) return 'ios'
    return 'manual'
  }

  // Manual open from anywhere (e.g. homepage "Get the app")
  useEffect(() => {
    function onOpen() {
      if (isStandalone()) return
      setMode(chooseMode())
      setOpen(true)
      trackEvent('install_prompt_shown', { source: 'manual' })
    }
    window.addEventListener('lungisa:open-install', onOpen)
    return () => window.removeEventListener('lungisa:open-install', onOpen)
  }, [])

  // Auto open: first time a signed-in user reaches the app
  useEffect(() => {
    if (autoDone.current) return
    if (!signedIn) return
    if (!AUTO_PATHS.some(p => pathname === p || pathname?.startsWith(p + '/'))) return
    if (isStandalone()) return
    const d = detect()
    if (!d.isMobile) return
    const s = readStore()
    if (s.installed || s.never) return
    if (s.asks >= MAX_ASKS) return
    if (s.asks > 0 && Date.now() - s.last < WAIT_MS) return

    autoDone.current = true
    const t = setTimeout(() => {
      if (isStandalone()) return
      setMode(chooseMode())
      setOpen(true)
      writeStore({ asks: s.asks + 1, last: Date.now() })
      trackEvent('install_prompt_shown', { source: 'auto', ask: s.asks + 1 })
    }, 2500)
    return () => clearTimeout(t)
  }, [signedIn, pathname])

  // Close the sheet if the user navigates to a page where it makes no sense
  useEffect(() => {
    if (open && pathname === '/auth') setOpen(false)
  }, [pathname, open])

  async function installNative() {
    const ev = deferred.current
    if (!ev) { setMode(detect().isIOS ? 'ios' : 'manual'); return }
    try {
      ev.prompt()
      const choice = await ev.userChoice
      trackEvent('install_prompt_result', { outcome: choice?.outcome })
      deferred.current = null
      if (choice?.outcome === 'accepted') writeStore({ installed: true })
    } catch (e) {}
    setOpen(false)
  }

  function dismiss(never = false) {
    trackEvent('install_prompt_dismissed', { never })
    if (never) writeStore({ never: true })
    setOpen(false)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText('https://www.lungiza.co.za')
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (e) {
      window.prompt('Copy this link and open it in Chrome or Safari:', 'https://www.lungiza.co.za')
    }
  }

  if (!open) return null

  const d = typeof navigator !== 'undefined' ? detect() : { isIOS: false, isAndroid: false, inApp: false, isMobile: false }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: css}} />
      <div className="lzi-scrim" onClick={() => dismiss(false)} />
      <div className="lzi-sheet" role="dialog" aria-modal="true" aria-label="Add Lungisa to your home screen">
        <div className="lzi-grab" />

        <div className="lzi-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192x192.png" alt="" width={56} height={56} className="lzi-icon" />
          <div>
            <div className="lzi-title">Add Lungisa to your home screen</div>
            <div className="lzi-sub">Opens like an app. No App Store, no waiting.</div>
          </div>
        </div>

        {mode === 'native' && (
          <>
            <ul className="lzi-list">
              <li>Opens in one tap, full screen</li>
              <li>Jobs and bids always one tap away</li>
              <li>Free, and takes almost no space</li>
            </ul>
            <button className="lzi-primary" onClick={installNative}>Install app</button>
          </>
        )}

        {mode === 'ios' && (
          <>
            <ol className="lzi-steps">
              <li>
                <span className="lzi-n">1</span>
                <span>Tap the <strong>Share</strong> button <ShareIcon /> in Safari{d.isIOS && /CriOS|FxiOS/.test(navigator.userAgent) ? ' (top right in Chrome)' : ' (bottom of the screen)'}</span>
              </li>
              <li>
                <span className="lzi-n">2</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusIcon /></span>
              </li>
              <li>
                <span className="lzi-n">3</span>
                <span>Tap <strong>Add</strong>. The Lungisa icon appears on your home screen.</span>
              </li>
            </ol>
            <button className="lzi-primary" onClick={() => dismiss(false)}>Got it</button>
          </>
        )}

        {mode === 'manual' && (
          <>
            <ol className="lzi-steps">
              <li>
                <span className="lzi-n">1</span>
                <span>Tap the browser menu <strong>&#8942;</strong> (top right)</span>
              </li>
              <li>
                <span className="lzi-n">2</span>
                <span>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></span>
              </li>
              <li>
                <span className="lzi-n">3</span>
                <span>Confirm. The Lungisa icon appears on your home screen.</span>
              </li>
            </ol>
            <button className="lzi-primary" onClick={() => dismiss(false)}>Got it</button>
          </>
        )}

        {mode === 'inapp' && (
          <>
            <div className="lzi-note">
              This link opened inside another app (like TikTok, Instagram or WhatsApp), which cannot install apps.
              Open it in <strong>{d.isIOS ? 'Safari' : 'Chrome'}</strong> to add Lungisa to your home screen.
            </div>
            <button className="lzi-primary" onClick={copyLink}>{copied ? 'Link copied. Paste it in your browser' : 'Copy link'}</button>
            <div className="lzi-hint">Or tap the <strong>&#8943;</strong> menu in this app and choose <strong>Open in browser</strong>.</div>
          </>
        )}

        <div className="lzi-foot">
          <button className="lzi-link" onClick={() => dismiss(false)}>Not now</button>
          <button className="lzi-link" onClick={() => dismiss(true)}>Don&apos;t ask again</button>
        </div>
      </div>
    </>
  )
}

function ShareIcon() {
  return (
    <svg className="lzi-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" /><path d="M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="lzi-inline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" />
    </svg>
  )
}

const css = `
.lzi-scrim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;animation:lziFade .2s ease both}
.lzi-sheet{position:fixed;left:0;right:0;bottom:0;z-index:10001;background:#1F1F1C;color:#F5F0E8;
  border-radius:20px 20px 0 0;padding:10px 20px calc(18px + env(safe-area-inset-bottom));
  max-width:520px;margin:0 auto;box-shadow:0 -12px 40px rgba(0,0,0,.45);
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;animation:lziUp .28s cubic-bezier(.2,.8,.2,1) both}
.lzi-grab{width:40px;height:4px;border-radius:4px;background:rgba(245,240,232,.2);margin:0 auto 14px}
.lzi-head{display:flex;gap:14px;align-items:center;margin-bottom:16px}
.lzi-icon{border-radius:14px;background:#F5F0E8;flex-shrink:0;object-fit:contain}
.lzi-title{font-size:18px;font-weight:700;line-height:1.25}
.lzi-sub{font-size:13px;color:rgba(245,240,232,.6);margin-top:3px;line-height:1.4}
.lzi-list{list-style:none;margin:0 0 16px;padding:0}
.lzi-list li{font-size:14px;color:rgba(245,240,232,.85);padding:7px 0 7px 26px;position:relative;line-height:1.4}
.lzi-list li::before{content:"";position:absolute;left:2px;top:12px;width:12px;height:7px;border-left:2.5px solid #52C47F;border-bottom:2.5px solid #52C47F;transform:rotate(-45deg)}
.lzi-steps{list-style:none;margin:0 0 16px;padding:0}
.lzi-steps li{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.5;color:rgba(245,240,232,.9);padding:8px 0}
.lzi-n{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:#C4593A;color:#fff;font-size:13px;font-weight:700;display:grid;place-items:center;margin-top:1px}
.lzi-inline{vertical-align:-4px;margin:0 2px;color:#E07A5F}
.lzi-primary{width:100%;min-height:50px;border:none;border-radius:12px;background:#C4593A;color:#fff;font-size:16px;font-weight:700;cursor:pointer}
.lzi-primary:active{transform:scale(.98)}
.lzi-note{font-size:14px;line-height:1.6;color:rgba(245,240,232,.85);background:rgba(245,240,232,.06);border-radius:10px;padding:12px 14px;margin-bottom:14px}
.lzi-hint{font-size:12.5px;color:rgba(245,240,232,.55);margin-top:12px;line-height:1.5;text-align:center}
.lzi-foot{display:flex;justify-content:space-between;margin-top:6px}
.lzi-link{background:none;border:none;color:rgba(245,240,232,.5);font-size:13px;padding:12px 4px;cursor:pointer;min-height:44px}
@keyframes lziUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
@keyframes lziFade{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.lzi-sheet,.lzi-scrim{animation:none}}
`
