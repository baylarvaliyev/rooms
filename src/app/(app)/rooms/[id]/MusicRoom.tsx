'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PLAYLIST = [
  { id: 1, title: 'Gece Yarısı', artist: 'Müslüm Gürses', dur: '3:42', durSec: 222, emoji: '🎸' },
  { id: 2, title: 'Yalnızım', artist: 'Sezen Aksu', dur: '4:15', durSec: 255, emoji: '🎤' },
  { id: 3, title: 'Bir Gün Mutlaka', artist: 'Tarkan', dur: '3:58', durSec: 238, emoji: '⭐' },
  { id: 4, title: 'Heyrati (Segah)', artist: 'Alim Qasimov', dur: '5:18', durSec: 318, emoji: '🎼' },
  { id: 5, title: 'Seviyorum Seni', artist: 'İbrahim Tatlıses', dur: '4:02', durSec: 242, emoji: '💫' },
]

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

const LISTENERS = [
  { name: 'Leyla K.', initials: 'LK', color: '#6366f1' },
  { name: 'Tariq M.', initials: 'TM', color: '#0891b2' },
  { name: 'Sarah V.', initials: 'SV', color: '#ec4899' },
  { name: 'Omar H.',  initials: 'OH', color: '#7c3aed' },
  { name: 'Jin Park', initials: 'JP', color: '#0f766e' },
]

export default function MusicRoom({ room, members, currentUser, isMember }: any) {
  const [joined, setJoined] = useState(isMember)
  const [playing, setPlaying] = useState(true)
  const [songIdx, setSongIdx] = useState(0)
  const [progress, setProgress] = useState(22)
  const [volume, setVolume] = useState(80)
  const [liked, setLiked] = useState<Set<number>>(new Set())
  const [tab, setTab] = useState<'queue' | 'chat' | 'listeners'>('queue')
  const [messages, setMessages] = useState<any[]>([
    { id: 1, user: 'Leyla K.', color: '#6366f1', text: 'This song is 🔥🔥🔥' },
    { id: 2, user: 'Tariq M.', color: '#0891b2', text: 'Müslüm always delivers 😭' },
    { id: 3, user: 'Sarah V.', color: '#ec4899', text: 'Listening from London right now' },
  ])
  const [chatInput, setChatInput] = useState('')
  const tickRef = useRef<any>(null)
  const supabase = createClient()
  const router = useRouter()
  const song = PLAYLIST[songIdx]

  useEffect(() => {
    if (playing) {
      tickRef.current = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            nextSong()
            return 0
          }
          return p + (100 / song.durSec) * 0.5
        })
      }, 500)
    } else {
      clearInterval(tickRef.current)
    }
    return () => clearInterval(tickRef.current)
  }, [playing, songIdx])

  function nextSong() {
    setSongIdx(i => (i + 1) % PLAYLIST.length)
    setProgress(0)
  }
  function prevSong() {
    setSongIdx(i => (i - 1 + PLAYLIST.length) % PLAYLIST.length)
    setProgress(0)
  }

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  function sendChat() {
    if (!chatInput.trim()) return
    const myName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'You'
    setMessages(prev => [...prev, { id: Date.now(), user: myName, color: getColor(myName), text: chatInput.trim() }])
    setChatInput('')
  }

  const mins = Math.floor((progress / 100) * song.durSec / 60)
  const secs = String(Math.floor((progress / 100) * song.durSec % 60)).padStart(2, '0')
  const allListeners = [...LISTENERS, ...(joined ? [{ name: 'You', initials: 'YO', color: '#6366f1' }] : [])]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>{room.name} <span className="live-dot" /></div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{allListeners.length} listening together</div>
        </div>
        {!joined
          ? <button onClick={joinRoom} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
          : <div style={{ padding: '5px 12px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓ Listening</div>
        }
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Player */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Now playing */}
          <div style={{
            padding: '28px 24px', background: 'linear-gradient(135deg, #1a0a2e, #2d1a4e)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0
          }}>
            {/* Album art */}
            <div style={{
              width: '140px', height: '140px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #2a1a4e, #4a2a7e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '56px', marginBottom: '18px',
              boxShadow: '0 20px 60px rgba(0,0,0,.5)',
              animation: playing ? 'glow 3s ease-in-out infinite' : 'none'
            }}>{song.emoji}</div>

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '4px' }}>{song.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>{song.artist}</div>
            </div>

            {/* Like button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
              <button
                onClick={() => setLiked(prev => { const n = new Set(prev); n.has(song.id) ? n.delete(song.id) : n.add(song.id); return n })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: liked.has(song.id) ? '#ef4444' : 'rgba(255,255,255,.4)', transition: 'all .18s' }}
              >{liked.has(song.id) ? '❤️' : '🤍'}</button>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100%', maxWidth: '340px' }}>
              <div
                style={{ height: '4px', background: 'rgba(255,255,255,.15)', borderRadius: '2px', cursor: 'pointer', marginBottom: '6px' }}
                onClick={e => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setProgress(((e.clientX - rect.left) / rect.width) * 100)
                }}
              >
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), #a855f7)', borderRadius: '2px', width: `${progress}%`, transition: 'width .5s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,.45)' }}>
                <span>{mins}:{secs}</span>
                <span>{song.dur}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px' }}>
              <button onClick={prevSong} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'rgba(255,255,255,.6)' }}>⏮</button>
              <button
                onClick={() => setPlaying(!playing)}
                style={{
                  width: '54px', height: '54px', borderRadius: '50%',
                  background: '#fff', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', transition: 'all .18s', boxShadow: '0 4px 20px rgba(0,0,0,.3)'
                }}
              >{playing ? '⏸' : '▶️'}</button>
              <button onClick={nextSong} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', color: 'rgba(255,255,255,.6)' }}>⏭</button>
            </div>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', width: '100%', maxWidth: '280px' }}>
              <span style={{ fontSize: '14px' }}>🔈</span>
              <input
                type="range" min="0" max="100" value={volume}
                onChange={e => setVolume(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: '14px' }}>🔊</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {[
              { id: 'queue', label: '📋 Queue' },
              { id: 'chat', label: '💬 Chat' },
              { id: 'listeners', label: `👥 ${allListeners.length}` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                flex: 1, padding: '10px', border: 'none', background: 'none',
                color: tab === t.id ? 'var(--accent2)' : 'var(--text3)',
                borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit'
              }}>{t.label}</button>
            ))}
          </div>

          {/* Queue tab */}
          {tab === 'queue' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {PLAYLIST.map((s, i) => (
                <div
                  key={s.id}
                  onClick={() => { setSongIdx(i); setProgress(0) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '11px 16px', cursor: 'pointer', transition: 'background .18s',
                    background: i === songIdx ? 'var(--accentbg, rgba(99,102,241,.1))' : 'none',
                    borderBottom: '1px solid var(--border)'
                  }}
                  onMouseOver={e => { if (i !== songIdx) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
                  onMouseOut={e => { if (i !== songIdx) (e.currentTarget as HTMLElement).style.background = 'none' }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'linear-gradient(135deg, #1a0a2e, #2d1a4e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>{s.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: i === songIdx ? '600' : '400', color: i === songIdx ? 'var(--accent2)' : 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{s.artist}</div>
                  </div>
                  {i === songIdx && playing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {[1,2,3].map(n => <div key={n} style={{ width: '3px', background: 'var(--accent2)', borderRadius: '2px', animation: `waveBar .7s ${n*.1}s infinite` }} />)}
                    </div>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>{s.dur}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chat tab */}
          {tab === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', gap: '8px', animation: 'fadeUp .22s ease' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: m.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff' }}>{m.user.charAt(0)}</div>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)', marginRight: '6px' }}>{m.user}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{m.text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="React to the music…"
                  style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={sendChat} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>Send</button>
              </div>
            </div>
          )}

          {/* Listeners tab */}
          {tab === 'listeners' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {allListeners.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '9px', marginBottom: '4px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{l.initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text1)' }}>{l.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}><span className="live-dot" style={{ width: '5px', height: '5px' }} />Listening</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}