'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const COLORS = ['#6366f1','#0891b2','#ec4899','#16a34a','#0f766e','#7c3aed','#d97706','#f97316']
function getColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}
function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

export default function DebateRoom({ room, currentUser, isMember }: any) {
  const [joined, setJoined] = useState(isMember)
  const [takes, setTakes] = useState<any[]>([])
  const [myVotes, setMyVotes] = useState<Record<string, string>>({})
  const [poll, setPoll] = useState<any>(null)
  const [myPollVote, setMyPollVote] = useState<number | null>(null)
  const [sort, setSort] = useState<'hot' | 'new' | 'top'>('hot')
  const [newTake, setNewTake] = useState('')
  const [posting, setPosting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [pollForm, setPollForm] = useState({ question: '', options: ['', '', ''] })
  const [isOwner, setIsOwner] = useState(false)
  const [pinnedTakeId, setPinnedTakeId] = useState<string | null>(null)
  const [closedDebate, setClosedDebate] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadData()
    // Check if owner
    if (room.created_by === currentUser.id) setIsOwner(true)

    // Real-time takes
    const channel = supabase.channel(`debate:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'room_takes',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        const { data } = await supabase
          .from('room_takes')
          .select('*, profiles(name, username)')
          .eq('id', payload.new.id)
          .single()
        if (data) setTakes(prev => [data, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'room_takes',
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        setTakes(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadData() {
    setLoading(true)
    const [
      { data: takesData },
      { data: pollData },
      { data: votesData },
      { data: pollVoteData },
    ] = await Promise.all([
      supabase.from('room_takes').select('*, profiles(name, username)').eq('room_id', room.id).order('created_at', { ascending: false }),
      supabase.from('room_polls').select('*').eq('room_id', room.id).single(),
      supabase.from('take_votes').select('take_id, direction').eq('user_id', currentUser.id),
      supabase.from('room_poll_votes').select('option_index').eq('user_id', currentUser.id),
    ])

    setTakes(takesData || [])
    setPoll(pollData || null)

    const voteMap: Record<string, string> = {}
    ;(votesData || []).forEach((v: any) => { voteMap[v.take_id] = v.direction })
    setMyVotes(voteMap)

    if (pollData && pollVoteData && pollVoteData.length > 0) {
      // find my vote for this poll
      const { data: myPollV } = await supabase.from('room_poll_votes').select('option_index').eq('poll_id', pollData.id).eq('user_id', currentUser.id).single()
      if (myPollV) setMyPollVote(myPollV.option_index)
    }

    setLoading(false)
  }

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  async function postTake() {
    if (!newTake.trim() || !joined || posting) return
    setPosting(true)
    await supabase.from('room_takes').insert({
      room_id: room.id, user_id: currentUser.id, content: newTake.trim()
    })
    setNewTake('')
    setPosting(false)
  }

  async function voteTake(takeId: string, dir: 'up' | 'down') {
    const current = myVotes[takeId]
    const take = takes.find(t => t.id === takeId)
    if (!take) return

    if (current === dir) {
      // Remove vote
      await supabase.from('take_votes').delete().eq('take_id', takeId).eq('user_id', currentUser.id)
      const field = dir === 'up' ? 'up_votes' : 'down_votes'
      await supabase.from('room_takes').update({ [field]: Math.max(0, take[field] - 1) }).eq('id', takeId)
      setMyVotes(prev => { const n = { ...prev }; delete n[takeId]; return n })
      setTakes(prev => prev.map(t => t.id === takeId ? { ...t, [field]: Math.max(0, t[field] - 1) } : t))
    } else {
      // Switch or new vote
      if (current) {
        // Remove old vote first
        await supabase.from('take_votes').delete().eq('take_id', takeId).eq('user_id', currentUser.id)
        const oldField = current === 'up' ? 'up_votes' : 'down_votes'
        await supabase.from('room_takes').update({ [oldField]: Math.max(0, take[oldField] - 1) }).eq('id', takeId)
      }
      // Add new vote
      await supabase.from('take_votes').insert({ take_id: takeId, user_id: currentUser.id, direction: dir })
      const field = dir === 'up' ? 'up_votes' : 'down_votes'
      await supabase.from('room_takes').update({ [field]: take[field] + 1 }).eq('id', takeId)
      setMyVotes(prev => ({ ...prev, [takeId]: dir }))
      setTakes(prev => prev.map(t => {
        if (t.id !== takeId) return t
        const oldField = current === 'up' ? 'up_votes' : 'down_votes'
        return {
          ...t,
          [field]: t[field] + 1,
          ...(current ? { [oldField]: Math.max(0, t[oldField] - 1) } : {})
        }
      }))
    }
  }

  async function votePoll(optionIndex: number) {
    if (!poll || myPollVote !== null) return
    await supabase.from('room_poll_votes').insert({ poll_id: poll.id, user_id: currentUser.id, option_index: optionIndex })
    // Update vote count optimistically
    const updatedOptions = poll.options.map((o: any, i: number) => i === optionIndex ? { ...o, votes: (o.votes || 0) + 1 } : o)
    setPoll({ ...poll, options: updatedOptions })
    setMyPollVote(optionIndex)
  }

  async function deleteTake(takeId: string) {
    if (!confirm('Delete this take?')) return
    await supabase.from('room_takes').delete().eq('id', takeId)
    setTakes(prev => prev.filter(t => t.id !== takeId))
  }

  async function pinTake(takeId: string) {
    setPinnedTakeId(pinnedTakeId === takeId ? null : takeId)
  }

  async function markWinner(takeId: string) {
    // Update take with winner flag
    await supabase.from('room_takes').update({ is_winner: true } as any).eq('id', takeId)
    setTakes(prev => prev.map(t => ({ ...t, is_winner: t.id === takeId })))
  }

  async function closeDebate() {
    setClosedDebate(!closedDebate)
  }

  async function deletePoll() {
    if (!poll || !confirm('Delete this poll?')) return
    await supabase.from('room_polls').delete().eq('id', poll.id)
    setPoll(null)
  }

  async function createPoll() {
    if (!pollForm.question.trim()) return
    const validOptions = pollForm.options.filter(o => o.trim())
    if (validOptions.length < 2) return
    const { data } = await supabase.from('room_polls').insert({
      room_id: room.id,
      question: pollForm.question,
      options: validOptions.map(o => ({ text: o, votes: 0 }))
    }).select().single()
    if (data) setPoll(data)
    setShowCreatePoll(false)
  }

  const sortedTakes = [...takes].sort((a, b) => {
    if (sort === 'hot') return (b.up_votes - b.down_votes) - (a.up_votes - a.down_votes)
    if (sort === 'new') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    if (sort === 'top') return b.up_votes - a.up_votes
    return 0
  })

  const totalPollVotes = poll ? poll.options.reduce((a: number, o: any) => a + (o.votes || 0), 0) : 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px', minWidth: '36px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>{room.name} <span className="live-dot" /></div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Debate · {room.member_count} members</div>
        </div>
        {!joined
          ? <button onClick={joinRoom} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
          : <div style={{ padding: '5px 10px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓ Joined</div>
        }
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

        {/* Poll section */}
        {poll ? (
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,.09), rgba(168,85,247,.06))', border: '1px solid rgba(99,102,241,.22)', borderRadius: '13px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '8px' }}>🔥 Live Poll</div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text1)', marginBottom: '14px', lineHeight: '1.4' }}>{poll.question}</div>
            {poll.options.map((opt: any, i: number) => {
              const pct = totalPollVotes > 0 ? Math.round(((opt.votes || 0) / totalPollVotes) * 100) : 0
              const chosen = myPollVote === i
              return (
                <div key={i} onClick={() => votePoll(i)} style={{ marginBottom: '8px', cursor: myPollVote !== null ? 'default' : 'pointer' }}>
                  <div style={{ padding: '10px 14px', borderRadius: '9px', position: 'relative', overflow: 'hidden', border: `1px solid ${chosen ? 'rgba(99,102,241,.4)' : 'var(--border)'}`, background: chosen ? 'rgba(99,102,241,.08)' : 'var(--bg3)', transition: 'all .18s' }}>
                    {myPollVote !== null && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'rgba(99,102,241,.12)', transition: 'width .6s ease' }} />}
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: chosen ? 'var(--accent2)' : 'var(--text1)', fontWeight: chosen ? '600' : '400' }}>{opt.text}</span>
                      {myPollVote !== null && <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent2)' }}>{pct}%</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
              {totalPollVotes} vote{totalPollVotes !== 1 ? 's' : ''} · {myPollVote === null ? 'Tap to vote' : 'Vote recorded ✓'}
            </div>
          </div>
        ) : isOwner ? (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', padding: '16px', marginBottom: '16px' }}>
            {!showCreatePoll ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '10px' }}>No poll yet. Create one to start the debate.</div>
                <button onClick={() => setShowCreatePoll(true)} style={{ padding: '8px 18px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ Create Poll</button>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>Create a Poll</div>
                <input value={pollForm.question} onChange={e => setPollForm(p => ({ ...p, question: e.target.value }))} placeholder="Ask a question…" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '10px' }} />
                {pollForm.options.map((opt, i) => (
                  <input key={i} value={opt} onChange={e => setPollForm(p => ({ ...p, options: p.options.map((o, j) => j === i ? e.target.value : o) }))} placeholder={`Option ${i + 1}`} style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '8px' }} />
                ))}
                {pollForm.options.length < 5 && (
                  <button onClick={() => setPollForm(p => ({ ...p, options: [...p.options, ''] }))} style={{ fontSize: '12px', color: 'var(--accent2)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px' }}>+ Add option</button>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowCreatePoll(false)} style={{ flex: 1, padding: '8px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={createPoll} style={{ flex: 2, padding: '8px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Create Poll</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', padding: '16px', marginBottom: '16px', textAlign: 'center', color: 'var(--text3)', fontSize: '13px' }}>
            No poll yet. The room owner will create one soon.
          </div>
        )}

        {/* Post take */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <textarea value={newTake} onChange={e => setNewTake(e.target.value)} placeholder={!joined ? 'Join the room to post your take' : closedDebate ? 'This debate has been closed' : 'Drop your hot take… 🔥'} disabled={!joined || closedDebate} rows={2}
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '10px', opacity: joined && !closedDebate ? 1 : 0.5 }} />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={postTake} disabled={!newTake.trim() || !joined || posting || closedDebate} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: !newTake.trim() || !joined || closedDebate ? .5 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
              {posting ? <><div className="spinner" />Posting…</> : 'Post take'}
            </button>
          </div>
        </div>

        {/* Moderation bar — owner only */}
        {isOwner && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button onClick={closeDebate} style={{ padding: '6px 14px', background: closedDebate ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.08)', border: `1px solid ${closedDebate ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}`, borderRadius: '8px', color: closedDebate ? 'var(--green)' : 'var(--red)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
              {closedDebate ? '✅ Debate Closed' : '🔒 Close Debate'}
            </button>
            {poll && (
              <button onClick={deletePoll} style={{ padding: '6px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '8px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑 Delete Poll
              </button>
            )}
          </div>
        )}

        {/* Closed debate banner */}
        {closedDebate && (
          <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--red)', fontWeight: '600' }}>
            🔒 This debate has been closed by the owner
          </div>
        )}

        {/* Sort */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {([['hot', '🔥 Hot'], ['new', '🆕 New'], ['top', '⬆️ Top']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSort(id)} style={{ padding: '5px 13px', borderRadius: '20px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: sort === id ? 'var(--accent)' : 'var(--bg3)', color: sort === id ? '#fff' : 'var(--text2)', border: `1px solid ${sort === id ? 'var(--accent)' : 'var(--border)'}`, fontFamily: 'inherit' }}>{label}</button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text3)', alignSelf: 'center' }}>{takes.length} take{takes.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div className="spinner" /> Loading takes…
          </div>
        )}

        {/* Empty */}
        {!loading && takes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔥</div>
            <div style={{ fontSize: '14px', color: 'var(--text2)' }}>No takes yet. Be the first!</div>
          </div>
        )}

        {sortedTakes.map(take => {
          const myVote = myVotes[take.id]
          const isPinned = pinnedTakeId === take.id
          const isWinner = (take as any).is_winner
          const isMyTake = take.user_id === currentUser.id
          return (
            <div key={take.id} style={{ background: isWinner ? 'linear-gradient(135deg, rgba(234,179,8,.08), rgba(234,179,8,.04))' : isPinned ? 'rgba(99,102,241,.06)' : 'var(--bg2)', border: `1px solid ${isWinner ? 'rgba(234,179,8,.3)' : isPinned ? 'rgba(99,102,241,.3)' : 'var(--border)'}`, borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
              {isPinned && <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600', marginBottom: '6px' }}>📌 Pinned by owner</div>}
              {isWinner && <div style={{ fontSize: '11px', color: 'var(--yellow)', fontWeight: '700', marginBottom: '6px' }}>🏆 Winner</div>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: getColor(take.profiles?.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                  {(take.profiles?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{take.profiles?.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(take.created_at)}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.65', marginBottom: '10px' }}>{take.content}</div>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => voteTake(take.id, 'up')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: `1px solid ${myVote === 'up' ? 'rgba(34,197,94,.3)' : 'var(--border)'}`, background: myVote === 'up' ? 'rgba(34,197,94,.1)' : 'none', color: myVote === 'up' ? 'var(--green)' : 'var(--text3)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>↑ {take.up_votes}</button>
                    <button onClick={() => voteTake(take.id, 'down')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: `1px solid ${myVote === 'down' ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, background: myVote === 'down' ? 'rgba(239,68,68,.1)' : 'none', color: myVote === 'down' ? 'var(--red)' : 'var(--text3)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>↓ {take.down_votes}</button>
                    <span style={{ fontSize: '11px', color: 'var(--text3)', marginLeft: '4px' }}>
                      {take.up_votes - take.down_votes > 0 ? '+' : ''}{take.up_votes - take.down_votes}
                    </span>
                    {/* Owner moderation actions */}
                    {isOwner && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
                        <button onClick={() => pinTake(take.id)} style={{ padding: '3px 8px', background: isPinned ? 'rgba(99,102,241,.15)' : 'none', border: `1px solid ${isPinned ? 'rgba(99,102,241,.3)' : 'var(--border)'}`, borderRadius: '6px', color: isPinned ? '#6366f1' : 'var(--text3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>📌</button>
                        <button onClick={() => markWinner(take.id)} style={{ padding: '3px 8px', background: isWinner ? 'rgba(234,179,8,.1)' : 'none', border: `1px solid ${isWinner ? 'rgba(234,179,8,.3)' : 'var(--border)'}`, borderRadius: '6px', color: isWinner ? 'var(--yellow)' : 'var(--text3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🏆</button>
                        <button onClick={() => deleteTake(take.id)} style={{ padding: '3px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--red)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑</button>
                      </div>
                    )}
                    {/* Own take — delete */}
                    {!isOwner && isMyTake && (
                      <button onClick={() => deleteTake(take.id)} style={{ marginLeft: 'auto', padding: '3px 8px', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text3)', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
