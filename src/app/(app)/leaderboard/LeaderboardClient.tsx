'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const MEDALS = ['🥇', '🥈', '🥉']
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

export default function LeaderboardClient({ topUsers, topRooms, topPosters, currentUserId }: any) {
  const [tab, setTab] = useState<'reputation' | 'posts' | 'rooms'>('reputation')
  const router = useRouter()

  const podiumUsers = [topUsers[1], topUsers[0], topUsers[2]].filter(Boolean)
  const podiumHeights = [100, 130, 85]
  const podiumColors = [
    'rgba(192,192,192,.2)',
    'rgba(234,179,8,.2)',
    'rgba(205,127,50,.2)',
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>🏆</div>
          <div style={{ fontWeight: '800', fontSize: '22px', marginBottom: '4px' }}>Leaderboard</div>
          <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Top contributors in the Rooms community</div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)',
          marginBottom: '24px'
        }}>
          {[
            { id: 'reputation', label: '⭐ Reputation' },
            { id: 'posts', label: '✍️ Most Active' },
            { id: 'rooms', label: '🚀 Top Rooms' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              padding: '9px 18px', border: 'none', background: 'none',
              color: tab === t.id ? 'var(--accent2)' : 'var(--text3)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              marginBottom: '-1px', transition: 'all .18s', fontFamily: 'inherit'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Reputation tab */}
        {tab === 'reputation' && (
          <>
            {/* Podium */}
            {topUsers.length >= 3 && (
              <div style={{
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                gap: '10px', marginBottom: '28px', padding: '0 20px'
              }}>
                {podiumUsers.map((u: any, i: number) => {
                  if (!u) return null
                  const color = getColor(u.name)
                  return (
                    <div key={u.id} style={{
                      flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', cursor: 'pointer'
                    }} onClick={() => router.push(`/users/${u.username}`)}>
                      <div style={{ fontSize: '20px', marginBottom: '6px' }}>{MEDALS[i === 0 ? 1 : i === 1 ? 0 : 2]}</div>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: u.avatar_url ? 'none' : color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px', fontWeight: '700', color: '#fff',
                        marginBottom: '6px', overflow: 'hidden', flexShrink: 0
                      }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : u.name.charAt(0).toUpperCase()
                        }
                      </div>
                      <div style={{
                        height: `${podiumHeights[i]}px`,
                        background: podiumColors[i],
                        border: `1px solid ${podiumColors[i]}`,
                        borderRadius: '8px 8px 0 0', width: '100%',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', padding: '10px 6px'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text1)', textAlign: 'center' }}>
                          {u.name.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent2)', marginTop: '4px' }}>
                          {(u.reputation || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text3)' }}>pts</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Full list */}
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: '13px', overflow: 'hidden'
            }}>
              {topUsers.map((u: any, i: number) => {
                const isMe = u.id === currentUserId
                const color = getColor(u.name)
                return (
                  <div
                    key={u.id}
                    onClick={() => router.push(`/users/${u.username}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderBottom: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'background .18s',
                      background: isMe ? 'rgba(99,102,241,.06)' : 'none'
                    }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(99,102,241,.1)' : 'var(--bg3)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(99,102,241,.06)' : 'none'}
                  >
                    <div style={{
                      width: '28px', textAlign: 'center', fontWeight: '700',
                      fontSize: i < 3 ? '18px' : '14px',
                      color: i < 3 ? 'var(--yellow)' : 'var(--text3)', flexShrink: 0
                    }}>
                      {i < 3 ? MEDALS[i] : i + 1}
                    </div>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: u.avatar_url ? 'none' : color, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: '700', color: '#fff', overflow: 'hidden'
                    }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : u.name.charAt(0).toUpperCase()
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {u.name}
                        {isMe && <span style={{ fontSize: '10px', color: 'var(--accent2)', background: 'var(--accentbg)', padding: '1px 6px', borderRadius: '4px' }}>You</span>}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent2)', flexShrink: 0 }}>
                      {(u.reputation || 0).toLocaleString()} pts
                    </div>
                  </div>
                )
              })}
              {topUsers.length === 0 && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                  No users yet — be the first!
                </div>
              )}
            </div>
          </>
        )}

        {/* Most active tab */}
        {tab === 'posts' && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '13px', overflow: 'hidden'
          }}>
            {topPosters.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
                No posts yet!
              </div>
            ) : topPosters.map((u: any, i: number) => {
              const color = getColor(u.name || 'U')
              return (
                <div
                  key={u.id}
                  onClick={() => router.push(`/users/${u.username}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderBottom: '1px solid var(--border)',
                    cursor: 'pointer', transition: 'background .18s'
                  }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{
                    width: '28px', textAlign: 'center', fontWeight: '700',
                    fontSize: i < 3 ? '18px' : '14px',
                    color: i < 3 ? 'var(--yellow)' : 'var(--text3)'
                  }}>
                    {i < 3 ? MEDALS[i] : i + 1}
                  </div>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: color, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: '700', color: '#fff'
                  }}>
                    {(u.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--accent2)' }}>
                    {u.count} posts
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Top rooms tab */}
        {tab === 'rooms' && (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '13px', overflow: 'hidden'
          }}>
            {topRooms.map((r: any, i: number) => (
              <div
                key={r.id}
                onClick={() => router.push(`/rooms/${r.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background .18s'
                }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >
                <div style={{
                  width: '28px', textAlign: 'center', fontWeight: '700',
                  fontSize: i < 3 ? '18px' : '14px',
                  color: i < 3 ? 'var(--yellow)' : 'var(--text3)'
                }}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </div>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: ROOM_COLORS[r.category] || 'var(--bg4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', flexShrink: 0
                }}>{r.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                    {r.member_count?.toLocaleString()} members · <span style={{ color: 'var(--green)' }}>{r.online_count || 0} live</span>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>{r.category}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}