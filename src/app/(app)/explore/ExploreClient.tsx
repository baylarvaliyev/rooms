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

function getActivityBadge(score: number, memberCount: number) {
  if (score > 20) return { label: '🔥 Very Active', color: '#ef4444' }
  if (score > 8) return { label: '⚡ Growing Fast', color: '#f97316' }
  if (memberCount > 100 && score === 0) return { label: '🌙 Quiet', color: '#6366f1' }
  if (score > 2) return { label: '💬 Active', color: '#22c55e' }
  return null
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
  const [followedRooms, setFollowedRooms] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadRooms() }, [])

  async function loadRooms() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [
      { data: roomsData },
      { data: recentPosts },
      { data: recentMsgs },
      { data: myFollows },
    ] = await Promise.all([
      supabase.from('rooms').select('*, profiles(name, username)').order('member_count', { ascending: false }),
      supabase.from('posts').select('room_id').gte('created_at', since),
      supabase.from('messages').select('room_id').gte('created_at', since),
      supabase.from('room_follows').select('room_id').eq('user_id', user.id),
    ])

    const activityScore: Record<string, number> = {}
    ;(recentPosts || []).forEach((p: any) => { activityScore[p.room_id] = (activityScore[p.room_id] || 0) + 3 })
    ;(recentMsgs || []).forEach((m: any) => { activityScore[m.room_id] = (activityScore[m.room_id] || 0) + 1 })

    const withScore = (roomsData || []).map((r: any) => ({ ...r, trending_score: activityScore[r.id] || 0 }))
    setRooms(withScore)
    setTrendingRooms([...withScore].sort((a, b) => b.trending_score - a.trending_score).slice(0, 6))
    setFollowedRooms(new Set((myFollows || []).map((f: any) => f.room_id)))
    setLoading(false)
  }

  // Refresh single room after navigation back (to pick up cover/icon changes)
  async function refreshRoom(roomId: string) {
    const { data } = await supabase.from('rooms').select('*, profiles(name, username)').eq('id', roomId).single()
    if (data) {
      const score = rooms.find(r => r.id === roomId)?.trending_score || 0
      setRooms(prev => prev.map(r => r.id === roomId ? { ...data, trending_score: score } : r))
      setTrendingRooms(prev => prev.map(r => r.id === roomId ? { ...data, trending_score: score } : r))
    }
  }

  async function toggleFollow(e: React.MouseEvent, roomId: string) {
    e.stopPropagation()
    if (!currentUserId) return
    const isFollowing = followedRooms.has(roomId)
    setFollowedRooms(prev => {
      const n = new Set(prev)
      isFollowing ? n.delete(roomId) : n.add(roomId)
      return n
    })
    // Update follower count optimistically
    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, follower_count: (r.follower_count || 0) + (isFollowing ? -1 : 1) } : r))
    if (isFollowing) {
      await supabase.from('room_follows').delete().eq('room_id', roomId).eq('user_id', currentUserId)
      await supabase.from('rooms').update({ follower_count: supabase.rpc as any }).eq('id', roomId)
    } else {
      await supabase.from('room_follows').insert({ room_id: roomId, user_id: currentUserId })
    }
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
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg3)', borderRadius: '10px', padding: '8px 14px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rooms…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '14px', fontFamily: 'inherit' }} />
        </div>
        <button onClick={() => setCreating(true)} style={{ padding: '8px 16px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ Room</button>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: '8px', padding: '10px 16px', overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        {CATEGORIES.map(c => (
          <div key={c} onClick={() => setCat(c)} style={{ padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', background: cat === c ? 'var(--accent)' : 'transparent', color: cat === c ? '#fff' : 'var(--text3)', border: `1px solid ${cat === c ? 'var(--accent)' : 'var(--border)'}`, transition: 'all .18s', flexShrink: 0 }}>
            {c}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Trending row */}
        {trendingRooms.length > 0 && cat === 'All' && !search && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text1)', marginBottom: '12px' }}>🔥 Trending this week</div>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {trendingRooms.map(r => {
                const badge = getActivityBadge(r.trending_score, r.member_count)
                return (
                  <div key={r.id} onClick={() => router.push(`/rooms/${r.id}`)} style={{ flexShrink: 0, width: '150px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'transform .2s' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.transform = 'none'}
                  >
                    <div style={{ height: '80px', background: r.cover_url ? 'none' : (ROOM_COLORS[r.category] || 'var(--bg3)'), position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                      {r.cover_url
                        ? <img src={r.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                        : (r.icon_url ? <img src={r.icon_url} style={{ width: '44px', height: '44px', borderRadius: '10px' }} alt="" /> : r.emoji)
                      }
                      {badge && <div style={{ position: 'absolute', bottom: '5px', left: '5px', fontSize: '9px', fontWeight: '700', color: '#fff', background: 'rgba(0,0,0,.6)', padding: '2px 5px', borderRadius: '4px' }}>{badge.label}</div>}
                    </div>
                    <div style={{ padding: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{r.member_count || 0} members</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Label */}
        {!search && <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text1)', marginBottom: '12px' }}>
          {cat === 'All' ? 'All Rooms' : cat}
          <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '400', marginLeft: '6px' }}>{filtered.length} rooms</span>
        </div>}

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
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '6px' }}>No rooms found</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Be the first to create one!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {filtered.map(r => {
              const badge = getActivityBadge(r.trending_score, r.member_count)
              const isFollowing = followedRooms.has(r.id)
              return (
                <div key={r.id} onClick={() => { router.push(`/rooms/${r.id}`); setTimeout(() => refreshRoom(r.id), 2000) }} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden', cursor: 'pointer', transition: 'all .2s' }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.08)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                >
                  {/* Room cover image — uses actual cover_url if set */}
                  <div style={{ height: '110px', background: r.cover_url ? 'none' : (ROOM_COLORS[r.category] || 'var(--bg3)'), position: 'relative', overflow: 'hidden' }}>
                    {r.cover_url
                      ? <img src={r.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '46px' }}>
                          {r.icon_url ? <img src={r.icon_url} style={{ width: '52px', height: '52px', borderRadius: '12px' }} alt="" /> : r.emoji}
                        </div>
                    }
                    <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)', borderRadius: '20px', fontSize: '10px', color: '#fff' }}>
                      <span className="live-dot" style={{ width: '5px', height: '5px' }} />live
                    </div>
                    <div style={{ position: 'absolute', top: '8px', right: '8px', padding: '3px 7px', background: 'rgba(0,0,0,.5)', borderRadius: '20px', fontSize: '10px', color: 'rgba(255,255,255,.8)' }}>{r.type}</div>
                    {badge && <div style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '10px', fontWeight: '700', color: '#fff', background: 'rgba(0,0,0,.6)', padding: '2px 6px', borderRadius: '4px' }}>{badge.label}</div>}
                    {/* Room icon overlay bottom-right */}
                    {r.icon_url && r.cover_url && (
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '7px', overflow: 'hidden', border: '2px solid rgba(255,255,255,.3)' }}>
                        <img src={r.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '3px', color: 'var(--text1)' }}>{r.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || r.category}</div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>👥 {r.member_count || 0}</span>
                        {(r.follower_count || 0) > 0 && <span style={{ fontSize: '12px', color: 'var(--text3)' }}>🔔 {r.follower_count}</span>}
                      </div>
                      {/* Follow button */}
                      <button onClick={e => toggleFollow(e, r.id)} style={{ padding: '4px 10px', borderRadius: '20px', border: `1px solid ${isFollowing ? 'var(--border)' : 'var(--accent)'}`, background: isFollowing ? 'var(--bg3)' : 'rgba(225,48,108,.1)', color: isFollowing ? 'var(--text3)' : 'var(--accent)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', transition: 'all .18s', fontFamily: 'inherit' }}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '460px' }} className="fade-up">
            <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '20px' }}>Create a Room</div>
            {[
              { label: 'Room name', key: 'name', placeholder: 'e.g. Baku Entrepreneurs' },
              { label: 'Description', key: 'description', placeholder: 'What is this room about?' },
              { label: 'Emoji', key: 'emoji', placeholder: '💬' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text3)', display: 'block', marginBottom: '5px' }}>{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
            ))}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text3)', display: 'block', marginBottom: '5px' }}>Category</label>
              <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text3)', display: 'block', marginBottom: '8px' }}>Room Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['text','voice','music','video','debate','pinterest'].map(t => (
                  <div key={t} onClick={() => setForm(prev => ({ ...prev, type: t }))} style={{ padding: '9px', borderRadius: '9px', cursor: 'pointer', textAlign: 'center', background: form.type === t ? 'rgba(225,48,108,.12)' : 'var(--bg3)', border: `1px solid ${form.type === t ? 'rgba(225,48,108,.35)' : 'var(--border)'}`, fontSize: '12px', fontWeight: '500', color: form.type === t ? 'var(--accent)' : 'var(--text2)', transition: 'all .18s' }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={createRoom} disabled={!form.name.trim() || creating2} style={{ flex: 2, padding: '10px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: !form.name.trim() || creating2 ? .6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit' }}>
                {creating2 ? <><div className="spinner" />Creating…</> : '🚀 Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
