'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function AdminClient({ stats, recentUsers, recentRooms, recentPosts, reports: initialReports, currentUserId }: any) {
  const [tab, setTab] = useState<'overview' | 'users' | 'rooms' | 'posts' | 'reports'>('overview')
  const [users, setUsers] = useState(recentUsers)
  const [rooms, setRooms] = useState(recentRooms)
  const [posts, setPosts] = useState(recentPosts)
  const [reports, setReports] = useState(initialReports || [])
  const router = useRouter()
  const supabase = createClient()

  async function deleteRoom(id: string) {
    if (!confirm('Delete this room? This cannot be undone.')) return
    await supabase.from('rooms').delete().eq('id', id)
    setRooms((prev: any[]) => prev.filter(r => r.id !== id))
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts((prev: any[]) => prev.filter(p => p.id !== id))
  }

  async function dismissReport(id: string) {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', id)
    setReports((prev: any[]) => prev.map(r => r.id === id ? { ...r, status: 'dismissed' } : r))
  }

  async function resolveReport(id: string, postId: string) {
    if (!confirm('Delete the reported post and resolve this report?')) return
    await supabase.from('posts').delete().eq('id', postId)
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', id)
    setReports((prev: any[]) => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r))
  }

  const statCards = [
    { label: 'Total Users', value: (stats.userCount || 0).toLocaleString(), icon: '👥', color: 'var(--accent2)' },
    { label: 'Total Rooms', value: (stats.roomCount || 0).toLocaleString(), icon: '🚪', color: 'var(--green)' },
    { label: 'Total Posts', value: (stats.postCount || 0).toLocaleString(), icon: '✍️', color: 'var(--orange)' },
    { label: 'Total Messages', value: (stats.messageCount || 0).toLocaleString(), icon: '💬', color: 'var(--pink)' },
  ]

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent), var(--purple, #a855f7))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
          }}>🛡️</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px' }}>Admin Dashboard</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Platform management and analytics</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'users', label: '👥 Users' },
            { id: 'rooms', label: '🚪 Rooms' },
            { id: 'posts', label: '✍️ Posts' },
            { id: 'reports', label: `🚩 Reports${reports.filter((r: any) => r.status === 'pending').length > 0 ? ` (${reports.filter((r: any) => r.status === 'pending').length})` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{
              padding: '9px 16px', border: 'none', background: 'none',
              color: tab === t.id ? 'var(--accent2)' : 'var(--text3)',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              marginBottom: '-1px', transition: 'all .18s', fontFamily: 'inherit'
            }}>{t.label}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              {statCards.map(s => (
                <div key={s.label} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '16px'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                  <div style={{ fontWeight: '800', fontSize: '24px', color: s.color, marginBottom: '3px' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent activity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>
                  Recent Users
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {recentUsers.slice(0, 5).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text1)' }}>{u.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(u.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '10px' }}>
                  Recent Rooms
                </div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {recentRooms.slice(0, 5).map((r: any) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '18px' }}>{r.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.member_count} members</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(r.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>All Users · {stats.userCount}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['User', 'Username', 'Reputation', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                      onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text1)', fontWeight: '500' }}>{u.name}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text3)' }}>@{u.username}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--accent2)', fontWeight: '600' }}>{u.reputation || 0}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text3)' }}>{timeAgo(u.created_at)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => router.push(`/users/${u.username}`)}
                          style={{
                            padding: '4px 10px', background: 'var(--bg3)',
                            border: '1px solid var(--border)', borderRadius: '6px',
                            color: 'var(--text2)', fontSize: '11px', cursor: 'pointer'
                          }}
                        >View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rooms tab */}
        {tab === 'rooms' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>All Rooms · {stats.roomCount}</div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Room', 'Category', 'Members', 'Created', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r: any) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                      onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>{r.emoji}</span>
                          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text1)' }}>{r.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text3)' }}>{r.category}</td>
                      <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--text2)' }}>{r.member_count?.toLocaleString()}</td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text3)' }}>{timeAgo(r.created_at)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button onClick={() => router.push(`/rooms/${r.id}`)} style={{ padding: '4px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', fontSize: '11px', cursor: 'pointer' }}>View</button>
                          <button onClick={() => deleteRoom(r.id)} style={{ padding: '4px 10px', background: 'var(--redbg, rgba(239,68,68,.1))', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', color: 'var(--red)', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Posts tab */}
        {tab === 'posts' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>Recent Posts · {stats.postCount}</div>
            </div>
            {posts.map((p: any) => (
              <div key={p.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{p.profiles?.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(p.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '500px' }}>
                    {p.content}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '5px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>❤️ {p.like_count}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>💬 {p.comment_count}</span>
                  </div>
                </div>
                <button onClick={() => deletePost(p.id)} style={{ padding: '5px 11px', background: 'var(--redbg, rgba(239,68,68,.1))', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Reports tab */}
        {tab === 'reports' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>
                Reports · {reports.filter((r: any) => r.status === 'pending').length} pending
              </div>
            </div>
            {reports.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No reports yet 🎉</div>
            ) : reports.map((r: any) => (
              <div key={r.id} style={{ padding: '14px', borderBottom: '1px solid var(--border)', opacity: r.status !== 'pending' ? .5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: r.status === 'pending' ? 'var(--red)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{r.status}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(r.created_at)}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text1)', marginBottom: '4px' }}>
                      <strong>Reason:</strong> {r.reason}
                    </div>
                    {r.posts?.content && (
                      <div style={{ fontSize: '12px', color: 'var(--text3)', background: 'var(--bg3)', padding: '8px 10px', borderRadius: '7px', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Post: {r.posts.content}
                      </div>
                    )}
                  </div>
                  {r.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => dismissReport(r.id)} style={{ padding: '5px 11px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer' }}>Dismiss</button>
                      {r.post_id && <button onClick={() => resolveReport(r.id, r.post_id)} style={{ padding: '5px 11px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer' }}>Delete Post</button>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}