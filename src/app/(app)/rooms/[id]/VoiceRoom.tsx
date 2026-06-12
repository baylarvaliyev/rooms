'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function VoiceRoom({ room, members, currentUser, isMember }: any) {
  const [joined, setJoined] = useState(isMember)
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  // Simulate speaking indicator
  function toggleSpeak(userId: string) {
    setSpeaking(prev => prev === userId ? null : userId)
  }

  const allParticipants = [
    ...members.map((m: any) => ({
      id: m.user_id,
      name: m.profiles?.name || 'Unknown',
      role: m.role,
      muted: false,
    })),
  ]

  // Add current user if joined but not in members yet
  const isInList = allParticipants.some(p => p.id === currentUser.id)
  if (joined && !isInList) {
    const myName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'You'
    allParticipants.push({ id: currentUser.id, name: myName, role: 'member', muted })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg0)' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>{room.name} <span className="live-dot" /></div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Voice room · {allParticipants.length} in room</div>
        </div>
        {!joined
          ? <button onClick={joinRoom} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join Room</button>
          : <div style={{ padding: '5px 12px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓ Live</div>
        }
      </div>

      {/* Participants grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {!joined ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎙️</div>
            <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '8px', color: 'var(--text2)' }}>
              {room.name} is live
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '20px' }}>
              {allParticipants.length} people in the room right now
            </div>
            <button onClick={joinRoom} style={{ padding: '11px 28px', background: 'var(--green)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              🎙️ Join Room
            </button>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                {allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''} · Click someone to simulate speaking
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '14px', maxWidth: '700px', margin: '0 auto' }}>
              {allParticipants.map(p => {
                const isSpeaking = speaking === p.id
                const isMe = p.id === currentUser.id
                const color = getColor(p.name)
                return (
                  <div
                    key={p.id}
                    onClick={() => isMe ? null : toggleSpeak(p.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '10px', padding: '20px 14px',
                      borderRadius: '14px', cursor: isMe ? 'default' : 'pointer',
                      background: isSpeaking ? 'rgba(34,197,94,.08)' : 'var(--bg2)',
                      border: `2px solid ${isSpeaking ? 'var(--green)' : 'var(--border)'}`,
                      transition: 'all .25s',
                      boxShadow: isSpeaking ? '0 0 20px rgba(34,197,94,.15)' : 'none'
                    }}
                  >
                    {/* Avatar with speaking ring */}
                    <div style={{ position: 'relative' }}>
                      {isSpeaking && (
                        <div style={{
                          position: 'absolute', inset: '-6px', borderRadius: '50%',
                          border: '2px solid var(--green)',
                          animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                      )}
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '50%',
                        background: color, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff'
                      }}>{p.name.charAt(0).toUpperCase()}</div>
                    </div>

                    {/* Wave bars when speaking */}
                    {isSpeaking && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '20px' }}>
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} style={{
                            width: '3px', background: 'var(--green)', borderRadius: '2px',
                            animation: `waveBar .7s ${i * 0.1}s infinite`
                          }} />
                        ))}
                      </div>
                    )}

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)' }}>
                        {isMe ? 'You' : p.name.split(' ')[0]}
                        {isMe && <span style={{ fontSize: '10px', color: 'var(--accent2)', display: 'block' }}>You</span>}
                      </div>
                      {p.role === 'owner' && <div style={{ fontSize: '10px', color: 'var(--yellow)' }}>Host</div>}
                    </div>

                    {/* Muted indicator */}
                    {(isMe && muted) && (
                      <div style={{ fontSize: '10px', color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        🔇 Muted
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {joined && (
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          background: 'var(--bg1)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px'
        }}>
          <button
            onClick={() => setMuted(!muted)}
            style={{
              width: '52px', height: '52px', borderRadius: '50%', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', transition: 'all .2s',
              background: muted ? 'rgba(239,68,68,.15)' : 'var(--bg3)',
              border: `1px solid ${muted ? 'rgba(239,68,68,.3)' : 'var(--border)'}`,
            }}
            title={muted ? 'Unmute' : 'Mute'}
          >{muted ? '🔇' : '🎙️'}</button>

          <button
            style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', background: 'var(--bg3)' }}
            title="Raise hand"
            onClick={() => setSpeaking(currentUser.id)}
          >✋</button>

          <button
            style={{ width: '52px', height: '52px', borderRadius: '50%', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', background: 'var(--bg3)' }}
            title="React"
          >😄</button>

          <button
            onClick={() => router.push('/explore')}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              border: '1px solid rgba(239,68,68,.3)',
              background: 'rgba(239,68,68,.1)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', color: 'var(--red)'
            }}
            title="Leave"
          >✕</button>
        </div>
      )}
    </div>
  )
}