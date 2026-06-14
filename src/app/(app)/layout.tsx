'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

// Clean SVG icons — Instagram style
const Icons = {
  home: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  explore: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  messages: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  notifications: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  create: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8" y1="12" x2="16" y2="12"/>
    </svg>
  ),
  leaderboard: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  settings: (active: boolean) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
}

const NAV = [
  { id: 'feed',          icon: Icons.home,         path: '/feed',          label: 'Home' },
  { id: 'explore',       icon: Icons.explore,      path: '/explore',       label: 'Explore' },
  { id: 'messages',      icon: Icons.messages,     path: '/messages',      label: 'Messages' },
  { id: 'notifications', icon: Icons.notifications,path: '/notifications', label: 'Notifications' },
  { id: 'leaderboard',   icon: Icons.leaderboard,  path: '/leaderboard',   label: 'Leaderboard' },
  { id: 'settings',      icon: Icons.settings,     path: '/settings',      label: 'Settings' },
]

const MOBILE_NAV = [
  { id: 'feed',        icon: Icons.home,         path: '/feed' },
  { id: 'explore',     icon: Icons.explore,      path: '/explore' },
  { id: 'leaderboard', icon: Icons.leaderboard,  path: '/leaderboard' },
  { id: 'messages',    icon: Icons.messages,     path: '/messages' },
  { id: 'profile',     icon: null,               path: '/profile' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [dmCount, setDmCount] = useState(0)

  // SECURITY: Detect if user changes mid-session (e.g. someone signs up on same browser)
  // If the auth user changes, clear state and redirect to login immediately
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null

      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setCurrentUserId(null)
        router.push('/login')
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (currentUserId && newUserId && newUserId !== currentUserId) {
          // Different user logged in on same browser — force full page reload
          // This clears all React state and prevents session mixing
          window.location.href = '/feed'
          return
        }
        if (newUserId && !currentUserId) {
          setCurrentUserId(newUserId)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [currentUserId])

  useEffect(() => {
    let channel: any = null
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)
      if (!profile) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
      const { count: nc } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
      setNotifCount(nc || 0)
      if (channel) return
      channel = supabase.channel(`layout:${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => setNotifCount(p => p + 1))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages', filter: `to_user=eq.${user.id}` }, () => {
          // Only show badge if not on messages page
          if (!window.location.pathname.startsWith('/messages')) setDmCount(p => p + 1)
        })
        .subscribe()
    }
    load()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [pathname])

  useEffect(() => { if (pathname === '/notifications') setNotifCount(0) }, [pathname])
  useEffect(() => { if (pathname.startsWith('/messages')) setDmCount(0) }, [pathname])

  async function signOut() { await supabase.auth.signOut(); router.push('/login') }

  const activeId = NAV.find(n => pathname.startsWith(n.path))?.id ||
    (pathname.startsWith('/profile') ? 'profile' : 'feed')
  const isRoom = pathname.startsWith('/rooms/')
  const isUser = pathname.startsWith('/users/')

  return (
    <div className="app-shell">

      {/* SIDEBAR — desktop only */}
      <nav className="app-sidebar">
        {/* Logo */}
        <div onClick={() => router.push('/feed')} style={{ width: '36px', height: '36px', background: 'var(--ig-gradient)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '17px', color: '#fff', cursor: 'pointer', marginBottom: '8px', letterSpacing: '-1px' }}>R</div>

        {NAV.map(n => {
          const isActive = activeId === n.id && !isRoom && !isUser
          return (
            <div key={n.id} onClick={() => router.push(n.path)} title={n.label} style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isActive ? 'var(--text1)' : 'var(--text3)', background: isActive ? 'var(--bg3)' : 'transparent', transition: 'all .15s' }}
              onMouseOver={e => !isActive && ((e.currentTarget as HTMLElement).style.background = 'var(--bg2)')}
              onMouseOut={e => !isActive && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            >
              {n.icon(isActive)}
              {n.id === 'notifications' && notifCount > 0 && (
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--red)', borderRadius: '50%', border: '1.5px solid var(--bg0)' }} />
              )}
              {n.id === 'messages' && dmCount > 0 && (
                <div style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%', border: '1.5px solid var(--bg0)' }} />
              )}
            </div>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* Profile avatar */}
        <div onClick={() => router.push('/profile')} style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', border: activeId === 'profile' ? '2px solid var(--text1)' : '1.5px solid var(--bg4)', transition: 'border .15s' }}>
          {profile?.avatar_url
            ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: 'var(--ig-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>{profile?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          }
        </div>
      </nav>

      {/* MAIN */}
      <div className="app-main">

        {/* TOPBAR */}
        <div className="app-topbar">
          {(isRoom || isUser) && (
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text1)', cursor: 'pointer', padding: '0', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text1)', flex: 1, letterSpacing: '-0.3px' }}>
            {isRoom || isUser ? '' : activeId === 'feed' ? 'Rooms' : NAV.find(n => n.id === activeId)?.label || 'Rooms'}
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {/* Notifications always visible on mobile topbar */}
            <button onClick={() => router.push('/notifications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text1)', position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Icons.notifications(false)}
              {notifCount > 0 && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: 'var(--red)', borderRadius: '50%', border: '1.5px solid var(--bg0)' }} />}
            </button>
            {activeId === 'feed' && (
              <button onClick={() => router.push('/messages')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text1)', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {Icons.messages(false)}
              </button>
            )}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div className="app-content">{children}</div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="app-mobile-nav">
        {MOBILE_NAV.map(n => {
          const isActive = activeId === n.id || (n.id === 'profile' && pathname.startsWith('/profile'))
          return (
            <div key={n.id} onClick={() => router.push(n.path)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: isActive ? 'var(--text1)' : 'var(--text3)', position: 'relative', height: '100%' }}>
              {n.id === 'profile' ? (
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden', border: isActive ? '2px solid var(--text1)' : '1.5px solid var(--bg4)' }}>
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'var(--ig-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>{profile?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                  }
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  {n.icon!(isActive)}
                  {n.id === 'notifications' && notifCount > 0 && (
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--red)', borderRadius: '50%', border: '1.5px solid var(--bg0)' }} />
                  )}
                  {n.id === 'messages' && dmCount > 0 && (
                    <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%', border: '1.5px solid var(--bg0)' }} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
