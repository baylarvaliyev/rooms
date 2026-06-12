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

export default function UserProfileClient({ profile, posts, followersCount, followingCount, isFollowing: initFollowing, currentUserId, isOwnProfile }: any) {
  const [following, setFollowing] = useState(initFollowing)
  const [followers, setFollowers] = useState(followersCount)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const color = getColor(profile?.name || 'U')

  async function toggleFollow() {
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
      setFollowers((f: number) => f - 1)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({
        follower_id: currentUserId,
        following_id: profile.id
      })
      setFollowers((f: number) => f + 1)
      setFollowing(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Back */}
        <button onClick={() => router.back()} style={{
          background: 'none', border: 'none', color: 'var(--text3)',
          cursor: 'pointer', fontSize: '13px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '5px'
        }}>← Back</button>

        {/* Profile card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: '16px', overflow: 'hidden', marginBottom: '20px'
        }}>
          {/* Cover */}
          <div style={{
            height: '130px',
            background: `linear-gradient(135deg, ${color}44, ${color}22)`
          }} />

          <div style={{ padding: '0 20px 20px', position: 'relative' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: color, border: '3px solid var(--bg2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', fontWeight: '800', color: '#fff',
              marginTop: '-36px', marginBottom: '12px'
            }}>{(profile?.name || 'U').charAt(0).toUpperCase()}</div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '19px' }}>{profile?.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>@{profile?.username}</div>
                {profile?.bio && (
                  <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '12px', maxWidth: '380px' }}>
                    {profile.bio}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '18px' }}>
                  {[
                    [posts.length, 'Posts'],
                    [followers, 'Followers'],
                    [followingCount, 'Following'],
                  ].map(([v, l]) => (
                    <div key={l as string}>
                      <div style={{ fontWeight: '700', fontSize: '16px' }}>{v}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              {!isOwnProfile && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={toggleFollow}
                    disabled={loading}
                    style={{
                      padding: '8px 18px',
                      background: following ? 'transparent' : 'var(--accent)',
                      border: `1px solid ${following ? 'var(--border)' : 'var(--accent)'}`,
                      borderRadius: '9px', color: following ? 'var(--text2)' : '#fff',
                      fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      transition: 'all .18s'
                    }}
                  >
                    {loading ? '…' : following ? 'Following' : 'Follow'}
                  </button>
                  <button
                    onClick={() => router.push('/messages')}
                    style={{
                      padding: '8px 14px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: '9px',
                      color: 'var(--text2)', fontSize: '13px', cursor: 'pointer'
                    }}
                  >Message</button>
                </div>
              )}
              {isOwnProfile && (
                <button
                  onClick={() => router.push('/profile')}
                  style={{
                    padding: '8px 14px', background: 'transparent',
                    border: '1px solid var(--border)', borderRadius: '9px',
                    color: 'var(--text2)', fontSize: '13px', cursor: 'pointer'
                  }}
                >Edit profile</button>
              )}
            </div>
          </div>
        </div>

        {/* Posts */}
        <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px', color: 'var(--text2)' }}>
          Posts · {posts.length}
        </div>
        {posts.length === 0 ? (
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
        )}
      </div>
    </div>
  )
}