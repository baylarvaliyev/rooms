'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

// All admin actions go through the server API — never direct Supabase
async function adminAction(action: string, targetId?: string, reason?: string, data?: any) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, targetId, reason, data }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Admin action failed')
  }
  return res.json()
}

export default function AdminClient({ stats, recentUsers, recentRooms, recentPosts, reports: initialReports, currentUserId }: any) {
  const [tab, setTab] = useState<'overview'|'users'|'rooms'|'posts'|'reports'>('overview')
  const [users, setUsers] = useState(recentUsers)
  const [rooms, setRooms] = useState(recentRooms)
  const [posts, setPosts] = useState(recentPosts)
  const [reports, setReports] = useState(initialReports || [])
  const [search, setSearch] = useState('')
  const [editUser, setEditUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({ name: '', username: '', ban_reason: '' })
  const [userSearch, setUserSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const router = useRouter()

  async function searchUsers(q: string) {
    setUserSearch(q)
    if (q.length < 2) { setUsers(recentUsers); return }
    setSearching(true)
    try {
      const { users: found } = await adminAction('search_users', undefined, undefined, { q })
      setUsers(found)
    } catch {}
    setSearching(false)
  }

  function openEdit(u: any) {
    setEditUser(u)
    setEditForm({ name: u.name || '', username: u.username || '', ban_reason: u.ban_reason || '' })
  }

  async function saveUserEdit() {
    if (!editUser) return
    try {
      await adminAction('edit_user', editUser.id, undefined, { name: editForm.name, username: editForm.username })
      setUsers((prev: any[]) => prev.map(u => u.id === editUser.id ? { ...u, name: editForm.name, username: editForm.username } : u))
      setEditUser(null)
    } catch (e: any) { alert(e.message) }
  }

  async function banUser(userId: string, reason: string) {
    try {
      await adminAction('ban_user', userId, reason)
      setUsers((prev: any[]) => prev.map(u => u.id === userId ? { ...u, is_banned: true, ban_reason: reason } : u))
      setEditUser(null)
      alert('User banned.')
    } catch (e: any) { alert(e.message) }
  }

  async function unbanUser(userId: string) {
    try {
      await adminAction('unban_user', userId)
      setUsers((prev: any[]) => prev.map(u => u.id === userId ? { ...u, is_banned: false } : u))
      alert('User unbanned.')
    } catch (e: any) { alert(e.message) }
  }

  async function shadowbanUser(userId: string) {
    try {
      await adminAction('shadowban_user', userId)
      setUsers((prev: any[]) => prev.map(u => u.id === userId ? { ...u, is_shadowbanned: true } : u))
      setEditUser(null)
      alert('User shadowbanned.')
    } catch (e: any) { alert(e.message) }
  }

  async function unshadowbanUser(userId: string) {
    try {
      await adminAction('unshadowban_user', userId)
      setUsers((prev: any[]) => prev.map(u => u.id === userId ? { ...u, is_shadowbanned: false } : u))
      alert('Shadowban removed.')
    } catch (e: any) { alert(e.message) }
  }

  async function nukeUser(userId: string, username: string) {
    if (!confirm(`DELETE ALL content from @${username}? Cannot be undone.`)) return
    try {
      await adminAction('delete_user_content', userId)
      setEditUser(null)
      alert('All content deleted.')
    } catch (e: any) { alert(e.message) }
  }

  async function deleteRoom(id: string) {
    if (!confirm('Delete this room? Cannot be undone.')) return
    try {
      await adminAction('delete_room', id)
      setRooms((prev: any[]) => prev.filter(r => r.id !== id))
    } catch (e: any) { alert(e.message) }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    try {
      await adminAction('delete_post', id)
      setPosts((prev: any[]) => prev.filter(p => p.id !== id))
    } catch (e: any) { alert(e.message) }
  }

  async function dismissReport(id: string) {
    try {
      await adminAction('dismiss_report', id)
      setReports((prev: any[]) => prev.map(r => r.id === id ? { ...r, status: 'dismissed' } : r))
    } catch (e: any) { alert(e.message) }
  }

  async function resolveReport(id: string) {
    if (!confirm('Delete the reported post and resolve?')) return
    try {
      await adminAction('resolve_report', id)
      setReports((prev: any[]) => prev.map(r => r.id === id ? { ...r, status: 'resolved' } : r))
    } catch (e: any) { alert(e.message) }
  }

  const pendingReports = reports.filter((r: any) => r.status === 'pending').length

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'var(--ig-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>🛡️</div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '18px' }}>Admin Dashboard</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Full platform control</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '20px', overflowX: 'auto' }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'users',    label: '👥 Users' },
            { id: 'rooms',    label: '🚪 Rooms' },
            { id: 'posts',    label: '✍️ Posts' },
            { id: 'reports',  label: `🚩 Reports${pendingReports > 0 ? ` (${pendingReports})` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ padding: '9px 16px', border: 'none', background: 'none', color: tab === t.id ? 'var(--text1)' : 'var(--text3)', borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`, fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '-1px', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t.label}</button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total Users',    value: (stats.userCount || 0).toLocaleString(),    icon: '👥', color: '#6366f1' },
                { label: 'Total Rooms',    value: (stats.roomCount || 0).toLocaleString(),    icon: '🚪', color: '#22c55e' },
                { label: 'Total Posts',    value: (stats.postCount || 0).toLocaleString(),    icon: '✍️', color: '#f97316' },
                { label: 'Total Messages', value: (stats.messageCount || 0).toLocaleString(), icon: '💬', color: '#ec4899' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg2)', border: `1px solid ${s.color}33`, borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>{s.icon}</div>
                  <div style={{ fontWeight: '800', fontSize: '24px', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Recent Users</div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {recentUsers.slice(0, 5).map((u: any) => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500' }}>{u.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(u.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Recent Rooms</div>
                <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {recentRooms.slice(0, 5).map((r: any) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '18px' }}>{r.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.member_count} members</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg3)', borderRadius: '10px', padding: '9px 14px', marginBottom: '14px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={userSearch} onChange={e => searchUsers(e.target.value)} placeholder="Search users by name or username…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '13px', fontFamily: 'inherit' }} />
              {searching && <div className="spinner" />}
            </div>

            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {users.map((u: any) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: '1px solid var(--border)', opacity: u.is_banned ? .5 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{u.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</span>
                      {u.is_admin && <span style={{ fontSize: '9px', background: 'var(--ig-gradient)', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>ADMIN</span>}
                      {u.is_banned && <span style={{ fontSize: '9px', background: 'rgba(239,68,68,.15)', color: 'var(--red)', padding: '1px 5px', borderRadius: '4px' }}>BANNED</span>}
                      {u.is_shadowbanned && <span style={{ fontSize: '9px', background: 'rgba(234,179,8,.1)', color: 'var(--yellow)', padding: '1px 5px', borderRadius: '4px' }}>SHADOWBANNED</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{u.reputation || 0} pts · joined {timeAgo(u.created_at)}</div>
                    {u.ban_reason && <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>Reason: {u.ban_reason}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(u)} style={{ padding: '4px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Edit</button>
                    {!u.is_banned
                      ? <button onClick={() => { openEdit(u); }} style={{ padding: '4px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', color: 'var(--red)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🚫 Ban</button>
                      : <button onClick={() => unbanUser(u.id)} style={{ padding: '4px 10px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '6px', color: 'var(--green)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Unban</button>
                    }
                    {!u.is_shadowbanned
                      ? <button onClick={() => shadowbanUser(u.id)} style={{ padding: '4px 10px', background: 'rgba(234,179,8,.1)', border: '1px solid rgba(234,179,8,.2)', borderRadius: '6px', color: 'var(--yellow)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>👻 Shadow</button>
                      : <button onClick={() => unshadowbanUser(u.id)} style={{ padding: '4px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Remove Shadow</button>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ROOMS TAB */}
        {tab === 'rooms' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {rooms.map((r: any) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '22px' }}>{r.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.category} · {r.member_count} members · {timeAgo(r.created_at)}</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => router.push(`/rooms/${r.id}`)} style={{ padding: '5px 10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>View</button>
                  <button onClick={() => deleteRoom(r.id)} style={{ padding: '5px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* POSTS TAB */}
        {tab === 'posts' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {posts.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', gap: '12px', padding: '12px 14px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{p.profiles?.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(p.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>❤️ {p.like_count} · 💬 {p.comment_count}</div>
                </div>
                <button onClick={() => deletePost(p.id)} style={{ padding: '5px 11px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>Delete</button>
              </div>
            ))}
          </div>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {reports.length === 0
              ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>No reports 🎉</div>
              : reports.map((r: any) => (
                <div key={r.id} style={{ padding: '14px', borderBottom: '1px solid var(--border)', opacity: r.status !== 'pending' ? .5 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: r.status === 'pending' ? 'var(--red)' : 'var(--text3)', textTransform: 'uppercase' }}>{r.status}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(r.created_at)}</span>
                      </div>
                      <div style={{ fontSize: '13px', marginBottom: '5px' }}><strong>Reason:</strong> {r.reason}</div>
                      {r.posts?.content && <div style={{ fontSize: '12px', color: 'var(--text3)', background: 'var(--bg3)', padding: '7px 10px', borderRadius: '7px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.posts.content}</div>}
                    </div>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => dismissReport(r.id)} style={{ padding: '5px 11px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
                        {r.post_id && <button onClick={() => resolveReport(r.id)} style={{ padding: '5px 11px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Delete Post</button>}
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }} className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>User: {editUser.name}</div>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>

            {/* Edit name + username */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Display Name</label>
              <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Username</label>
              <input value={editForm.username} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
            </div>
            <button onClick={saveUserEdit} style={{ width: '100%', padding: '10px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '12px', fontFamily: 'inherit' }}>Save Changes</button>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px' }}>Moderation Actions</div>

              {/* Ban reason */}
              <input value={editForm.ban_reason} onChange={e => setEditForm(p => ({ ...p, ban_reason: e.target.value }))} placeholder="Ban reason (required for ban)…" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {!editUser.is_banned
                  ? <button onClick={() => editForm.ban_reason ? banUser(editUser.id, editForm.ban_reason) : alert('Enter a ban reason first')} style={{ padding: '9px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '9px', color: 'var(--red)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>🚫 Ban User</button>
                  : <button onClick={() => unbanUser(editUser.id)} style={{ padding: '9px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', borderRadius: '9px', color: 'var(--green)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>✓ Unban</button>
                }
                {!editUser.is_shadowbanned
                  ? <button onClick={() => shadowbanUser(editUser.id)} style={{ padding: '9px', background: 'rgba(234,179,8,.1)', border: '1px solid rgba(234,179,8,.25)', borderRadius: '9px', color: 'var(--yellow)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>👻 Shadowban</button>
                  : <button onClick={() => unshadowbanUser(editUser.id)} style={{ padding: '9px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Remove Shadow</button>
                }
              </div>
              <button onClick={() => nukeUser(editUser.id, editUser.username)} style={{ width: '100%', padding: '9px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: '9px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>💥 Delete All Content</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
