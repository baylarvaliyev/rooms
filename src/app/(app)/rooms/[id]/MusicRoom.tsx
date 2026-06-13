'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Extract YouTube video ID from URL
function getYouTubeId(url: string) {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export default function MusicRoom({ room, members, currentUser, isMember }: any) {
  const [joined, setJoined] = useState(isMember)
  const [tracks, setTracks] = useState<any[]>([])
  const [state, setState] = useState<any>({ current_index: 0, is_playing: false, position_seconds: 0, mode: 'youtube' })
  const [isOwner, setIsOwner] = useState(false)
  const [tab, setTab] = useState<'queue' | 'chat' | 'listeners'>('queue')
  const [messages, setMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showAddTrack, setShowAddTrack] = useState(false)
  const [addMode, setAddMode] = useState<'youtube' | 'upload'>('youtube')
  const [ytUrl, setYtUrl] = useState('')
  const [ytTitle, setYtTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [onlineCount, setOnlineCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const currentTrack = tracks[state.current_index] || null
  const ytId = currentTrack?.type === 'youtube' ? getYouTubeId(currentTrack.url) : null

  useEffect(() => {
    setIsOwner(room.created_by === currentUser.id)
    loadData()

    // Real-time music state sync
    const channel = supabase.channel(`music:${room.id}`, {
      config: { presence: { key: currentUser.id } }
    })
      .on('presence', { event: 'sync' }, () => {
        setOnlineCount(Object.keys(channel.presenceState()).length)
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'room_music_state',
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        const newState = payload.new as any
        if (newState && newState.updated_by !== currentUser.id) {
          setState(newState)
        }
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'room_tracks',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        const { data } = await supabase.from('room_tracks').select('*, profiles(name)').eq('id', payload.new.id).single()
        if (data) setTracks(prev => [...prev, data])
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'room_tracks',
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        setTracks(prev => prev.filter(t => t.id !== payload.old.id))
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        const { data } = await supabase.from('messages').select('*, profiles(name)').eq('id', payload.new.id).single()
        if (data) setMessages(prev => [...prev, data])
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUser.id, online_at: new Date().toISOString() })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Sync audio element for uploaded tracks
  useEffect(() => {
    if (!audioRef.current || !currentTrack || currentTrack.type !== 'upload') return
    audioRef.current.src = currentTrack.url
    if (state.is_playing) {
      audioRef.current.currentTime = state.position_seconds || 0
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [currentTrack?.id, state.is_playing])

  async function loadData() {
    setLoading(true)
    const [
      { data: tracksData },
      { data: stateData },
      { data: msgsData },
    ] = await Promise.all([
      supabase.from('room_tracks').select('*, profiles(name)').eq('room_id', room.id).order('position', { ascending: true }),
      supabase.from('room_music_state').select('*').eq('room_id', room.id).single(),
      supabase.from('messages').select('*, profiles(name)').eq('room_id', room.id).order('created_at', { ascending: true }).limit(50),
    ])
    setTracks(tracksData || [])
    if (stateData) setState(stateData)
    setMessages(msgsData || [])
    setLoading(false)
  }

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  async function updateMusicState(patch: any) {
    const newState = { ...state, ...patch, room_id: room.id, updated_by: currentUser.id, updated_at: new Date().toISOString() }
    setState(newState)
    // Upsert state
    await supabase.from('room_music_state').upsert(newState, { onConflict: 'room_id' })
  }

  async function playPause() {
    if (!isOwner) return
    await updateMusicState({ is_playing: !state.is_playing })
  }

  async function nextTrack() {
    if (!isOwner || tracks.length === 0) return
    const next = (state.current_index + 1) % tracks.length
    await updateMusicState({ current_index: next, is_playing: true, position_seconds: 0 })
  }

  async function prevTrack() {
    if (!isOwner || tracks.length === 0) return
    const prev = (state.current_index - 1 + tracks.length) % tracks.length
    await updateMusicState({ current_index: prev, is_playing: true, position_seconds: 0 })
  }

  async function playTrack(index: number) {
    if (!isOwner) return
    await updateMusicState({ current_index: index, is_playing: true, position_seconds: 0 })
  }

  async function addYouTubeTrack() {
    const videoId = getYouTubeId(ytUrl)
    if (!videoId) { alert('Invalid YouTube URL'); return }
    const title = ytTitle.trim() || 'YouTube Track'
    const { data } = await supabase.from('room_tracks').insert({
      room_id: room.id, added_by: currentUser.id,
      type: 'youtube', title, url: ytUrl,
      thumbnail_url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      position: tracks.length
    }).select('*, profiles(name)').single()
    if (data) setTracks(prev => [...prev, data])
    setYtUrl(''); setYtTitle(''); setShowAddTrack(false)
    // If first track, start playing
    if (tracks.length === 0) await updateMusicState({ current_index: 0, is_playing: true, position_seconds: 0, mode: 'youtube' })
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { alert('File must be under 50MB'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `music/${room.id}/${currentUser.id}-${Date.now()}.${ext}`
    const { data: uploadData, error } = await supabase.storage.from('posts').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { alert('Upload failed'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
    const title = file.name.replace(/\.[^/.]+$/, '')
    const { data } = await supabase.from('room_tracks').insert({
      room_id: room.id, added_by: currentUser.id,
      type: 'upload', title, url: urlData.publicUrl,
      position: tracks.length
    }).select('*, profiles(name)').single()
    if (data) setTracks(prev => [...prev, data])
    setUploading(false); setShowAddTrack(false)
    if (tracks.length === 0) await updateMusicState({ current_index: 0, is_playing: true, position_seconds: 0, mode: 'upload' })
  }

  async function removeTrack(trackId: string, idx: number) {
    await supabase.from('room_tracks').delete().eq('id', trackId)
    if (idx === state.current_index && tracks.length > 1) {
      await updateMusicState({ current_index: 0, is_playing: false })
    }
  }

  async function sendChat() {
    if (!chatInput.trim()) return
    await supabase.from('messages').insert({ room_id: room.id, user_id: currentUser.id, content: chatInput.trim() })
    setChatInput('')
  }

  const myName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'You'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px', minWidth: '36px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>{room.name} <span className="live-dot" /></div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{onlineCount} listening · {tracks.length} track{tracks.length !== 1 ? 's' : ''}</div>
        </div>
        {joined && (
          <button onClick={() => setShowAddTrack(true)} style={{ padding: '6px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer' }}>+ Add</button>
        )}
        {!joined
          ? <button onClick={joinRoom} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
          : <div style={{ padding: '5px 10px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓</div>
        }
      </div>

      {/* Add track modal */}
      {showAddTrack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setShowAddTrack(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }} className="fade-up">
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px' }}>Add Track</div>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {(['youtube', 'upload'] as const).map(m => (
                <button key={m} onClick={() => setAddMode(m)} style={{ flex: 1, padding: '8px', borderRadius: '9px', border: `1px solid ${addMode === m ? 'var(--accent)' : 'var(--border)'}`, background: addMode === m ? 'var(--accentbg)' : 'var(--bg3)', color: addMode === m ? 'var(--accent2)' : 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {m === 'youtube' ? '▶ YouTube' : '📁 Upload'}
                </button>
              ))}
            </div>

            {addMode === 'youtube' ? (
              <>
                <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} placeholder="YouTube URL (e.g. https://youtube.com/watch?v=...)" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '10px' }} />
                <input value={ytTitle} onChange={e => setYtTitle(e.target.value)} placeholder="Track title (optional)" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px' }} />
                {ytUrl && getYouTubeId(ytUrl) && (
                  <div style={{ marginBottom: '14px', borderRadius: '9px', overflow: 'hidden' }}>
                    <img src={`https://img.youtube.com/vi/${getYouTubeId(ytUrl)}/mqdefault.jpg`} style={{ width: '100%', display: 'block' }} alt="Preview" />
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowAddTrack(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                  <button onClick={addYouTubeTrack} disabled={!ytUrl} style={{ flex: 2, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: !ytUrl ? .5 : 1 }}>Add to Queue</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px' }}>Upload MP3, WAV, M4A — max 50MB</div>
                <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: '40px', border: '2px dashed var(--border2)', borderRadius: '12px', background: 'var(--bg3)', color: 'var(--text3)', cursor: 'pointer', fontSize: '13px', marginBottom: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  {uploading ? <><div className="spinner" /><span>Uploading…</span></> : <><span style={{ fontSize: '32px' }}>🎵</span><span>Click to choose audio file</span></>}
                </button>
                <button onClick={() => setShowAddTrack(false)} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Player area */}
          {currentTrack ? (
            <div style={{ background: 'linear-gradient(135deg, #1a0a2e, #0a1a2e)', padding: '20px', flexShrink: 0 }}>

              {/* YouTube embed */}
              {ytId ? (
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=${state.is_playing ? 1 : 0}&enablejsapi=1`}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    key={`${ytId}-${state.is_playing}`}
                  />
                </div>
              ) : (
                // Upload player
                <div>
                  <audio ref={audioRef} style={{ display: 'none' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'linear-gradient(135deg, #2a1a4e, #4a2a7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>🎵</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '3px' }}>{currentTrack.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Added by {currentTrack.profiles?.name}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls — owner only */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                <button onClick={prevTrack} disabled={!isOwner || tracks.length < 2} style={{ background: 'none', border: 'none', cursor: isOwner ? 'pointer' : 'default', fontSize: '22px', color: isOwner ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.2)' }}>⏮</button>
                <button onClick={playPause} disabled={!isOwner} style={{ width: '50px', height: '50px', borderRadius: '50%', background: isOwner ? '#fff' : 'rgba(255,255,255,.3)', border: 'none', cursor: isOwner ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  {state.is_playing ? '⏸' : '▶️'}
                </button>
                <button onClick={nextTrack} disabled={!isOwner || tracks.length < 2} style={{ background: 'none', border: 'none', cursor: isOwner ? 'pointer' : 'default', fontSize: '22px', color: isOwner ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.2)' }}>⏭</button>
              </div>
              {!isOwner && (
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,.4)', marginTop: '8px' }}>Only the room host can control playback</div>
              )}
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', background: 'linear-gradient(135deg, #1a0a2e, #0a1a2e)', flexShrink: 0 }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎵</div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.5)', marginBottom: '12px' }}>No tracks yet</div>
              {joined && <button onClick={() => setShowAddTrack(true)} style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>+ Add first track</button>}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {[['queue', `📋 Queue (${tracks.length})`], ['chat', '💬 Chat'], ['listeners', `👥 ${onlineCount}`]].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id as any)} style={{ flex: 1, padding: '10px', border: 'none', background: 'none', color: tab === id ? 'var(--accent2)' : 'var(--text3)', borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`, fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
            ))}
          </div>

          {/* Queue tab */}
          {tab === 'queue' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {tracks.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                  No tracks yet. {joined ? 'Click + Add to add tracks.' : 'Join to add tracks.'}
                </div>
              )}
              {tracks.map((t, i) => (
                <div key={t.id} onClick={() => isOwner && playTrack(i)} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 16px', borderBottom: '1px solid var(--border)', background: i === state.current_index ? 'rgba(99,102,241,.08)' : 'none', cursor: isOwner ? 'pointer' : 'default', transition: 'background .18s' }}>
                  {t.thumbnail_url
                    ? <img src={t.thumbnail_url} style={{ width: '44px', height: '32px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} alt="" />
                    : <div style={{ width: '44px', height: '32px', borderRadius: '6px', background: 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>🎵</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: i === state.current_index ? '600' : '400', color: i === state.current_index ? 'var(--accent2)' : 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>by {t.profiles?.name} · {t.type}</div>
                  </div>
                  {i === state.current_index && state.is_playing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {[1,2,3].map(n => <div key={n} style={{ width: '3px', background: 'var(--accent2)', borderRadius: '2px', animation: `waveBar .7s ${n*.1}s infinite` }} />)}
                    </div>
                  )}
                  {t.added_by === currentUser.id && i !== state.current_index && (
                    <button onClick={e => { e.stopPropagation(); removeTrack(t.id, i) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
                      onMouseOver={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
                      onMouseOut={e => (e.currentTarget as HTMLElement).style.color = 'var(--text3)'}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Chat tab */}
          {tab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>No messages yet. React to the music!</div>}
                {messages.map((m: any) => (
                  <div key={m.id} style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: getColor(m.profiles?.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff' }}>{(m.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)', marginRight: '6px' }}>{m.profiles?.name}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{m.content}</span>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="React to the music…" style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={sendChat} disabled={!chatInput.trim()} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer', opacity: !chatInput.trim() ? .5 : 1 }}>Send</button>
              </div>
            </div>
          )}

          {/* Listeners tab */}
          {tab === 'listeners' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text3)', padding: '8px', marginBottom: '4px' }}>{onlineCount} listening right now</div>
              {members.slice(0, 20).map((m: any) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '9px', marginBottom: '2px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getColor(m.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>{(m.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text1)' }}>{m.profiles?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{m.role === 'owner' ? '👑 Host' : 'Listener'}</div>
                  </div>
                  <span className="live-dot" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
