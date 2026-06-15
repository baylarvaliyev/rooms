'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const INTERESTS = [
  'Startups', 'AI / ML', 'Marketing', 'Crypto', 'Design', 'Travel',
  'Music', 'Finance', 'Photography', 'Gaming', 'Fitness', 'Technology',
  'Business', 'Cars', 'Fashion', 'Science'
]

const INTEREST_TO_CATEGORY: Record<string, string> = {
  'Startups': 'Business', 'AI / ML': 'Technology', 'Marketing': 'Business',
  'Crypto': 'Finance', 'Design': 'Art', 'Travel': 'Travel',
  'Music': 'Music', 'Finance': 'Finance', 'Photography': 'Art',
  'Gaming': 'Lifestyle', 'Fitness': 'Fitness', 'Technology': 'Technology',
  'Business': 'Business', 'Cars': 'Cars', 'Fashion': 'Lifestyle', 'Science': 'Technology'
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

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [suggestedRooms, setSuggestedRooms] = useState<any[]>([])
  const [followedRooms, setFollowedRooms] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function loadSuggestedRooms(interests: string[]) {
    if (interests.length === 0) return
    setLoadingRooms(true)
    const categories = [...new Set(interests.map(i => INTEREST_TO_CATEGORY[i]).filter(Boolean))]
    const { data } = await supabase
      .from('rooms')
      .select('id, name, emoji, category, member_count, description, type')
      .in('category', categories)
      .order('member_count', { ascending: false })
      .limit(12)
    setSuggestedRooms(data || [])
    setLoadingRooms(false)
  }

  function toggleInterest(i: string) {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  function toggleRoom(roomId: string) {
    setFollowedRooms(prev => {
      const n = new Set(prev)
      n.has(roomId) ? n.delete(roomId) : n.add(roomId)
      return n
    })
  }

  async function goToStep3() {
    await loadSuggestedRooms(selected)
    setStep(3)
  }

  async function finish() {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Save profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ name, username, interests: selected })
      .eq('id', user.id)

    if (profileError) { setError(profileError.message); setLoading(false); return }

    // Join + follow selected rooms
    if (followedRooms.size > 0) {
      const roomIds = [...followedRooms]
      await Promise.all([
        supabase.from('room_members').insert(roomIds.map(room_id => ({ room_id, user_id: user.id, role: 'member' }))),
        supabase.from('room_follows').insert(roomIds.map(room_id => ({ room_id, user_id: user.id }))),
      ])
    }

    router.push('/feed')
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '10px 14px', color: 'var(--text1)',
    fontSize: '14px', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#000' }}>
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '500px' }}>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: step >= s ? 'var(--ig-gradient)' : 'var(--bg4)', transition: 'background .3s' }} />
          ))}
        </div>

        {/* Step 1 — Profile */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '56px', height: '56px', background: 'var(--ig-gradient)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '26px', color: '#fff', margin: '0 auto 12px' }}>R</div>
              <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '4px' }}>Welcome to Rooms</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Set up your profile in 3 quick steps</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Display name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Baylar" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text3)', display: 'block', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.05em' }}>Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '14px' }}>@</span>
                <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="yourhandle" style={{ ...inputStyle, paddingLeft: '28px' }} />
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!name.trim() || !username.trim()} style={{ width: '100%', padding: '12px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#fff', cursor: 'pointer', opacity: !name.trim() || !username.trim() ? .5 : 1, fontFamily: 'inherit' }}>
              Next →
            </button>
          </>
        )}

        {/* Step 2 — Interests */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>✨</div>
              <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '4px' }}>What are you into?</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Pick at least 3 — we'll find the right rooms for you</div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
              {INTERESTS.map(i => (
                <div key={i} onClick={() => toggleInterest(i)} style={{ padding: '7px 15px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all .15s', background: selected.includes(i) ? 'rgba(225,48,108,.12)' : 'var(--bg3)', border: `1px solid ${selected.includes(i) ? 'rgba(225,48,108,.4)' : 'var(--border)'}`, color: selected.includes(i) ? 'var(--accent)' : 'var(--text2)' }}>
                  {i}
                </div>
              ))}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', marginBottom: '16px' }}>
              {selected.length} selected {selected.length < 3 && `· need ${3 - selected.length} more`}
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '8px', padding: '9px 13px', fontSize: '13px', color: 'var(--red)', marginBottom: '14px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              <button onClick={goToStep3} disabled={selected.length < 3 || loadingRooms} style={{ flex: 2, padding: '11px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#fff', cursor: 'pointer', opacity: selected.length < 3 ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit' }}>
                {loadingRooms ? <><div className="spinner" />Finding rooms…</> : 'Next →'}
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Join Rooms */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏠</div>
              <div style={{ fontWeight: '700', fontSize: '20px', marginBottom: '4px' }}>Join your first rooms</div>
              <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Join at least 1 room — or skip and explore later</div>
            </div>

            {suggestedRooms.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)', fontSize: '13px' }}>No rooms found for your interests yet — you can explore rooms after signup!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '340px', overflowY: 'auto' }}>
                {suggestedRooms.map(r => {
                  const isSelected = followedRooms.has(r.id)
                  return (
                    <div key={r.id} onClick={() => toggleRoom(r.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: isSelected ? 'rgba(225,48,108,.08)' : 'var(--bg3)', border: `1px solid ${isSelected ? 'rgba(225,48,108,.3)' : 'var(--border)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all .15s' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: ROOM_COLORS[r.category] || 'var(--bg4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {r.icon_url ? <img src={r.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} alt="" /> : r.emoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', marginBottom: '2px' }}>{r.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{r.category} · {r.member_count || 0} members</div>
                      </div>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, background: isSelected ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                        {isSelected && <svg width="10" height="10" viewBox="0 0 12 10" fill="none"><polyline points="1 5 4.5 8.5 11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ fontSize: '12px', color: 'var(--text3)', textAlign: 'center', marginBottom: '16px' }}>
              {followedRooms.size} room{followedRooms.size !== 1 ? 's' : ''} selected
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '8px', padding: '9px 13px', fontSize: '13px', color: 'var(--red)', marginBottom: '14px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '11px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px', color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              {/* Issue 9: min 1 room required, but skip always available */}
              <button onClick={finish} disabled={loading || followedRooms.size < 1} style={{ flex: 2, padding: '11px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', color: '#fff', cursor: followedRooms.size < 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontFamily: 'inherit', opacity: followedRooms.size < 1 ? .5 : 1 }}>
                {loading ? <><div className="spinner" />Setting up…</> : `Let's go 🚀`}
              </button>
            </div>

            {/* Skip always visible */}
            <button onClick={finish} disabled={loading} style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'none', border: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Skip for now — I'll explore rooms myself
            </button>
          </>
        )}
      </div>
    </div>
  )
}
