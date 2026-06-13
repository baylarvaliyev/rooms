'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [settings, setSettings] = useState({
    push_notifications: true,
    email_digest: false,
    mentions: true,
    show_online: true,
    public_profile: true,
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserEmail(user.email || '')
      const { data } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()
      if (data?.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }))
      }
    }
    load()
  }, [])

  async function saveSettings() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ settings }).eq('id', user.id)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function sendPasswordReset() {
    if (!userEmail) return
    await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setResetSent(true)
  }

  async function signOut() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  function toggle(key: string) {
    setSettings(prev => ({ ...prev, [key]: !(prev as any)[key] }))
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ fontWeight: '700', fontSize: '18px', marginBottom: '24px' }}>Settings</div>

        {/* Account */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '9px' }}>Account</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div
              onClick={() => router.push('/profile')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .18s' }}
              onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
              onMouseOut={e => (e.currentTarget as HTMLElement).style.background = 'none'}
            >
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text1)' }}>Edit profile</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>Name, bio, avatar, username</div>
              </div>
              <span style={{ color: 'var(--text3)', fontSize: '16px' }}>›</span>
            </div>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '13px', color: 'var(--text1)', marginBottom: '2px' }}>Email</div>
              <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{userEmail || 'Loading…'}</div>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text1)' }}>Password</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>Send reset link to your email</div>
                </div>
                <button
                  onClick={sendPasswordReset}
                  style={{
                    padding: '6px 13px', background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: '8px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer'
                  }}
                >{resetSent ? '✓ Sent!' : 'Reset'}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '9px' }}>Notifications</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {[
              { key: 'push_notifications', label: 'Push notifications', sub: 'Real-time alerts in browser' },
              { key: 'email_digest', label: 'Email digest', sub: 'Weekly summary of activity' },
              { key: 'mentions', label: 'Mentions', sub: 'When someone tags you' },
            ].map((item, i, arr) => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text1)' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{item.sub}</div>
                </div>
                <ToggleSwitch on={(settings as any)[item.key]} onToggle={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '9px' }}>Privacy</div>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {[
              { key: 'public_profile', label: 'Public profile', sub: 'Anyone can view your profile' },
              { key: 'show_online', label: 'Show online status', sub: 'Let others see when you\'re active' },
            ].map((item, i, arr) => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '13px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text1)' }}>{item.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>{item.sub}</div>
                </div>
                <ToggleSwitch on={(settings as any)[item.key]} onToggle={() => toggle(item.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={saveSettings} disabled={saving} style={{
          width: '100%', padding: '12px', background: 'var(--accent)',
          border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer', marginBottom: '12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: saving ? .7 : 1
        }}>
          {saving ? <><div className="spinner" />Saving…</> : saved ? '✓ Saved!' : 'Save settings'}
        </button>

        {/* Sign out */}
        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '9px' }}>Session</div>
        <button onClick={signOut} disabled={loading} style={{
          width: '100%', padding: '12px', background: 'rgba(239,68,68,.1)',
          border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px',
          color: 'var(--red)', fontSize: '13px', fontWeight: '600',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px'
        }}>
          {loading ? <><div className="spinner" />Signing out…</> : '↩ Sign out'}
        </button>

        {/* Legal */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '24px' }}>
          <a href="/terms" style={{ fontSize: '12px', color: 'var(--text3)', textDecoration: 'none' }}>Terms of Service</a>
          <span style={{ color: 'var(--text3)', fontSize: '12px' }}>·</span>
          <a href="/privacy" style={{ fontSize: '12px', color: 'var(--text3)', textDecoration: 'none' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch({ on, onToggle }: { on: boolean, onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{
      width: '38px', height: '21px', borderRadius: '11px',
      background: on ? 'var(--accent)' : 'var(--bg5, #242a38)',
      position: 'relative', cursor: 'pointer', transition: 'background .2s',
      flexShrink: 0, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`
    }}>
      <div style={{
        position: 'absolute', top: '2px', left: on ? '18px' : '2px',
        width: '15px', height: '15px', borderRadius: '50%',
        background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)'
      }} />
    </div>
  )
}
