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

const TITLES: Record<string, string> = {
  feed: 'Home Feed', explore: 'Explore', search: 'Search',
  messages: 'Messages', notifications: 'Notifications',
  leaderboard: 'Leaderboard', admin: 'Admin', settings: 'Settings', profile: 'Profile'
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [notifCount, setNotifCount] = useState(0)
  const [msgCount, setMsgCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let channel: any = null

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)

      // Unread notifications count
      const { count: nc } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setNotifCount(nc || 0)

      // Real-time notification listener
      channel = supabase
        .channel(`notifs:${user.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          setNotifCount(prev => prev + 1)
        })
        .subscribe()
    }

    load()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Reset badge when visiting notifications page
  useEffect(() => {
    if (pathname === '/notifications') setNotifCount(0)
  }, [pathname])

  const activeId = NAV.find(n => pathname.startsWith(n.path))?.id || 'feed'
  const isRoom = pathname.startsWith('/rooms/')
  const isUser = pathname.startsWith('/users/')
  const title = isRoom ? 'Room' : isUser ? 'Profile' : TITLES[activeId] || 'Rooms'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg0)' }}>

      {/* SIDEBAR */}
      <nav style={{
        width: '70px', background: 'var(--bg1)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '12px 0 14px', gap: '2px', flexShrink: 0, zIndex: 50
      }}>
        <div onClick={() => router.push('/feed')} style={{
          width: '40px', height: '40px',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          borderRadius: '11px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: '800', fontSize: '18px',
          color: '#fff', cursor: 'pointer', marginBottom: '10px',
          animation: 'glow 4s ease-in-out infinite'
        }}>R</div>

        {NAV.map(n => (
          <div key={n.id} onClick={() => router.push(n.path)} title={n.label} style={{
            position: 'relative', width: '42px', height: '42px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '18px',
            background: activeId === n.id && !isRoom && !isUser ? 'rgba(99,102,241,.12)' : 'transparent',
            border: `1px solid ${activeId === n.id && !isRoom && !isUser ? 'rgba(99,102,241,.28)' : 'transparent'}`,
            transition: 'all .18s'
          }}
            onMouseOver={e => { if (activeId !== n.id) (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
            onMouseOut={e => { if (activeId !== n.id) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            {n.icon}
            {n.id === 'notifications' && notifCount > 0 && (
              <div style={{
                position: 'absolute', top: '3px', right: '3px',
                minWidth: '15px', height: '15px', background: 'var(--red)',
                borderRadius: '8px', fontSize: '9px', fontWeight: '700',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: '2px solid var(--bg1)'
              }}>{notifCount > 9 ? '9+' : notifCount}</div>
            )}
            {n.id === 'messages' && msgCount > 0 && (
              <div style={{
                position: 'absolute', top: '3px', right: '3px',
                minWidth: '15px', height: '15px', background: 'var(--accent)',
                borderRadius: '8px', fontSize: '9px', fontWeight: '700',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: '2px solid var(--bg1)'
              }}>{msgCount}</div>
            )}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Avatar */}
        <div onClick={() => router.push('/profile')} title="Profile" style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: profile?.avatar_url ? 'none' : 'linear-gradient(135deg, #6366f1, #ec4899)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: '700', fontSize: '14px', color: '#fff',
          cursor: 'pointer', overflow: 'hidden', border: '2px solid var(--border)',
          transition: 'border-color .2s'
        }}
          onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent2)'}
          onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}
        >
          {profile?.avatar_url
            ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : profile?.name?.charAt(0)?.toUpperCase() || 'U'
          }
        </div>

        {/* Sign out */}
        <div onClick={signOut} title="Sign out" style={{
          width: '36px', height: '36px', borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '16px', marginTop: '4px',
          color: 'var(--text3)', transition: 'color .18s'
        }}
          onMouseOver={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
          onMouseOut={e => (e.currentTarget as HTMLElement).style.color = 'var(--text3)'}
        >↩</div>
      </nav>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{
          height: '56px', flexShrink: 0,
          background: 'rgba(11,13,18,.92)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 18px', gap: '12px', zIndex: 40
        }}>
          {/* Back button on room/user pages */}
          {(isRoom || isUser) && (
            <button onClick={() => router.back()} style={{
              background: 'none', border: 'none', color: 'var(--text3)',
              cursor: 'pointer', fontSize: '20px', padding: '0', lineHeight: 1
            }}>←</button>
          )}

          <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text1)' }}>{title}</div>

          {/* Search bar on explore */}
          {activeId === 'explore' && !isRoom && (
            <div style={{ flex: 1, maxWidth: '360px', position: 'relative' }}>
              <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '13px' }}>🔍</span>
              <input
                placeholder="Search rooms…"
                id="main-search"
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: '9px', padding: '7px 12px 7px 32px', color: 'var(--text1)',
                  fontSize: '13px', outline: 'none', fontFamily: 'inherit'
                }}
              />
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Notification bell (mobile) */}
            {notifCount > 0 && (
              <div onClick={() => router.push('/notifications')} style={{
                position: 'relative', cursor: 'pointer', fontSize: '20px'
              }}>
                🔔
                <div style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  width: '16px', height: '16px', background: 'var(--red)',
                  borderRadius: '50%', fontSize: '9px', fontWeight: '700', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--bg1)'
                }}>{notifCount > 9 ? '9+' : notifCount}</div>
              </div>
            )}
            {/* Username */}
            <div style={{ fontSize: '12px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              {profile?.avatar_url && (
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden' }}>
                  <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              {profile?.username && `@${profile.username}`}
            </div>
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {children}
        </div>
      </div>

      {/* MOBILE NAV */}
      <style>{`
        @media (max-width: 768px) {
          #mobile-nav { display: flex !important; }
          nav { display: none !important; }
          .page-content { padding-bottom: 70px !important; }
        }
        @media (max-width: 500px) {
          #topbar-username { display: none !important; }
        }
      `}</style>
      <div id="mobile-nav" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '58px', background: 'rgba(11,13,18,.96)',
        backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)',
        zIndex: 100, alignItems: 'center', justifyContent: 'space-around',
        padding: '0 8px', paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}>
        {[
          { id: 'feed',          icon: '⊞',  path: '/feed',          label: 'Home' },
          { id: 'explore',       icon: '🧭', path: '/explore',       label: 'Explore' },
          { id: 'messages',      icon: '💬', path: '/messages',      label: 'DMs' },
          { id: 'notifications', icon: '🔔', path: '/notifications', label: 'Alerts' },
          { id: 'profile',       icon: '👤', path: '/profile',       label: 'Me' },
        ].map(n => (
          <div key={n.id} onClick={() => router.push(n.path)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '2px', cursor: 'pointer', padding: '5px 10px',
            color: activeId === n.id ? 'var(--accent2)' : 'var(--text3)',
            fontSize: '20px', position: 'relative'
          }}>
            {n.icon}
            <span style={{ fontSize: '9px', fontWeight: '500' }}>{n.label}</span>
            {n.id === 'notifications' && notifCount > 0 && (
              <div style={{
                position: 'absolute', top: '2px', right: '6px',
                width: '14px', height: '14px', background: 'var(--red)',
                borderRadius: '50%', fontSize: '8px', fontWeight: '700', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid var(--bg1)'
              }}>{notifCount}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}