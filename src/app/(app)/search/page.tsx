'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function search() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    const [{ data: foundUsers }, { data: foundRooms }] = await Promise.all([
      supabase.from('profiles').select('id, name, username, bio')
        .or(`name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10),
      supabase.from('rooms').select('id, name, description, emoji, category, member_count, online_count')
        .ilike('name', `%${query}%`)
        .limit(10)
    ])

    setUsers(foundUsers || [])
    setRooms(foundRooms || [])
    setLoading(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '20px' }}>Search</div>

        {/* Search input */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search people, rooms…"
            autoFocus
            style={{
              flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '11px 16px', color: 'var(--text1)',
              fontSize: '14px', outline: 'none', fontFamily: 'inherit'
            }}
          />
          <button onClick={search} style={{
            padding: '11px 20px', background: 'var(--accent)', border: 'none',
            borderRadius: '10px', color: '#fff', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer'
          }}>Search</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}

        {!loading && searched && users.length === 0 && rooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
            <div style={{ fontSize: '14px', color: 'var(--text2)' }}>No results for &quot;{query}&quot;</div>
          </div>
        )}

        {/* People */}
        {users.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>
              People · {users.length}
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
              {users.map((u: any, i: number) => (
                <div
                  key={u.id}
                  onClick={() => router.push(`/users/${u.username}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 14px', cursor: 'pointer', transition: 'background .18s',
                    borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none'
                  }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: getColor(u.name), flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: '700', color: '#fff'
                  }}>{u.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text1)' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>@{u.username}</div>
                    {u.bio && <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.bio}</div>}
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: '16px' }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rooms */}
        {rooms.length > 0 && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px' }}>
              Rooms · {rooms.length}
            </div>
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden' }}>
              {rooms.map((r: any, i: number) => (
                <div
                  key={r.id}
                  onClick={() => router.push(`/rooms/${r.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '13px 14px', cursor: 'pointer', transition: 'background .18s',
                    borderBottom: i < rooms.length - 1 ? '1px solid var(--border)' : 'none'
                  }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'var(--bg4)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px'
                  }}>{r.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text1)' }}>{r.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                      {r.member_count || 0} members · <span style={{ color: 'var(--green)' }}>{r.online_count || 0} live</span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--text3)', fontSize: '16px' }}>›</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}