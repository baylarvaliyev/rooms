'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function VideoRoom({ room, members, currentUser, isMember }: any) {
  const [joined, setJoined] = useState(isMember)
  const [callJoined, setCallJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [participants, setParticipants] = useState<any[]>([])
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(false)
  const [isOwner] = useState(room.created_by === currentUser.id)
  const [isMobile, setIsMobile] = useState(false)
  const [dailyUrl, setDailyUrl] = useState('')
  const [dailyToken, setDailyToken] = useState('')
  const callRef = useRef<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    setIsMobile(mobile)
    return () => {
      if (callRef.current) { callRef.current.destroy(); callRef.current = null }
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
      const roomName = `video-${room.id.replace(/-/g, '').slice(0, 38)}`
      const userName = currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split('@')[0] || 'Guest'

      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-or-create-room', roomName, isOwner, userName, enableVideo: true })
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error || 'Failed to connect'); setLoading(false); return }
      const { url, token } = json

      if (isMobile) {
        setDailyUrl(url)
        setDailyToken(token)
        setCallJoined(true)
        setLoading(false)
        return
      }

      const DailyIframe = (await import('@daily-co/daily-js')).default
      const call = DailyIframe.createCallObject({ audioSource: true, videoSource: true })
      callRef.current = call

      call.on('joined-meeting', () => { setCallJoined(true); setLoading(false); updateParticipants(call) })
      call.on('participant-joined', () => updateParticipants(call))
      call.on('participant-updated', () => updateParticipants(call))
      call.on('participant-left', () => updateParticipants(call))
      call.on('error', (e: any) => { setError(`Error: ${e?.errorMsg || 'Unknown'}. Try again.`); setLoading(false) })
      call.on('left-meeting', () => { setCallJoined(false); setParticipants([]) })

      await call.join({ url, token, startAudioOff: false, startVideoOff: false })

    } catch (e: any) {
      setError(e.message || 'Failed to join. Check camera/mic permissions.')
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

  async function toggleCamera() {
    if (!callRef.current) return
    const newOff = !cameraOff
    await callRef.current.setLocalVideo(!newOff)
    setCameraOff(newOff)
  }

  async function leaveCall() {
    if (callRef.current) { await callRef.current.leave(); callRef.current.destroy(); callRef.current = null }
    setCallJoined(false); setParticipants([]); setDailyUrl(''); setDailyToken('')
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
            Video room · {participants.length > 0 ? `${participants.length} in call` : `${members.length} members`}
          </div>
        </div>
        {isOwner && <div style={{ padding: '4px 10px', background: 'rgba(99,102,241,.15)', border: '1px solid var(--accentbdr)', borderRadius: '6px', fontSize: '11px', color: 'var(--accent2)' }}>👑 Host</div>}
      </div>

      {/* Mobile iframe */}
      {callJoined && isMobile && dailyUrl && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <iframe
            src={`${dailyUrl}?t=${dailyToken}`}
            allow="camera; microphone; autoplay; display-capture; fullscreen"
            style={{ flex: 1, border: 'none', width: '100%' }}
          />
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg1)', display: 'flex', justifyContent: 'center' }}>
            <button onClick={leaveCall} style={{ padding: '10px 24px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: '24px', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit' }}>
              📴 Leave
            </button>
          </div>
        </div>
      )}

      {/* Desktop video grid */}
      {callJoined && !isMobile && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {participants.map((p: any) => {
              const name = p.user_name || 'Guest'
              const isSpeaking = p.tracks?.audio?.state === 'playable'
              const hasVideo = p.tracks?.video?.state === 'playable'
              return (
                <div key={p.session_id} style={{ position: 'relative', background: 'var(--bg3)', borderRadius: '12px', overflow: 'hidden', border: `2px solid ${isSpeaking ? 'rgba(34,197,94,.5)' : 'var(--border)'}`, aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {hasVideo ? (
                    <video
                      ref={el => {
                        if (el && p.tracks?.video?.persistentTrack) {
                          el.srcObject = new MediaStream([p.tracks.video.persistentTrack])
                          el.play().catch(() => {})
                        }
                      }}
                      autoPlay playsInline muted={p.local}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: getColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: '#fff' }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Camera off</div>
                    </div>
                  )}
                  <div style={{ position: 'absolute', bottom: '8px', left: '10px', fontSize: '12px', fontWeight: '500', color: '#fff', background: 'rgba(0,0,0,.5)', padding: '3px 8px', borderRadius: '6px' }}>
                    {p.local ? 'You' : name} {isSpeaking ? '🎙️' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pre-join screen */}
      {!callJoined && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--red)' }}>{error}</div>
          )}
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎥</div>
            <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '8px' }}>{room.name}</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>
              {isOwner ? 'You are the host.' : 'Camera and mic will be enabled when you join.'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '28px' }}>Up to 6 participants</div>
            {!joined ? (
              <button onClick={joinRoom} style={{ padding: '12px 32px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>Join Room</button>
            ) : (
              <button onClick={joinCall} disabled={loading} style={{ padding: '12px 32px', background: 'var(--accent)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: loading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', opacity: loading ? .7 : 1 }}>
                {loading ? <><div className="spinner" />Connecting…</> : '🎥 Join Video Room'}
              </button>
            )}
          </div>

          {members.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>{members.length} members</div>
              {members.slice(0, 8).map((m: any) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', marginBottom: '2px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: getColor(m.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {(m.profiles?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>{m.profiles?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{m.role === 'owner' ? '👑 Host' : 'Member'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop controls */}
      {callJoined && !isMobile && (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <button onClick={toggleMute} style={{ width: '48px', height: '48px', borderRadius: '50%', background: muted ? 'rgba(239,68,68,.15)' : 'var(--bg3)', border: `1px solid ${muted ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            {muted ? '🔇' : '🎙️'}
          </button>
          <button onClick={leaveCall} style={{ padding: '0 24px', height: '48px', borderRadius: '24px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', color: 'var(--red)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📴 Leave
          </button>
          <button onClick={toggleCamera} style={{ width: '48px', height: '48px', borderRadius: '50%', background: cameraOff ? 'rgba(239,68,68,.15)' : 'var(--bg3)', border: `1px solid ${cameraOff ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            {cameraOff ? '📵' : '📹'}
          </button>
        </div>
      )}
    </div>
  )
}
