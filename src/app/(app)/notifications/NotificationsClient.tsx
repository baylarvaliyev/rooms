'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(str: string) {
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}
function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

const NOTIF_META: Record<string, { icon: string, label: string }> = {
  like:       { icon: '❤️', label: 'liked your post' },
  comment:    { icon: '💬', label: 'commented on your post' },
  follow:     { icon: '👤', label: 'started following you' },
  post:       { icon: '✍️', label: 'posted in' },
  room_event: { icon: '📅', label: 'scheduled an event' },
  mention:    { icon: '@️', label: 'mentioned you' },
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadNotifications()
  }, [])

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('notifications')
      .select('*, actor:profiles!actor_id(name, username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    setNotifications(data || [])
    setLoading(false)

    // Issue 29: delay marking as read by 2s so user actually sees unread state first
    setTimeout(async () => {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }, 2000)
  }

  if (loading) {
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--bg4)', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '12px', background: 'var(--bg4)', borderRadius: '6px', width: '70%', marginBottom: '7px', animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', width: '30%', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
            <div style={{ fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>No notifications yet</div>
            <div style={{ fontSize: '14px', color: 'var(--text3)' }}>When someone likes or comments, you'll see it here</div>
          </div>
        )}

        {notifications.map(n => {
          const meta = NOTIF_META[n.type] || { icon: '🔔', label: 'activity' }
          const actorName = n.actor?.name || (n.type === 'room_event' ? 'Room' : 'Someone')
          const color = getColor(actorName)
          // For room_event notifications, show the content directly
          const displayText = n.type === 'room_event' && n.content
            ? n.content
            : `${actorName} ${meta.label}${n.room_name ? ` in ${n.room_name}` : ''}`
          return (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'rgba(225,48,108,.04)', cursor: 'pointer', transition: 'background .18s' }}
              onClick={() => n.type === 'room_event' && n.room_id ? router.push(`/rooms/${n.room_id}`) : n.actor?.username && router.push(`/users/${n.actor.username}`)}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'rgba(225,48,108,.04)'}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: n.actor?.avatar_url ? 'none' : color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: n.type === 'room_event' ? '24px' : '16px', fontWeight: '700', color: '#fff', overflow: 'hidden' }}>
                  {n.type === 'room_event'
                    ? '📅'
                    : n.actor?.avatar_url
                      ? <img src={n.actor.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : actorName.charAt(0).toUpperCase()
                  }
                </div>
                {n.type !== 'room_event' && <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '14px', lineHeight: 1 }}>{meta.icon}</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', color: 'var(--text1)', lineHeight: '1.5' }}>{displayText}</div>
                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{timeAgo(n.created_at)}</div>
              </div>
              {!n.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
