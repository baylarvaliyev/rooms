'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const INTERESTS = [
  'Startups', 'AI / ML', 'Marketing', 'Crypto', 'Design', 'Travel',
  'Music', 'Finance', 'Photography', 'Gaming', 'Fitness', 'Technology',
  'Business', 'Cars', 'Fashion', 'Science'
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  function toggleInterest(i: string) {
    setSelected(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    )
  }

  async function finish() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({ name, username })
      .eq('id', user.id)

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/feed')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '20px',
      background: 'radial-gradient(ellipse at 50% 40%, rgba(99,102,241,.08) 0%, transparent 60%), var(--bg0)'
    }}>
      <div className="fade-up" style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: '24px', padding: '38px', width: '100%', maxWidth: '480px',
        boxShadow: '0 16px 60px rgba(0,0,0,.7)'
      }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: step >= s ? 'var(--accent)' : 'var(--bg5, #242a38)',
              transition: 'background .3s'
            }} />
          ))}
        </div>

        {step === 1 ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>👋</div>
              <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '4px' }}>Set up your profile</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>How should people know you?</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '5px' }}>Display name</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Baylar"
                style={{
                  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)',
                  fontSize: '13px', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text2)', display: 'block', marginBottom: '5px' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text3)', fontSize: '13px'
                }}>@</span>
                <input
                  value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  placeholder="yourhandle"
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: '9px', padding: '9px 13px 9px 26px', color: 'var(--text1)',
                    fontSize: '13px', outline: 'none'
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!name.trim() || !username.trim()}
              style={{
                width: '100%', padding: '11px', background: 'var(--accent)',
                border: 'none', borderRadius: '10px', fontSize: '14px',
                fontWeight: '600', color: '#fff', cursor: 'pointer',
                opacity: !name.trim() || !username.trim() ? .5 : 1
              }}
            >
              Next →
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>✨</div>
              <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '4px' }}>Pick your interests</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Select at least 3 to personalise your feed</div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {INTERESTS.map(i => (
                <div
                  key={i}
                  onClick={() => toggleInterest(i)}
                  style={{
                    padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                    fontSize: '13px', fontWeight: '500', transition: 'all .18s',
                    background: selected.includes(i) ? 'var(--accentbg, rgba(99,102,241,.1))' : 'var(--bg3)',
                    border: `1px solid ${selected.includes(i) ? 'var(--accentbdr, rgba(99,102,241,.28))' : 'var(--border)'}`,
                    color: selected.includes(i) ? 'var(--accent2)' : 'var(--text2)'
                  }}
                >
                  {i}
                </div>
              ))}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', marginBottom: '14px' }}>
              {selected.length} selected
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)',
                borderRadius: '8px', padding: '9px 13px', fontSize: '13px',
                color: 'var(--red)', marginBottom: '14px'
              }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, padding: '11px', background: 'transparent',
                  border: '1px solid var(--border)', borderRadius: '10px',
                  fontSize: '14px', fontWeight: '500', color: 'var(--text2)', cursor: 'pointer'
                }}
              >
                Back
              </button>
              <button
                onClick={finish}
                disabled={selected.length < 3 || loading}
                style={{
                  flex: 2, padding: '11px', background: 'var(--accent)',
                  border: 'none', borderRadius: '10px', fontSize: '14px',
                  fontWeight: '600', color: '#fff', cursor: 'pointer',
                  opacity: selected.length < 3 || loading ? .5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {loading ? <><div className="spinner" /> Setting up…</> : `Let's go 🚀`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}