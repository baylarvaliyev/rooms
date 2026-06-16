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
  const [wasInCall, setWasInCall] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [participants, setParticipants] = useState<any[]>([])
  const [muted, setMuted] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [isOwner] = useState(room.created_by === currentUser.id)
  const [isMobile, setIsMobile] = useState(false)
  const [dailyUrl, setDailyUrl] = useState('')
  const [dailyToken, setDailyToken] = useState('')
  const callRef = useRef<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Detect mobile
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setIsMobile(mobile)

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

  async function getCredentials() {
    const roomName = `room-${room.id.replace(/-/g, '').slice(0, 40)}`
    const userName = currentUser?.user_metadata?.full_name ||
      currentUser?.user_metadata?.name ||
      currentUser?.email?.split('@')[0] || 'Guest'
    const res = await fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-or-create-room', roomName, isOwner, userName })
    })
    const json = await res.json()
    if (!res.ok || json.error) throw new Error(json.error || 'Failed to connect')
    return json
  }

  async function joinCall() {
    setLoading(true)
    setError('')
    try {
      const { url, token } = await getCredentials()

      if (isMobile) {
        // Mobile: use iframe embed (avoids SDK auth issues on Safari)
        setDailyUrl(url)
        setDailyToken(token)
        setCallJoined(true)
        setLoading(false)
        return
      }

      // Desktop: use call object for better control
      const DailyIframe = (await import('@daily-co/daily-js')).default
      const call = DailyIframe.createCallObject({
        audioSource: true,
        videoSource: false,
      })
      callRef.current = call

      call.on('joined-meeting', () => {
        setCallJoined(true)
        setLoading(false)
        updateParticipants(call)
      })
      call.on('participant-joined', () => updateParticipants(call))
      call.on('participant-updated', () => updateParticipants(call))
      call.on('participant-left', () => updateParticipants(call))
      call.on('error', (e: any) => {
        console.error('Daily error:', e)
        setError(`Connection error: ${e?.errorMsg || 'Unknown'}. Try again.`)
        setLoading(false)
      })
      call.on('left-meeting', () => {
        setCallJoined(false)
        setParticipants([])
      })

      await call.join({ url, token, startAudioOff: !isOwner })
      setMuted(!isOwner)

    } catch (e: any) {
      setError(e.message || 'Failed to join. Check microphone permissions.')
      setLoading(false)
    }
  }

  function updateParticipants(call: any) {
    setParticipants(Object.values(call.participants()))
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
    setDailyUrl('')
    setDailyToken('')
    setWasInCall(true) // Issue 37: track that user was in call
  }

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

      {/* Mobile iframe embed */}
      {callJoined && isMobile && dailyUrl && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <iframe
            src={`${dailyUrl}?t=${dailyToken}&embed=true&showLeaveButton=false&showFullscreenButton=false`}
            allow="camera; microphone; autoplay; display-capture; fullscreen; speaker-selection"
            allowFullScreen
            style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
          />
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg1)', display: 'flex', gap: '10px', justifyContent: 'center', flexShrink: 0, paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <button onClick={leaveCall} style={{ padding: '10px 32px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '24px', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit' }}>
              📴 Leave
            </button>
          </div>
        </div>
      )}

      {/* Desktop call view */}
      {callJoined && !isMobile && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>
              {participants.length} in call
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
              {participants.map((p: any) => {
                const name = p.user_name || 'Guest'
                const isSpeaking = p.tracks?.audio?.state === 'playable'
                return (
                  <div key={p.session_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '14px 10px', background: 'var(--bg2)', border: `1px solid ${isSpeaking ? 'rgba(34,197,94,.4)' : 'var(--border)'}`, borderRadius: '12px', boxShadow: isSpeaking ? '0 0 12px rgba(34,197,94,.15)' : 'none' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: getColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff', border: `2px solid ${isSpeaking ? 'var(--green)' : 'transparent'}` }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      {isSpeaking && <div style={{ position: 'absolute', bottom: 0, right: 0, width: '14px', height: '14px', background: 'var(--green)', borderRadius: '50%', border: '2px solid var(--bg2)' }} />}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '500', textAlign: 'center' }}>{p.local ? 'You' : name}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {!isOwner && (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px' }}>Raise hand to request mic from host</div>
              <button onClick={() => setHandRaised(!handRaised)} style={{ padding: '7px 16px', background: handRaised ? 'rgba(234,179,8,.15)' : 'var(--bg3)', border: `1px solid ${handRaised ? 'rgba(234,179,8,.3)' : 'var(--border)'}`, borderRadius: '8px', color: handRaised ? 'var(--yellow)' : 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                {handRaised ? '✋ Hand raised' : '✋ Raise hand'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pre-join screen */}
      {!callJoined && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--red)' }}>
              {error}
            </div>
          )}
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎙️</div>
            <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '8px' }}>{room.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px' }}>
              {isOwner ? 'You are the host. You control who speaks.' : 'You will join muted. Raise hand to speak.'}
            </div>
            {!joined ? (
              <button onClick={joinRoom} style={{ padding: '12px 32px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Join Room</button>
            ) : (
              <button onClick={joinCall} disabled={loading} style={{ padding: '12px 32px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', opacity: loading ? .7 : 1 }}>
                {loading ? <><div className="spinner" />Connecting…</> : wasInCall ? '🎙️ Rejoin Voice Room' : '🎙️ Join Voice Room'}
              </button>
            )}
          </div>

          {/* Members list */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>{members.length} members</div>
            {members.slice(0, 12).map((m: any) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', marginBottom: '2px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: getColor(m.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>{(m.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500' }}>{m.profiles?.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{m.role === 'owner' ? '👑 Host' : 'Member'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom controls — desktop only */}
      {callJoined && !isMobile && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <button onClick={toggleMute} style={{ width: '52px', height: '52px', borderRadius: '50%', background: muted ? 'rgba(239,68,68,.15)' : 'var(--bg3)', border: `1px solid ${muted ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
            {muted ? '🔇' : '🎙️'}
          </button>
          <button onClick={leaveCall} style={{ padding: '0 24px', height: '52px', borderRadius: '26px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📴 Leave
          </button>
        </div>
      )}
    </div>
  )
}
