'use client'

import { useState, useRef, useEffect } from 'react'
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
  if (s < 86400) return `${Math.floor(s/3600)}h ago`
  return `${Math.floor(s/86400)}d ago`
}

export default function FeedClient({ posts: initialPosts, likedIds, savedIds, profile, rooms, currentUserId, isNewUser, suggestedRooms }: any) {
  const [posts, setPosts] = useState(initialPosts)
  const [liked, setLiked] = useState<Set<string>>(new Set(likedIds))
  const [saved, setSaved] = useState<Set<string>>(new Set(savedIds))
  const [openComments, setOpenComments] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, any[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [postForm, setPostForm] = useState({ content: '', room_id: rooms[0]?.id || '', type: 'post' })
  const [posting, setPosting] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialPosts.length === 30)
  const [page, setPage] = useState(0)
  // Poll state
  const [postType, setPostType] = useState<'post' | 'poll'>('post')
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({}) // pollId -> optionIndex voted
  const [reporting, setReporting] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore()
      },
      { threshold: 0.1 }
    )
    if (bottomRef.current) observer.observe(bottomRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, posts])

  async function loadMore() {
    setLoadingMore(true)
    const nextPage = page + 1
    const from = nextPage * 30
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)')
      .order('created_at', { ascending: false })
      .range(from, from + 29)
    if (data && data.length > 0) {
      setPosts((prev: any[]) => [...prev, ...data])
      setPage(nextPage)
      if (data.length < 30) setHasMore(false)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10MB'); return }
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function toggleLike(postId: string) {
    const isLiked = liked.has(postId)
    const post = posts.find((p: any) => p.id === postId)
    setLiked(prev => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n })
    setPosts((prev: any[]) => prev.map(p => p.id === postId ? { ...p, like_count: p.like_count + (isLiked ? -1 : 1) } : p))
    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
      await supabase.from('posts').update({ like_count: Math.max(0, (post?.like_count || 1) - 1) }).eq('id', postId)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId })
      await supabase.from('posts').update({ like_count: (post?.like_count || 0) + 1 }).eq('id', postId)
    }
  }

  async function toggleSave(postId: string) {
    const isSaved = saved.has(postId)
    setSaved(prev => { const n = new Set(prev); isSaved ? n.delete(postId) : n.add(postId); return n })
    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', currentUserId)
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUserId })
    }
  }

  async function toggleComments(postId: string) {
    setOpenComments(prev => { const n = new Set(prev); n.has(postId) ? n.delete(postId) : n.add(postId); return n })
    if (!comments[postId]) {
      const { data } = await supabase.from('comments').select('*, profiles(name)').eq('post_id', postId).order('created_at', { ascending: true })
      setComments(prev => ({ ...prev, [postId]: data || [] }))
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return
    await supabase.from('posts').delete().eq('id', postId).eq('user_id', currentUserId)
    setPosts((prev: any[]) => prev.filter((p: any) => p.id !== postId))
  }

  async function submitReport(postId: string) {
    if (!reportReason.trim()) return
    await supabase.from('reports').insert({
      reporter_id: currentUserId,
      post_id: postId,
      reason: reportReason
    })
    setReporting(null)
    setReportReason('')
    alert('Report submitted. Thank you.')
  }

  async function submitComment(postId: string) {
    const text = commentInput[postId]?.trim()
    if (!text) return
    const { data } = await supabase.from('comments').insert({ post_id: postId, user_id: currentUserId, content: text }).select('*, profiles(name)').single()
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }))
      setCommentInput(prev => ({ ...prev, [postId]: '' }))
      setPosts((prev: any[]) => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
    }
  }

  async function createPost() {
    if (!postForm.content.trim() || !postForm.room_id) return
    setPosting(true)

    if (postType === 'poll') {
      const validOptions = pollOptions.filter(o => o.trim())
      if (!pollQuestion.trim() || validOptions.length < 2) { setPosting(false); return }
      const { data: post } = await supabase.from('posts').insert({
        content: postForm.content, room_id: postForm.room_id, user_id: currentUserId, type: 'poll'
      }).select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)').single()
      if (post) {
        await supabase.from('polls').insert({ post_id: post.id, question: pollQuestion, options: validOptions.map(o => ({ text: o, votes: 0 })) })
        setPosts((prev: any[]) => [post, ...prev])
      }
      setPostForm({ content: '', room_id: rooms[0]?.id || '', type: 'post' })
      setPollQuestion(''); setPollOptions(['', '']); setPostType('post'); setCreating(false)
      setPosting(false); return
    }

    let mediaUrl = ''
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${currentUserId}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage.from('posts').upload(path, imageFile, { cacheControl: '3600', upsert: false })
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
        mediaUrl = urlData.publicUrl
      }
    }
    const { data } = await supabase.from('posts').insert({
      content: postForm.content, room_id: postForm.room_id, user_id: currentUserId,
      type: imageFile ? 'photo' : 'post', media_url: mediaUrl,
    }).select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)').single()
    if (data) {
      setPosts((prev: any[]) => [data, ...prev])
      setPostForm({ content: '', room_id: rooms[0]?.id || '', type: 'post' })
      setImageFile(null); setImagePreview(null); setCreating(false)
    }
    setPosting(false)
  }

  async function votePoll(pollId: string, postId: string, optionIndex: number, currentOptions: any[]) {
    const prevVote = pollVotes[pollId]
    setPollVotes(prev => ({ ...prev, [pollId]: optionIndex }))
    // Update local post poll data optimistically
    setPosts((prev: any[]) => prev.map(p => {
      if (p.id !== postId || !p._poll) return p
      const newOptions = p._poll.options.map((o: any, i: number) => ({
        ...o,
        votes: i === optionIndex ? o.votes + 1 : (i === prevVote ? o.votes - 1 : o.votes)
      }))
      return { ...p, _poll: { ...p._poll, options: newOptions } }
    }))
    if (prevVote !== undefined) {
      await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', currentUserId)
    }
    await supabase.from('poll_votes').insert({ poll_id: pollId, user_id: currentUserId, option_index: optionIndex })
  }

  async function loadPollData(postId: string) {
    const { data: poll } = await supabase.from('polls').select('*').eq('post_id', postId).single()
    if (!poll) return
    const { data: votes } = await supabase.from('poll_votes').select('*').eq('poll_id', poll.id)
    const { data: myVote } = await supabase.from('poll_votes').select('option_index').eq('poll_id', poll.id).eq('user_id', currentUserId).single()
    // Count votes per option
    const counts: number[] = poll.options.map((_: any) => 0)
    ;(votes || []).forEach((v: any) => { if (counts[v.option_index] !== undefined) counts[v.option_index]++ })
    const optionsWithVotes = poll.options.map((o: any, i: number) => ({ ...o, votes: counts[i] }))
    if (myVote) setPollVotes(prev => ({ ...prev, [poll.id]: myVote.option_index }))
    setPosts((prev: any[]) => prev.map(p => p.id === postId ? { ...p, _poll: { ...poll, options: optionsWithVotes } } : p))
  }

  const name = profile?.name || 'You'
  const color = getColor(name)

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Create post box */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', padding: '14px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div onClick={() => setCreating(true)} style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '9px 16px', fontSize: '13px', color: 'var(--text3)', cursor: 'pointer' }}>
              What&apos;s on your mind, {name.split(' ')[0]}?
            </div>
            <button onClick={() => setCreating(true)} style={{ padding: '8px 14px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}>Post</button>
          </div>
        </div>

        {/* New user banner */}
        {isNewUser && posts.length > 0 && (
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,.12), rgba(168,85,247,.08))', border: '1px solid rgba(99,102,241,.25)', borderRadius: '13px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '5px' }}>👋 Welcome to Rooms!</div>
            <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px', lineHeight: '1.6' }}>You&apos;re seeing trending posts. Join rooms to personalise your feed.</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {suggestedRooms.slice(0, 3).map((r: any) => (
                <button key={r.id} onClick={() => router.push(`/rooms/${r.id}`)} style={{ padding: '6px 13px', background: 'rgba(99,102,241,.1)', border: '1px solid rgba(99,102,241,.28)', borderRadius: '20px', color: 'var(--accent2)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                  {r.emoji} {r.name}
                </button>
              ))}
              <button onClick={() => router.push('/explore')} style={{ padding: '6px 13px', background: 'var(--accent)', border: 'none', borderRadius: '20px', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>Browse all →</button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✨</div>
            <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '6px', color: 'var(--text2)' }}>Your feed is empty</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>Join some rooms and start posting!</div>
            <button onClick={() => router.push('/explore')} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Explore Rooms</button>
          </div>
        )}

        {/* Posts */}
        {posts.map((post: any, idx: number) => {
          const posterName = post.profiles?.name || 'Unknown'
          const posterColor = getColor(posterName)
          const isLiked = liked.has(post.id)
          const isSaved = saved.has(post.id)
          const showComments = openComments.has(post.id)
          return (
            <div key={post.id} className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '13px', marginBottom: '14px', overflow: 'hidden', animationDelay: `${idx * 0.04}s` }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 14px 0' }}>
                <div onClick={() => router.push(`/users/${post.profiles?.username}`)} style={{ width: '36px', height: '36px', borderRadius: '50%', background: post.profiles?.avatar_url ? 'none' : posterColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}>
                  {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : posterName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div onClick={() => router.push(`/users/${post.profiles?.username}`)} style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', cursor: 'pointer' }}>{posterName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {post.rooms && <span onClick={() => router.push(`/rooms/${post.room_id}`)} style={{ fontSize: '11px', color: 'var(--accent2)', cursor: 'pointer' }}>{post.rooms.emoji} {post.rooms.name}</span>}
                    <span style={{ fontSize: '11px', color: 'var(--text3)' }}>· {timeAgo(post.created_at)}</span>
                  </div>
                </div>
                {post.user_id === currentUserId && (
                  <button onClick={() => deletePost(post.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '4px', fontSize: '14px', borderRadius: '6px', transition: 'color .18s' }}
                    onMouseOver={e => (e.currentTarget as HTMLElement).style.color = 'var(--red)'}
                    onMouseOut={e => (e.currentTarget as HTMLElement).style.color = 'var(--text3)'}
                  >🗑</button>
                )}
              </div>

              {/* Content */}
              {post.content && <div style={{ padding: '10px 14px', fontSize: '14px', color: 'var(--text2)', lineHeight: '1.65', whiteSpace: 'pre-wrap' }}>{post.content}</div>}
              {post.media_url && <img src={post.media_url} alt="" style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />}

              {/* Poll */}
              {post.type === 'poll' && (
                <PollBlock
                  post={post}
                  pollVotes={pollVotes}
                  onLoad={() => loadPollData(post.id)}
                  onVote={(pollId: string, optIdx: number, opts: any[]) => votePoll(pollId, post.id, optIdx, opts)}
                />
              )}

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '7px 10px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => toggleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'none', color: isLiked ? 'var(--red)' : 'var(--text3)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', transition: 'all .18s' }}>
                  {isLiked ? '❤️' : '🤍'} {post.like_count}
                </button>
                <button onClick={() => toggleComments(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'none', color: showComments ? 'var(--accent2)' : 'var(--text3)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  💬 {post.comment_count}
                </button>
                <button onClick={() => toggleSave(post.id)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'none', color: isSaved ? 'var(--yellow)' : 'var(--text3)', fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                  🔖 {isSaved ? 'Saved' : 'Save'}
                </button>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                  <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/feed`)} style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'none', color: 'var(--text3)', fontSize: '13px', cursor: 'pointer' }}>🔗</button>
                  {post.user_id !== currentUserId && (
                    <button onClick={() => { setReporting(post.id); setReportReason('') }} style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'none', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer' }} title="Report post">⚑</button>
                  )}
                </div>
              </div>

              {/* Comments */}
              {showComments && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{ padding: '8px 14px' }}>
                    {(comments[post.id] || []).length === 0 && <div style={{ fontSize: '12px', color: 'var(--text3)', padding: '6px 0' }}>No comments yet. Be the first!</div>}
                    {(comments[post.id] || []).map((c: any) => (
                      <div key={c.id} style={{ display: 'flex', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: getColor(c.profiles?.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff' }}>{(c.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                        <div><span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)', marginRight: '6px' }}>{c.profiles?.name}</span><span style={{ fontSize: '13px', color: 'var(--text2)' }}>{c.content}</span></div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '9px 14px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>{name.charAt(0).toUpperCase()}</div>
                    <input value={commentInput[post.id] || ''} onChange={e => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && submitComment(post.id)} placeholder="Add a comment…" style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '7px 14px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                    <button onClick={() => submitComment(post.id)} style={{ background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}>Post</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Infinite scroll sentinel */}
        <div ref={bottomRef} style={{ height: '1px' }} />

        {/* Loading more */}
        {loadingMore && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div className="spinner" /> Loading more…
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text3)', fontSize: '12px' }}>
            You&apos;re all caught up ✨
          </div>
        )}

      </div>

      {/* Report Modal */}
      {reporting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setReporting(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '6px' }}>Report Post</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>Why are you reporting this post?</div>
            <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
              {['Spam', 'Harassment', 'Misinformation', 'Inappropriate content', 'Other'].map(r => (
                <div key={r} onClick={() => setReportReason(r)} style={{ padding: '10px 14px', borderRadius: '9px', cursor: 'pointer', border: `1px solid ${reportReason === r ? 'var(--accent)' : 'var(--border)'}`, background: reportReason === r ? 'var(--accentbg)' : 'var(--bg3)', color: reportReason === r ? 'var(--accent2)' : 'var(--text2)', fontSize: '13px', transition: 'all .18s' }}>
                  {r}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setReporting(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={() => submitReport(reporting)} disabled={!reportReason} style={{ flex: 1, padding: '10px', background: 'var(--red)', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: !reportReason ? .5 : 1 }}>Submit Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Post Modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={e => e.target === e.currentTarget && setCreating(false)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '500px' }} className="fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ fontWeight: '700', fontSize: '16px' }}>Create Post</div>
              <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>{name.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>{name}</div>
                <select value={postForm.room_id} onChange={e => setPostForm(prev => ({ ...prev, room_id: e.target.value }))} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', color: 'var(--accent2)', fontSize: '12px', outline: 'none', cursor: 'pointer', marginTop: '2px' }}>
                  {rooms.length === 0 && <option value="">No rooms — join one first</option>}
                  {rooms.map((r: any) => <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>)}
                </select>
              </div>
            </div>
            {/* Post type toggle */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {(['post', 'poll'] as const).map(t => (
                <button key={t} onClick={() => setPostType(t)} style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${postType === t ? 'var(--accent)' : 'var(--border)'}`, background: postType === t ? 'var(--accent)' : 'var(--bg3)', color: postType === t ? '#fff' : 'var(--text2)', fontSize: '12px', fontWeight: '500', cursor: 'pointer' }}>
                  {t === 'post' ? '📝 Post' : '📊 Poll'}
                </button>
              ))}
            </div>

            <textarea value={postForm.content} onChange={e => setPostForm(prev => ({ ...prev, content: e.target.value }))} placeholder={postType === 'poll' ? 'Context for your poll (optional)…' : "What's on your mind?"} rows={3} autoFocus style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'var(--text1)', fontSize: '14px', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: '1.6', marginBottom: '10px' }} />

            {/* Poll builder */}
            {postType === 'poll' && (
              <div style={{ marginBottom: '12px' }}>
                <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Ask a question…" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--accentbdr, rgba(99,102,241,.28))', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '8px' }} />
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <input value={opt} onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))} placeholder={`Option ${i + 1}`} style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button onClick={() => setPollOptions(prev => [...prev, ''])} style={{ padding: '6px 13px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer' }}>+ Add option</button>
                )}
              </div>
            )}

            {/* Image upload (only for regular posts) */}
            {postType === 'post' && (<>
            {imagePreview && (
              <div style={{ position: 'relative', marginBottom: '10px', borderRadius: '10px', overflow: 'hidden' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }} />
                <button onClick={removeImage} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '12px', cursor: 'pointer' }}>📷 Add photo</button>
            </div>
            </>)}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={createPost} disabled={!postForm.content.trim() || !postForm.room_id || posting} style={{ flex: 2, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: !postForm.content.trim() || posting ? .6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {posting ? <><div className="spinner" />Posting…</> : '✓ Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PollBlock({ post, pollVotes, onLoad, onVote }: any) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) { onLoad(); setLoaded(true) }
  }, [])

  const poll = post._poll
  if (!poll) return <div style={{ padding: '14px', color: 'var(--text3)', fontSize: '13px' }}>Loading poll…</div>

  const totalVotes = poll.options.reduce((a: number, o: any) => a + (o.votes || 0), 0)
  const myVote = pollVotes[poll.id]
  const hasVoted = myVote !== undefined

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text1)', marginBottom: '10px' }}>📊 {poll.question}</div>
      {poll.options.map((opt: any, i: number) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
        const chosen = myVote === i
        return (
          <div key={i} onClick={() => !hasVoted && onVote(poll.id, i, poll.options)} style={{ marginBottom: '7px', cursor: hasVoted ? 'default' : 'pointer' }}>
            <div style={{ padding: '9px 13px', borderRadius: '9px', position: 'relative', overflow: 'hidden', border: `1px solid ${chosen ? 'rgba(99,102,241,.4)' : 'var(--border)'}`, background: chosen ? 'rgba(99,102,241,.08)' : 'var(--bg3)', transition: 'all .18s' }}>
              {hasVoted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'rgba(99,102,241,.1)', transition: 'width .6s ease' }} />}
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: chosen ? 'var(--accent2)' : 'var(--text1)', fontWeight: chosen ? '600' : '400' }}>{opt.text}</span>
                {hasVoted && <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent2)' }}>{pct}%</span>}
              </div>
            </div>
          </div>
        )
      })}
      <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
        {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {hasVoted ? 'You voted' : 'Tap to vote'}
      </div>
    </div>
  )
}
