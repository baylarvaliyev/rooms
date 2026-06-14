'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
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

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}

function formatEventDate(date: string) {
  const d = new Date(date)
  return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function RoomClient({ room: initialRoom, initialMessages, members: initialMembers, currentUser, isMember }: any) {
  const [room, setRoom] = useState(initialRoom)
  const [messages, setMessages] = useState(initialMessages)
  const [members, setMembers] = useState(initialMembers)
  const [input, setInput] = useState('')
  const [joined, setJoined] = useState(isMember)
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [onlineCount, setOnlineCount] = useState(1)
  const [pinnedMsg, setPinnedMsg] = useState<any>(null)
  const [pinInput, setPinInput] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [rules, setRules] = useState(initialRoom.rules || '')
  const [editingRules, setEditingRules] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ msgId: string, x: number, y: number, content: string } | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [generatingInvite, setGeneratingInvite] = useState(false)
  const [copied, setCopied] = useState(false)
  const [schedules, setSchedules] = useState<any[]>([])
  const [rsvpIds, setRsvpIds] = useState<Set<string>>(new Set())
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [eventForm, setEventForm] = useState({ title: '', description: '', starts_at: '', is_recurring: false, recurrence: 'weekly' })
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'general'|'schedule'|'members'|'invite'|'analytics'>('general')
  const [joinRequests, setJoinRequests] = useState<any[]>([])
  // Room settings form
  const [settingsForm, setSettingsForm] = useState({
    name: initialRoom.name,
    description: initialRoom.description || '',
    is_private: initialRoom.is_private || false,
    join_mode: initialRoom.join_mode || 'open',
    max_members: initialRoom.max_members || '',
    slug: initialRoom.slug || '',
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const iconInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const isOwner = room.created_by === currentUser.id
  const myMembership = members.find((m: any) => m.user_id === currentUser.id)
  const isMod = isOwner || myMembership?.is_moderator
  const memberCount = members.length
  const isAtMax = room.max_members && memberCount >= room.max_members

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    loadExtra()
    const channel = supabase.channel(`room:${room.id}`, { config: { presence: { key: currentUser.id } } })
      .on('presence', { event: 'sync' }, () => setOnlineCount(Object.keys(channel.presenceState()).length))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, async (payload) => {
        const { data } = await supabase.from('messages').select('*, profiles(name, username)').eq('id', payload.new.id).single()
        if (data) setMessages((prev: any[]) => [...prev, data])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, (payload) => {
        setMessages((prev: any[]) => prev.filter((m: any) => m.id !== payload.old.id))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const myName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User'
          await channel.track({ user_id: currentUser.id, name: myName, online_at: new Date().toISOString() })
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [room.id])

  async function loadExtra() {
    const [pinRes, followRes, schedRes, rsvpRes] = await Promise.all([
      supabase.from('room_pinned_messages').select('*').eq('room_id', room.id).single(),
      supabase.from('room_follows').select('id').eq('room_id', room.id).eq('user_id', currentUser.id).single(),
      supabase.from('room_schedules').select('*, profiles(name)').eq('room_id', room.id).order('starts_at', { ascending: true }),
      supabase.from('room_rsvps').select('schedule_id').eq('user_id', currentUser.id),
    ])
    if (pinRes.data) setPinnedMsg(pinRes.data)
    setIsFollowing(!!followRes.data)
    setSchedules(schedRes.data || [])
    setRsvpIds(new Set((rsvpRes.data || []).map((r: any) => r.schedule_id)))
    if (isOwner) {
      const { data: reqs } = await supabase.from('room_join_requests').select('*, profiles(name, username)').eq('room_id', room.id).eq('status', 'pending')
      setJoinRequests(reqs || [])
    }
  }

  async function joinRoom() {
    if (isAtMax) { alert('This room is full'); return }
    if (room.join_mode === 'invite_only') { alert('This room is invite only'); return }
    if (room.join_mode === 'request') {
      await supabase.from('room_join_requests').insert({ room_id: room.id, user_id: currentUser.id })
      alert('Join request sent! The owner will review it.')
      return
    }
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    await supabase.from('rooms').update({ member_count: (room.member_count || 0) + 1 }).eq('id', room.id)
    setJoined(true)
    setMembers((prev: any[]) => [...prev, { user_id: currentUser.id, role: 'member', profiles: { name: currentUser.name || 'You' } }])
  }

  async function sendMessage() {
    if (!input.trim() || !joined || sending) return
    setSending(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: room.id, content: input.trim() })
    })
    if (!res.ok) { const { error } = await res.json(); if (error) alert(error) }
    else setInput('')
    setSending(false)
  }

  async function deleteMessage(msgId: string) {
    await supabase.from('messages').delete().eq('id', msgId)
    setContextMenu(null)
  }

  async function pinMessage(content: string) {
    if (!content.trim()) return
    await supabase.from('room_pinned_messages').upsert({ room_id: room.id, content: content.trim(), pinned_by: currentUser.id }, { onConflict: 'room_id' })
    setPinnedMsg({ content: content.trim() })
    setShowPinInput(false); setPinInput('')
  }

  async function unpinMessage() {
    await supabase.from('room_pinned_messages').delete().eq('room_id', room.id)
    setPinnedMsg(null)
  }

  async function kickMember(userId: string) {
    if (!confirm('Remove this member?')) return
    await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', userId)
    setMembers((prev: any[]) => prev.filter((m: any) => m.user_id !== userId))
  }

  async function toggleModerator(userId: string, isMod: boolean) {
    await supabase.from('room_members').update({ is_moderator: !isMod }).eq('room_id', room.id).eq('user_id', userId)
    setMembers((prev: any[]) => prev.map((m: any) => m.user_id === userId ? { ...m, is_moderator: !isMod } : m))
  }

  async function toggleFollow() {
    if (isFollowing) await supabase.from('room_follows').delete().eq('room_id', room.id).eq('user_id', currentUser.id)
    else await supabase.from('room_follows').insert({ room_id: room.id, user_id: currentUser.id })
    setIsFollowing(!isFollowing)
  }

  async function generateInvite() {
    setGeneratingInvite(true)
    const { data: existing } = await supabase.from('room_invites').select('code').eq('room_id', room.id).eq('created_by', currentUser.id).single()
    if (existing) { setInviteCode(existing.code) }
    else {
      const { data } = await supabase.from('room_invites').insert({ room_id: room.id, created_by: currentUser.id }).select('code').single()
      if (data) setInviteCode(data.code)
    }
    setGeneratingInvite(false)
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteCode}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function saveRoomSettings() {
    const updates: any = {
      name: settingsForm.name,
      description: settingsForm.description,
      is_private: settingsForm.is_private,
      join_mode: settingsForm.join_mode,
      max_members: settingsForm.max_members ? parseInt(settingsForm.max_members) : null,
    }
    if (settingsForm.slug) updates.slug = settingsForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    await supabase.from('rooms').update(updates).eq('id', room.id)
    setRoom((prev: any) => ({ ...prev, ...updates }))
    alert('Settings saved!')
  }

  async function uploadRoomIcon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingIcon(true)
    const path = `room-icons/${room.id}-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('posts').upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
      await supabase.from('rooms').update({ icon_url: urlData.publicUrl }).eq('id', room.id)
      setRoom((prev: any) => ({ ...prev, icon_url: urlData.publicUrl }))
    }
    setUploadingIcon(false)
  }

  async function uploadRoomCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    const path = `room-covers/${room.id}-${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('posts').upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
      await supabase.from('rooms').update({ cover_url: urlData.publicUrl }).eq('id', room.id)
      setRoom((prev: any) => ({ ...prev, cover_url: urlData.publicUrl }))
    }
    setUploadingCover(false)
  }

  async function toggleRsvp(scheduleId: string) {
    if (rsvpIds.has(scheduleId)) {
      await supabase.from('room_rsvps').delete().eq('schedule_id', scheduleId).eq('user_id', currentUser.id)
      setRsvpIds(prev => { const n = new Set(prev); n.delete(scheduleId); return n })
    } else {
      await supabase.from('room_rsvps').insert({ schedule_id: scheduleId, user_id: currentUser.id })
      setRsvpIds(prev => new Set([...prev, scheduleId]))
    }
  }

  async function createEvent() {
    if (!eventForm.title || !eventForm.starts_at) return
    const { data } = await supabase.from('room_schedules').insert({
      room_id: room.id, created_by: currentUser.id,
      title: eventForm.title, description: eventForm.description,
      starts_at: new Date(eventForm.starts_at).toISOString(),
      is_recurring: eventForm.is_recurring,
      recurrence: eventForm.is_recurring ? eventForm.recurrence : null,
    }).select('*, profiles(name)').single()
    if (data) setSchedules(prev => [...prev, data])
    setShowNewEvent(false)
    setEventForm({ title: '', description: '', starts_at: '', is_recurring: false, recurrence: 'weekly' })
  }

  async function deleteEvent(id: string) {
    await supabase.from('room_schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  async function approveJoinRequest(requestId: string, userId: string) {
    await supabase.from('room_join_requests').update({ status: 'approved' }).eq('id', requestId)
    await supabase.from('room_members').insert({ room_id: room.id, user_id: userId, role: 'member' })
    setJoinRequests(prev => prev.filter(r => r.id !== requestId))
  }

  async function rejectJoinRequest(requestId: string) {
    await supabase.from('room_join_requests').update({ status: 'rejected' }).eq('id', requestId)
    setJoinRequests(prev => prev.filter(r => r.id !== requestId))
  }

  const upcomingEvents = schedules.filter(s => new Date(s.starts_at) > new Date()).slice(0, 3)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }} onClick={() => contextMenu && setContextMenu(null)}>
      <input ref={iconInputRef} type="file" accept="image/*" onChange={uploadRoomIcon} style={{ display: 'none' }} />
      <input ref={coverInputRef} type="file" accept="image/*" onChange={uploadRoomCover} style={{ display: 'none' }} />

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Cover photo */}
        <div style={{ height: '90px', background: room.cover_url ? 'none' : (ROOM_COLORS[room.category] || 'var(--bg3)'), flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          {room.cover_url && <img src={room.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.5))' }} />
          {/* Back button */}
          <button onClick={() => router.back()} style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {isOwner && (
            <button onClick={() => coverInputRef.current?.click()} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {uploadingCover ? '…' : '📷 Cover'}
            </button>
          )}
        </div>

        {/* Room header */}
        <div style={{ padding: '0 14px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg0)', flexShrink: 0, marginTop: '-20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '8px' }}>
            {/* Room icon */}
            <div onClick={() => isOwner && iconInputRef.current?.click()} style={{ width: '52px', height: '52px', borderRadius: '12px', border: '2px solid var(--bg0)', overflow: 'hidden', background: ROOM_COLORS[room.category] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0, cursor: isOwner ? 'pointer' : 'default', position: 'relative' }}>
              {room.icon_url ? <img src={room.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : room.emoji}
              {uploadingIcon && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '700', fontSize: '15px' }}>{room.name}</span>
                {isOwner && <span style={{ fontSize: '9px', background: 'var(--ig-gradient)', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>👑 Founder</span>}
                {!isOwner && isMod && <span style={{ fontSize: '9px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '1px 6px', borderRadius: '4px' }}>🛡 Mod</span>}
                {room.is_private && <span style={{ fontSize: '9px', background: 'rgba(239,68,68,.15)', color: 'var(--red)', padding: '1px 6px', borderRadius: '4px' }}>🔒 Private</span>}
                <span className="live-dot" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                {memberCount} members · <span style={{ color: 'var(--green)' }}>{onlineCount} online</span>
                {room.max_members && <span> · max {room.max_members}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={toggleFollow} style={{ padding: '5px 10px', borderRadius: '20px', border: `1px solid ${isFollowing ? 'var(--border)' : 'var(--accent)'}`, background: isFollowing ? 'var(--bg3)' : 'rgba(225,48,108,.1)', color: isFollowing ? 'var(--text3)' : 'var(--accent)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {isFollowing ? '🔔' : '🔔 Follow'}
              </button>
              <button onClick={() => setShowMembers(s => !s)} style={{ background: showMembers ? 'var(--bg3)' : 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: showMembers ? 'var(--text1)' : 'var(--text3)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              </button>
              {joined && (
                <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text3)', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </button>
              )}
              {!joined && (
                <button onClick={joinRoom} disabled={!!isAtMax} style={{ padding: '5px 14px', background: isAtMax ? 'var(--bg3)' : 'var(--accent)', border: 'none', borderRadius: '8px', color: isAtMax ? 'var(--text3)' : '#fff', fontSize: '12px', fontWeight: '600', cursor: isAtMax ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  {isAtMax ? 'Full' : room.join_mode === 'request' ? 'Request' : 'Join'}
                </button>
              )}
            </div>
          </div>

          {/* Room description */}
          {room.description && <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', lineHeight: '1.5' }}>{room.description}</div>}

          {/* Upcoming events strip */}
          {upcomingEvents.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '2px' }}>
              {upcomingEvents.map(s => (
                <div key={s.id} onClick={() => setShowSettings(true)} style={{ flexShrink: 0, background: 'rgba(225,48,108,.08)', border: '1px solid rgba(225,48,108,.2)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>📅</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text1)' }}>{s.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{formatEventDate(s.starts_at)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleRsvp(s.id) }} style={{ background: rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--bg3)', border: `1px solid ${rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '6px', color: rsvpIds.has(s.id) ? '#fff' : 'var(--text3)', fontSize: '10px', padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                    {rsvpIds.has(s.id) ? '✓ Going' : 'RSVP'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pinned message */}
        {pinnedMsg && (
          <div style={{ padding: '7px 14px', background: 'rgba(99,102,241,.07)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '13px', flexShrink: 0 }}>📌</span>
            <div style={{ flex: 1, fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>{pinnedMsg.content}</div>
            {isMod && <button onClick={unpinMessage} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px' }}>×</button>}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{room.icon_url ? <img src={room.icon_url} style={{ width: '48px', height: '48px', borderRadius: '10px' }} alt="" /> : room.emoji}</div>
              <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px', color: 'var(--text2)' }}>Welcome to {room.name}</div>
              <div style={{ fontSize: '13px' }}>Be the first to say something!</div>
            </div>
          )}
          {messages.map((msg: any) => {
            const isMe = msg.user_id === currentUser.id
            const name = msg.profiles?.name || 'Unknown'
            const color = getColor(name)
            const memberInfo = members.find((m: any) => m.user_id === msg.user_id)
            const isFounder = msg.user_id === room.created_by
            const isModMsg = memberInfo?.is_moderator
            return (
              <div key={msg.id} style={{ display: 'flex', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                {!isMe && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff' }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: '72%' }}>
                  {!isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '500' }}>{name}</span>
                      {isFounder && <span style={{ fontSize: '9px', background: 'var(--ig-gradient)', color: '#fff', padding: '0 4px', borderRadius: '3px', fontWeight: '700' }}>👑</span>}
                      {!isFounder && isModMsg && <span style={{ fontSize: '9px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '0 4px', borderRadius: '3px' }}>🛡</span>}
                      <span style={{ fontSize: '9px', color: 'var(--text3)' }}>{timeAgo(msg.created_at)}</span>
                    </div>
                  )}
                  <div
                    onContextMenu={e => {
                      if (isMod || isMe) { e.preventDefault(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY, content: msg.content }) }
                    }}
                    style={{ padding: '8px 12px', borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px', background: isMe ? 'var(--accent)' : 'var(--bg3)', color: isMe ? '#fff' : 'var(--text2)', border: isMe ? 'none' : '1px solid var(--border)', fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word', cursor: (isMod || isMe) ? 'context-menu' : 'default' }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '10px', padding: '6px', zIndex: 500, minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
            {isMod && <button onClick={() => { setPinInput(contextMenu.content); setShowPinInput(true); setContextMenu(null) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontFamily: 'inherit' }}>📌 Pin message</button>}
            <button onClick={() => deleteMessage(contextMenu.msgId)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--red)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontFamily: 'inherit' }}>🗑 Delete</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg0)', flexShrink: 0 }}>
          {!joined ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              {room.join_mode === 'invite_only' ? '🔒 Invite only room' : 'Join to send messages'}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg3)', borderRadius: '24px', padding: '8px 8px 8px 16px' }}>
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()} placeholder={`Message ${room.name}…`} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text1)', fontSize: '14px', fontFamily: 'inherit' }} />
              <button onClick={sendMessage} disabled={!input.trim() || sending} style={{ width: '34px', height: '34px', background: input.trim() ? 'var(--accent)' : 'transparent', border: 'none', borderRadius: '50%', cursor: 'pointer', color: input.trim() ? '#fff' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Members panel */}
      {showMembers && (
        <div style={{ width: '200px', borderLeft: '1px solid var(--border)', background: 'var(--bg0)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase' }}>Members · {memberCount}</div>
            <button onClick={() => setShowMembers(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px' }}>×</button>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
            {members.map((m: any) => {
              const mname = m.profiles?.name || 'Unknown'
              const mIsOwner = m.user_id === room.created_by
              const mIsMod = m.is_moderator
              return (
                <div key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px' }}
                  onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                  onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: getColor(mname), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{mname.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mname}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{mIsOwner ? '👑' : mIsMod ? '🛡 Mod' : 'Member'}</div>
                  </div>
                  {isOwner && m.user_id !== currentUser.id && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button onClick={() => toggleModerator(m.user_id, mIsMod)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: mIsMod ? 'var(--accent2)' : 'var(--text3)' }}>🛡</button>
                      <button onClick={() => kickMember(m.user_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--text3)' }}>✕</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }} onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', marginTop: '20px' }} className="fade-up">
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
              {([['general','⚙️ General'], ['schedule','📅 Schedule'], ['members','👥 Members'], ['invite','🔗 Invite'], ...(isOwner ? [['analytics','📊 Analytics']] : [])] as [string,string][]).map(([id, label]) => (
                <button key={id} onClick={() => setSettingsTab(id as any)} style={{ padding: '12px 14px', background: 'none', border: 'none', color: settingsTab === id ? 'var(--text1)' : 'var(--text3)', borderBottom: `2px solid ${settingsTab === id ? 'var(--accent)' : 'transparent'}`, fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{label}</button>
              ))}
              <button onClick={() => setShowSettings(false)} style={{ marginLeft: 'auto', padding: '12px 14px', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>

              {/* General tab */}
              {settingsTab === 'general' && (
                <div>
                  {isOwner && (
                    <>
                      {/* Cover + Icon */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Room Identity</div>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          <button onClick={() => iconInputRef.current?.click()} style={{ flex: 1, padding: '10px', background: 'var(--bg3)', border: '1px dashed var(--border2)', borderRadius: '10px', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                            {room.icon_url ? <img src={room.icon_url} style={{ width: '32px', height: '32px', borderRadius: '6px' }} alt="" /> : '🖼️'} Change Icon
                          </button>
                          <button onClick={() => coverInputRef.current?.click()} style={{ flex: 1, padding: '10px', background: 'var(--bg3)', border: '1px dashed var(--border2)', borderRadius: '10px', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                            📷 Change Cover
                          </button>
                        </div>
                      </div>

                      {[{label:'Room Name', key:'name'}, {label:'Description', key:'description'}, {label:'Slug (URL)', key:'slug', hint:'rooms.com/rooms/slug'}].map(f => (
                        <div key={f.key} style={{ marginBottom: '12px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>{f.label}</label>
                          <input value={(settingsForm as any)[f.key]} onChange={e => setSettingsForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.hint || ''} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                      ))}

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Visibility</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[['false','🌐 Public'],['true','🔒 Private']].map(([val, label]) => (
                            <button key={val} onClick={() => setSettingsForm(prev => ({ ...prev, is_private: val === 'true' }))} style={{ flex: 1, padding: '8px', background: String(settingsForm.is_private) === val ? 'rgba(225,48,108,.12)' : 'var(--bg3)', border: `1px solid ${String(settingsForm.is_private) === val ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', color: String(settingsForm.is_private) === val ? 'var(--accent)' : 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Join Mode</label>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {[['open','🚪 Open'],['request','✋ Request'],['invite_only','🔗 Invite Only']].map(([val, label]) => (
                            <button key={val} onClick={() => setSettingsForm(prev => ({ ...prev, join_mode: val }))} style={{ flex: 1, padding: '8px', background: settingsForm.join_mode === val ? 'rgba(225,48,108,.12)' : 'var(--bg3)', border: `1px solid ${settingsForm.join_mode === val ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', color: settingsForm.join_mode === val ? 'var(--accent)' : 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', minWidth: '80px' }}>{label}</button>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Max Members</label>
                        <select value={settingsForm.max_members || ''} onChange={e => setSettingsForm(prev => ({ ...prev, max_members: e.target.value }))} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}>
                          <option value="">Unlimited</option>
                          {[10,25,50,100,250,500].map(n => <option key={n} value={n}>{n} members</option>)}
                        </select>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Room Rules</label>
                        <textarea value={rules} onChange={e => setRules(e.target.value)} rows={3} placeholder="Set rules for your room…" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Pinned Message</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input value={pinInput || pinnedMsg?.content || ''} onChange={e => setPinInput(e.target.value)} placeholder="Pin a message to top of chat…" style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                          <button onClick={() => pinMessage(pinInput || pinnedMsg?.content || '')} style={{ padding: '8px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>Pin</button>
                        </div>
                      </div>

                      <button onClick={saveRoomSettings} style={{ width: '100%', padding: '11px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Save Changes</button>
                    </>
                  )}
                  {!isOwner && rules && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Room Rules</div>
                      <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{rules}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule tab */}
              {settingsTab === 'schedule' && (
                <div>
                  {isMod && (
                    <button onClick={() => setShowNewEvent(!showNewEvent)} style={{ width: '100%', padding: '10px', background: 'rgba(225,48,108,.1)', border: '1px solid rgba(225,48,108,.2)', borderRadius: '10px', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '16px', fontFamily: 'inherit' }}>
                      + Schedule New Event
                    </button>
                  )}
                  {showNewEvent && (
                    <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                      {[{label:'Title', key:'title', type:'text'}, {label:'Description', key:'description', type:'text'}, {label:'Date & Time', key:'starts_at', type:'datetime-local'}].map(f => (
                        <div key={f.key} style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '3px' }}>{f.label}</label>
                          <input type={f.type} value={(eventForm as any)[f.key]} onChange={e => setEventForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <input type="checkbox" id="recurring" checked={eventForm.is_recurring} onChange={e => setEventForm(prev => ({ ...prev, is_recurring: e.target.checked }))} />
                        <label htmlFor="recurring" style={{ fontSize: '13px', color: 'var(--text2)', cursor: 'pointer' }}>Recurring event</label>
                      </div>
                      {eventForm.is_recurring && (
                        <select value={eventForm.recurrence} onChange={e => setEventForm(prev => ({ ...prev, recurrence: e.target.value }))} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '10px' }}>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      )}
                      <button onClick={createEvent} style={{ width: '100%', padding: '9px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Create Event</button>
                    </div>
                  )}
                  {schedules.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>No events scheduled yet</div>}
                  {schedules.map(s => (
                    <div key={s.id} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '3px' }}>{s.title}</div>
                          {s.description && <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '4px' }}>{s.description}</div>}
                          <div style={{ fontSize: '11px', color: 'var(--accent)' }}>📅 {formatEventDate(s.starts_at)}{s.is_recurring && ` · ${s.recurrence}`}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => toggleRsvp(s.id)} style={{ padding: '5px 12px', background: rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--bg4)', border: `1px solid ${rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '7px', color: rsvpIds.has(s.id) ? '#fff' : 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                            {rsvpIds.has(s.id) ? '✓ Going' : 'RSVP'}
                          </button>
                          {(isMod || s.created_by === currentUser.id) && <button onClick={() => deleteEvent(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px' }}>🗑</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Members tab */}
              {settingsTab === 'members' && (
                <div>
                  {joinRequests.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>Join Requests ({joinRequests.length})</div>
                      {joinRequests.map(req => (
                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg3)', borderRadius: '10px', marginBottom: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getColor(req.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>{(req.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: '500' }}>{req.profiles?.name}</div></div>
                          <button onClick={() => approveJoinRequest(req.id, req.user_id)} style={{ padding: '5px 12px', background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)', borderRadius: '7px', color: 'var(--green)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Accept</button>
                          <button onClick={() => rejectJoinRequest(req.id)} style={{ padding: '5px 12px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Reject</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '8px' }}>All Members ({memberCount})</div>
                  {members.map((m: any) => {
                    const mname = m.profiles?.name || 'Unknown'
                    const mIsOwner = m.user_id === room.created_by
                    const mIsMod = m.is_moderator
                    return (
                      <div key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', background: 'var(--bg3)', borderRadius: '10px', marginBottom: '6px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getColor(mname), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>{mname.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {mname}
                            {mIsOwner && <span style={{ fontSize: '9px', background: 'var(--ig-gradient)', color: '#fff', padding: '0 4px', borderRadius: '3px' }}>👑</span>}
                            {!mIsOwner && mIsMod && <span style={{ fontSize: '9px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '0 4px', borderRadius: '3px' }}>🛡</span>}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{mIsOwner ? 'Founder' : mIsMod ? 'Moderator' : 'Member'}</div>
                        </div>
                        {isOwner && m.user_id !== currentUser.id && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => toggleModerator(m.user_id, mIsMod)} style={{ padding: '4px 10px', background: mIsMod ? 'rgba(99,102,241,.15)' : 'var(--bg4)', border: `1px solid ${mIsMod ? 'var(--accentbdr)' : 'var(--border)'}`, borderRadius: '6px', color: mIsMod ? 'var(--accent2)' : 'var(--text3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>{mIsMod ? '🛡 Mod' : 'Make Mod'}</button>
                            <button onClick={() => kickMember(m.user_id)} style={{ padding: '4px 10px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', color: 'var(--red)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Invite tab */}
              {settingsTab === 'invite' && (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px', lineHeight: '1.6' }}>Share this link to invite people to {room.name}. Anyone with the link can join.</div>
                  {inviteCode ? (
                    <>
                      <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--text2)', marginBottom: '10px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{inviteCode}
                      </div>
                      <button onClick={copyInvite} style={{ width: '100%', padding: '10px', background: copied ? 'rgba(34,197,94,.15)' : 'var(--ig-gradient)', border: `1px solid ${copied ? 'rgba(34,197,94,.3)' : 'none'}`, borderRadius: '10px', color: copied ? 'var(--green)' : '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {copied ? '✓ Copied!' : 'Copy Invite Link'}
                      </button>
                    </>
                  ) : (
                    <button onClick={generateInvite} disabled={generatingInvite} style={{ width: '100%', padding: '10px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text2)', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {generatingInvite ? <><div className="spinner" />Generating…</> : '🔗 Generate Invite Link'}
                    </button>
                  )}
                </div>
              )}

              {/* Analytics tab — owner only */}
              {settingsTab === 'analytics' && isOwner && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                    {[
                      { label: 'Total Members', value: memberCount, icon: '👥' },
                      { label: 'Online Now', value: onlineCount, icon: '🟢' },
                      { label: 'Moderators', value: members.filter((m: any) => m.is_moderator).length, icon: '🛡' },
                      { label: 'Events', value: schedules.length, icon: '📅' },
                      { label: 'RSVPs Total', value: schedules.reduce((a: number) => a, 0), icon: '✋' },
                      { label: 'Join Mode', value: room.join_mode || 'open', icon: '🚪' },
                    ].map(stat => (
                      <div key={stat.label} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px' }}>
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                        <div style={{ fontWeight: '700', fontSize: '20px', color: 'var(--text1)' }}>{stat.value}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  {room.max_members && (
                    <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Capacity</span>
                        <span style={{ fontSize: '12px', color: 'var(--text1)', fontWeight: '600' }}>{memberCount} / {room.max_members}</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg4)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (memberCount / room.max_members) * 100)}%`, background: 'var(--ig-gradient)', borderRadius: '3px', transition: 'width .3s' }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pin from context menu */}
      {showPinInput && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 901, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setShowPinInput(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '14px', padding: '20px', width: '100%', maxWidth: '400px' }}>
            <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>📌 Pin Message</div>
            <textarea value={pinInput} onChange={e => setPinInput(e.target.value)} rows={3} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowPinInput(false)} style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => pinMessage(pinInput)} style={{ flex: 2, padding: '9px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>Pin</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
