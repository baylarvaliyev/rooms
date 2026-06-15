'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}
function timeAgo(date: string) {
  if (!date) return ''
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}

// Parse a message — returns { type, text, post } 
function parseMessage(content: string) {
  if (content.startsWith('__SHARED_POST__')) {
    const body = content.slice('__SHARED_POST__'.length)
    const sepIdx = body.indexOf('|||')
    let note = ''
    let jsonStr = body
    if (sepIdx !== -1) {
      note = body.slice(0, sepIdx)
      jsonStr = body.slice(sepIdx + 3)
    }
    try {
      const post = JSON.parse(jsonStr)
      return { type: 'shared_post', note, post }
    } catch {}
  }
  return { type: 'text', note: '', post: null }
}

export default function MessagesClient() {
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserName, setCurrentUserName] = useState('')
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [activeUser, setActiveUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const typingTimeoutRef = useRef<any>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    initUser()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-open conversation from URL params (e.g. from user profile Message button)
  useEffect(() => {
    if (!searchParams || loading) return
    const userId = searchParams.get('user')
    const name = searchParams.get('name')
    const username = searchParams.get('username')
    if (userId && name && !activeUser) {
      const user = { id: userId, name: decodeURIComponent(name), username: username ? decodeURIComponent(username) : '' }
      openConversation(user)
    }
  }, [loading, searchParams])

  // Real-time DM listener — global for this user
  useEffect(() => {
    if (!currentUserId) return
    const channel = supabase.channel(`dms:${currentUserId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `to_user=eq.${currentUserId}`,
      }, async (payload) => {
        const msg = payload.new as any
        // Add to current conversation if it's the right one
        setActiveUser((au: any) => {
          if (au && msg.from_user === au.id) {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
          }
          return au
        })
        // Refresh conversation list
        loadConversations(currentUserId)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  async function initUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('id, name, username').eq('id', user.id).single()
    const userId = profile?.id || user.id
    const userName = profile?.name || user.email?.split('@')[0] || 'You'
    setCurrentUserId(userId)
    setCurrentUserName(userName)
    await Promise.all([
      loadConversations(userId),
      loadAllUsers(userId),
    ])
    setLoading(false)
  }

  async function loadConversations(userId: string) {
    if (!userId) return
    // Get all DMs involving this user — latest per partner
    const { data: sent } = await supabase
      .from('direct_messages')
      .select('to_user, content, created_at')
      .eq('from_user', userId)
      .order('created_at', { ascending: false })

    const { data: received } = await supabase
      .from('direct_messages')
      .select('from_user, content, created_at')
      .eq('to_user', userId)
      .order('created_at', { ascending: false })

    // Build map of partnerID -> last message
    const lastMsg: Record<string, { content: string, created_at: string, isMe: boolean }> = {}
    ;(sent || []).forEach((m: any) => {
      if (!lastMsg[m.to_user] || m.created_at > lastMsg[m.to_user].created_at) {
        lastMsg[m.to_user] = { content: m.content, created_at: m.created_at, isMe: true }
      }
    })
    ;(received || []).forEach((m: any) => {
      if (!lastMsg[m.from_user] || m.created_at > lastMsg[m.from_user].created_at) {
        lastMsg[m.from_user] = { content: m.content, created_at: m.created_at, isMe: false }
      }
    })

    const partnerIds = Object.keys(lastMsg)
    if (partnerIds.length === 0) { setConversations([]); return }

    const { data: partners } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', partnerIds)

    // Merge partner info with last message, sort by most recent
    const convos = (partners || []).map((p: any) => ({
      ...p,
      lastMsg: lastMsg[p.id],
    })).sort((a, b) => {
      const aTime = a.lastMsg?.created_at || ''
      const bTime = b.lastMsg?.created_at || ''
      return bTime.localeCompare(aTime)
    })

    setConversations(convos)
  }

  async function loadAllUsers(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .neq('id', userId)
      .limit(100)
    setAllUsers(data || [])
  }

  async function openConversation(user: any) {
    setActiveUser(user)
    setView('chat')
    setShowSearch(false)
    setSearch('')
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(from_user.eq.${currentUserId},to_user.eq.${user.id}),and(from_user.eq.${user.id},to_user.eq.${currentUserId})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    // Mark messages as read
    await supabase.from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('to_user', currentUserId)
      .eq('from_user', user.id)
      .is('read_at', null)
    // Subscribe to typing indicators for this conversation
    const typingChannel = supabase.channel(`typing:${[currentUserId, user.id].sort().join('-')}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUserId) {
          setTypingUsers(prev => new Set([...prev, payload.user_id]))
          setTimeout(() => setTypingUsers(prev => { const n = new Set(prev); n.delete(payload.user_id); return n }), 3000)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(typingChannel)
  }

  function handleTyping() {
    if (!activeUser || !currentUserId) return
    const channelName = `typing:${[currentUserId, activeUser.id].sort().join('-')}`
    supabase.channel(channelName).send({ type: 'broadcast', event: 'typing', payload: { user_id: currentUserId } })
  }

  async function sendMessage() {
    if (!input.trim() || !activeUser || sending || !currentUserId) return
    setSending(true)
    const content = input.trim()
    setInput('')
    const { data } = await supabase
      .from('direct_messages')
      .insert({ from_user: currentUserId, to_user: activeUser.id, content })
      .select().single()
    if (data) {
      setMessages(prev => [...prev, data])
      loadConversations(currentUserId)
    }
    setSending(false)
  }

  const filteredUsers = allUsers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="msg-shell">
        <div className="msg-sidebar">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ height: '14px', background: 'var(--bg4)', borderRadius: '6px', width: '40%', animation: 'pulse 1.5s infinite' }} />
          </div>
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg4)', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '13px', background: 'var(--bg4)', borderRadius: '6px', width: '60%', marginBottom: '7px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '11px', background: 'var(--bg4)', borderRadius: '6px', width: '80%', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="msg-shell">

      {/* SIDEBAR */}
      <div className={`msg-sidebar${view === 'chat' ? ' hidden' : ''}`}>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg3)', borderRadius: '10px', padding: '8px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={search} onChange={e => { setSearch(e.target.value); setShowSearch(true) }} onFocus={() => setShowSearch(true)} placeholder="Search people…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '13px', fontFamily: 'inherit' }} />
          </div>
          <button onClick={() => { setShowSearch(!showSearch); setSearch('') }} style={{ padding: '8px 14px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>+ New</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Search results */}
          {showSearch && search && (
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>People</div>
              {filteredUsers.length === 0 && <div style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text3)' }}>No users found</div>}
              {filteredUsers.slice(0, 8).map(u => (
                <div key={u.id} onClick={() => openConversation(u)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                    {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text1)' }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Conversations */}
          {!showSearch || !search ? (
            conversations.length === 0 ? (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text2)', marginBottom: '4px' }}>No messages yet</div>
                <div style={{ fontSize: '13px' }}>Search for someone to start a conversation</div>
              </div>
            ) : conversations.map(u => (
              <div key={u.id} onClick={() => openConversation(u)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: activeUser?.id === u.id ? 'var(--bg2)' : 'none', transition: 'background .15s' }}
                onMouseOver={e => { if (activeUser?.id !== u.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
                onMouseOut={e => { if (activeUser?.id !== u.id) (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                  {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{u.name}</div>
                    {u.lastMsg && <div style={{ fontSize: '10px', color: 'var(--text3)', flexShrink: 0, marginLeft: '6px' }}>{timeAgo(u.lastMsg.created_at)}</div>}
                  </div>
                  {u.lastMsg && (
                    <div style={{ fontSize: '12px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.lastMsg.isMe ? 'You: ' : ''}
                      {u.lastMsg.content.startsWith('__SHARED_POST__') ? '📎 Shared a post' : u.lastMsg.content}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : null}
        </div>
      </div>

      {/* CHAT */}
      <div className={`msg-chat${view === 'list' ? ' hidden' : ''}`}>

        {!activeUser ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '48px' }}>💬</div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text2)' }}>Your Messages</div>
            <div style={{ fontSize: '13px' }}>Click + New to start a conversation</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg0)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: '0', minWidth: '36px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: activeUser.avatar_url ? 'none' : getColor(activeUser.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                {activeUser.avatar_url ? <img src={activeUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (activeUser.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text1)' }}>{activeUser.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{activeUser.username}</div>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: '13px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>👋</div>
                  Say hello to {activeUser.name}!
                </div>
              )}
              {messages.map((msg: any, i: number) => {
                const isMe = msg.from_user === currentUserId
                const prevMsg = messages[i - 1]
                const showAvatar = !isMe && (!prevMsg || prevMsg.from_user !== msg.from_user)
                const parsed = parseMessage(msg.content)

                return (
                  <div key={msg.id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
                    {!isMe && (
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: showAvatar ? getColor(activeUser.name || 'U') : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                        {showAvatar && (activeUser.avatar_url
                          ? <img src={activeUser.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : (activeUser.name || 'U').charAt(0).toUpperCase()
                        )}
                      </div>
                    )}

                    {parsed.type === 'shared_post' && parsed.post ? (
                      <div style={{ maxWidth: '80%' }}>
                        {/* Optional note above the card */}
                        {parsed.note && (
                          <div style={{ padding: '6px 12px', marginBottom: '4px', fontSize: '13px', color: isMe ? '#fff' : 'var(--text1)', background: isMe ? 'var(--accent)' : 'var(--bg3)', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', border: isMe ? 'none' : '1px solid var(--border)' }}>
                            {parsed.note}
                          </div>
                        )}
                        {/* Post card */}
                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '14px', overflow: 'hidden', maxWidth: '280px' }}>
                          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              📎 Shared post
                              {parsed.post.room && <><span>·</span><span>{parsed.post.room_emoji} {parsed.post.room}</span></>}
                            </div>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', marginBottom: '6px' }}>{parsed.post.author}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text1)', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {parsed.post.content}
                            </div>
                          </div>
                          {parsed.post.media_url && (
                            <img src={parsed.post.media_url} alt="" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }} />
                          )}
                          <div style={{ padding: '8px 12px', display: 'flex', gap: '12px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>❤️ {parsed.post.like_count}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>💬 {parsed.post.comment_count}</span>
                          </div>
                        </div>
                        {isMe && <div style={{ fontSize: '10px', color: 'var(--text3)', textAlign: 'right', marginTop: '2px' }}>{msg.read_at ? '✓✓' : '✓'}</div>}
                      </div>
                    ) : (
                      <div style={{ maxWidth: '72%', padding: '9px 13px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? 'var(--accent)' : 'var(--bg3)', color: isMe ? '#fff' : 'var(--text1)', border: isMe ? 'none' : '1px solid var(--border)', fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word' }}>
                        {msg.content}
                        {isMe && (
                          <div style={{ fontSize: '10px', opacity: .7, marginTop: '2px', textAlign: 'right' }}>
                            {msg.read_at ? '✓✓' : '✓'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Typing indicator */}
            {typingUsers.size > 0 && (
              <div style={{ padding: '4px 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--text3)', animation: `bounce .9s ease ${i * 0.15}s infinite` }} />)}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{activeUser.name} is typing…</span>
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg0)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg3)', borderRadius: '24px', padding: '8px 8px 8px 16px' }}>
                <input value={input} onChange={e => { setInput(e.target.value); handleTyping() }} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={`Message ${activeUser.name}…`} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '14px', fontFamily: 'inherit' }} />
                <button onClick={sendMessage} disabled={!input.trim() || sending} style={{ width: '36px', height: '36px', background: input.trim() ? 'var(--accent)' : 'transparent', border: 'none', borderRadius: '50%', cursor: 'pointer', color: input.trim() ? '#fff' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
