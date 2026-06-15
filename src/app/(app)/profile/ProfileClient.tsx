'use client'

import { useState, useRef, useEffect } from 'react'
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

const ACHIEVEMENT_META: Record<string, { icon: string, label: string, desc: string, color: string }> = {
  first_post:     { icon: '✍️', label: 'First Post',      desc: 'Published your first post',   color: '#6366f1' },
  prolific_poster:{ icon: '📝', label: 'Prolific Poster', desc: 'Published 10 posts',           color: '#0891b2' },
  viral:          { icon: '🔥', label: 'Viral',           desc: 'Received 50 likes',            color: '#ef4444' },
  influencer:     { icon: '⭐', label: 'Influencer',      desc: 'Gained 10 followers',          color: '#eab308' },
  room_explorer:  { icon: '🧭', label: 'Room Explorer',   desc: 'Joined 5 rooms',               color: '#0f766e' },
  rising_star:    { icon: '🌟', label: 'Rising Star',     desc: 'Reached 100 reputation',       color: '#f97316' },
  elite:          { icon: '👑', label: 'Elite',           desc: 'Reached 1000 reputation',      color: '#a855f7' },
}
const ALL_ACHIEVEMENTS = Object.keys(ACHIEVEMENT_META)

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

function getLevel(rep: number) {
  if (rep >= 5000) return { level: 10, title: 'Legend', next: null }
  if (rep >= 2000) return { level: 8, title: 'Expert', next: 5000 }
  if (rep >= 1000) return { level: 7, title: 'Elite', next: 2000 }
  if (rep >= 500)  return { level: 6, title: 'Pro', next: 1000 }
  if (rep >= 200)  return { level: 5, title: 'Active', next: 500 }
  if (rep >= 100)  return { level: 4, title: 'Rising Star', next: 200 }
  if (rep >= 50)   return { level: 3, title: 'Contributor', next: 100 }
  if (rep >= 20)   return { level: 2, title: 'Member', next: 50 }
  return { level: 1, title: 'Newcomer', next: 20 }
}

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardTab({ profile, leaderboard, myRank, loading, onLoad, router, getColor }: any) {
  useEffect(() => { onLoad() }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <div>
      {/* My rank banner */}
      {myRank && (
        <div style={{ background: 'linear-gradient(135deg, rgba(225,48,108,.08), rgba(131,58,180,.06))', border: '1px solid rgba(225,48,108,.2)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '2px' }}>Your global rank</div>
            <div style={{ fontWeight: '800', fontSize: '28px', color: 'var(--accent)' }}>#{myRank}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '2px' }}>Reputation</div>
            <div style={{ fontWeight: '700', fontSize: '20px', color: 'var(--text1)' }}>{(profile?.reputation || 0).toLocaleString()} pts</div>
          </div>
        </div>
      )}

      {/* Top 10 list */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden', marginBottom: '14px' }}>
        {leaderboard.map((u: any, i: number) => {
          const isMe = u.id === profile?.id
          return (
            <div key={u.id} onClick={() => router.push(`/users/${u.username}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--border)' : 'none', background: isMe ? 'rgba(225,48,108,.06)' : 'none', cursor: 'pointer', transition: 'background .15s' }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(225,48,108,.1)' : 'var(--bg3)'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(225,48,108,.06)' : 'none'}
            >
              <div style={{ width: '26px', textAlign: 'center', fontWeight: '700', fontSize: i < 3 ? '16px' : '13px', color: i < 3 ? 'var(--yellow)' : 'var(--text3)', flexShrink: 0 }}>
                {i < 3 ? MEDALS[i] : i + 1}
              </div>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: isMe ? '700' : '500', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {u.name}
                  {isMe && <span style={{ fontSize: '9px', color: 'var(--accent)', background: 'rgba(225,48,108,.1)', padding: '1px 5px', borderRadius: '4px' }}>You</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>@{u.username}</div>
              </div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text1)', flexShrink: 0 }}>
                {(u.reputation || 0).toLocaleString()} <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: '400' }}>pts</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* View full leaderboard button */}
      <button onClick={() => router.push('/leaderboard')} style={{ width: '100%', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text2)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all .2s' }}
        onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
        onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
      >
        🏆 View Full Leaderboard →
      </button>
    </div>
  )
}

export default function ProfileClient({ profile: initialProfile, posts: initialPosts, rooms: initialRooms, followersCount: initialFollowers, followingCount: initialFollowing, achievements: initialAchievements }: any) {
  const [profile, setProfile] = useState(initialProfile || null)
  const [posts, setPosts] = useState(initialPosts || [])
  const [rooms, setRooms] = useState(initialRooms || [])
  const [followersCount, setFollowersCount] = useState(initialFollowers || 0)
  const [followingCount, setFollowingCount] = useState(initialFollowing || 0)
  const [achievements, setAchievements] = useState(initialAchievements || [])
  const [dataLoading, setDataLoading] = useState(!initialProfile)
  const [tab, setTab] = useState<'posts' | 'rooms' | 'achievements' | 'leaderboard'>('posts')

  function switchTab(t: 'posts' | 'rooms' | 'achievements' | 'leaderboard') {
    setTab(t)
    if (t === 'leaderboard') loadLeaderboard()
  }
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [usernameError, setUsernameError] = useState('')
  const [bio, setBio] = useState(profile?.bio || '')
  const [twitter, setTwitter] = useState(profile?.social_links?.twitter || '')
  const [linkedin, setLinkedin] = useState(profile?.social_links?.linkedin || '')
  const [website, setWebsite] = useState(profile?.social_links?.website || '')
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [coverUrl, setCoverUrl] = useState(profile?.cover_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const avatarRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    if (!initialProfile) loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [
      { data: profileData },
      { data: postsData },
      { data: roomsData },
      { count: followers },
      { count: following },
      { data: achievementsData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('posts').select('*, rooms(name, emoji)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('room_members').select('*, rooms(id, name, emoji, category, member_count)').eq('user_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('achievements').select('*').eq('user_id', user.id),
    ])
    if (profileData) {
      setProfile(profileData)
      setName(profileData.name || '')
      setBio(profileData.bio || '')
      setTwitter(profileData.social_links?.twitter || '')
      setLinkedin(profileData.social_links?.linkedin || '')
      setWebsite(profileData.social_links?.website || '')
      setAvatarUrl(profileData.avatar_url || '')
      setCoverUrl(profileData.cover_url || '')
    }
    setPosts(postsData || [])
    setRooms(roomsData || [])
    setFollowersCount(followers || 0)
    setFollowingCount(following || 0)
    setAchievements(achievementsData || [])
    setDataLoading(false)
  }

  async function loadLeaderboard() {
    if (leaderboard.length > 0) return // already loaded
    setLeaderboardLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: topUsers } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url, reputation')
      .order('reputation', { ascending: false })
      .limit(10)
    setLeaderboard(topUsers || [])
    // Find my rank
    if (user && profile) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('reputation', profile.reputation || 0)
      setMyRank((count || 0) + 1)
    }
    setLeaderboardLoading(false)
  }

  const color = getColor(profile?.name || 'U')
  const rep = profile?.reputation || 0
  const { level, title, next } = getLevel(rep)
  const progress = next ? Math.min(100, (rep / next) * 100) : 100
  const earnedTypes = new Set((achievements || []).map((a: any) => a.type))

  if (dataLoading) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: '160px', background: 'var(--bg4)' }} />
            <div style={{ padding: '50px 20px 20px' }}>
              <div style={{ height: '18px', background: 'var(--bg4)', borderRadius: '6px', width: '30%', marginBottom: '8px' }} />
              <div style={{ height: '12px', background: 'var(--bg4)', borderRadius: '6px', width: '20%' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return }
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id)
      setAvatarUrl(url)
    }
    setUploadingAvatar(false)
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB'); return }
    setUploadingCover(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/cover.${ext}`
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = urlData.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').update({ cover_url: url }).eq('id', profile.id)
      setCoverUrl(url)
    }
    setUploadingCover(false)
  }

  async function saveProfile() {
    setSaving(true)
    setUsernameError('')
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '')

    // Check username availability if changed
    if (cleanUsername !== profile.username) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).neq('id', profile.id).single()
      if (existing) {
        setUsernameError('Username already taken — choose another')
        setSaving(false)
        return
      }
    }

    await supabase.from('profiles').update({
      name,
      username: cleanUsername,
      bio,
      social_links: { twitter, linkedin, website }
    }).eq('id', profile.id)

    setProfile((p: any) => ({ ...p, name, username: cleanUsername, bio }))
    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Profile card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>

          {/* Cover photo */}
          <div style={{ height: '160px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
            onClick={() => coverRef.current?.click()}>
            {coverUrl
              ? <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${color}55, ${color}22)` }} />
            }
            {/* Cover overlay */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .2s' }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
            >
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600', background: 'rgba(0,0,0,.5)', padding: '6px 14px', borderRadius: '8px' }}>
                {uploadingCover ? 'Uploading…' : '📷 Change cover'}
              </span>
            </div>
            <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />

            {/* Edit button */}
            <button onClick={e => { e.stopPropagation(); setEditing(!editing) }} style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 14px', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
              {editing ? 'Cancel' : '✏️ Edit profile'}
            </button>
          </div>

          <div style={{ padding: '0 20px 20px', position: 'relative' }}>
            {/* Avatar */}
            <div style={{ position: 'relative', width: '76px', marginTop: '-38px', marginBottom: '12px' }}>
              <div style={{ width: '76px', height: '76px', borderRadius: '50%', background: avatarUrl ? 'none' : color, border: '3px solid var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#fff', overflow: 'hidden' }}>
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div onClick={() => avatarRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px' }}>
                {uploadingAvatar ? '…' : '📷'}
              </div>
              <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
            </div>

            {editing ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Username</label>
                    <input value={username} onChange={e => { setUsername(e.target.value); setUsernameError('') }} placeholder="yourhandle" style={{ width: '100%', background: 'var(--bg3)', border: `1px solid ${usernameError ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                    {usernameError && <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '3px' }}>{usernameError}</div>}
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>Bio</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '8px', fontWeight: '600' }}>Social links</div>
                <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: '𝕏 Twitter / X', value: twitter, set: setTwitter, placeholder: 'https://x.com/username' },
                    { label: '💼 LinkedIn', value: linkedin, set: setLinkedin, placeholder: 'https://linkedin.com/in/username' },
                    { label: '🌐 Website', value: website, set: setWebsite, placeholder: 'https://yoursite.com' },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', width: '110px', flexShrink: 0 }}>{f.label}</span>
                      <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 11px', color: 'var(--text1)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
                    </div>
                  ))}
                </div>
                <button onClick={saveProfile} disabled={saving} style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {saving ? <><div className="spinner" />Saving…</> : '✓ Save changes'}
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '2px' }}>{profile?.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '6px' }}>@{profile?.username}</div>
                {profile?.bio && <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '10px' }}>{profile.bio}</div>}

                {/* Social links */}
                {(twitter || linkedin || website) && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {twitter && <a href={twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>𝕏 Twitter</a>}
                    {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>💼 LinkedIn</a>}
                    {website && <a href={website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>🌐 Website</a>}
                  </div>
                )}

                {/* Stats */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {[[posts.length, 'Posts'], [rooms.length, 'Rooms'], [followersCount, 'Followers'], [followingCount, 'Following']].map(([v, l]) => (
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

        {/* Reputation card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                ⭐ Reputation
                <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(99,102,241,.1)', color: 'var(--accent2)', fontWeight: '500' }}>Level {level} · {title}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                {next ? `${rep} / ${next} pts to Level ${level + 1}` : 'Max level reached! 👑'}
              </div>
            </div>
            <div style={{ fontWeight: '800', fontSize: '22px', color: 'var(--accent2)' }}>{rep.toLocaleString()} pts</div>
          </div>
          <div style={{ height: '6px', background: 'var(--bg5, #242a38)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, var(--accent), #a855f7)', width: `${progress}%`, transition: 'width 1s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: 'var(--text3)', flexWrap: 'wrap' }}>
            <span>+2 per post</span><span>+5 per like</span><span>+3 per comment</span><span>+10 per follower</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', marginBottom: '18px', overflowX: 'auto' }}>
          {(['posts', 'rooms', 'achievements', 'leaderboard'] as const).map(t => (
            <button key={t} onClick={() => switchTab(t)} style={{ padding: '9px 16px', border: 'none', background: 'none', color: tab === t ? 'var(--accent2)' : 'var(--text3)', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '-1px', transition: 'all .18s', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {t === 'leaderboard' ? '🏆 Leaderboard' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (posts.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}><div style={{ fontSize: '32px', marginBottom: '10px' }}>✍️</div><div style={{ fontSize: '14px' }}>No posts yet</div></div>
          : posts.map((post: any) => (
            <div key={post.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                {post.rooms && <span style={{ fontSize: '12px', color: 'var(--accent2)' }}>{post.rooms.emoji} {post.rooms.name}</span>}
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {timeAgo(post.created_at)}</span>
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.65', whiteSpace: 'pre-wrap', marginBottom: post.media_url ? '10px' : '0' }}>{post.content}</div>
              {post.media_url && <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />}
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>❤️ {post.like_count}</span>
                <span style={{ fontSize: '12px', color: 'var(--text3)' }}>💬 {post.comment_count}</span>
              </div>
            </div>
          ))
        )}

        {/* Rooms tab */}
        {tab === 'rooms' && (rooms.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚪</div>
              <div style={{ fontSize: '14px' }}>No rooms joined yet</div>
              <button onClick={() => router.push('/explore')} style={{ marginTop: '12px', padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>Explore Rooms</button>
            </div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {rooms.map((m: any) => {
                const r = m.rooms
                if (!r) return null
                return (
                  <div key={m.id} onClick={() => router.push(`/rooms/${r.id}`)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all .2s' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.11)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.06)'}
                  >
                    <div style={{ height: '70px', background: ROOM_COLORS[r.category] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>{r.emoji}</div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.member_count || 0} members</div>
                    </div>
                  </div>
                )
              })}
            </div>
        )}

        {/* Achievements tab */}
        {tab === 'achievements' && (
          <div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '14px' }}>{earnedTypes.size} of {ALL_ACHIEVEMENTS.length} earned</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {ALL_ACHIEVEMENTS.map(type => {
                const meta = ACHIEVEMENT_META[type]
                const earned = earnedTypes.has(type)
                return (
                  <div key={type} style={{ background: earned ? `${meta.color}11` : 'var(--bg2)', border: `1px solid ${earned ? meta.color + '44' : 'var(--border)'}`, borderRadius: '12px', padding: '14px', opacity: earned ? 1 : 0.45 }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>{meta.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: earned ? 'var(--text1)' : 'var(--text2)', marginBottom: '3px' }}>{meta.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{meta.desc}</div>
                    {earned && <div style={{ fontSize: '10px', color: meta.color, marginTop: '6px', fontWeight: '600' }}>✓ Earned</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {/* Leaderboard tab — embedded mini board */}
        {tab === 'leaderboard' && (
          <LeaderboardTab
            profile={profile}
            leaderboard={leaderboard}
            myRank={myRank}
            loading={leaderboardLoading}
            onLoad={loadLeaderboard}
            router={router}
            getColor={getColor}
          />
        )}

        {/* Settings + Sign out */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '8px', marginBottom: '32px' }}>
          <button onClick={() => router.push('/settings')} style={{ flex: 1, padding: '11px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text2)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            Settings
          </button>
          <button onClick={signOut} disabled={signingOut} style={{ flex: 1, padding: '11px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', color: 'var(--red)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
            {signingOut
              ? <><div className="spinner" />Signing out…</>
              : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Sign Out</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}
