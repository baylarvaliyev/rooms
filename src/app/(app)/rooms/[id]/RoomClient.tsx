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

export default function RoomClient({ room, initialMessages, members, currentUser, isMember }: any) {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [joined, setJoined] = useState(isMember)
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select('*, profiles(name, username)')
          .eq('id', payload.new.id)
          .single()
        if (data) setMessages((prev: any[]) => [...prev, data])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id])

  async function joinRoom() {
    const { error } = await supabase.from('room_members').insert({
      room_id: room.id, user_id: currentUser.id, role: 'member'
    })
    if (!error) {
      await supabase.from('rooms').update({ member_count: (room.member_count || 0) + 1 }).eq('id', room.id)
      setJoined(true)
    }
  }

  async function sendMessage() {
    if (!input.trim() || !joined || sending) return
    setSending(true)
    await supabase.from('messages').insert({
      room_id: room.id,
      user_id: currentUser.id,
      content: input.trim()
    })
    setInput('')
    setSending(false)
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

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Room header */}
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px', padding: '0', minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: ROOM_COLORS[room.category] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{room.emoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {room.name} <span className="live-dot" />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{members.length} members</div>
          </div>
          {/* Members toggle button */}
          <button onClick={() => setShowMembers(s => !s)} style={{ background: showMembers ? 'var(--accentbg)' : 'none', border: `1px solid ${showMembers ? 'var(--accentbdr)' : 'var(--border)'}`, borderRadius: '8px', color: showMembers ? 'var(--accent2)' : 'var(--text3)', cursor: 'pointer', fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            👥 {members.length}
          </button>
          {!joined ? (
            <button onClick={joinRoom} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Join</button>
          ) : (
            <div style={{ padding: '5px 10px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500', flexShrink: 0 }}>✓</div>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{room.emoji}</div>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--text2)' }}>
                Welcome to {room.name}
              </div>
              <div style={{ fontSize: '13px' }}>Be the first to say something!</div>
            </div>
          )}
          {messages.map((msg: any) => {
            const isMe = msg.user_id === currentUser.id
            const name = msg.profiles?.name || 'Unknown'
            const color = getColor(name)
            return (
              <div key={msg.id} style={{
                display: 'flex', gap: '9px',
                flexDirection: isMe ? 'row-reverse' : 'row',
                animation: 'fadeUp .25s ease'
              }}>
                {!isMe && (
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: color, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: '700', color: '#fff'
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  {!isMe && (
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '3px' }}>{name}</div>
                  )}
                  <div style={{
                    maxWidth: '72%', padding: '9px 13px',
                    borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px',
                    background: isMe ? 'var(--accent)' : 'var(--bg3)',
                    color: isMe ? '#fff' : 'var(--text2)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word'
                  }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          background: 'var(--bg1)', flexShrink: 0
        }}>
          {!joined ? (
            <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text3)', fontSize: '13px' }}>
              Join the room to send messages
            </div>
          ) : (
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '8px 10px 8px 14px'
            }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={`Message ${room.name}…`}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text1)', fontSize: '13px', fontFamily: 'inherit'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                style={{
                  width: '32px', height: '32px', background: 'var(--accent)',
                  border: 'none', borderRadius: '8px', cursor: 'pointer',
                  color: '#fff', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '14px',
                  opacity: !input.trim() ? .5 : 1, transition: 'opacity .18s'
                }}
              >↑</button>
            </div>
          )}
        </div>
      </div>

      {/* MEMBERS PANEL — toggleable */}
      {showMembers && (
        <div style={{ width: '200px', borderLeft: '1px solid var(--border)', background: 'var(--bg1)', overflow: 'hidden', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Members · {members.length}</div>
            <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px', padding: '0' }}>×</button>
          </div>
          <div style={{ padding: '8px', overflowY: 'auto', flex: 1 }}>
            {members.map((m: any) => {
              const mname = m.profiles?.name || 'Unknown'
              const mcolor = getColor(mname)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: mcolor, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{mname.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mname}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{m.role}</div>
                  </div>
                  <span className="live-dot" style={{ width: '5px', height: '5px' }} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}