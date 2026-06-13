'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const CATEGORIES = ['All','Business','Technology','Music','Study','Travel','Art','Fitness','Finance','Cars','Lifestyle']

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

export default function ExploreClient() {
  const [rooms, setRooms] = useState<any[]>([])
  const [trendingRooms, setTrendingRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', category: 'Business', type: 'text', emoji: '💬' })
  const [creating2, setCreating2] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadRooms() }, [])

  async function loadRooms() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: roomsData }, { data: recentPosts }, { data: recentMsgs }] = await Promise.all([
      supabase.from('rooms').select('*, profiles(name, username)').order('member_count', { ascending: false }),
      supabase.from('posts').select('room_id').gte('created_at', since),
      supabase.from('messages').select('room_id').gte('created_at', since),
    ])
    const activityScore: Record<string, number> = {}
    ;(recentPosts || []).forEach((p: any) => { activityScore[p.room_id] = (activityScore[p.room_id] || 0) + 3 })
    ;(recentMsgs || []).forEach((m: any) => { activityScore[m.room_id] = (activityScore[m.room_id] || 0) + 1 })
    const withScore = (roomsData || []).map((r: any) => ({ ...r, trending_score: activityScore[r.id] || 0 }))
    setRooms(withScore)
    setTrendingRooms([...withScore].sort((a, b) => b.trending_score - a.trending_score).slice(0, 6))
    setLoading(false)
  }

  async function createRoom() {
    setCreating2(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('rooms').insert({ ...form, created_by: user.id }).select().single()
    if (!error && data) {
      await supabase.from('room_members').insert({ room_id: data.id, user_id: user.id, role: 'owner' })
      setCreating(false)
      router.push(`/rooms/${data.id}`)
    }
    setCreating2(false)
  }

  const filtered = rooms.filter(r => {
    const matchCat = cat === 'All' || r.category === cat
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0, background: 'var(--bg1)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rooms…" style={{ flex: 1, maxWidth: '360px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px 14px', color: 'var(--text1)', fontSize: '13px', outline: 'none' }} />
        <button onClick={() => setCreating(true)} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ New Room</button>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 20px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        {CATEGORIES.map(c => (
          <div key={c} onClick={() => setCat(c)} style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap', background: cat === c ? 'var(--accent)' : 'var(--bg3)', color: cat === c ? '#fff' : 'var(--text2)', border: `1px solid ${cat === c ? 'var(--accent)' : 'var(--border)'}`, transition: 'all .18s' }}>
            {c}
          </div>
        ))}
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Trending */}
        {trendingRooms && trendingRooms.length > 0 && cat === 'All' && !search && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '12px' }}>🔥 Trending this week</div>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
              {trendingRooms.map(r => (
                <div key={r.id} onClick={() => router.push(`/rooms/${r.id}`)} style={{ flexShrink: 0, width: '160px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all .2s' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.15)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.06)'}
                >
                  <div style={{ height: '70px', background: ROOM_COLORS[r.category] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', position: 'relative' }}>
                    {r.emoji}
                    {r.trending_score > 0 && <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239,68,68,.8)', borderRadius: '4px', padding: '2px 5px', fontSize: '9px', fontWeight: '700', color: '#fff' }}>🔥 HOT</div>}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.member_count || 0} members</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Label */}
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '12px' }}>
          {cat === 'All' && !search ? 'All Rooms' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden', animation: 'pulse 1.5s infinite' }}>
                <div style={{ height: '110px', background: 'var(--bg4)' }} />
                <div style={{ padding: '12px' }}>
                  <div style={{ height: '13px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '8px', width: '70%' }} />
                  <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '6px', color: 'var(--text2)' }}>No rooms found</div>
            <div style={{ fontSize: '13px' }}>Be the first to create one!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {filtered.map((r, i) => (
              <div key={r.id} onClick={() => router.push(`/rooms/${r.id}`)} className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', animationDelay: `${i * 0.04}s` }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.11)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.06)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
              >
                <div style={{ height: '110px', background: ROOM_COLORS[r.category] || 'linear-gradient(135deg,#1a1a4e,#312a7e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', position: 'relative' }}>
                  {r.emoji}
                  <div style={{ position: 'absolute', top: '9px', left: '9px', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)', borderRadius: '20px', fontSize: '10px', fontWeight: '500', color: '#fff' }}>
                    <span className="live-dot" style={{ width: '5px', height: '5px' }} />live
                  </div>
                  <div style={{ position: 'absolute', top: '9px', right: '9px', padding: '3px 8px', background: 'rgba(99,102,241,.25)', borderRadius: '20px', fontSize: '10px', fontWeight: '600', color: '#a5b4fc' }}>{r.type}</div>
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--text1)' }}>{r.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>👥 {r.member_count || 0}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text3)' }}>{r.category}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '460px' }} className="fade-up">
            <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '20px' }}>Create a Room</div>
            {[
              { label: 'Room name', key: 'name', placeholder: 'e.g. Baku Entrepreneurs' },
              { label: 'Description', key: 'description', placeholder: 'What is this room about?' },
              { label: 'Emoji', key: 'emoji', placeholder: '💬' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none' }} />
              </div>
            ))}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '5px' }}>Category</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none' }}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '8px' }}>Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['text','voice','music','video','debate','pinterest'].map(t => (
                  <div key={t} onClick={() => setForm(prev => ({ ...prev, type: t }))} style={{ padding: '9px', borderRadius: '9px', cursor: 'pointer', textAlign: 'center', background: form.type === t ? 'rgba(99,102,241,.12)' : 'var(--bg3)', border: `1px solid ${form.type === t ? 'rgba(99,102,241,.28)' : 'var(--border)'}`, fontSize: '12px', fontWeight: '500', color: form.type === t ? 'var(--accent2)' : 'var(--text2)', transition: 'all .18s' }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={createRoom} disabled={!form.name.trim() || creating2} style={{ flex: 2, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: !form.name.trim() || creating2 ? .6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {creating2 ? <><div className="spinner" />Creating…</> : '🚀 Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
