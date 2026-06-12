'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}
function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function ProfileClient({ profile, posts, rooms, followersCount, followingCount }: any) {
  const [tab, setTab] = useState<'posts' | 'rooms'>('posts')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const color = getColor(profile?.name || 'U')

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles').update({ name, bio }).eq('id', profile.id)
    setSaving(false)
    setEditing(false)
    router.refresh()
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

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>

        {/* Profile card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '16px', overflow: 'hidden', marginBottom: '20px'
        }}>
          {/* Cover */}
          <div style={{
            height: '140px',
            background: `linear-gradient(135deg, ${color}44, ${color}22)`,
            position: 'relative'
          }}>
            <button
              onClick={() => setEditing(!editing)}
              style={{
                position: 'absolute', top: '12px', right: '12px',
                padding: '6px 14px', background: 'rgba(0,0,0,.4)',
                backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.15)',
                borderRadius: '8px', color: '#fff', fontSize: '12px',
                cursor: 'pointer', fontWeight: '500'
              }}
            >{editing ? 'Cancel' : '✏️ Edit profile'}</button>
          </div>

          {/* Avatar + info */}
          <div style={{ padding: '0 20px 20px', position: 'relative' }}>
            <div style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: color, border: '3px solid var(--bg2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: '800', color: '#fff',
              marginTop: '-38px', marginBottom: '12px'
            }}>{(profile?.name || 'U').charAt(0).toUpperCase()}</div>

            {editing ? (
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Name</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    style={{
                      width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)',
                      fontSize: '13px', outline: 'none'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Bio</label>
                  <textarea
                    value={bio} onChange={e => setBio(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)',
                      fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit'
                    }}
                  />
                </div>
                <button onClick={saveProfile} disabled={saving} style={{
                  padding: '8px 20px', background: 'var(--accent)', border: 'none',
                  borderRadius: '8px', color: '#fff', fontSize: '13px',
                  fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px'
                }}>
                  {saving ? <><div className="spinner" />Saving…</> : 'Save changes'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '2px' }}>{profile?.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>@{profile?.username}</div>
                {profile?.bio && (
                  <div style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '14px', lineHeight: '1.6' }}>
                    {profile.bio}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '20px' }}>
                  {[
                    [posts.length, 'Posts'],
                    [rooms.length, 'Rooms'],
                    [followersCount, 'Followers'],
                    [followingCount, 'Following'],
                  ].map(([v, l]) => (
                    <div key={l as string}>
                      <div style={{ fontWeight: '700', fontSize: '17px' }}>{v}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)',
          marginBottom: '18px'
        }}>
          {(['posts', 'rooms'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 18px', border: 'none', background: 'none',
              color: tab === t ? 'var(--accent2)' : 'var(--text3)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              marginBottom: '-1px', transition: 'all .18s', fontFamily: 'inherit'
            }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>✍️</div>
              <div style={{ fontSize: '14px', color: 'var(--text2)' }}>No posts yet</div>
            </div>
          ) : (
            posts.map((post: any) => (
              <div key={post.id} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '14px', marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  {post.rooms && (
                    <span style={{ fontSize: '12px', color: 'var(--accent2)' }}>
                      {post.rooms.emoji} {post.rooms.name}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {timeAgo(post.created_at)}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>
                  {post.content}
                </div>
                <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>❤️ {post.like_count}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text3)' }}>💬 {post.comment_count}</span>
                </div>
              </div>
            ))
          )
        )}

        {/* Rooms tab */}
        {tab === 'rooms' && (
          rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚪</div>
              <div style={{ fontSize: '14px', color: 'var(--text2)' }}>No rooms joined yet</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {rooms.map((m: any) => {
                const r = m.rooms
                if (!r) return null
                return (
                  <div
                    key={m.id}
                    onClick={() => router.push(`/rooms/${r.id}`)}
                    style={{
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                      transition: 'all .2s'
                    }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.11)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.06)'}
                  >
                    <div style={{
                      height: '70px',
                      background: ROOM_COLORS[r.category] || 'var(--bg3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '32px'
                    }}>{r.emoji}</div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.member_count || 0} members</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </div>
  )
}