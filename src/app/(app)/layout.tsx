'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const NAV = [
  { id: 'feed',          label: 'Feed',         icon: '⊞',  path: '/feed' },
  { id: 'explore',       label: 'Explore',      icon: '🧭', path: '/explore' },
  { id: 'messages',      label: 'Messages',     icon: '💬', path: '/messages' },
  { id: 'notifications', label: 'Notifications',icon: '🔔', path: '/notifications' },
  { id: 'leaderboard',   label: 'Leaderboard',  icon: '🏆', path: '/leaderboard' },
  { id: 'admin',         label: 'Admin',        icon: '🛡️', path: '/admin' },
  { id: 'settings',      label: 'Settings',     icon: '⚙️', path: '/settings' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [notifCount] = useState(4)
  const [msgCount] = useState(3)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const active = NAV.find(n => pathname.startsWith(n.path))?.id || 'feed'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg0)' }}>

      {/* SIDEBAR */}
      <nav style={{
        width: '70px', background: 'var(--bg1)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '12px 0 14px',
        gap: '2px', flexShrink: 0, zIndex: 50
      }}>
        {/* Logo */}
        <div
          onClick={() => router.push('/feed')}
          style={{
            width: '40px', height: '40px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: '11px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: '800', fontSize: '18px',
            color: '#fff', cursor: 'pointer', marginBottom: '10px',
            animation: 'glow 4s ease-in-out infinite'
          }}
        >R</div>

        {/* Nav items */}
        {NAV.map(n => (
          <div
            key={n.id}
            onClick={() => router.push(n.path)}
            title={n.label}
            style={{
              position: 'relative', width: '42px', height: '42px',
              borderRadius: '10px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', fontSize: '18px',
              background: active === n.id ? 'rgba(99,102,241,.12)' : 'transparent',
              border: `1px solid ${active === n.id ? 'rgba(99,102,241,.28)' : 'transparent'}`,
              transition: 'all .18s'
            }}
          >
            {n.icon}
            {n.id === 'notifications' && notifCount > 0 && (
              <div style={{
                position: 'absolute', top: '3px', right: '3px',
                minWidth: '15px', height: '15px', background: 'var(--red)',
                borderRadius: '8px', fontSize: '9px', fontWeight: '700',
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', border: '2px solid var(--bg1)'
              }}>{notifCount}</div>
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
        <div
          onClick={() => router.push('/profile')}
          title="Profile"
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '14px', color: '#fff',
            cursor: 'pointer', border: '2px solid transparent',
            transition: 'border-color .2s'
          }}
        >
          {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>

        {/* Sign out */}
        <div
          onClick={signOut}
          title="Sign out"
          style={{
            width: '36px', height: '36px', borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '16px', marginTop: '4px',
            color: 'var(--text3)', transition: 'color .18s'
          }}
        >↩</div>
      </nav>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{
          height: '56px', flexShrink: 0,
          background: 'rgba(11,13,18,.9)', backdropFilter: 'blur(24px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: '0 18px', gap: '12px', zIndex: 40
        }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: '15px',
            fontWeight: '600', color: 'var(--text1)'
          }}>
            {NAV.find(n => n.id === active)?.label || 'Rooms'}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{
            fontSize: '13px', color: 'var(--text3)'
          }}>
            {profile?.name && `@${profile.username}`}
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
          #sidebar { display: none !important; }
        }
      `}</style>
      <div id="mobile-nav" style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '56px', background: 'rgba(11,13,18,.95)',
        backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)',
        zIndex: 100, alignItems: 'center', justifyContent: 'space-around',
        padding: '0 8px'
      }}>
        {[NAV[0], NAV[1], NAV[2], NAV[3], {id:'profile', label:'Profile', icon:'👤', path:'/profile'}].map(n => (
          <div
            key={n.id}
            onClick={() => router.push(n.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '2px', cursor: 'pointer', padding: '5px 10px',
              color: active === n.id ? 'var(--accent2)' : 'var(--text3)',
              fontSize: '20px'
            }}
          >
            {n.icon}
            <span style={{ fontSize: '9px', fontWeight: '500' }}>{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}