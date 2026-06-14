'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit() {
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`
        }
      })
      if (error) { setError(error.message); setLoading(false); return }
      // If email confirmation is ON, identities will be empty or session null
      if (!data.session) {
        setEmailSent(true)
        setLoading(false)
        return
      }
      router.push('/onboarding')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/feed')
    }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  // Email confirmation screen
  if (emailSent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--bg0)' }}>
        <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '24px', padding: '40px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>📧</div>
          <div style={{ fontWeight: '800', fontSize: '22px', marginBottom: '8px' }}>Check your email</div>
          <div style={{ fontSize: '14px', color: 'var(--text3)', marginBottom: '6px' }}>We sent a confirmation link to:</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text1)', marginBottom: '24px' }}>{email}</div>
          <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '24px', lineHeight: '1.6' }}>
            Click the link in your email to confirm your account and start using Rooms.
          </div>
          <button onClick={() => setEmailSent(false)} style={{ width: '100%', padding: '11px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(ellipse at 30% 40%, rgba(99,102,241,.08) 0%, transparent 60%), var(--bg0)'
    }}>
      <div className="fade-up" style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border2)',
        borderRadius: '24px',
        padding: '38px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 16px 60px rgba(0,0,0,.7)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'var(--ig-gradient)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '900', fontSize: '26px', color: '#fff',
            margin: '0 auto 12px',
          }}>R</div>
          <div style={{ fontWeight: '800', fontSize: '22px' }}>Rooms</div>
          <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '3px' }}>Join live experiences, not feeds</div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px',
          background: 'var(--bg3)', borderRadius: '10px', padding: '4px',
          marginBottom: '20px'
        }}>
          {(['signin', 'signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '7px',
              borderRadius: '7px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: '500',
              background: mode === m ? 'var(--bg1)' : 'transparent',
              color: mode === m ? 'var(--text1)' : 'var(--text3)',
              transition: 'all .2s'
            }}>
              {m === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        {/* Google */}
        <button onClick={handleGoogle} style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '9px', padding: '10px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: '10px', fontSize: '13px', fontWeight: '500',
          color: 'var(--text2)', cursor: 'pointer', marginBottom: '8px',
          transition: 'all .18s'
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          margin: '16px 0', color: 'var(--text3)', fontSize: '12px'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          or
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* Form */}
        {mode === 'signup' && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '5px' }}>Full name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
              style={{
                width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)',
                fontSize: '13px', outline: 'none'
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '5px' }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)',
              fontSize: '13px', outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '5px' }}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)',
              fontSize: '13px', outline: 'none'
            }}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
            borderRadius: '8px', padding: '9px 13px', fontSize: '13px',
            color: 'var(--red)', marginBottom: '14px'
          }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: '100%', padding: '11px',
          background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px',
          fontSize: '14px', fontWeight: '600', color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: loading ? .7 : 1, transition: 'all .18s',
          fontFamily: 'inherit'
        }}>
          {loading ? <><div className="spinner" /> Loading…</> : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </div>
    </div>
  )
}