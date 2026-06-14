'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const MEDALS = ['🥇', '🥈', '🥉']

// 20-level system — hard to reach top
const LEVELS = [
  { level: 1,  title: 'Newcomer',    min: 0,       color: '#6b7280' },
  { level: 2,  title: 'Lurker',      min: 50,      color: '#6b7280' },
  { level: 3,  title: 'Regular',     min: 150,     color: '#10b981' },
  { level: 4,  title: 'Contributor', min: 400,     color: '#10b981' },
  { level: 5,  title: 'Active',      min: 900,     color: '#3b82f6' },
  { level: 6,  title: 'Engaged',     min: 1800,    color: '#3b82f6' },
  { level: 7,  title: 'Veteran',     min: 3500,    color: '#8b5cf6' },
  { level: 8,  title: 'Respected',   min: 6000,    color: '#8b5cf6' },
  { level: 9,  title: 'Influencer',  min: 10000,   color: '#f59e0b' },
  { level: 10, title: 'Authority',   min: 16000,   color: '#f59e0b' },
  { level: 11, title: 'Expert',      min: 25000,   color: '#ef4444' },
  { level: 12, title: 'Mentor',      min: 38000,   color: '#ef4444' },
  { level: 13, title: 'Leader',      min: 55000,   color: '#ec4899' },
  { level: 14, title: 'Pioneer',     min: 78000,   color: '#ec4899' },
  { level: 15, title: 'Elite',       min: 110000,  color: '#f97316' },
  { level: 16, title: 'Master',      min: 150000,  color: '#f97316' },
  { level: 17, title: 'Grandmaster', min: 200000,  color: '#dc2626' },
  { level: 18, title: 'Legend',      min: 275000,  color: '#dc2626' },
  { level: 19, title: 'Icon',        min: 375000,  color: '#7c3aed' },
  { level: 20, title: 'Immortal',    min: 500000,  color: '#f59e0b' },
]

export function getLevel(rep: number) {
  let current = LEVELS[0]
  for (const l of LEVELS) { if (rep >= l.min) current = l }
  const nextLevel = LEVELS.find(l => l.min > rep)
  return { ...current, next: nextLevel?.min || null, nextTitle: nextLevel?.title || null }
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

export default function LeaderboardClient() {
  const [topUsers, setTopUsers] = useState<any[]>([])
  const [topRooms, setTopRooms] = useState<any[]>([])
  const [topPosters, setTopPosters] = useState<any[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'reputation' | 'posts' | 'rooms' | 'levels'>('reputation')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCurrentUserId(user.id)

    const [{ data: users }, { data: rooms }, { data: posts }] = await Promise.all([
      supabase.from('profiles').select('id, name, username, avatar_url, reputation').order('reputation', { ascending: false }).limit(50),
      supabase.from('rooms').select('id, name, emoji, category, member_count, icon_url, cover_url, follower_count').order('member_count', { ascending: false }).limit(10),
      supabase.from('posts').select('user_id, profiles(name, username, avatar_url)').limit(500),
    ])

    setTopUsers(users || [])
    setTopRooms(rooms || [])

    const counts: Record<string, any> = {}
    ;(posts || []).forEach((p: any) => {
      if (!p.user_id) return
      if (!counts[p.user_id]) counts[p.user_id] = { count: 0, ...p.profiles, id: p.user_id }
      counts[p.user_id].count++
    })
    setTopPosters(Object.values(counts).sort((a: any, b: any) => b.count - a.count).slice(0, 20))
    setLoading(false)
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  const podiumUsers = [topUsers[1], topUsers[0], topUsers[2]].filter(Boolean)
  const podiumHeights = [100, 130, 85]
  const podiumColors = ['rgba(192,192,192,.15)', 'rgba(234,179,8,.15)', 'rgba(205,127,50,.15)']
  const podiumBorders = ['rgba(192,192,192,.3)', 'rgba(234,179,8,.3)', 'rgba(205,127,50,.3)']

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto' }}>
          {[
            { id: 'reputation', label: '⭐ Reputation' },
            { id: 'posts',      label: '✍️ Most Active' },
            { id: 'rooms',      label: '🚀 Top Rooms' },
            { id: 'levels',     label: '🎖 Levels' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ padding: '10px 16px', border: 'none', background: 'none', color: tab === t.id ? 'var(--text1)' : 'var(--text3)', borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`, fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', marginBottom: '-1px' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* REPUTATION TAB */}
        {tab === 'reputation' && (
          <>
            {topUsers.length >= 3 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', marginBottom: '24px', padding: '0 10px' }}>
                {podiumUsers.map((u: any, i: number) => {
                  if (!u) return null
                  const levelInfo = getLevel(u.reputation || 0)
                  return (
                    <div key={u.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => router.push(`/users/${u.username}`)}>
                      <div style={{ fontSize: '22px', marginBottom: '6px' }}>{MEDALS[i === 0 ? 1 : i === 1 ? 0 : 2]}</div>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '6px', overflow: 'hidden', border: `2px solid ${levelInfo.color}` }}>
                        {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ height: `${podiumHeights[i]}px`, background: podiumColors[i], border: `1px solid ${podiumBorders[i]}`, borderRadius: '8px 8px 0 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', gap: '3px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text1)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>{(u.name || 'U').split(' ')[0]}</div>
                        <div style={{ fontSize: '9px', color: levelInfo.color, fontWeight: '600' }}>{levelInfo.title}</div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text1)' }}>{(u.reputation || 0).toLocaleString()}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
              {topUsers.map((u: any, i: number) => {
                const isMe = u.id === currentUserId
                const levelInfo = getLevel(u.reputation || 0)
                return (
                  <div key={u.id} onClick={() => router.push(`/users/${u.username}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: isMe ? 'rgba(225,48,108,.05)' : 'none', transition: 'background .15s' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(225,48,108,.09)' : 'var(--bg3)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(225,48,108,.05)' : 'none'}
                  >
                    <div style={{ width: '26px', textAlign: 'center', fontWeight: '700', fontSize: i < 3 ? '16px' : '13px', color: i < 3 ? 'var(--yellow)' : 'var(--text3)', flexShrink: 0 }}>{i < 3 ? MEDALS[i] : i + 1}</div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden', border: `1.5px solid ${levelInfo.color}` }}>
                      {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {u.name}
                        {isMe && <span style={{ fontSize: '9px', color: 'var(--accent)', background: 'var(--accentbg)', padding: '1px 5px', borderRadius: '4px' }}>You</span>}
                        <span style={{ fontSize: '9px', color: levelInfo.color, fontWeight: '600' }}>{levelInfo.title}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text1)', flexShrink: 0 }}>{(u.reputation || 0).toLocaleString()} <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: '400' }}>pts</span></div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* MOST ACTIVE TAB */}
        {tab === 'posts' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
            {topPosters.length === 0
              ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No posts yet!</div>
              : topPosters.map((u: any, i: number) => (
                <div key={u.id || i} onClick={() => u.username && router.push(`/users/${u.username}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{ width: '26px', textAlign: 'center', fontWeight: '700', fontSize: i < 3 ? '16px' : '13px', color: i < 3 ? 'var(--yellow)' : 'var(--text3)', flexShrink: 0 }}>{i < 3 ? MEDALS[i] : i + 1}</div>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: getColor(u.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                    {(u.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{u.name || 'Unknown'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username || '—'}</div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--accent2)' }}>{u.count} posts</div>
                </div>
              ))
            }
          </div>
        )}

        {/* TOP ROOMS TAB */}
        {tab === 'rooms' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
            {topRooms.map((r: any, i: number) => (
              <div key={r.id} onClick={() => router.push(`/rooms/${r.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >
                <div style={{ width: '26px', textAlign: 'center', fontWeight: '700', fontSize: i < 3 ? '16px' : '13px', color: i < 3 ? 'var(--yellow)' : 'var(--text3)', flexShrink: 0 }}>{i < 3 ? MEDALS[i] : i + 1}</div>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: r.cover_url ? 'none' : (ROOM_COLORS[r.category] || 'var(--bg4)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, overflow: 'hidden' }}>
                  {r.icon_url ? <img src={r.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : r.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{(r.member_count || 0).toLocaleString()} members · {r.follower_count || 0} followers</div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0, background: 'var(--bg4)', padding: '3px 8px', borderRadius: '6px' }}>{r.category}</div>
              </div>
            ))}
          </div>
        )}

        {/* LEVELS TAB */}
        {tab === 'levels' && (
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px', lineHeight: '1.6' }}>
              Earn reputation by posting, getting likes, comments, and followers. The path to Immortal is long — only the most dedicated will make it.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {LEVELS.map(l => (
                <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', background: 'var(--bg2)', border: `1px solid ${l.level === 20 ? 'rgba(234,179,8,.3)' : 'var(--border)'}`, borderRadius: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: `${l.color}22`, border: `2px solid ${l.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '13px', color: l.color, flexShrink: 0 }}>{l.level}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: l.color }}>{l.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{l.min.toLocaleString()} pts{l.level < 20 ? ` — ${LEVELS[l.level].min.toLocaleString()} pts` : '+'}</div>
                  </div>
                  {l.level === 20 && <div style={{ fontSize: '18px' }}>👑</div>}
                  {l.level === 19 && <div style={{ fontSize: '18px' }}>🌟</div>}
                  {l.level === 18 && <div style={{ fontSize: '18px' }}>⚡</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
