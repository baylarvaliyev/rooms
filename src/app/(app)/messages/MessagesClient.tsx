'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function MessagesClient({ currentUser, allUsers }: any) {
  const [conversations, setConversations] = useState<any[]>([])
  const [activeUser, setActiveUser] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [view, setView] = useState<'list' | 'chat'>('list') // mobile view toggle
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { loadConversations() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!activeUser) return
    const channel = supabase.channel(`dm:${currentUser.id}:${activeUser.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, async (payload) => {
        const msg = payload.new as any
        const isRelevant = (msg.from_user === currentUser.id && msg.to_user === activeUser.id) || (msg.from_user === activeUser.id && msg.to_user === currentUser.id)
        if (isRelevant) { setMessages(prev => [...prev, msg]); loadConversations() }
      }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeUser])

  async function loadConversations() {
    const { data: sent } = await supabase.from('direct_messages').select('to_user').eq('from_user', currentUser.id)
    const { data: received } = await supabase.from('direct_messages').select('from_user').eq('to_user', currentUser.id)
    const partnerIds = new Set<string>()
    ;(sent || []).forEach((m: any) => partnerIds.add(m.to_user))
    ;(received || []).forEach((m: any) => partnerIds.add(m.from_user))
    if (partnerIds.size === 0) return
    const { data: partners } = await supabase.from('profiles').select('id, name, username').in('id', [...partnerIds])
    setConversations(partners || [])
  }

  async function openConversation(user: any) {
    setActiveUser(user)
    setView('chat')
    const { data } = await supabase.from('direct_messages').select('*')
      .or(`and(from_user.eq.${currentUser.id},to_user.eq.${user.id}),and(from_user.eq.${user.id},to_user.eq.${currentUser.id})`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setShowSearch(false)
    setSearch('')
  }

  async function sendMessage() {
    if (!input.trim() || !activeUser || sending) return
    setSending(true)
    const { data } = await supabase.from('direct_messages').insert({ from_user: currentUser.id, to_user: activeUser.id, content: input.trim() }).select().single()
    if (data) { setMessages(prev => [...prev, data]); setInput(''); loadConversations() }
    setSending(false)
  }

  const filteredUsers = allUsers.filter((u: any) =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="msg-shell">

      {/* SIDEBAR */}
      <div className={`msg-sidebar${view === 'chat' ? ' hidden' : ''}`}>
          <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>Messages</span>
            <button onClick={() => setShowSearch(!showSearch)} style={{ background: 'var(--accent)', border: 'none', borderRadius: '7px', color: '#fff', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>+ New</button>
          </div>

          {showSearch && (
            <div style={{ padding: '10px', borderBottom: '1px solid var(--border)' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…" autoFocus style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
              <div style={{ marginTop: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                {filteredUsers.map((u: any) => (
                  <div key={u.id} onClick={() => openConversation(u)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 8px', borderRadius: '8px', cursor: 'pointer' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getColor(u.name), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>{u.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text1)' }}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conversations.length === 0 && !showSearch ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No conversations yet.<br />Click + New to start one.</div>
            ) : conversations.map((u: any) => (
              <div key={u.id} onClick={() => openConversation(u)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: activeUser?.id === u.id ? 'rgba(99,102,241,.08)' : 'none', transition: 'background .18s' }}
                onMouseOver={e => { if (activeUser?.id !== u.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
                onMouseOut={e => { if (activeUser?.id !== u.id) (e.currentTarget as HTMLElement).style.background = 'none' }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: getColor(u.name), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: '#fff' }}>{u.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{u.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* CHAT */}
      <div className={`msg-chat${view === 'list' ? ' hidden' : ''}`}>
          {!activeUser ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '40px' }}>💬</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text2)' }}>Your Messages</div>
              <div style={{ fontSize: '13px' }}>Click + New to start a conversation</div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                {/* Back button — mobile only */}
                <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px', padding: '0', minWidth: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: getColor(activeUser.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>{activeUser.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '14px' }}>{activeUser.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{activeUser.username}</div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)', fontSize: '13px' }}>Start a conversation with {activeUser.name}</div>
                )}
                {messages.map((msg: any) => {
                  const isMe = msg.from_user === currentUser.id
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', animation: 'fadeUp .22s ease' }}>
                      <div style={{ maxWidth: '75%', padding: '9px 13px', borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px', background: isMe ? 'var(--accent)' : 'var(--bg3)', color: isMe ? '#fff' : 'var(--text2)', border: isMe ? 'none' : '1px solid var(--border)', fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '7px 8px 7px 14px' }}>
                  <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={`Message ${activeUser.name}…`} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '13px', fontFamily: 'inherit' }} />
                  <button onClick={sendMessage} disabled={!input.trim() || sending} style={{ width: '34px', height: '34px', background: 'var(--accent)', border: 'none', borderRadius: '8px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', opacity: !input.trim() ? .5 : 1 }}>↑</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
