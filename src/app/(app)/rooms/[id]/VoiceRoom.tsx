'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function VoiceRoom({ room, members, currentUser, isMember }: any) {
  const [joined, setJoined] = useState(isMember)
  const [callJoined, setCallJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [participants, setParticipants] = useState<any[]>([])
  const [muted, setMuted] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [isOwner] = useState(room.created_by === currentUser.id)
  const callRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callRef.current) {
        callRef.current.destroy()
        callRef.current = null
      }
    }
  }, [])

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  async function joinCall() {
    setLoading(true)
    setError('')
    try {
      // Get Daily room + token from our API
      const roomName = `rooms-${room.id.replace(/-/g, '').slice(0, 20)}`
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-or-create-room', roomName, isOwner })
      })
      const { url, token, error: apiError } = await res.json()
      if (apiError) { setError('Failed to create room. Try again.'); setLoading(false); return }

      // Dynamically import Daily to avoid SSR issues
      const DailyIframe = (await import('@daily-co/daily-js')).default
      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false, // Voice only
      })
      callRef.current = call

      // Event listeners
      call.on('joined-meeting', () => {
        setCallJoined(true)
        setLoading(false)
        updateParticipants(call)
      })
      call.on('participant-joined', () => updateParticipants(call))
      call.on('participant-updated', () => updateParticipants(call))
      call.on('participant-left', () => updateParticipants(call))
      call.on('error', (e: any) => {
        setError('Connection error. Please try again.')
        setLoading(false)
      })
      call.on('left-meeting', () => {
        setCallJoined(false)
        setParticipants([])
      })

      // Join the call
      await call.join({ url, token, startAudioOff: !isOwner })
      setMuted(!isOwner)

    } catch (e) {
      setError('Failed to join. Check your microphone permissions.')
      setLoading(false)
    }
  }

  function updateParticipants(call: any) {
    const ps = call.participants()
    setParticipants(Object.values(ps))
  }

  async function toggleMute() {
    if (!callRef.current) return
    const newMuted = !muted
    await callRef.current.setLocalAudio(!newMuted)
    setMuted(newMuted)
  }

  async function leaveCall() {
    if (callRef.current) {
      await callRef.current.leave()
      callRef.current.destroy()
      callRef.current = null
    }
    setCallJoined(false)
    setParticipants([])
    setHandRaised(false)
  }

  const speakingCount = participants.filter((p: any) => !p.audio?.blocked && p.tracks?.audio?.state === 'playable').length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => { leaveCall(); router.back() }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px', minWidth: '36px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {room.name} {callJoined && <span className="live-dot" />}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
            Voice room · {participants.length > 0 ? `${participants.length} in call` : `${members.length} members`}
          </div>
        </div>
        {isOwner && <div style={{ padding: '4px 10px', background: 'rgba(99,102,241,.15)', border: '1px solid var(--accentbdr)', borderRadius: '6px', fontSize: '11px', color: 'var(--accent2)' }}>👑 Host</div>}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--red)' }}>
            {error}
          </div>
        )}

        {/* Not in call yet */}
        {!callJoined ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎙️</div>
            <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '8px' }}>{room.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>
              {isOwner ? 'You are the host. You can control who speaks.' : 'Join muted. Raise hand to request mic access.'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '28px' }}>
              {members.length} member{members.length !== 1 ? 's' : ''}
            </div>
            {!joined ? (
              <button onClick={joinRoom} style={{ padding: '12px 32px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }}>Join Room</button>
            ) : (
              <button onClick={joinCall} disabled={loading} style={{ padding: '12px 32px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', opacity: loading ? .7 : 1 }}>
                {loading ? <><div className="spinner" />Connecting…</> : '🎙️ Join Voice Room'}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Participants grid */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
                {participants.length} in call
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {participants.map((p: any) => {
                  const name = p.user_name || p.user_id?.slice(0, 8) || 'Guest'
                  const isSpeaking = p.tracks?.audio?.state === 'playable' && !p.audio?.blocked
                  const isLocal = p.local
                  return (
                    <div key={p.session_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 10px', background: 'var(--bg2)', border: `1px solid ${isSpeaking ? 'rgba(34,197,94,.4)' : 'var(--border)'}`, borderRadius: '12px', transition: 'border-color .2s', boxShadow: isSpeaking ? '0 0 12px rgba(34,197,94,.15)' : 'none' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: getColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff', border: `2px solid ${isSpeaking ? 'var(--green)' : 'transparent'}`, transition: 'border-color .2s' }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        {isSpeaking && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', background: 'var(--green)', borderRadius: '50%', border: '2px solid var(--bg2)', animation: 'pulse 1.5s infinite' }} />}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text1)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80px' }}>{isLocal ? 'You' : name}</div>
                      {p.audio?.blocked === false ? null : <div style={{ fontSize: '10px', color: 'var(--text3)' }}>🔇</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Host controls info */}
            {isOwner && (
              <div style={{ background: 'rgba(99,102,241,.08)', border: '1px solid var(--accentbdr)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--accent2)' }}>
                👑 As host, you can manage participants from the Daily.co interface. Members join muted and can raise their hand.
              </div>
            )}
            {!isOwner && (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>Raise your hand to request microphone access from the host</div>
                <button onClick={() => setHandRaised(!handRaised)} style={{ padding: '7px 16px', background: handRaised ? 'rgba(234,179,8,.15)' : 'var(--bg3)', border: `1px solid ${handRaised ? 'rgba(234,179,8,.3)' : 'var(--border)'}`, borderRadius: '8px', color: handRaised ? 'var(--yellow)' : 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {handRaised ? '✋ Hand raised' : '✋ Raise hand'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom controls — only when in call */}
      {callJoined && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button onClick={toggleMute} style={{ width: '52px', height: '52px', borderRadius: '50%', background: muted ? 'rgba(239,68,68,.15)' : 'var(--bg3)', border: `1px solid ${muted ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', transition: 'all .2s' }}>
            {muted ? '🔇' : '🎙️'}
          </button>
          <button onClick={leaveCall} style={{ padding: '0 24px', height: '52px', borderRadius: '26px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📴 Leave
          </button>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text3)' }}>
            {participants.length}👤
          </div>
        </div>
      )}
    </div>
  )
}
