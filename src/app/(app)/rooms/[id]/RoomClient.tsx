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

// Issue 3: Parse shared post messages from room chat
function parseRoomMessage(content: string) {
  if (content?.startsWith('__SHARED_POST__')) {
    const body = content.slice('__SHARED_POST__'.length)
    const sepIdx = body.indexOf('|||')
    const note = sepIdx !== -1 ? body.slice(0, sepIdx) : ''
    const jsonStr = sepIdx !== -1 ? body.slice(sepIdx + 3) : body
    try {
      const post = JSON.parse(jsonStr)
      return { type: 'shared_post', note, post }
    } catch {}
  }
  return { type: 'text', note: '', post: null }
}

const REACTION_EMOJIS = ['👍','❤️','😂','🔥','😮','👏','💯','🎉']

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

function FounderDashboard({ room, members, onlineCount, schedules, supabase }: any) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAnalytics() }, [])

  async function loadAnalytics() {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const [{ count: msgs7d }, { count: msgs30d }, { count: totalMsgs }, { data: recentMembers }, { data: topContributors }, { data: msgsByDay }] = await Promise.all([
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('room_id', room.id).gte('created_at', since7d),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('room_id', room.id).gte('created_at', since30d),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('room_id', room.id),
      supabase.from('room_members').select('created_at').eq('room_id', room.id).order('created_at', { ascending: false }).limit(30),
      supabase.from('messages').select('user_id, profiles(name, avatar_url)').eq('room_id', room.id).gte('created_at', since30d),
      supabase.from('messages').select('created_at').eq('room_id', room.id).gte('created_at', since7d),
    ])
    const contrib: Record<string, any> = {}
    ;(topContributors || []).forEach((m: any) => {
      if (!m.user_id) return
      if (!contrib[m.user_id]) contrib[m.user_id] = { count: 0, ...m.profiles }
      contrib[m.user_id].count++
    })
    const topList = Object.values(contrib).sort((a: any, b: any) => b.count - a.count).slice(0, 5)
    const dayMap: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      dayMap[d.toLocaleDateString('en', { weekday: 'short' })] = 0
    }
    ;(msgsByDay || []).forEach((m: any) => {
      const day = new Date(m.created_at).toLocaleDateString('en', { weekday: 'short' })
      if (dayMap[day] !== undefined) dayMap[day]++
    })
    const weekMap: Record<string, number> = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 }
    ;(recentMembers || []).forEach((m: any) => {
      const daysAgo = Math.floor((Date.now() - new Date(m.created_at).getTime()) / (24 * 60 * 60 * 1000))
      if (daysAgo <= 7) weekMap['Week 4']++
      else if (daysAgo <= 14) weekMap['Week 3']++
      else if (daysAgo <= 21) weekMap['Week 2']++
      else if (daysAgo <= 30) weekMap['Week 1']++
    })
    setAnalytics({ msgs7d, msgs30d, totalMsgs, topList, dayMap, weekMap })
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
  const memberCount = members.length
  const mods = members.filter((m: any) => m.is_moderator).length
  const dayValues = Object.values(analytics.dayMap) as number[]
  const maxDay = Math.max(...dayValues, 1)
  const weekValues = Object.values(analytics.weekMap) as number[]
  const maxWeek = Math.max(...weekValues, 1)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Total Members', value: memberCount, icon: '👥', color: '#6366f1' },
          { label: 'Online Now', value: onlineCount, icon: '🟢', color: '#22c55e' },
          { label: 'Messages (7d)', value: analytics.msgs7d || 0, icon: '💬', color: '#0891b2' },
          { label: 'All Time', value: analytics.totalMsgs || 0, icon: '📨', color: '#a855f7' },
          { label: 'Moderators', value: mods, icon: '🛡', color: '#ec4899' },
          { label: 'Events', value: schedules.length, icon: '📅', color: '#f97316' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', border: `1px solid ${s.color}22` }}>
            <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontWeight: '800', fontSize: '22px', color: s.color }}>{(s.value || 0).toLocaleString()}</div>
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{s.label}</div>
          </div>
        ))}
      </div>
      {room.max_members && (
        <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)' }}>Capacity</span>
            <span style={{ fontSize: '12px', color: 'var(--text1)', fontWeight: '700' }}>{memberCount} / {room.max_members}</span>
          </div>
          <div style={{ height: '8px', background: 'var(--bg4)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, (memberCount / room.max_members) * 100)}%`, background: memberCount / room.max_members > 0.8 ? 'var(--red)' : 'var(--ig-gradient)', borderRadius: '4px' }} />
          </div>
        </div>
      )}
      <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', marginBottom: '12px' }}>💬 Messages — Last 7 Days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '70px' }}>
          {Object.entries(analytics.dayMap).map(([day, count]: [string, any]) => (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: '9px', color: 'var(--text3)' }}>{count > 0 ? count : ''}</div>
              <div style={{ width: '100%', background: count > 0 ? 'var(--accent)' : 'var(--bg4)', borderRadius: '3px 3px 0 0', height: `${Math.max(4, (count / maxDay) * 50)}px` }} />
              <div style={{ fontSize: '9px', color: 'var(--text3)' }}>{day}</div>
            </div>
          ))}
        </div>
      </div>
      {analytics.topList.length > 0 && (
        <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text2)', marginBottom: '10px' }}>🏆 Top Contributors (30d)</div>
          {analytics.topList.map((u: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '20px', fontWeight: '700', fontSize: '12px', color: i < 3 ? 'var(--yellow)' : 'var(--text3)' }}>{['🥇','🥈','🥉'][i] || i + 1}</div>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{(u.name || 'U').charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1, fontSize: '13px' }}>{u.name || 'Unknown'}</div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent2)' }}>{u.count} msgs</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
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
  const [onlineCount, setOnlineCount] = useState(1)
  const [pinnedMsg, setPinnedMsg] = useState<any>(null)
  const [pinInput, setPinInput] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)
  const [rules, setRules] = useState(initialRoom.rules || '')
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
  const [settingsForm, setSettingsForm] = useState({
    name: initialRoom.name, description: initialRoom.description || '',
    is_private: initialRoom.is_private || false, join_mode: initialRoom.join_mode || 'open',
    max_members: initialRoom.max_members || '', slug: initialRoom.slug || '',
  })
  // Reactions
  const [reactions, setReactions] = useState<Record<string, any[]>>({})
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  // Rules on join modal
  const [showRulesModal, setShowRulesModal] = useState(false)
  // Share post modal
  const [sharePost, setSharePost] = useState<any>(null)
  const [shareMsg, setShareMsg] = useState('')
  // Debate moderation
  const [showDebateMod, setShowDebateMod] = useState(false)

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, async (payload) => {
        const r = payload.new as any
        // Reload reactions for that message
        loadReactionsForMessage(r.message_id)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, async (payload) => {
        const r = payload.old as any
        loadReactionsForMessage(r.message_id)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: currentUser.id, name: currentUser?.user_metadata?.name || 'User', online_at: new Date().toISOString() })
        }
      })
    return () => { supabase.removeChannel(channel) }
  }, [room.id])

  async function loadReactionsForMessage(messageId: string) {
    const { data } = await supabase.from('message_reactions').select('*').eq('message_id', messageId)
    setReactions(prev => ({ ...prev, [messageId]: data || [] }))
  }

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
    // Load reactions for recent messages
    if (initialMessages.length > 0) {
      const msgIds = initialMessages.map((m: any) => m.id)
      const { data: reactionData } = await supabase.from('message_reactions').select('*').in('message_id', msgIds)
      const grouped: Record<string, any[]> = {}
      ;(reactionData || []).forEach((r: any) => {
        if (!grouped[r.message_id]) grouped[r.message_id] = []
        grouped[r.message_id].push(r)
      })
      setReactions(grouped)
    }
  }

  const [joinRequestSent, setJoinRequestSent] = useState(false)

  async function joinRoom() {
    if (isAtMax) { alert('This room is full'); return }
    if (room.join_mode === 'invite_only') { alert('This room is invite only'); return }
    if (room.join_mode === 'request') {
      await supabase.from('room_join_requests').insert({ room_id: room.id, user_id: currentUser.id })
      setJoinRequestSent(true)
      return
    }
    if (room.rules && room.rules.trim()) { setShowRulesModal(true); return }
    await doJoin()
  }

  async function doJoin() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member', rules_accepted: true })
    setJoined(true)
    setShowRulesModal(false)
    setMembers((prev: any[]) => [...prev, { user_id: currentUser.id, role: 'member', profiles: { name: 'You' } }])
  }

  async function sendMessage() {
    if (!input.trim() || !joined || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')

    // Send to room chat
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: room.id, content })
    })
    if (!res.ok) {
      const { error } = await res.json()
      if (error) alert(error)
      setSending(false)
      return
    }

    // ALSO create a feed post so it appears on followers' feeds
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: room.id, content, type: 'post' })
    })

    setSending(false)
  }

  async function deleteMessage(msgId: string) {
    await supabase.from('messages').delete().eq('id', msgId)
    setContextMenu(null)
  }

  async function toggleReaction(messageId: string, emoji: string) {
    const existing = (reactions[messageId] || []).find(r => r.user_id === currentUser.id && r.emoji === emoji)
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: currentUser.id, emoji })
    }
    setShowReactionPicker(null)
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

  async function toggleModerator(userId: string, mod: boolean) {
    await supabase.from('room_members').update({ is_moderator: !mod }).eq('room_id', room.id).eq('user_id', userId)
    setMembers((prev: any[]) => prev.map((m: any) => m.user_id === userId ? { ...m, is_moderator: !mod } : m))
  }

  async function toggleFollow() {
    if (isFollowing) await supabase.from('room_follows').delete().eq('room_id', room.id).eq('user_id', currentUser.id)
    else await supabase.from('room_follows').insert({ room_id: room.id, user_id: currentUser.id })
    setIsFollowing(!isFollowing)
  }

  // Issues 30+31: Leave room
  async function leaveRoom() {
    if (!confirm('Leave this room? You can rejoin later.')) return
    await supabase.from('room_members').delete().eq('room_id', room.id).eq('user_id', currentUser.id)
    router.push('/feed')
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
      name: settingsForm.name, description: settingsForm.description,
      is_private: settingsForm.is_private, join_mode: settingsForm.join_mode,
      max_members: settingsForm.max_members ? parseInt(settingsForm.max_members) : null,
      rules,
    }
    if (settingsForm.slug) updates.slug = settingsForm.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    await supabase.from('rooms').update(updates).eq('id', room.id)
    setRoom((prev: any) => ({ ...prev, ...updates }))
    alert('Settings saved!')
  }

  async function uploadRoomIcon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
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
    const file = e.target.files?.[0]; if (!file) return
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
    if (data) {
      setSchedules(prev => [...prev, data])
      // Send notification to all room followers
      const { data: followers } = await supabase.from('room_follows').select('user_id').eq('room_id', room.id)
      if (followers && followers.length > 0) {
        await supabase.from('notifications').insert(
          followers.map((f: any) => ({
            user_id: f.user_id,
            type: 'room_event',
            content: `📅 New event in ${room.name}: ${eventForm.title}`,
            room_id: room.id,
            read: false,
          }))
        )
      }
    }
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

  // Group reactions by emoji for display
  function getReactionGroups(messageId: string) {
    const msgReactions = reactions[messageId] || []
    const groups: Record<string, { count: number, mine: boolean }> = {}
    msgReactions.forEach(r => {
      if (!groups[r.emoji]) groups[r.emoji] = { count: 0, mine: false }
      groups[r.emoji].count++
      if (r.user_id === currentUser.id) groups[r.emoji].mine = true
    })
    return groups
  }

  const upcomingEvents = schedules.filter(s => new Date(s.starts_at) > new Date()).slice(0, 3)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }} onClick={() => { contextMenu && setContextMenu(null); showReactionPicker && setShowReactionPicker(null) }}>
      <input ref={iconInputRef} type="file" accept="image/*" onChange={uploadRoomIcon} style={{ display: 'none' }} />
      <input ref={coverInputRef} type="file" accept="image/*" onChange={uploadRoomCover} style={{ display: 'none' }} />

      {/* RULES ON JOIN MODAL */}
      {showRulesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '420px' }} className="fade-up">
            <div style={{ fontSize: '24px', textAlign: 'center', marginBottom: '8px' }}>📋</div>
            <div style={{ fontWeight: '700', fontSize: '16px', textAlign: 'center', marginBottom: '4px' }}>{room.name} — Room Rules</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', marginBottom: '16px' }}>Please read and accept before joining</div>
            <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', fontSize: '13px', color: 'var(--text2)', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>{room.rules}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowRulesModal(false)} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={doJoin} style={{ flex: 2, padding: '11px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit' }}>Accept & Join</button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Cover */}
        <div style={{ height: '80px', background: room.cover_url ? 'none' : (ROOM_COLORS[room.category] || 'var(--bg3)'), flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          {room.cover_url && <img src={room.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.2), rgba(0,0,0,.5))' }} />
          <button onClick={() => router.back()} style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          {isOwner && <button onClick={() => coverInputRef.current?.click()} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,.5)', border: 'none', color: '#fff', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>{uploadingCover ? '…' : '📷'}</button>}
        </div>

        {/* Header */}
        <div style={{ padding: '0 14px 10px', borderBottom: '1px solid var(--border)', background: 'var(--bg0)', flexShrink: 0, marginTop: '-20px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '8px' }}>
            <div onClick={() => isOwner && iconInputRef.current?.click()} style={{ width: '50px', height: '50px', borderRadius: '12px', border: '2px solid var(--bg0)', overflow: 'hidden', background: ROOM_COLORS[room.category] || 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0, cursor: isOwner ? 'pointer' : 'default', position: 'relative' }}>
              {room.icon_url ? <img src={room.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : room.emoji}
              {uploadingIcon && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: '700', fontSize: '14px' }}>{room.name}</span>
                {isOwner && <span style={{ fontSize: '9px', background: 'var(--ig-gradient)', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>👑</span>}
                {!isOwner && isMod && <span style={{ fontSize: '9px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '1px 5px', borderRadius: '4px' }}>🛡</span>}
                {room.is_private && <span style={{ fontSize: '9px', background: 'rgba(239,68,68,.15)', color: 'var(--red)', padding: '1px 5px', borderRadius: '4px' }}>🔒</span>}
                <span className="live-dot" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '2px' }}>
                {memberCount} members · <span style={{ color: 'var(--green)' }}>{onlineCount} online</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={toggleFollow} style={{ padding: '5px 9px', borderRadius: '20px', border: `1px solid ${isFollowing ? 'var(--border)' : 'var(--accent)'}`, background: isFollowing ? 'var(--bg3)' : 'rgba(225,48,108,.1)', color: isFollowing ? 'var(--text3)' : 'var(--accent)', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                {isFollowing ? '🔔' : '+ Follow'}
              </button>
              <button onClick={() => setShowMembers(s => !s)} style={{ background: showMembers ? 'var(--bg3)' : 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text3)', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
              </button>
              {joined && (
                <button onClick={() => setShowSettings(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text3)', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                </button>
              )}
              {!joined && (
                <button onClick={joinRoom} disabled={!!isAtMax || joinRequestSent} style={{ padding: '5px 12px', background: joinRequestSent ? 'rgba(99,102,241,.15)' : isAtMax ? 'var(--bg3)' : 'var(--accent)', border: joinRequestSent ? '1px solid rgba(99,102,241,.3)' : 'none', borderRadius: '8px', color: joinRequestSent ? 'var(--accent2)' : isAtMax ? 'var(--text3)' : '#fff', fontSize: '12px', fontWeight: '600', cursor: isAtMax || joinRequestSent ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                  {isAtMax ? 'Full' : joinRequestSent ? '⏳ Pending…' : room.join_mode === 'request' ? 'Request' : 'Join'}
                </button>
              )}
            </div>
          </div>

          {room.description && <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '6px', lineHeight: '1.5' }}>{room.description}</div>}

          {/* Upcoming events strip */}
          {upcomingEvents.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '2px' }}>
              {upcomingEvents.map(s => (
                <div key={s.id} style={{ flexShrink: 0, background: 'rgba(225,48,108,.08)', border: '1px solid rgba(225,48,108,.2)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px' }}>📅</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text1)' }}>{s.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{formatEventDate(s.starts_at)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleRsvp(s.id) }} style={{ background: rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--bg3)', border: `1px solid ${rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '6px', color: rsvpIds.has(s.id) ? '#fff' : 'var(--text3)', fontSize: '10px', padding: '2px 7px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                    {rsvpIds.has(s.id) ? '✓' : 'RSVP'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pinned */}
        {pinnedMsg && (
          <div style={{ padding: '7px 14px', background: 'rgba(99,102,241,.07)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <span style={{ fontSize: '12px', flexShrink: 0 }}>📌</span>
            <div style={{ flex: 1, fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>{pinnedMsg.content}</div>
            {isMod && <button onClick={unpinMessage} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px' }}>×</button>}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{room.emoji}</div>
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
            const reactionGroups = getReactionGroups(msg.id)
            const hasReactions = Object.keys(reactionGroups).length > 0
            // Issue 3: parse shared post messages
            const parsed = parseRoomMessage(msg.content)

            return (
              <div key={msg.id} style={{ display: 'flex', gap: '8px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                {!isMe && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', marginTop: '16px' }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ maxWidth: '75%' }}>
                  {!isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: '500' }}>{name}</span>
                      {isFounder && <span style={{ fontSize: '9px', background: 'var(--ig-gradient)', color: '#fff', padding: '0 4px', borderRadius: '3px' }}>👑</span>}
                      {!isFounder && isModMsg && <span style={{ fontSize: '9px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '0 4px', borderRadius: '3px' }}>🛡</span>}
                      <span style={{ fontSize: '9px', color: 'var(--text3)' }}>{timeAgo(msg.created_at)}</span>
                    </div>
                  )}
                  <div style={{ position: 'relative' }}>
                    {/* Issue 3: Render shared post as card, not raw JSON */}
                    {parsed.type === 'shared_post' && parsed.post ? (
                      <div>
                        {parsed.note && <div style={{ padding: '6px 12px', marginBottom: '4px', fontSize: '13px', color: isMe ? '#fff' : 'var(--text1)', background: isMe ? 'var(--accent)' : 'var(--bg3)', borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px', border: isMe ? 'none' : '1px solid var(--border)' }}>{parsed.note}</div>}
                        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '12px', overflow: 'hidden', maxWidth: '240px' }}>
                          <div style={{ padding: '9px 11px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '3px' }}>📎 {parsed.post.room_emoji} {parsed.post.room}</div>
                            <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text2)', marginBottom: '4px' }}>{parsed.post.author}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text1)', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{parsed.post.content}</div>
                          </div>
                          {parsed.post.media_url && <img src={parsed.post.media_url} alt="" style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }} />}
                          <div style={{ padding: '6px 11px', display: 'flex', gap: '10px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--text3)' }}>❤️ {parsed.post.like_count}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text3)' }}>💬 {parsed.post.comment_count}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onContextMenu={e => {
                          if (isMod || isMe) { e.preventDefault(); setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY, content: msg.content }) }
                        }}
                        onDoubleClick={() => joined && setShowReactionPicker(msg.id)}
                        style={{ padding: '8px 12px', borderRadius: isMe ? '13px 13px 4px 13px' : '13px 13px 13px 4px', background: isMe ? 'var(--accent)' : 'var(--bg3)', color: isMe ? '#fff' : 'var(--text2)', border: isMe ? 'none' : '1px solid var(--border)', fontSize: '13px', lineHeight: '1.6', wordBreak: 'break-word', cursor: 'default' }}>
                        {msg.content}
                      </div>
                    )}

                    {/* Reaction picker button */}
                    {joined && parsed.type !== 'shared_post' && (
                      <button onClick={e => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id) }}
                        style={{ position: 'absolute', top: '-8px', [isMe ? 'left' : 'right']: '-8px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11px', opacity: 0.7 }}>
                        😊
                      </button>
                    )}

                    {/* Reaction picker popup */}
                    {showReactionPicker === msg.id && (
                      <div style={{ position: 'absolute', [isMe ? 'right' : 'left']: '0', bottom: '100%', marginBottom: '4px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '24px', padding: '6px 10px', display: 'flex', gap: '6px', zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,.4)', whiteSpace: 'nowrap' }}>
                        {REACTION_EMOJIS.map(emoji => {
                          const isMine = reactionGroups[emoji]?.mine
                          return (
                            <button key={emoji} onClick={e => { e.stopPropagation(); toggleReaction(msg.id, emoji) }}
                              style={{ background: isMine ? 'var(--bg3)' : 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '2px', borderRadius: '6px', transform: isMine ? 'scale(1.2)' : 'scale(1)', transition: 'transform .1s' }}>
                              {emoji}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reactions display */}
                  {hasReactions && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      {Object.entries(reactionGroups).map(([emoji, { count, mine }]: [string, any]) => (
                        <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                          style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', background: mine ? 'rgba(99,102,241,.15)' : 'var(--bg3)', border: `1px solid ${mine ? 'var(--accent2)' : 'var(--border)'}`, borderRadius: '12px', cursor: 'pointer', fontSize: '12px', color: 'var(--text2)', fontFamily: 'inherit' }}>
                          {emoji} <span style={{ fontSize: '11px', color: mine ? 'var(--accent2)' : 'var(--text3)' }}>{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: '10px', padding: '6px', zIndex: 500, minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
            {isMod && <button onClick={() => { setPinInput(contextMenu.content); setShowPinInput(true); setContextMenu(null) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontFamily: 'inherit' }}>📌 Pin</button>}
            <button onClick={() => { setShowReactionPicker(contextMenu.msgId); setContextMenu(null) }} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontFamily: 'inherit' }}>😊 React</button>
            <button onClick={() => deleteMessage(contextMenu.msgId)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--red)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', borderRadius: '6px', fontFamily: 'inherit' }}>🗑 Delete</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--bg0)', flexShrink: 0 }}>
          {!joined ? (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
              {room.join_mode === 'invite_only' ? '🔒 Invite only room' : 'Join to participate'}
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
        <div style={{ width: '190px', borderLeft: '1px solid var(--border)', background: 'var(--bg0)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
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
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: getColor(mname), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff' }}>{mname.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mname}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{mIsOwner ? '👑' : mIsMod ? '🛡' : ''}</div>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px', overflowY: 'auto' }} onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', marginTop: '16px' }} className="fade-up">
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
              {/* Issue 11: Only show Invite tab for owners. Analytics only for owners */}
              {([
                ['general','⚙️ General'],
                ['schedule','📅 Events'],
                ['members','👥 Members'],
                ...(isOwner ? [['invite','🔗 Invite']] : []),
                ...(isOwner ? [['analytics','📊 Analytics']] : []),
              ] as [string,string][]).map(([id, label]) => (
                <button key={id} onClick={() => setSettingsTab(id as any)} style={{ padding: '11px 12px', background: 'none', border: 'none', color: settingsTab === id ? 'var(--text1)' : 'var(--text3)', borderBottom: `2px solid ${settingsTab === id ? 'var(--accent)' : 'transparent'}`, fontSize: '12px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{label}</button>
              ))}
              <button onClick={() => setShowSettings(false)} style={{ marginLeft: 'auto', padding: '11px 14px', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            <div style={{ padding: '18px', maxHeight: '72vh', overflowY: 'auto' }}>

              {settingsTab === 'general' && (
                <div>
                  {/* Rules always shown first */}
                  {room.rules && !isOwner && (
                    <div style={{ marginBottom: '16px', background: 'var(--bg3)', borderRadius: '10px', padding: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '6px' }}>📋 Room Rules</div>
                      <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{room.rules}</div>
                    </div>
                  )}
                  {isOwner && (
                    <>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <button onClick={() => iconInputRef.current?.click()} style={{ flex: 1, padding: '9px', background: 'var(--bg3)', border: '1px dashed var(--border2)', borderRadius: '9px', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                          {room.icon_url ? <img src={room.icon_url} style={{ width: '24px', height: '24px', borderRadius: '5px', verticalAlign: 'middle' }} alt="" /> : '🖼️'} Icon
                        </button>
                        <button onClick={() => coverInputRef.current?.click()} style={{ flex: 1, padding: '9px', background: 'var(--bg3)', border: '1px dashed var(--border2)', borderRadius: '9px', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>📷 Cover</button>
                      </div>
                      {[{label:'Name', key:'name'}, {label:'Description', key:'description'}, {label:'Slug (URL)', key:'slug'}].map(f => (
                        <div key={f.key} style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>{f.label}</label>
                          <input value={(settingsForm as any)[f.key]} onChange={e => setSettingsForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 11px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        {[['false','🌐 Public'],['true','🔒 Private']].map(([val, label]) => (
                          <button key={val} onClick={() => setSettingsForm(prev => ({ ...prev, is_private: val === 'true' }))} style={{ flex: 1, padding: '7px', background: String(settingsForm.is_private) === val ? 'rgba(225,48,108,.12)' : 'var(--bg3)', border: `1px solid ${String(settingsForm.is_private) === val ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', color: String(settingsForm.is_private) === val ? 'var(--accent)' : 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>{label}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        {[['open','🚪 Open'],['request','✋ Request'],['invite_only','🔗 Invite Only']].map(([val, label]) => (
                          <button key={val} onClick={() => setSettingsForm(prev => ({ ...prev, join_mode: val }))} style={{ flex: 1, padding: '7px', background: settingsForm.join_mode === val ? 'rgba(225,48,108,.12)' : 'var(--bg3)', border: `1px solid ${settingsForm.join_mode === val ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '8px', color: settingsForm.join_mode === val ? 'var(--accent)' : 'var(--text2)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', minWidth: '70px' }}>{label}</button>
                        ))}
                      </div>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>Max Members</label>
                        <select value={settingsForm.max_members || ''} onChange={e => setSettingsForm(prev => ({ ...prev, max_members: e.target.value }))} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 11px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}>
                          <option value="">Unlimited</option>
                          {[10,25,50,100,250,500].map(n => <option key={n} value={n}>{n} members</option>)}
                        </select>
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>Room Rules</label>
                        <textarea value={rules} onChange={e => setRules(e.target.value)} rows={3} placeholder="Set rules shown to new members before they join…" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 11px', color: 'var(--text1)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
                        <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>Members will see and accept these rules before joining</div>
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '3px', textTransform: 'uppercase' }}>Pinned Message</label>
                        <div style={{ display: 'flex', gap: '7px' }}>
                          <input value={pinInput || pinnedMsg?.content || ''} onChange={e => setPinInput(e.target.value)} placeholder="Pin a message to top of chat…" style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '7px 11px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                          <button onClick={() => pinMessage(pinInput || pinnedMsg?.content || '')} style={{ padding: '7px 13px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>Pin</button>
                        </div>
                      </div>
                      <button onClick={saveRoomSettings} style={{ width: '100%', padding: '11px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '12px' }}>Save Changes</button>
                      {/* Issue 30/31: Leave room — owner can't leave (they'd need to transfer ownership) */}
                    </>
                  )}
                  {/* Issue 30/31: Leave room button for non-owners */}
                  {joined && !isOwner && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                      <button onClick={leaveRoom} style={{ width: '100%', padding: '11px', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: '10px', color: 'var(--red)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                        🚪 Leave Room
                      </button>
                    </div>
                  )}
                </div>
              )}

              {settingsTab === 'schedule' && (
                <div>
                  {isMod && (
                    <button onClick={() => setShowNewEvent(!showNewEvent)} style={{ width: '100%', padding: '10px', background: 'rgba(225,48,108,.1)', border: '1px solid rgba(225,48,108,.2)', borderRadius: '10px', color: 'var(--accent)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', marginBottom: '14px', fontFamily: 'inherit' }}>
                      + Schedule Event
                    </button>
                  )}
                  {showNewEvent && (
                    <div style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                      {[{label:'Title', key:'title', type:'text'}, {label:'Description', key:'description', type:'text'}, {label:'Date & Time', key:'starts_at', type:'datetime-local'}].map(f => (
                        <div key={f.key} style={{ marginBottom: '9px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: '3px' }}>{f.label}</label>
                          <input type={f.type} value={(eventForm as any)[f.key]} onChange={e => setEventForm(prev => ({ ...prev, [f.key]: e.target.value }))} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
                        <input type="checkbox" id="rec" checked={eventForm.is_recurring} onChange={e => setEventForm(prev => ({ ...prev, is_recurring: e.target.checked }))} />
                        <label htmlFor="rec" style={{ fontSize: '13px', color: 'var(--text2)', cursor: 'pointer' }}>Recurring</label>
                      </div>
                      {eventForm.is_recurring && (
                        <select value={eventForm.recurrence} onChange={e => setEventForm(prev => ({ ...prev, recurrence: e.target.value }))} style={{ width: '100%', background: 'var(--bg4)', border: '1px solid var(--border)', borderRadius: '7px', padding: '7px 10px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '9px' }}>
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '9px' }}>📣 All room followers will be notified</div>
                      <button onClick={createEvent} style={{ width: '100%', padding: '9px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>Create Event & Notify</button>
                    </div>
                  )}
                  {schedules.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text3)', fontSize: '13px' }}>No events yet</div>}
                  {schedules.map(s => (
                    <div key={s.id} style={{ background: 'var(--bg3)', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>{s.title}</div>
                          {s.description && <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '3px' }}>{s.description}</div>}
                          <div style={{ fontSize: '11px', color: 'var(--accent)' }}>📅 {formatEventDate(s.starts_at)}{s.is_recurring && ` · ${s.recurrence}`}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                          <button onClick={() => toggleRsvp(s.id)} style={{ padding: '4px 10px', background: rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--bg4)', border: `1px solid ${rsvpIds.has(s.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '7px', color: rsvpIds.has(s.id) ? '#fff' : 'var(--text2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                            {rsvpIds.has(s.id) ? '✓ Going' : 'RSVP'}
                          </button>
                          {(isMod || s.created_by === currentUser.id) && <button onClick={() => deleteEvent(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '15px' }}>🗑</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {settingsTab === 'members' && (
                <div>
                  {joinRequests.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '7px' }}>Requests ({joinRequests.length})</div>
                      {joinRequests.map(req => (
                        <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--bg3)', borderRadius: '10px', marginBottom: '7px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: getColor(req.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>{(req.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                          <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: '500' }}>{req.profiles?.name}</div></div>
                          <button onClick={() => approveJoinRequest(req.id, req.user_id)} style={{ padding: '4px 10px', background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)', borderRadius: '7px', color: 'var(--green)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Accept</button>
                          <button onClick={() => rejectJoinRequest(req.id)} style={{ padding: '4px 10px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '7px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Reject</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '7px' }}>All Members ({memberCount})</div>
                  {members.map((m: any) => {
                    const mname = m.profiles?.name || 'Unknown'
                    const mIsOwner = m.user_id === room.created_by
                    const mIsMod = m.is_moderator
                    return (
                      <div key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', background: 'var(--bg3)', borderRadius: '10px', marginBottom: '6px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: getColor(mname), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>{mname.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {mname}
                            {mIsOwner && <span style={{ fontSize: '9px', background: 'var(--ig-gradient)', color: '#fff', padding: '0 4px', borderRadius: '3px' }}>👑</span>}
                            {!mIsOwner && mIsMod && <span style={{ fontSize: '9px', background: 'rgba(99,102,241,.2)', color: 'var(--accent2)', padding: '0 4px', borderRadius: '3px' }}>🛡</span>}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text3)' }}>{mIsOwner ? 'Founder' : mIsMod ? 'Moderator' : 'Member'}</div>
                        </div>
                        {isOwner && m.user_id !== currentUser.id && (
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => toggleModerator(m.user_id, mIsMod)} style={{ padding: '4px 8px', background: mIsMod ? 'rgba(99,102,241,.15)' : 'var(--bg4)', border: `1px solid ${mIsMod ? 'rgba(99,102,241,.3)' : 'var(--border)'}`, borderRadius: '6px', color: mIsMod ? 'var(--accent2)' : 'var(--text3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>{mIsMod ? '🛡 Mod' : 'Mod'}</button>
                            <button onClick={() => kickMember(m.user_id)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', color: 'var(--red)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {settingsTab === 'invite' && (
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '14px', lineHeight: '1.6' }}>Share this link to invite people to {room.name}.</div>
                  {inviteCode ? (
                    <>
                      <div style={{ background: 'var(--bg3)', borderRadius: '8px', padding: '11px', fontSize: '12px', color: 'var(--text2)', marginBottom: '9px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{inviteCode}
                      </div>
                      <button onClick={copyInvite} style={{ width: '100%', padding: '10px', background: copied ? 'rgba(34,197,94,.15)' : 'var(--ig-gradient)', border: `1px solid ${copied ? 'rgba(34,197,94,.3)' : 'transparent'}`, borderRadius: '10px', color: copied ? 'var(--green)' : '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
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

              {settingsTab === 'analytics' && isOwner && (
                <FounderDashboard room={room} members={members} onlineCount={onlineCount} schedules={schedules} supabase={supabase} />
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
