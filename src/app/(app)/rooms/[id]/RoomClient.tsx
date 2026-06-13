'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const ROOM_COLORS: Record<string, string> = {
  Business: 'linear-gradient(135deg,#0a1e3a,#1a3a6e)',
  Technology: 'linear-gradient(135deg,#1e0a3a,#3d1a5e)',
  Music: 'linear-gradient(135deg,#3a0a1e,#6e1a3e)',
  Study: 'linear-gradient(135deg,#0a2a1a,#1a4a30)',
  Travel: 'linear-gradient(135deg,#1e1a00,#3a3200)',
  Art: 'linear-gradient(135deg,#2a0a1a,#5e1a30)',
  Fitness: 'linear-gradient(135deg,#0a2a0a,#1a4a1a)',
  Finance: 'linear-gradient(135deg,#2a1a00,#4e3200)',
  Cars: 'linear-gradient(135deg,#3a0a0a,#6e1a1a)',
  Lifestyle: 'linear-gradient(135deg,#0a0a2a,#1a1a4e)',
}

export default function RoomClient({ room, initialMessages, members: initialMembers, currentUser, isMember }: any) {
  const [messages, setMessages] = useState(initialMessages)
  const [members, setMembers] = useState(initialMembers)
  const [input, setInput] = useState('')
  const [joined, setJoined] = useState(isMember)
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [onlineCount, setOnlineCount] = useState(1)
  const [pinnedMsg, setPinnedMsg] = useState<any>(null)
  const [pinInput, setPinInput] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [rules, setRules] = useState(room.rules || '')
  const [editingRules, setEditingRules] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ msgId: string, x: number, y: number, content: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const isOwner = room.created_by === currentUser.id
  const myMembership = members.find((m: any) => m.user_id === currentUser.id)
  const isMod = isOwner || myMembership?.is_moderator

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadPinnedMessage()

    const channel = supabase.channel(`room:${room.id}`, {
      config: { presence: { key: currentUser.id } }
    })
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        const { data } = await supabase.from('messages').select('*, profiles(name, username)').eq('id', payload.new.id).single()
        if (data) setMessages((prev: any[]) => [...prev, data])
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        setMessages((prev: any[]) => prev.filter((m: any) => m.id !== payload.old.id))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const myName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User'
          await channel.track({ user_id: currentUser.id, name: myName, online_at: new Date().toISOString() })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [room.id])

  async function loadPinnedMessage() {
    const { data } = await supabase.from('room_pinned_messages').select('*').eq('room_id', room.id).single()
    if (data) setPinnedMsg(data)
  }

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    await supabase.from('rooms').update({ member_count: (room.member_count || 0) + 1 }).eq('id', room.id)
    setJoined(true)
  }

  async function sendMessage() {
    if (!input.trim() || !joined || sending) return
    setSending(true)
    await supabase.from('messages').insert({ room_id: room.id, user_id: currentUser.id, content: input.trim() })
    setInput('')
    setSending(false)
  }

  async function deleteMessage(msgId: string) {
    await supabase.from('messages').delete().eq('id', msgId)
    setContextMenu(null)
  }

  async function pinMessage(content: string) {
    if (!content.trim()) return
    await supabase.from('room_pinned_messages').upsert({ room_id: room.id, content: content.trim(), pinned_by: currentUser.id }, { onConflict: 'room_id' })
    setPinnedMsg({ content: content.trim() })
    setShowPinInput(false)
    setPinInput('')
  }

  async function unpinMessage() {
    await supabase.from('room_pinned_messages').delete().eq('room_id', room.id)
    setPinnedMsg(null)
  }

  async function kickMember(userId: string) {
    if (!confirm('Remove this member from the room?')) return
    await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', userId)
    setMembers((prev: any[]) => prev.filter((m: any) => m.user_id !== userId))
  }

  async function toggleModerator(userId: string, isMod: boolean) {
    await supabase.from('room_members').update({ is_moderator: !isMod }).eq('room_id', room.id).eq('user_id', userId)
    setMembers((prev: any[]) => prev.map((m: any) => m.user_id === userId ? { ...m, is_moderator: !isMod } : m))
  }

  async function saveRules() {
    await supabase.from('rooms').update({ rules }).eq('id', room.id)
    setEditingRules(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }} onClick={() => contextMenu && setContextMenu(null)}>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg0)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: ROOM_COLORS[room.category] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{room.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {room.name}
              {isOwner && <span style={{ fontSize: '10px', background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743)', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', flexShrink: 0 }}>👑 Founder</span>}
              {!isOwner && isMod && <span style={{ fontSize: '10px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '1px 6px', borderRadius: '4px', fontWeight: '600', flexShrink: 0 }}>🛡 Mod</span>}
              <span className="live-dot" />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
              {members.length} members · <span style={{ color: 'var(--green)' }}>{onlineCount} online</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => setShowMembers(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: showMembers ? 'var(--text1)' : 'var(--text3)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </button>
            {isMod && (
              <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </button>
            )}
            {!joined
              ? <button onClick={joinRoom} style={{ padding: '6px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
              : <div style={{ padding: '4px 8px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '11px', color: 'var(--green)' }}>✓</div>
            }
          </div>
        </div>

        {/* Pinned message */}
        {pinnedMsg && (
          <div style={{ padding: '8px 14px', background: 'rgba(99,102,241,.07)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>📌</span>
            <div style={{ flex: 1, fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>{pinnedMsg.content}</div>
            {isMod && <button onClick={unpinMessage} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>×</button>}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{room.emoji}</div>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--text2)' }}>Welcome to {room.name}</div>
              <div style={{ fontSize: '13px' }}>Be the first to say something!</div>
            </div>
          )}
          {messages.map((msg: any) => {
            const isMe = msg.user_id === currentUser.id
            const name = msg.profiles?.name || 'Unknown'
            const color = getColor(name)
            const memberInfo = members.find((m: any) => m.user_id === msg.user_id)
            const isFounder = msg.user_id === room.created_by
            const isModMsg = memberInfo?.is_moderator
            return (
              <div key={msg.id} style={{ display: 'flex', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row', animation: 'fadeUp .2s ease' }}>
                {!isMe && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff' }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: '72%' }}>
                  {!isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '500' }}>{name}</span>
                      {isFounder && <span style={{ fontSize: '9px', background: 'linear-gradient(135deg,#f09433,#dc2743)', color: '#fff', padding: '0 4px', borderRadius: '3px', fontWeight: '700' }}>👑</span>}
                      {!isFounder && isModMsg && <span style={{ fontSize: '9px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '0 4px', borderRadius: '3px' }}>🛡</span>}
                    </div>
                  )}
                  <div
                    onContextMenu={e => {
                      if (isMod || isMe) {
                        e.preventDefault()
                        setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY, content: msg.content })
                      }
                    }}
                    style={{ padding: '8px 12px', borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px', background: isMe ? 'var(--accent)' : 'var(--bg3)', color: isMe ? '#fff' : 'var(--text2)', border: isMe ? 'none' : '1px solid var(--border)', fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word', cursor: (isMod || isMe) ? 'context-menu' : 'default' }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Message context menu */}
        {contextMenu && (
          <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '10px', padding: '6px', zIndex: 500, minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
            {isMod && (
              <button onClick={() => { setPinInput(contextMenu.content); setShowPinInput(true); setContextMenu(null) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg4)'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >📌 Pin message</button>
            )}
            <button onClick={() => deleteMessage(contextMenu.msgId)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--red)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'inherit' }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,.1)'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >🗑 Delete message</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg0)', flexShrink: 0 }}>
          {!joined ? (
            <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text3)', fontSize: '13px' }}>Join the room to send messages</div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg3)', borderRadius: '24px', padding: '8px 8px 8px 16px' }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={`Message ${room.name}…`} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '14px', fontFamily: 'inherit' }} />
              <button onClick={sendMessage} disabled={!input.trim() || sending} style={{ width: '34px', height: '34px', background: input.trim() ? 'var(--accent)' : 'transparent', border: 'none', borderRadius: '50%', cursor: 'pointer', color: input.trim() ? '#fff' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MEMBERS PANEL */}
      {showMembers && (
        <div style={{ width: '220px', borderLeft: '1px solid var(--border)', background: 'var(--bg0)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Members · {members.length}</div>
            <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>×</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
            {members.map((m: any) => {
              const mname = m.profiles?.name || 'Unknown'
              const mcolor = getColor(mname)
              const mIsOwner = m.user_id === room.created_by
              const mIsMod = m.is_moderator
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '8px' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: mcolor, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{mname.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mname}</span>
                      {mIsOwner && <span style={{ fontSize: '9px' }}>👑</span>}
                      {!mIsOwner && mIsMod && <span style={{ fontSize: '9px' }}>🛡</span>}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{mIsOwner ? 'Founder' : mIsMod ? 'Moderator' : 'Member'}</div>
                  </div>
                  {/* Owner controls for other members */}
                  {isOwner && m.user_id !== currentUser.id && (
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button onClick={() => toggleModerator(m.user_id, mIsMod)} title={mIsMod ? 'Remove mod' : 'Make mod'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '3px', color: mIsMod ? 'var(--accent2)' : 'var(--text3)' }}>🛡</button>
                      <button onClick={() => kickMember(m.user_id)} title="Remove from room" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: '3px', color: 'var(--text3)' }}
                        onMouseOver={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
                        onMouseOut={e => (e.currentTarget as HTMLElement).style.color = 'var(--text3)'}
                      >✕</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '460px' }} className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>⚙️ Room Settings</div>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            {/* Pin a message */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>📌 Pinned Message</div>
              {pinnedMsg && !showPinInput ? (
                <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', fontSize: '13px', color: 'var(--text2)' }}>{pinnedMsg.content}</div>
              ) : null}
              {showPinInput || !pinnedMsg ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter a message to pin…" style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  <button onClick={() => pinMessage(pinInput)} style={{ padding: '8px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>Pin</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowPinInput(true)} style={{ padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer' }}>Change</button>
                  <button onClick={unpinMessage} style={{ padding: '7px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '8px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer' }}>Unpin</button>
                </div>
              )}
            </div>

            {/* Room rules */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>📋 Room Rules</div>
              {editingRules ? (
                <>
                  <textarea value={rules} onChange={e => setRules(e.target.value)} rows={4} placeholder="Set rules for your room…" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '8px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingRules(false)} style={{ padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={saveRules} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>Save</button>
                  </div>
                </>
              ) : (
                <div onClick={() => setEditingRules(true)} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: rules ? 'var(--text2)' : 'var(--text3)', cursor: 'pointer', minHeight: '40px' }}>
                  {rules || 'Click to add room rules…'}
                </div>
              )}
            </div>

            {/* Analytics — owner only */}
            {isOwner && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>📊 Room Analytics</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { label: 'Members', value: members.length },
                    { label: 'Online now', value: onlineCount },
                    { label: 'Messages', value: initialMessages.length + '+' },
                    { label: 'Moderators', value: members.filter((m: any) => m.is_moderator).length },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontWeight: '700', fontSize: '20px', color: 'var(--text1)' }}>{stat.value}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pin from context menu */}
      {showPinInput && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 901, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setShowPinInput(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '14px', padding: '20px', width: '100%', maxWidth: '400px' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>📌 Pin Message</div>
            <textarea value={pinInput} onChange={e => setPinInput(e.target.value)} rows={3} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowPinInput(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={() => pinMessage(pinInput)} style={{ flex: 2, padding: '9px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Pin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
