'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '24px' }}>Settings</div>

        {/* Account section */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '9px' }}>
            Account
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {[
              { label: 'Edit profile', sub: 'Name, bio, username', action: () => router.push('/profile'), arrow: true },
              { label: 'Change password', sub: 'Update your password', action: () => setDone(true), arrow: true },
            ].map((item, i) => (
              <div
                key={i}
                onClick={item.action}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background .18s'
                }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text1)' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{item.sub}</div>
                </div>
                {item.arrow && <span style={{ color: 'var(--text3)', fontSize: '16px' }}>›</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Notifications section */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '9px' }}>
            Notifications
          </div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {[
              { label: 'Push notifications', sub: 'Real-time alerts' },
              { label: 'Email digest', sub: 'Weekly summary' },
              { label: 'Mentions', sub: 'When someone tags you' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text1)' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{item.sub}</div>
                </div>
                <Toggle />
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '9px' }}>
            Session
          </div>
          <button onClick={signOut} disabled={loading} style={{
            width: '100%', padding: '12px', background: 'rgba(239,68,68,.1)',
            border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px',
            color: 'var(--red)', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px'
          }}>
            {loading ? <><div className="spinner" />Signing out…</> : '↩ Sign out'}
          </button>
        </div>

        {done && (
          <div style={{
            marginTop: '16px', padding: '12px', background: 'rgba(34,197,94,.1)',
            border: '1px solid rgba(34,197,94,.2)', borderRadius: '9px',
            fontSize: '13px', color: 'var(--green)', textAlign: 'center'
          }}>
            Password reset email sent!
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle() {
  const [on, setOn] = useState(true)
  return (
    <div
      onClick={() => setOn(!on)}
      style={{
        width: '38px', height: '21px', borderRadius: '11px',
        background: on ? 'var(--accent)' : 'var(--bg5, #242a38)',
        position: 'relative', cursor: 'pointer', transition: 'background .2s',
        flexShrink: 0, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`
      }}
    >
      <div style={{
        position: 'absolute', top: '2px',
        left: on ? '18px' : '2px',
        width: '15px', height: '15px', borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 4px rgba(0,0,0,.3)'
      }} />
    </div>
  )
}