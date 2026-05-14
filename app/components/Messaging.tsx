'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

type Message = {
  id: string
  body: string
  sender_id: string
  receiver_id: string
  read_at: string | null
  created_at: string
  message_type: 'text' | 'system'
}

type Thread = {
  jobId: string
  jobTitle: string
  otherUserId: string
  otherUserName: string
  otherUserInit: string
  otherUserRole: 'homeowner' | 'tradesperson'
  lastMessage: string
  lastTime: string
  unread: number
}

type Props = {
  theme: 'light' | 'dark'
  /** If provided, opens directly to this job's thread */
  openJobId?: string | null
  /** If provided, the other party's user ID */
  openUserId?: string | null
  onClose?: () => void
}

function getTimeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if(mins < 1)  return 'Just now'
  if(mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if(hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if(days < 7)  return `${days}d ago`
  return new Date(d).toLocaleDateString('en-ZA', { day:'numeric', month:'short' })
}

function getInit(name: string) {
  return name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
}

const AVATAR_COLORS = ['#8B3A2A','#5A3A2A','#2A4A3A','#3A4A6A','#6A3A5A','#4A5A2A']
function avatarColor(id: string) {
  let hash = 0
  for(let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function Messaging({ theme, openJobId, openUserId, onClose }: Props) {
  const dark = theme === 'dark'

  const [myId, setMyId]           = useState('')
  const [threads, setThreads]     = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages]   = useState<Message[]>([])
  const [newMsg, setNewMsg]       = useState('')
  const [sending, setSending]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [msgLoading, setMsgLoading] = useState(false)
  const messagesEndRef            = useRef<HTMLDivElement>(null)
  const inputRef                  = useRef<HTMLTextAreaElement>(null)
  const channelRef                = useRef<any>(null)

  // ── Colours based on theme ───────────────────────────────────────
  const bg        = dark ? '#1A1A16'               : '#FAFAF7'
  const panel     = dark ? '#222220'               : '#fff'
  const panelBdr  = dark ? 'rgba(255,255,255,.06)' : '#EAE3D6'
  const sidePanel = dark ? '#111110'               : '#F5F0E8'
  const txt1      = dark ? '#F5F0E8'               : '#2C2C28'
  const txt2      = dark ? 'rgba(245,240,232,.5)'  : '#5A5952'
  const txt3      = dark ? 'rgba(245,240,232,.25)' : '#D4C9B4'
  const inputBg   = dark ? 'rgba(255,255,255,.05)' : '#fff'
  const inputBdr  = dark ? 'rgba(255,255,255,.1)'  : '#DDD5C5'
  const hoverBg   = dark ? 'rgba(255,255,255,.04)' : 'rgba(196,89,58,.04)'
  const activeBg  = dark ? 'rgba(196,89,58,.08)'   : 'rgba(196,89,58,.06)'

  useEffect(() => {
    init()
    return () => {
      if(channelRef.current) supabase.removeChannel(channelRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function init() {
    const { data: { session } } = await supabase.auth.getSession()
    if(!session?.user) return
    setMyId(session.user.id)
    await loadThreads(session.user.id)
    setLoading(false)
  }

  async function loadThreads(uid: string) {
    try {
      // Get all jobs where user is homeowner or has a bid
      const { data: homeJobs } = await supabase
        .from('jobs')
        .select('id, title, status')
        .eq('homeowner_id', uid)
        .in('status', ['bidding','accepted','in_progress','completed'])

      const { data: tradeBids } = await supabase
        .from('bids')
        .select('job_id, jobs(id, title, status, homeowner_id)')
        .eq('tradesperson_id', uid)
        .in('status', ['pending','countered','accepted','completed'])

      const threadMap = new Map<string, Thread>()

      // Process homeowner threads
      if(homeJobs) {
        for(const job of homeJobs) {
          // Find accepted or most recent bid tradesperson
          const { data: bids } = await supabase
            .from('bids')
            .select('tradesperson_id, status, profiles!tradesperson_id(full_name)')
            .eq('job_id', job.id)
            .order('created_at', { ascending: false })
            .limit(5)

          if(bids && bids.length > 0) {
            // Prefer accepted bid, else most recent
            const chosen = bids.find(b => b.status === 'accepted') || bids[0]
            const otherName = (chosen as any).profiles?.full_name || 'Tradesperson'

            // Get last message + unread count
            const { data: lastMsgs } = await supabase
              .from('messages')
              .select('*')
              .eq('job_id', job.id)
              .order('created_at', { ascending: false })
              .limit(1)

            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id)
              .eq('receiver_id', uid)
              .is('read_at', null)

            const lastMsg = lastMsgs?.[0]
            threadMap.set(`${job.id}-${chosen.tradesperson_id}`, {
              jobId:          job.id,
              jobTitle:       job.title,
              otherUserId:    chosen.tradesperson_id,
              otherUserName:  otherName,
              otherUserInit:  getInit(otherName),
              otherUserRole:  'tradesperson',
              lastMessage:    lastMsg?.body || 'No messages yet',
              lastTime:       lastMsg ? getTimeAgo(lastMsg.created_at) : '',
              unread:         unreadCount || 0,
            })
          }
        }
      }

      // Process tradesperson threads
      if(tradeBids) {
        for(const bid of tradeBids) {
          const job = (bid as any).jobs
          if(!job) continue

          const { data: homeProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', job.homeowner_id)
            .single()

          const otherName = homeProfile?.full_name || 'Homeowner'
          const key = `${job.id}-${job.homeowner_id}`

          if(!threadMap.has(key)) {
            const { data: lastMsgs } = await supabase
              .from('messages')
              .select('*')
              .eq('job_id', job.id)
              .order('created_at', { ascending: false })
              .limit(1)

            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('job_id', job.id)
              .eq('receiver_id', uid)
              .is('read_at', null)

            const lastMsg = lastMsgs?.[0]
            threadMap.set(key, {
              jobId:          job.id,
              jobTitle:       job.title,
              otherUserId:    job.homeowner_id,
              otherUserName:  otherName,
              otherUserInit:  getInit(otherName),
              otherUserRole:  'homeowner',
              lastMessage:    lastMsg?.body || 'No messages yet',
              lastTime:       lastMsg ? getTimeAgo(lastMsg.created_at) : '',
              unread:         unreadCount || 0,
            })
          }
        }
      }

      const sortedThreads = Array.from(threadMap.values())
      setThreads(sortedThreads)

      // Auto-open if jobId+userId provided
      if(openJobId && openUserId) {
        const target = sortedThreads.find(t => t.jobId === openJobId && t.otherUserId === openUserId)
        if(target) {
          openThread(target, uid)
        } else {
          // Create ad-hoc thread for new conversation
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('full_name, role')
            .eq('id', openUserId)
            .single()
          const { data: jobInfo } = await supabase
            .from('jobs')
            .select('title')
            .eq('id', openJobId)
            .single()
          if(otherProfile && jobInfo) {
            const thread: Thread = {
              jobId:         openJobId,
              jobTitle:      jobInfo.title,
              otherUserId:   openUserId,
              otherUserName: otherProfile.full_name || 'User',
              otherUserInit: getInit(otherProfile.full_name || 'U'),
              otherUserRole: otherProfile.role as any,
              lastMessage:   'Start the conversation',
              lastTime:      '',
              unread:        0,
            }
            setThreads(prev => [thread, ...prev])
            openThread(thread, uid)
          }
        }
      }
    } catch(e) { console.log('Thread load error:', e) }
  }

  async function openThread(thread: Thread, uid?: string) {
    setActiveThread(thread)
    setMsgLoading(true)
    const currentUid = uid || myId

    // Load messages
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('job_id', thread.jobId)
        .or(`sender_id.eq.${currentUid},receiver_id.eq.${currentUid}`)
        .order('created_at', { ascending: true })
      if(!error && data) setMessages(data)

      // Mark as read
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('job_id', thread.jobId)
        .eq('receiver_id', currentUid)
        .is('read_at', null)

      // Update thread unread count locally
      setThreads(prev => prev.map(t =>
        t.jobId === thread.jobId && t.otherUserId === thread.otherUserId
          ? { ...t, unread: 0 }
          : t
      ))
    } catch(e) { console.log('Message load error:', e) }
    setMsgLoading(false)

    // Subscribe to new messages for this thread
    if(channelRef.current) supabase.removeChannel(channelRef.current)
    channelRef.current = supabase
      .channel(`messages-${thread.jobId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `job_id=eq.${thread.jobId}`,
      }, async (payload) => {
        const msg = payload.new as Message
        setMessages(prev => {
          if(prev.find(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        // Mark as read if we're the receiver
        if(msg.receiver_id === (uid || myId)) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('id', msg.id)
        }
        // Update thread preview
        setThreads(prev => prev.map(t =>
          t.jobId === thread.jobId
            ? { ...t, lastMessage: msg.body, lastTime: 'Just now' }
            : t
        ))
      })
      .subscribe()
  }

  async function sendMessage() {
    const body = newMsg.trim()
    if(!body || sending || !activeThread || !myId) return
    setSending(true)
    setNewMsg('')

    try {
      const { error } = await supabase.from('messages').insert({
        job_id:      activeThread.jobId,
        sender_id:   myId,
        receiver_id: activeThread.otherUserId,
        body,
        message_type: 'text',
      })
      if(error) { console.log('Send error:', error); setNewMsg(body) }
      else {
        // Update thread preview immediately
        setThreads(prev => prev.map(t =>
          t.jobId === activeThread.jobId
            ? { ...t, lastMessage: body, lastTime: 'Just now' }
            : t
        ))

        // Send notification to receiver
        fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:       'new_message',
            jobId:      activeThread.jobId,
            jobTitle:   activeThread.jobTitle,
            senderId:   myId,
            receiverId: activeThread.otherUserId,
            body,
          })
        }).catch(e => console.log('Message notify error:', e))
      }
    } catch(e) { console.log('Send error:', e) }
    setSending(false)
    inputRef.current?.focus()
  }

  // Auto scroll to bottom
  useEffect(() => {
    if(messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const totalUnread = threads.reduce((s, t) => s + t.unread, 0)

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex',
      height: '100%',
      minHeight: 500,
      background: bg,
      borderRadius: 12,
      border: `1px solid ${panelBdr}`,
      overflow: 'hidden',
      fontFamily: "'Barlow', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@500;600;700&display=swap');
        .msg-thread:hover { background: ${hoverBg} !important; }
        .msg-thread.active { background: ${activeBg} !important; }
        .msg-input:focus { border-color: #C4593A !important; outline: none; }
        .send-btn:hover:not(:disabled) { background: #E07A5F !important; }
        .send-btn:disabled { opacity: .4; cursor: not-allowed; }
        @keyframes msgIn { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        .msg-bubble { animation: msgIn .2s ease both; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)'}; border-radius: 2px; }
      `}</style>

      {/* ── THREAD LIST (left panel) ─────────────────────────────── */}
      <div style={{
        width: 280,
        flexShrink: 0,
        background: sidePanel,
        borderRight: `1px solid ${panelBdr}`,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px 14px',
          borderBottom: `1px solid ${panelBdr}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13, fontWeight: 700, letterSpacing: 2,
              textTransform: 'uppercase', color: txt1,
            }}>
              Messages
            </div>
            {totalUnread > 0 && (
              <span style={{
                background: '#C4593A', color: '#fff',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9, fontWeight: 700,
                padding: '2px 6px', borderRadius: 10,
              }}>
                {totalUnread}
              </span>
            )}
          </div>
          {onClose && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: txt2, fontSize: 18, lineHeight: 1, padding: 2,
            }}>✕</button>
          )}
        </div>

        {/* Thread list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: txt3,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12 }}>
              Loading conversations...
            </div>
          ) : threads.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                fontWeight: 700, color: txt1, marginBottom: 6 }}>No conversations yet</div>
              <div style={{ fontSize: 12, color: txt2, lineHeight: 1.5 }}>
                Messages appear here once a tradesperson bids on your job.
              </div>
            </div>
          ) : threads.map(thread => (
            <div
              key={`${thread.jobId}-${thread.otherUserId}`}
              className={`msg-thread ${activeThread?.jobId === thread.jobId && activeThread?.otherUserId === thread.otherUserId ? 'active' : ''}`}
              onClick={() => openThread(thread)}
              style={{
                padding: '14px 18px',
                cursor: 'pointer',
                borderBottom: `1px solid ${panelBdr}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                position: 'relative',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: avatarColor(thread.otherUserId),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, color: '#fff',
                flexShrink: 0, position: 'relative',
              }}>
                {thread.otherUserInit}
                {thread.unread > 0 && (
                  <div style={{
                    position: 'absolute', top: -2, right: -2,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#C4593A',
                    border: `2px solid ${sidePanel}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 7, color: '#fff',
                    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  }}>
                    {thread.unread > 9 ? '9+' : thread.unread}
                  </div>
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 13, fontWeight: thread.unread > 0 ? 700 : 600,
                    color: thread.unread > 0 ? txt1 : txt2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 130,
                  }}>
                    {thread.otherUserName}
                  </div>
                  <div style={{ fontSize: 10, color: txt3, flexShrink: 0 }}>
                    {thread.lastTime}
                  </div>
                </div>
                <div style={{
                  fontSize: 11, color: txt3, fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600, letterSpacing: 0.5, marginBottom: 3,
                  textTransform: 'uppercase', fontSize: 9,
                }}>
                  {thread.jobTitle.substring(0, 28)}{thread.jobTitle.length > 28 ? '…' : ''}
                </div>
                <div style={{
                  fontSize: 12, color: thread.unread > 0 ? txt1 : txt3,
                  fontWeight: thread.unread > 0 ? 600 : 400,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {thread.lastMessage}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MESSAGE PANE (right) ─────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {!activeThread ? (
          // Empty state
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: txt3 }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700, color: txt2 }}>
              Select a conversation
            </div>
            <div style={{ fontSize: 13, color: txt3 }}>Choose a thread from the left to start messaging</div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{
              padding: '16px 22px',
              borderBottom: `1px solid ${panelBdr}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: panel,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: avatarColor(activeThread.otherUserId),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: '#fff',
                flexShrink: 0,
              }}>
                {activeThread.otherUserInit}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 15, fontWeight: 700, color: txt1, marginBottom: 2,
                }}>
                  {activeThread.otherUserName}
                </div>
                <div style={{
                  fontSize: 11, color: txt2,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 600, letterSpacing: 0.5,
                }}>
                  Re: {activeThread.jobTitle}
                </div>
              </div>
              {/* Role badge */}
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 9, fontWeight: 700, letterSpacing: 1.5,
                textTransform: 'uppercase',
                background: activeThread.otherUserRole === 'tradesperson'
                  ? 'rgba(196,89,58,.1)' : 'rgba(61,170,106,.1)',
                color: activeThread.otherUserRole === 'tradesperson'
                  ? '#C4593A' : '#3DAA6A',
                border: `1px solid ${activeThread.otherUserRole === 'tradesperson' ? 'rgba(196,89,58,.2)' : 'rgba(61,170,106,.2)'}`,
                padding: '3px 8px', borderRadius: 4,
              }}>
                {activeThread.otherUserRole === 'tradesperson' ? '🔧 Tradesperson' : '🏠 Homeowner'}
              </span>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              background: bg,
            }}>
              {msgLoading ? (
                <div style={{ textAlign: 'center', color: txt3,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, padding: '32px 0' }}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
                    fontWeight: 700, color: txt2, marginBottom: 6 }}>
                    Start the conversation
                  </div>
                  <div style={{ fontSize: 12, color: txt3, lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
                    Ask questions about the job, share more details, or discuss the timeline with {activeThread.otherUserName.split(' ')[0]}.
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => {
                    const isMine = msg.sender_id === myId
                    const isSystem = msg.message_type === 'system'
                    const showTime = i === 0 || (
                      new Date(msg.created_at).getTime() -
                      new Date(messages[i-1].created_at).getTime() > 5 * 60 * 1000
                    )

                    if(isSystem) return (
                      <div key={msg.id} style={{
                        textAlign: 'center', padding: '6px 0',
                        fontSize: 11, color: txt3,
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontStyle: 'italic',
                      }}>
                        {msg.body}
                      </div>
                    )

                    return (
                      <div key={msg.id} className="msg-bubble">
                        {showTime && (
                          <div style={{
                            textAlign: 'center', fontSize: 10, color: txt3,
                            fontFamily: "'Barlow Condensed', sans-serif",
                            margin: '8px 0 4px',
                          }}>
                            {getTimeAgo(msg.created_at)}
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          justifyContent: isMine ? 'flex-end' : 'flex-start',
                        }}>
                          <div style={{
                            maxWidth: '72%',
                            padding: '10px 14px',
                            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isMine
                              ? '#C4593A'
                              : (dark ? 'rgba(255,255,255,.08)' : '#EAE3D6'),
                            color: isMine ? '#fff' : txt1,
                            fontSize: 14,
                            lineHeight: 1.5,
                            wordBreak: 'break-word',
                          }}>
                            {msg.body}
                          </div>
                        </div>
                        {/* Read receipt */}
                        {isMine && msg.read_at && (
                          <div style={{
                            textAlign: 'right', fontSize: 9, color: txt3,
                            fontFamily: "'Barlow Condensed', sans-serif",
                            marginTop: 2, marginRight: 2,
                          }}>
                            ✓ Read
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef}/>
                </>
              )}
            </div>

            {/* Input bar */}
            <div style={{
              padding: '14px 18px',
              borderTop: `1px solid ${panelBdr}`,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              background: panel,
            }}>
              <textarea
                ref={inputRef}
                className="msg-input"
                value={newMsg}
                onChange={e => setNewMsg(e.target.value)}
                onKeyDown={e => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder={`Message ${activeThread.otherUserName.split(' ')[0]}…`}
                rows={1}
                style={{
                  flex: 1,
                  background: inputBg,
                  border: `1.5px solid ${inputBdr}`,
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 14,
                  color: txt1,
                  resize: 'none',
                  minHeight: 42,
                  maxHeight: 120,
                  lineHeight: 1.5,
                  transition: 'border-color .2s',
                }}
              />
              <button
                className="send-btn"
                onClick={sendMessage}
                disabled={!newMsg.trim() || sending}
                style={{
                  width: 42, height: 42,
                  borderRadius: '50%',
                  background: '#C4593A',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'background .15s',
                }}
              >
                {sending ? (
                  <div style={{
                    width: 14, height: 14,
                    border: '2px solid rgba(255,255,255,.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin .6s linear infinite',
                  }}/>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}