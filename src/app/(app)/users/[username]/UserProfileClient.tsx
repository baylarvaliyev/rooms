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
  const [messageSending, setMessageSending] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const color = getColor(profile?.name || 'U')

  async function toggleFollow() {
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', profile.id)
      setFollowers((f: number) => f - 1)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
      setFollowers((f: number) => f + 1)
      setFollowing(true)
    }
    setLoading(false)
  }

  // Message button — opens DM with this user directly
  async function openMessage() {
    setMessageSending(true)
    // Navigate to messages and open conversation with this user
    router.push(`/messages?user=${profile.id}&name=${encodeURIComponent(profile.name)}&username=${encodeURIComponent(profile.username)}`)
    setMessageSending(false)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 0 24px' }}>

        {/* Profile card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '0 0 16px 16px', overflow: 'hidden', marginBottom: '20px' }}>

          {/* Cover photo */}
          <div style={{ height: '160px', position: 'relative', overflow: 'hidden' }}>
            {profile?.cover_url
              ? <img src={profile.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${color}66, ${color}22)` }} />
            }
            {/* Back button */}
            <button onClick={() => router.back()} style={{ position: 'absolute', top: '12px', left: '12px', width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <div style={{ padding: '0 20px 20px', position: 'relative' }}>
            {/* Avatar */}
            <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: profile?.avatar_url ? 'none' : color, border: '3px solid var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#fff', marginTop: '-38px', marginBottom: '10px', overflow: 'hidden', flexShrink: 0 }}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (profile?.name || 'U').charAt(0).toUpperCase()
              }
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '700', fontSize: '19px', marginBottom: '2px' }}>{profile?.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '8px' }}>@{profile?.username}</div>
                {profile?.bio && (
                  <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '12px' }}>{profile.bio}</div>
                )}
                {/* Social links */}
                {(profile?.social_links?.twitter || profile?.social_links?.linkedin || profile?.social_links?.website) && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {profile.social_links.twitter && <a href={profile.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none' }}>𝕏 Twitter</a>}
                    {profile.social_links.linkedin && <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none' }}>💼 LinkedIn</a>}
                    {profile.social_links.website && <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none' }}>🌐 Website</a>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {[[posts.length, 'Posts'], [followers, 'Followers'], [followingCount, 'Following']].map(([v, l]) => (
                    <div key={l as string}>
                      <div style={{ fontWeight: '700', fontSize: '16px' }}>{v}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                {!isOwnProfile ? (
                  <>
                    <button onClick={toggleFollow} disabled={loading} style={{ padding: '8px 20px', background: following ? 'transparent' : 'var(--accent)', border: `1px solid ${following ? 'var(--border)' : 'var(--accent)'}`, borderRadius: '9px', color: following ? 'var(--text2)' : '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {loading ? '…' : following ? '✓ Following' : 'Follow'}
                    </button>
                    <button onClick={openMessage} disabled={messageSending} style={{ padding: '8px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      💬 Message
                    </button>
                  </>
                ) : (
                  <button onClick={() => router.push('/profile')} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '14px', color: 'var(--text2)' }}>Posts · {posts.length}</div>
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>✍️</div>
              <div style={{ fontSize: '14px' }}>No posts yet</div>
            </div>
          ) : posts.map((post: any) => (
            <div key={post.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                {post.rooms && <span style={{ fontSize: '12px', color: 'var(--accent2)' }}>{post.rooms.emoji} {post.rooms.name}</span>}
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {timeAgo(post.created_at)}</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.65', whiteSpace: 'pre-wrap', marginBottom: post.media_url ? '10px' : '0' }}>{post.content}</div>
              {post.media_url && <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', display: 'block', marginBottom: '8px' }} />}
              <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>❤️ {post.like_count}</span>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>💬 {post.comment_count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
