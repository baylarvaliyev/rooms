'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [tab, setTab] = useState<'all'|'people'|'rooms'|'posts'>('all')

  // Discovery state
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([])
  const [suggestedRooms, setSuggestedRooms] = useState<any[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [followingRooms, setFollowingRooms] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState('')
  const [discoveryLoading, setDiscoveryLoading] = useState(true)

  const debounceRef = useRef<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadDiscovery()
  }, [])

  // Real-time search as you type
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setSearched(false); setUsers([]); setRooms([]); setPosts([]); return }
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function loadDiscovery() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const [
      { data: myFollows },
      { data: myRoomFollows },
      { data: myInterests },
    ] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', user.id),
      supabase.from('room_follows').select('room_id').eq('user_id', user.id),
      supabase.from('profiles').select('interests').eq('id', user.id).single(),
    ])

    const followingIds = new Set((myFollows || []).map((f: any) => f.following_id))
    const followingRoomIds = new Set((myRoomFollows || []).map((f: any) => f.room_id))
    setFollowing(followingIds)
    setFollowingRooms(followingRoomIds)

    const interests = myInterests?.interests || []

    // Suggested users: active users not already followed
    const { data: activeUsers } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url, bio, reputation')
      .neq('id', user.id)
      .order('reputation', { ascending: false })
      .limit(30)

    // Filter out already followed, pick 8
    const suggested = (activeUsers || [])
      .filter((u: any) => !followingIds.has(u.id))
      .slice(0, 8)
    setSuggestedUsers(suggested)

    // Suggested rooms: match interests, not already following
    const { data: interestRooms } = await supabase
      .from('rooms')
      .select('id, name, emoji, category, member_count, icon_url, cover_url, description')
      .order('member_count', { ascending: false })
      .limit(30)

    const suggestedRoomList = (interestRooms || [])
      .filter((r: any) => !followingRoomIds.has(r.id))
      .sort((a: any, b: any) => {
        // Prioritize rooms matching user interests
        const aMatch = interests.some((i: string) => a.category?.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(a.category?.toLowerCase()))
        const bMatch = interests.some((i: string) => b.category?.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(b.category?.toLowerCase()))
        if (aMatch && !bMatch) return -1
        if (!aMatch && bMatch) return 1
        return b.member_count - a.member_count
      })
      .slice(0, 6)
    setSuggestedRooms(suggestedRoomList)
    setDiscoveryLoading(false)
  }

  async function search(q: string) {
    setLoading(true)
    setSearched(true)

    const [{ data: foundUsers }, { data: foundRooms }, { data: foundPosts }] = await Promise.all([
      supabase.from('profiles')
        .select('id, name, username, avatar_url, bio, reputation')
        .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
        .neq('id', currentUserId)
        .limit(10),
      supabase.from('rooms')
        .select('id, name, description, emoji, category, member_count, icon_url, cover_url')
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
        .limit(10),
      supabase.from('posts')
        .select('id, content, created_at, like_count, comment_count, profiles(name, username)')
        .ilike('content', `%${q}%`)
        .limit(8),
    ])

    setUsers(foundUsers || [])
    setRooms(foundRooms || [])
    setPosts(foundPosts || [])
    setLoading(false)
  }

  async function followUser(userId: string) {
    if (!currentUserId) return
    setFollowing(prev => new Set([...prev, userId]))
    await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId })
  }

  async function unfollowUser(userId: string) {
    setFollowing(prev => { const n = new Set(prev); n.delete(userId); return n })
    await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId)
  }

  async function followRoom(roomId: string) {
    setFollowingRooms(prev => new Set([...prev, roomId]))
    await supabase.from('room_follows').insert({ room_id: roomId, user_id: currentUserId })
  }

  function timeAgo(date: string) {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 3600) return `${Math.floor(s/60)}m`
    if (s < 86400) return `${Math.floor(s/3600)}h`
    return `${Math.floor(s/86400)}d`
  }

  const showDiscovery = !searched || !query.trim()

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px' }}>

        {/* Search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg3)', borderRadius: '14px', padding: '10px 16px', marginBottom: '20px', border: '1px solid var(--border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search people, rooms, posts…"
            autoFocus
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '15px', fontFamily: 'inherit' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* SEARCH RESULTS */}
        {searched && query.trim() && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '16px' }}>
              {[['all','All'], ['people','People'], ['rooms','Rooms'], ['posts','Posts']].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id as any)} style={{ padding: '8px 14px', border: 'none', background: 'none', color: tab === id ? 'var(--text1)' : 'var(--text3)', borderBottom: `2px solid ${tab === id ? 'var(--accent)' : 'transparent'}`, fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '-1px', fontFamily: 'inherit' }}>{label}</button>
              ))}
            </div>

            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>}

            {!loading && users.length === 0 && rooms.length === 0 && posts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>No results for "{query}"</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Try different keywords</div>
              </div>
            )}

            {/* People results */}
            {!loading && (tab === 'all' || tab === 'people') && users.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {tab === 'all' && <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>People</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {users.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div onClick={() => router.push(`/users/${u.username}`)} style={{ width: '44px', height: '44px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', overflow: 'hidden', cursor: 'pointer' }}>
                        {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(`/users/${u.username}`)}>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{u.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>@{u.username}{u.reputation > 0 ? ` · ${u.reputation} pts` : ''}</div>
                        {u.bio && <div style={{ fontSize: '12px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{u.bio}</div>}
                      </div>
                      <button onClick={() => following.has(u.id) ? unfollowUser(u.id) : followUser(u.id)} style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${following.has(u.id) ? 'var(--border)' : 'var(--accent)'}`, background: following.has(u.id) ? 'var(--bg3)' : 'rgba(225,48,108,.1)', color: following.has(u.id) ? 'var(--text3)' : 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                        {following.has(u.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Room results */}
            {!loading && (tab === 'all' || tab === 'rooms') && rooms.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                {tab === 'all' && <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>Rooms</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {rooms.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div onClick={() => router.push(`/rooms/${r.id}`)} style={{ width: '46px', height: '46px', borderRadius: '12px', background: r.cover_url ? 'none' : (ROOM_COLORS[r.category] || 'var(--bg4)'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', overflow: 'hidden', cursor: 'pointer' }}>
                        {r.icon_url ? <img src={r.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : r.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(`/rooms/${r.id}`)}>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{r.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{r.category} · {r.member_count || 0} members</div>
                        {r.description && <div style={{ fontSize: '12px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{r.description}</div>}
                      </div>
                      <button onClick={() => followRoom(r.id)} style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${followingRooms.has(r.id) ? 'var(--border)' : 'var(--accent)'}`, background: followingRooms.has(r.id) ? 'var(--bg3)' : 'rgba(225,48,108,.1)', color: followingRooms.has(r.id) ? 'var(--text3)' : 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                        {followingRooms.has(r.id) ? '✓ Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post results */}
            {!loading && (tab === 'all' || tab === 'posts') && posts.length > 0 && (
              <div>
                {tab === 'all' && <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>Posts</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {posts.map((p: any) => (
                    <div key={p.id} style={{ padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: getColor(p.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{(p.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{p.profiles?.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {timeAgo(p.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.5', marginBottom: '8px' }}>{p.content}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>❤️ {p.like_count} · 💬 {p.comment_count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* DISCOVERY — shown when not searching */}
        {showDiscovery && (
          <>
            {/* Suggested People */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '15px' }}>👥 People to Follow</div>
              </div>

              {discoveryLoading ? (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flexShrink: 0, width: '140px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', textAlign: 'center', animation: 'pulse 1.5s infinite' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--bg4)', margin: '0 auto 10px' }} />
                      <div style={{ height: '12px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '6px' }} />
                      <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', width: '70%', margin: '0 auto' }} />
                    </div>
                  ))}
                </div>
              ) : suggestedUsers.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)', padding: '20px', textAlign: 'center', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  You're following everyone! 🎉
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {suggestedUsers.map(u => (
                    <div key={u.id} style={{ flexShrink: 0, width: '148px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
                      <div onClick={() => router.push(`/users/${u.username}`)} style={{ width: '52px', height: '52px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#fff', overflow: 'hidden', cursor: 'pointer' }}>
                        {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => router.push(`/users/${u.username}`)}>{u.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '10px' }}>@{u.username}</div>
                      {u.bio && <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{u.bio}</div>}
                      <button onClick={() => following.has(u.id) ? unfollowUser(u.id) : followUser(u.id)} style={{ width: '100%', padding: '6px', borderRadius: '8px', border: `1px solid ${following.has(u.id) ? 'var(--border)' : 'var(--accent)'}`, background: following.has(u.id) ? 'var(--bg3)' : 'rgba(225,48,108,.1)', color: following.has(u.id) ? 'var(--text3)' : 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {following.has(u.id) ? '✓ Following' : '+ Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Rooms */}
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '12px' }}>🚀 Rooms You Might Like</div>
              {discoveryLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', animation: 'pulse 1.5s infinite' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'var(--bg4)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ height: '13px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '7px', width: '60%' }} />
                        <div style={{ height: '11px', background: 'var(--bg4)', borderRadius: '6px', width: '40%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestedRooms.length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text3)', padding: '20px', textAlign: 'center', background: 'var(--bg2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  You're following all available rooms!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {suggestedRooms.map(r => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <div onClick={() => router.push(`/rooms/${r.id}`)} style={{ width: '46px', height: '46px', borderRadius: '12px', background: r.cover_url ? 'none' : (ROOM_COLORS[r.category] || 'var(--bg4)'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', overflow: 'hidden', cursor: 'pointer' }}>
                        {r.icon_url ? <img src={r.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : r.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => router.push(`/rooms/${r.id}`)}>
                        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px' }}>{r.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{r.category} · {(r.member_count || 0).toLocaleString()} members</div>
                      </div>
                      <button onClick={() => { followRoom(r.id); setSuggestedRooms(prev => prev.filter(x => x.id !== r.id)) }} style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid var(--accent)', background: 'rgba(225,48,108,.1)', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
