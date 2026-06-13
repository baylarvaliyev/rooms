'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const NAV = [
  { id: 'feed',          label: 'Feed',          icon: '⊞',  path: '/feed' },
  { id: 'explore',       label: 'Explore',       icon: '🧭', path: '/explore' },
  { id: 'search',        label: 'Search',        icon: '🔍', path: '/search' },
  { id: 'messages',      label: 'Messages',      icon: '💬', path: '/messages' },
  { id: 'notifications', label: 'Notifications', icon: '🔔', path: '/notifications' },
  { id: 'leaderboard',   label: 'Leaderboard',   icon: '🏆', path: '/leaderboard' },
  { id: 'admin',         label: 'Admin',         icon: '🛡️', path: '/admin' },
  { id: 'settings',      label: 'Settings',      icon: '⚙️', path: '/settings' },
]

const MOBILE_NAV = [
  { id: 'feed',          icon: '⊞',  path: '/feed',          label: 'Home' },
  { id: 'explore',       icon: '🧭', path: '/explore',       label: 'Explore' },
  { id: 'messages',      icon: '💬', path: '/messages',      label: 'DMs' },
  { id: 'notifications', icon: '🔔', path: '/notifications', label: 'Alerts' },
  { id: 'profile',       icon: '👤', path: '/profile',       label: 'Me' },
]

const TITLES: Record<string, string> = {
  feed: 'Home', explore: 'Explore', search: 'Search',
  messages: 'Messages', notifications: 'Notifications',
  leaderboard: 'Leaderboard', admin: 'Admin', settings: 'Settings', profile: 'Profile'
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    let channel: any = null
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Only fetch profile once
      if (!profile) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }

      const { count: nc } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
      setNotifCount(nc || 0)

      if (channel) return // don't re-subscribe
      channel = supabase.channel(`notifs:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => setNotifCount(p => p + 1))
        .subscribe()
    }
    load()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [pathname])

  useEffect(() => { if (pathname === '/notifications') setNotifCount(0) }, [pathname])

  async function signOut() { await supabase.auth.signOut(); router.push('/login') }

  const activeId = NAV.find(n => pathname.startsWith(n.path))?.id || 'feed'
  const isRoom = pathname.startsWith('/rooms/')
  const isUser = pathname.startsWith('/users/')
  const title = isRoom ? 'Room' : isUser ? 'Profile' : TITLES[activeId] || 'Rooms'

  return (
    <div className="app-shell">

      {/* SIDEBAR — hidden on mobile via globals.css */}
      <nav className="app-sidebar">
        <div onClick={() => router.push('/feed')} style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', color: '#fff', cursor: 'pointer', marginBottom: '10px', animation: 'glow 4s ease-in-out infinite' }}>R</div>

        {NAV.map(n => (
          <div key={n.id} onClick={() => router.push(n.path)} title={n.label} style={{ position: 'relative', width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '18px', background: activeId === n.id && !isRoom && !isUser ? 'rgba(99,102,241,.12)' : 'transparent', border: `1px solid ${activeId === n.id && !isRoom && !isUser ? 'rgba(99,102,241,.28)' : 'transparent'}`, transition: 'all .18s' }}>
            {n.icon}
            {n.id === 'notifications' && notifCount > 0 && (
              <div style={{ position: 'absolute', top: '3px', right: '3px', minWidth: '15px', height: '15px', background: 'var(--red)', borderRadius: '8px', fontSize: '9px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg1)' }}>{notifCount > 9 ? '9+' : notifCount}</div>
            )}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div onClick={() => router.push('/profile')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: profile?.avatar_url ? 'none' : 'linear-gradient(135deg, #6366f1, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', color: '#fff', cursor: 'pointer', overflow: 'hidden', border: '2px solid var(--border)' }}>
          {profile?.avatar_url ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profile?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div onClick={signOut} style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '16px', marginTop: '4px', color: 'var(--text3)' }}>↩</div>
      </nav>

      {/* MAIN */}
      <div className="app-main">

        {/* TOPBAR */}
        <div className="app-topbar">
          {(isRoom || isUser) && (
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '22px', padding: '0', lineHeight: 1, minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          )}
          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text1)', flex: 1 }}>{title}</div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {notifCount > 0 && (
              <div onClick={() => router.push('/notifications')} style={{ position: 'relative', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                🔔
                <div style={{ position: 'absolute', top: '4px', right: '4px', width: '16px', height: '16px', background: 'var(--red)', borderRadius: '50%', fontSize: '9px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg1)' }}>{notifCount > 9 ? '9+' : notifCount}</div>
              </div>
            )}
            {profile?.username && (
              <div style={{ fontSize: '12px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {profile?.avatar_url && <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden' }}><img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                <span>@{profile.username}</span>
              </div>
            )}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="app-content">{children}</div>
      </div>

      {/* MOBILE BOTTOM NAV — shown on mobile via globals.css */}
      <div className="app-mobile-nav">
        {MOBILE_NAV.map(n => (
          <div key={n.id} onClick={() => router.push(n.path)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer', padding: '6px 12px', color: activeId === n.id ? 'var(--accent2)' : 'var(--text3)', position: 'relative', flex: 1 }}>
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{n.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: activeId === n.id ? '600' : '400' }}>{n.label}</span>
            {n.id === 'notifications' && notifCount > 0 && (
              <div style={{ position: 'absolute', top: '4px', right: '8px', width: '14px', height: '14px', background: 'var(--red)', borderRadius: '50%', fontSize: '8px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg1)' }}>{notifCount}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
