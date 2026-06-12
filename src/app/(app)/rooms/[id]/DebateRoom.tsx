'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

const SAMPLE_DEBATE = {
  question: "Will AI replace most knowledge workers within 10 years?",
  options: [
    { label: "Yes, significantly", votes: 847 },
    { label: "Partially, but humans adapt", votes: 1203 },
    { label: "No, AI just augments", votes: 421 },
  ]
}

const SAMPLE_TAKES = [
  { id: 1, user: "Alex R.", text: "The question isn't if but when. GPT-4 already does 80% of what junior analysts do. Companies are already quietly not replacing people who leave.", up: 234, down: 45, voted: null },
  { id: 2, user: "Sarah V.", text: "Every wave of automation created more jobs than it destroyed. The industrial revolution, computing, internet. AI will be the same.", up: 189, down: 67, voted: null },
  { id: 3, user: "Omar H.", text: "The difference this time is speed. Previous transitions took generations. AI capabilities are doubling every few months.", up: 156, down: 23, voted: null },
]

export default function DebateRoom({ room, currentUser, isMember }: any) {
  const [takes, setTakes] = useState(SAMPLE_TAKES)
  const [pollVote, setPollVote] = useState<number | null>(null)
  const [totalVotes] = useState(SAMPLE_DEBATE.options.reduce((a, b) => a + b.votes, 0))
  const [newTake, setNewTake] = useState('')
  const [posting, setPosting] = useState(false)
  const [joined, setJoined] = useState(isMember)
  const supabase = createClient()
  const router = useRouter()

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  function vote(takeId: number, dir: 'up' | 'down') {
    setTakes(prev => prev.map(t => {
      if (t.id !== takeId) return t
      if (t.voted === dir) return { ...t, [dir]: t[dir] - 1, voted: null }
      const opp = dir === 'up' ? 'down' : 'up'
      return { ...t, [dir]: t[dir] + 1, [opp]: t.voted === opp ? t[opp] - 1 : t[opp], voted: dir }
    }))
  }

  function postTake() {
    if (!newTake.trim() || !joined) return
    setPosting(true)
    const name = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'You'
    setTakes(prev => [{
      id: Date.now(), user: name,
      text: newTake.trim(), up: 0, down: 0, voted: null
    }, ...prev])
    setNewTake('')
    setPosting(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            {room.name} <span className="live-dot" />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Debate room · {room.member_count} members</div>
        </div>
        {!joined
          ? <button onClick={joinRoom} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
          : <div style={{ padding: '5px 12px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓ Joined</div>
        }
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>

        {/* Poll */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,.09), rgba(168,85,247,.06))',
          border: '1px solid rgba(99,102,241,.22)', borderRadius: '13px', padding: '18px', marginBottom: '20px'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>🔥 Live Poll</div>
          <div style={{ fontWeight: '700', fontSize: '16px', color: 'var(--text1)', marginBottom: '14px', lineHeight: '1.4' }}>
            {SAMPLE_DEBATE.question}
          </div>
          {SAMPLE_DEBATE.options.map((opt, i) => {
            const pct = Math.round((opt.votes / totalVotes) * 100)
            const chosen = pollVote === i
            return (
              <div key={i} onClick={() => setPollVote(i)} style={{ marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '9px', position: 'relative', overflow: 'hidden',
                  border: `1px solid ${chosen ? 'rgba(99,102,241,.4)' : 'var(--border)'}`,
                  background: chosen ? 'rgba(99,102,241,.08)' : 'var(--bg3)',
                  transition: 'all .18s'
                }}>
                  {pollVote !== null && (
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'rgba(99,102,241,.12)', transition: 'width .6s ease' }} />
                  )}
                  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: chosen ? 'var(--accent2)' : 'var(--text1)', fontWeight: chosen ? '600' : '400' }}>{opt.label}</span>
                    {pollVote !== null && <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent2)' }}>{pct}%</span>}
                  </div>
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '6px' }}>
            {totalVotes.toLocaleString()} votes · {pollVote === null ? 'Tap to vote' : 'Vote recorded ✓'}
          </div>
        </div>

        {/* Post take */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '18px' }}>
          <textarea
            value={newTake}
            onChange={e => setNewTake(e.target.value)}
            placeholder={joined ? "Drop your hot take… 🔥" : "Join the room to post your take"}
            disabled={!joined}
            rows={2}
            style={{
              width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: '9px', padding: '10px 13px', color: 'var(--text1)',
              fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit',
              marginBottom: '10px', opacity: joined ? 1 : 0.5
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px' }}>
            <button
              onClick={postTake}
              disabled={!newTake.trim() || !joined}
              style={{
                padding: '7px 16px', background: 'var(--accent)', border: 'none',
                borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', opacity: !newTake.trim() || !joined ? .5 : 1
              }}
            >Post take</button>
          </div>
        </div>

        {/* Sort tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {['🔥 Hot', '🆕 New', '⬆️ Top'].map((t, i) => (
            <div key={i} style={{
              padding: '5px 13px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
              background: i === 0 ? 'var(--accent)' : 'var(--bg3)',
              color: i === 0 ? '#fff' : 'var(--text2)',
              border: `1px solid ${i === 0 ? 'var(--accent)' : 'var(--border)'}`,
            }}>{t}</div>
          ))}
        </div>

        {/* Takes */}
        {takes.map(take => (
          <div key={take.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '10px', transition: 'border-color .2s' }}
            onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.11)'}
            onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.06)'}
          >
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: getColor(take.user), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                {take.user.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', marginBottom: '5px' }}>{take.user}</div>
                <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.65', marginBottom: '10px' }}>{take.text}</div>
                <div style={{ display: 'flex', gap: '7px' }}>
                  <button onClick={() => vote(take.id, 'up')} style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                    borderRadius: '7px', border: `1px solid ${take.voted === 'up' ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                    background: take.voted === 'up' ? 'rgba(34,197,94,.1)' : 'none',
                    color: take.voted === 'up' ? 'var(--green)' : 'var(--text3)',
                    fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit'
                  }}>↑ {take.up}</button>
                  <button onClick={() => vote(take.id, 'down')} style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                    borderRadius: '7px', border: `1px solid ${take.voted === 'down' ? 'rgba(239,68,68,.3)' : 'var(--border)'}`,
                    background: take.voted === 'down' ? 'rgba(239,68,68,.1)' : 'none',
                    color: take.voted === 'down' ? 'var(--red)' : 'var(--text3)',
                    fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit'
                  }}>↓ {take.down}</button>
                  <button style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>💬 Reply</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}