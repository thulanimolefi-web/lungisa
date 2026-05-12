'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

type Notification = {
  id: string
  title: string
  message: string
  type: string
  link: string
  read: boolean
  created_at: string
}

function getTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if(mins < 1)  return 'Just now'
  if(mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if(hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getNotifIcon(type: string) {
  const m: Record<string, string> = {
    new_bid:           '🔨',
    bid_accepted:      '✅',
    counter_offer:     '💬',
    payment_confirmed: '🔒',
    job_completed:     '🎉',
  }
  return m[type] || '🔔'
}

function getNotifAccent(type: string, dark: boolean) {
  const m: Record<string, string> = {
    new_bid:           '#C4593A',
    bid_accepted:      '#3DAA6A',
    counter_offer:     '#E8A020',
    payment_confirmed: '#3DAA6A',
    job_completed:     '#3DAA6A',
  }
  return m[type] || (dark ? 'rgba(245,240,232,.3)' : '#5A5952')
}

type Props = {
  /** 'dark' = tradesperson dashboard (dark bg), 'light' = homeowner dashboard */
  theme: 'dark' | 'light'
}

export default function NotificationBell({ theme }: Props) {
  const [open, setOpen]                   = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(false)
  const ref                               = useRef<HTMLDivElement>(null)
  const dark                              = theme === 'dark'

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    loadNotifications()

    // Real-time: new notification arrives → reload + badge updates instantly
    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        loadNotifications()
      })
      .subscribe()

    // Close dropdown on outside click
    function handleClick(e: MouseEvent) {
      if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClick)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadNotifications() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if(!session?.user) { setLoading(false); return }
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if(!error && data) setNotifications(data)
    } catch(e) { console.log('Notifications error:', e) }
    setLoading(false)
  }

  async function markAllRead() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if(!session?.user) return
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', session.user.id)
        .eq('read', false)
      setNotifications(n => n.map(x => ({ ...x, read: true })))
    } catch(e) { console.log('Mark read error:', e) }
  }

  async function markOneRead(id: string) {
    try {
      await supabase.from('notifications').update({ read: true }).eq('id', id)
      setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x))
    } catch(e) { console.log('Mark one read error:', e) }
  }

  function handleOpen() {
    setOpen(o => {
      const next = !o
      if(next && unread > 0) markAllRead()
      return next
    })
  }

  // ── Styles ───────────────────────────────────────────────────────
  const bg          = dark ? '#1A1A16'          : '#FAFAF7'
  const border      = dark ? 'rgba(255,255,255,.08)' : '#EAE3D6'
  const textPrimary = dark ? '#F5F0E8'          : '#2C2C28'
  const textSub     = dark ? 'rgba(245,240,232,.4)' : '#5A5952'
  const itemHover   = dark ? 'rgba(255,255,255,.04)' : 'rgba(196,89,58,.04)'
  const unreadDot   = dark ? 'rgba(255,255,255,.06)' : 'rgba(196,89,58,.06)'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          width: 36, height: 36, borderRadius: 8,
          background: open
            ? (dark ? 'rgba(196,89,58,.15)' : 'rgba(196,89,58,.1)')
            : (dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.04)'),
          border: `1px solid ${open ? 'rgba(196,89,58,.3)' : border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', transition: 'all .15s',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={dark ? (open ? '#E07A5F' : 'rgba(245,240,232,.6)') : (open ? '#C4593A' : '#5A5952')}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread badge */}
        {unread > 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            background: '#C4593A', color: '#fff',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 9, fontWeight: 700,
            width: unread > 9 ? 18 : 16, height: 16,
            borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${dark ? '#1A1A16' : '#FAFAF7'}`,
            letterSpacing: 0,
          }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 44, right: 0, zIndex: 200,
          width: 340,
          background: dark ? '#222220' : '#fff',
          border: `1px solid ${border}`,
          borderRadius: 12,
          boxShadow: dark
            ? '0 8px 32px rgba(0,0,0,.5)'
            : '0 8px 32px rgba(0,0,0,.12)',
          overflow: 'hidden',
          animation: 'bellDrop .15s ease both',
        }}>
          <style>{`
            @keyframes bellDrop {
              from { opacity: 0; transform: translateY(-6px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase', color: textPrimary,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              Notifications
              {unread > 0 && (
                <span style={{
                  background: 'rgba(196,89,58,.15)', color: '#C4593A',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                }}>
                  {unread} new
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 10, fontWeight: 600, letterSpacing: 1,
                  color: '#C4593A', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, textTransform: 'uppercase',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {loading ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12, color: textSub, letterSpacing: 1,
              }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔔</div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 4,
                }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: 12, color: textSub, lineHeight: 1.5 }}>
                  You&apos;ll see bids, counters, and payments here.
                </div>
              </div>
            ) : notifications.map(n => (
              <a
                key={n.id}
                href={n.link || '#'}
                onClick={() => markOneRead(n.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 16px',
                  background: !n.read ? unreadDot : 'transparent',
                  borderBottom: `1px solid ${border}`,
                  textDecoration: 'none',
                  transition: 'background .12s',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = itemHover)}
                onMouseLeave={e => (e.currentTarget.style.background = !n.read ? unreadDot : 'transparent')}
              >
                {/* Icon */}
                <div style={{
                  width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                  background: dark ? 'rgba(255,255,255,.06)' : 'rgba(196,89,58,.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, marginTop: 1,
                }}>
                  {getNotifIcon(n.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 13, fontWeight: 700,
                    color: !n.read ? getNotifAccent(n.type, dark) : textPrimary,
                    marginBottom: 2, lineHeight: 1.3,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {n.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: textSub, lineHeight: 1.45,
                    display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {n.message}
                  </div>
                  <div style={{
                    fontSize: 10, color: textSub, marginTop: 4,
                    fontFamily: "'Barlow Condensed', sans-serif",
                    letterSpacing: .5,
                  }}>
                    {getTimeAgo(n.created_at)}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: getNotifAccent(n.type, dark),
                    flexShrink: 0, marginTop: 6,
                  }}/>
                )}
              </a>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: `1px solid ${border}`,
              textAlign: 'center',
            }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10, fontWeight: 600, letterSpacing: 1.5,
                textTransform: 'uppercase', color: textSub,
              }}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} total
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}