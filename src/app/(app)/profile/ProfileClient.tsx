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

// Issue 13: Unified level system matching LeaderboardClient (20 levels)
function getLevel(rep: number) {
  const levels = [
    { level: 1,  title: 'Newcomer',     min: 0,      next: 50 },
    { level: 2,  title: 'Curious',      min: 50,     next: 150 },
    { level: 3,  title: 'Regular',      min: 150,    next: 300 },
    { level: 4,  title: 'Active',       min: 300,    next: 500 },
    { level: 5,  title: 'Contributor',  min: 500,    next: 800 },
    { level: 6,  title: 'Rising Star',  min: 800,    next: 1200 },
    { level: 7,  title: 'Influencer',   min: 1200,   next: 1800 },
    { level: 8,  title: 'Pro',          min: 1800,   next: 2500 },
    { level: 9,  title: 'Expert',       min: 2500,   next: 3500 },
    { level: 10, title: 'Elite',        min: 3500,   next: 5000 },
    { level: 11, title: 'Champion',     min: 5000,   next: 7000 },
    { level: 12, title: 'Master',       min: 7000,   next: 10000 },
    { level: 13, title: 'Grand Master', min: 10000,  next: 15000 },
    { level: 14, title: 'Legend',       min: 15000,  next: 25000 },
    { level: 15, title: 'Mythic',       min: 25000,  next: 40000 },
    { level: 16, title: 'Godlike',      min: 40000,  next: 60000 },
    { level: 17, title: 'Transcendent', min: 60000,  next: 100000 },
    { level: 18, title: 'Cosmic',       min: 100000, next: 200000 },
    { level: 19, title: 'Eternal',      min: 200000, next: 500000 },
    { level: 20, title: 'Immortal',     min: 500000, next: null },
  ]
  for (let i = levels.length - 1; i >= 0; i--) {
    if (rep >= levels[i].min) return levels[i]
  }
  return levels[0]
}

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardTab({ profile, leaderboard, myRank, loading, onLoad, router, getColor }: any) {
  useEffect(() => { onLoad() }, [])
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
  return (
    <div>
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
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', overflow: 'hidden', marginBottom: '14px' }}>
        {leaderboard.map((u: any, i: number) => {
          const isMe = u.id === profile?.id
          return (
            <div key={u.id} onClick={() => router.push(`/users/${u.username}`)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', borderBottom: i < leaderboard.length - 1 ? '1px solid var(--border)' : 'none', background: isMe ? 'rgba(225,48,108,.06)' : 'none', cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(225,48,108,.1)' : 'var(--bg3)'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.background = isMe ? 'rgba(225,48,108,.06)' : 'none'}
            >
              <div style={{ width: '26px', textAlign: 'center', fontWeight: '700', fontSize: i < 3 ? '16px' : '13px', color: i < 3 ? 'var(--yellow)' : 'var(--text3)' }}>{i < 3 ? MEDALS[i] : i + 1}</div>
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
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text1)' }}>{(u.reputation || 0).toLocaleString()} <span style={{ fontSize: '10px', color: 'var(--text3)', fontWeight: '400' }}>pts</span></div>
            </div>
          )
        })}
      </div>
      <button onClick={() => router.push('/leaderboard')} style={{ width: '100%', padding: '12px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text2)', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'}
        onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
      >🏆 View Full Leaderboard →</button>
    </div>
  )
}

export default function ProfileClient({ profile: initialProfile, posts: initialPosts, rooms: initialRooms, followersCount: initialFollowers, followingCount: initialFollowing }: any) {
  const [profile, setProfile] = useState(initialProfile || null)
  const [posts, setPosts] = useState(initialPosts || [])
  const [rooms, setRooms] = useState(initialRooms || [])
  const [followersCount, setFollowersCount] = useState(initialFollowers || 0)
  const [followingCount, setFollowingCount] = useState(initialFollowing || 0)
  const [dataLoading, setDataLoading] = useState(!initialProfile)
  const [tab, setTab] = useState<'posts' | 'rooms' | 'likes' | 'saved' | 'leaderboard'>('posts')
  const [likedPosts, setLikedPosts] = useState<any[]>([])
  const [savedPosts, setSavedPosts] = useState<any[]>([])
  const [likesLoading, setLikesLoading] = useState(false)
  const [savedLoading, setSavedLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [myRank, setMyRank] = useState<number | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
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
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [followersList, setFollowersList] = useState<any[]>([])
  const [followingList, setFollowingList] = useState<any[]>([])
  const [followListLoading, setFollowListLoading] = useState(false)
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

  async function openFollowers() {
    setShowFollowers(true)
    if (followersList.length > 0) return
    setFollowListLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: rows } = await supabase.from('follows').select('profiles!follower_id(id, name, username, avatar_url)').eq('following_id', user.id)
    setFollowersList((rows || []).map((r: any) => r.profiles).filter(Boolean))
    setFollowListLoading(false)
  }

  async function openFollowing() {
    setShowFollowing(true)
    if (followingList.length > 0) return
    setFollowListLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: rows } = await supabase.from('follows').select('profiles!following_id(id, name, username, avatar_url)').eq('follower_id', user.id)
    setFollowingList((rows || []).map((r: any) => r.profiles).filter(Boolean))
    setFollowListLoading(false)
  }

  useEffect(() => { if (!initialProfile) loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: profileData }, { data: postsData }, { data: roomsData }, { count: followers }, { count: following }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('posts').select('*, rooms(name, emoji)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('room_members').select('*, rooms(id, name, emoji, category, member_count)').eq('user_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
    ])
    if (profileData) {
      setProfile(profileData)
      setName(profileData.name || '')
      setUsername(profileData.username || '')
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
    setDataLoading(false)
  }

  async function loadLikes() {
    if (likesLoading || likedPosts.length > 0) return
    setLikesLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: likeRows } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
    if (!likeRows || likeRows.length === 0) { setLikesLoading(false); return }
    const ids = likeRows.map((l: any) => l.post_id)
    const { data } = await supabase.from('posts').select('*, profiles(name, username, avatar_url), rooms(name, emoji)').in('id', ids).order('created_at', { ascending: false })
    setLikedPosts(data || [])
    setLikesLoading(false)
  }

  async function loadSaved() {
    if (savedLoading || savedPosts.length > 0) return
    setSavedLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: savedRows } = await supabase.from('saved_posts').select('post_id').eq('user_id', user.id)
    if (!savedRows || savedRows.length === 0) { setSavedLoading(false); return }
    const ids = savedRows.map((s: any) => s.post_id)
    const { data } = await supabase.from('posts').select('*, profiles(name, username, avatar_url), rooms(name, emoji)').in('id', ids).order('created_at', { ascending: false })
    setSavedPosts(data || [])
    setSavedLoading(false)
  }

  async function loadLeaderboard() {
    if (leaderboard.length > 0) return
    setLeaderboardLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: topUsers } = await supabase.from('profiles').select('id, name, username, avatar_url, reputation').order('reputation', { ascending: false }).limit(10)
    setLeaderboard(topUsers || [])
    if (user && profile) {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('reputation', profile.reputation || 0)
      // Issue 36: only show meaningful rank — don't show #1 with 0 pts if no real competition
      if ((profile.reputation || 0) > 0 || (count || 0) > 0) {
        setMyRank((count || 0) + 1)
      }
    }
    setLeaderboardLoading(false)
  }

  function switchTab(t: typeof tab) {
    setTab(t)
    if (t === 'leaderboard') loadLeaderboard()
    if (t === 'likes') loadLikes()
    if (t === 'saved') loadSaved()
  }

  const color = getColor(profile?.name || 'U')
  const rep = profile?.reputation || 0
  const { level, title, next } = getLevel(rep)
  const progress = next ? Math.min(100, (rep / next) * 100) : 100

  if (dataLoading) return (
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

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
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
    const file = e.target.files?.[0]; if (!file) return
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
    setSaving(true); setUsernameError('')
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (cleanUsername !== profile.username) {
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).neq('id', profile.id).single()
      if (existing) { setUsernameError('Username already taken'); setSaving(false); return }
    }
    await supabase.from('profiles').update({ name, username: cleanUsername, bio, social_links: { twitter, linkedin, website } }).eq('id', profile.id)
    setProfile((p: any) => ({ ...p, name, username: cleanUsername, bio }))
    setSaving(false); setEditing(false); router.refresh()
  }

  // Reusable post card for likes/saved tabs
  function PostCard({ post }: { post: any }) {
    const posterName = post.profiles?.name || 'Unknown'
    return (
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: getColor(posterName), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
            {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : posterName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600' }}>{posterName}</span>
          {post.rooms && <><span style={{ color: 'var(--text3)', fontSize: '12px' }}>·</span><span style={{ fontSize: '11px', color: 'var(--text3)' }}>{post.rooms.emoji} {post.rooms.name}</span></>}
          <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: 'auto' }}>{timeAgo(post.created_at)}</span>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: post.media_url ? '8px' : '0' }}>{post.content}</div>
        {post.media_url && <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px' }} />}
        <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>❤️ {post.like_count}</span>
          <span style={{ fontSize: '12px', color: 'var(--text3)' }}>💬 {post.comment_count}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Profile card */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>

          {/* Cover photo */}
          <div style={{ height: '160px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => coverRef.current?.click()}>
            {coverUrl ? <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${color}55, ${color}22)` }} />}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity .2s' }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
            >
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: '600', background: 'rgba(0,0,0,.5)', padding: '6px 14px', borderRadius: '8px' }}>
                {uploadingCover ? 'Uploading…' : '📷 Change cover'}
              </span>
            </div>
            <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />

            {/* Edit + Settings icons top right */}
            <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px' }}>
              <button onClick={e => { e.stopPropagation(); setEditing(!editing) }} style={{ padding: '6px 12px', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '500' }}>
                {editing ? 'Cancel' : '✏️ Edit'}
              </button>
              <button onClick={e => { e.stopPropagation(); router.push('/settings') }} style={{ width: '32px', height: '32px', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              </button>
            </div>
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
                    <input value={username} onChange={e => { setUsername(e.target.value); setUsernameError('') }} style={{ width: '100%', background: 'var(--bg3)', border: `1px solid ${usernameError ? 'var(--red)' : 'var(--border)'}`, borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
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
                    { label: '𝕏 Twitter', value: twitter, set: setTwitter, placeholder: 'https://x.com/username' },
                    { label: '💼 LinkedIn', value: linkedin, set: setLinkedin, placeholder: 'https://linkedin.com/in/username' },
                    { label: '🌐 Website', value: website, set: setWebsite, placeholder: 'https://yoursite.com' },
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text3)', width: '80px', flexShrink: 0 }}>{f.label}</span>
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
                {(profile?.social_links?.twitter || profile?.social_links?.linkedin || profile?.social_links?.website) && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {profile.social_links.twitter && <a href={profile.social_links.twitter} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none' }}>𝕏 Twitter</a>}
                    {profile.social_links.linkedin && <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none' }}>💼 LinkedIn</a>}
                    {profile.social_links.website && <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent2)', textDecoration: 'none' }}>🌐 Website</a>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {[[posts.length, 'Posts', null], [rooms.length, 'Rooms', null], [followersCount, 'Followers', openFollowers], [followingCount, 'Following', openFollowing]].map(([v, l, fn]) => (
                    <div key={l as string} onClick={() => fn && (fn as any)()} style={{ cursor: fn ? 'pointer' : 'default' }}
                      onMouseOver={e => { if (fn) (e.currentTarget as HTMLElement).style.opacity = '.7' }}
                      onMouseOut={e => { if (fn) (e.currentTarget as HTMLElement).style.opacity = '1' }}
                    >
                      <div style={{ fontWeight: '700', fontSize: '17px' }}>{v}</div>
                      <div style={{ fontSize: '11px', color: fn ? 'var(--accent2)' : 'var(--text3)', textDecoration: fn ? 'underline' : 'none' }}>{l as string}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tabs — no Achievements, added Likes + Saved */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '18px', overflowX: 'auto' }}>
          {([
            ['posts', 'Posts'],
            ['rooms', 'Rooms'],
            ['likes', '❤️ Likes'],
            ['saved', '🔖 Saved'],
            ['leaderboard', '🏆 Rank'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => switchTab(t)} style={{ padding: '9px 14px', border: 'none', background: 'none', color: tab === t ? 'var(--accent2)' : 'var(--text3)', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`, fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginBottom: '-1px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {label}
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
                const r = m.rooms; if (!r) return null
                return (
                  <div key={m.id} onClick={() => router.push(`/rooms/${r.id}`)} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ height: '70px', background: ROOM_COLORS[r.category] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', overflow: 'hidden' }}>
                      {r.icon_url ? <img src={r.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : r.emoji}
                    </div>
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '3px' }}>{r.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.member_count || 0} members</div>
                    </div>
                  </div>
                )
              })}
            </div>
        )}

        {/* Likes tab — public */}
        {tab === 'likes' && (
          likesLoading
            ? <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
            : likedPosts.length === 0
              ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}><div style={{ fontSize: '32px', marginBottom: '10px' }}>❤️</div><div style={{ fontSize: '14px' }}>No liked posts yet</div></div>
              : likedPosts.map((post: any) => <PostCard key={post.id} post={post} />)
        )}

        {/* Saved tab — private */}
        {tab === 'saved' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', padding: '8px 12px', background: 'rgba(99,102,241,.06)', border: '1px solid rgba(99,102,241,.15)', borderRadius: '8px' }}>
              <span style={{ fontSize: '14px' }}>🔒</span>
              <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Saved posts are private — only you can see them</span>
            </div>
            {savedLoading
              ? <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
              : savedPosts.length === 0
                ? <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}><div style={{ fontSize: '32px', marginBottom: '10px' }}>🔖</div><div style={{ fontSize: '14px' }}>No saved posts yet</div><div style={{ fontSize: '12px', marginTop: '6px' }}>Tap the bookmark icon on any post to save it</div></div>
                : savedPosts.map((post: any) => <PostCard key={post.id} post={post} />)
            }
          </div>
        )}

        {/* Leaderboard tab */}
        {tab === 'leaderboard' && (
          <LeaderboardTab profile={profile} leaderboard={leaderboard} myRank={myRank} loading={leaderboardLoading} onLoad={loadLeaderboard} router={router} getColor={getColor} />
        )}

        <div style={{ height: '32px' }} />
      </div>

      {/* Followers/Following Modal */}
      {(showFollowers || showFollowing) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && (setShowFollowers(false), setShowFollowing(false))}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '500px', maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} className="fade-up">
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--bg5)' }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>{showFollowers ? 'Followers' : 'Following'}</div>
              <button onClick={() => { setShowFollowers(false); setShowFollowing(false) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>×</button>
            </div>
            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {followListLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
              ) : (showFollowers ? followersList : followingList).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', fontSize: '14px' }}>
                  {showFollowers ? 'No followers yet' : 'Not following anyone yet'}
                </div>
              ) : (showFollowers ? followersList : followingList).map((u: any) => (
                <div key={u.id} onClick={() => { router.push(`/users/${u.username}`); setShowFollowers(false); setShowFollowing(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: u.avatar_url ? 'none' : getColor(u.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                    {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : (u.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text1)' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text3)' }}>@{u.username}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
