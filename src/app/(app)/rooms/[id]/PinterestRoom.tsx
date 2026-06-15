'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function PinterestRoom({ room, currentUser, isMember }: any) {
  const [joined, setJoined] = useState(isMember)
  const [pins, setPins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [caption, setCaption] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [openPin, setOpenPin] = useState<any>(null)
  const [likedPins, setLikedPins] = useState<Set<string>>(new Set())
  const [savedPins, setSavedPins] = useState<Set<string>>(new Set())
  const [pinComments, setPinComments] = useState<Record<string, any[]>>({})
  const [commentInput, setCommentInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadPins()
    loadMyInteractions()

    const channel = supabase.channel(`pins:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_pins', filter: `room_id=eq.${room.id}` }, async (payload) => {
        if (payload.new.user_id === currentUser.id) return
        const { data } = await supabase.from('room_pins').select('*, profiles(name, username)').eq('id', payload.new.id).single()
        if (data) setPins(prev => [data, ...prev])
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'room_pins', filter: `room_id=eq.${room.id}` }, (payload) => {
        setPins(prev => prev.filter(p => p.id !== payload.old.id))
        if (openPin?.id === payload.old.id) setOpenPin(null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPins() {
    setLoading(true)
    const { data } = await supabase.from('room_pins').select('*, profiles(name, username)').eq('room_id', room.id).order('created_at', { ascending: false })
    setPins(data || [])
    setLoading(false)
  }

  async function loadMyInteractions() {
    // Load liked + saved pin IDs for current user
    const [{ data: liked }, { data: saved }] = await Promise.all([
      supabase.from('pin_likes').select('pin_id').eq('user_id', currentUser.id),
      supabase.from('pin_saves').select('pin_id').eq('user_id', currentUser.id),
    ])
    setLikedPins(new Set((liked || []).map((l: any) => l.pin_id)))
    setSavedPins(new Set((saved || []).map((s: any) => s.pin_id)))
  }

  async function openPinModal(pin: any) {
    setOpenPin(pin)
    // Load comments for this pin
    if (!pinComments[pin.id]) {
      const { data } = await supabase.from('pin_comments').select('*, profiles(name)').eq('pin_id', pin.id).order('created_at', { ascending: true })
      setPinComments(prev => ({ ...prev, [pin.id]: data || [] }))
    }
  }

  async function toggleLike(pinId: string) {
    const isLiked = likedPins.has(pinId)
    setLikedPins(prev => { const n = new Set(prev); isLiked ? n.delete(pinId) : n.add(pinId); return n })
    setPins(prev => prev.map(p => p.id === pinId ? { ...p, likes: (p.likes || 0) + (isLiked ? -1 : 1) } : p))
    if (openPin?.id === pinId) setOpenPin((p: any) => ({ ...p, likes: (p.likes || 0) + (isLiked ? -1 : 1) }))
    if (isLiked) {
      await supabase.from('pin_likes').delete().eq('pin_id', pinId).eq('user_id', currentUser.id)
    } else {
      await supabase.from('pin_likes').insert({ pin_id: pinId, user_id: currentUser.id })
    }
  }

  async function toggleSave(pinId: string) {
    const isSaved = savedPins.has(pinId)
    setSavedPins(prev => { const n = new Set(prev); isSaved ? n.delete(pinId) : n.add(pinId); return n })
    if (isSaved) {
      await supabase.from('pin_saves').delete().eq('pin_id', pinId).eq('user_id', currentUser.id)
    } else {
      await supabase.from('pin_saves').insert({ pin_id: pinId, user_id: currentUser.id })
    }
  }

  async function postComment(pinId: string) {
    if (!commentInput.trim()) return
    const { data } = await supabase.from('pin_comments').insert({ pin_id: pinId, user_id: currentUser.id, content: commentInput.trim() }).select('*, profiles(name)').single()
    if (data) {
      setPinComments(prev => ({ ...prev, [pinId]: [...(prev[pinId] || []), data] }))
      setCommentInput('')
    }
  }

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { alert('Image must be under 10MB'); return }
    setFile(f)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  async function uploadPin() {
    if (!file || !joined) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `pins/${room.id}/${currentUser.id}-${Date.now()}.${ext}`
    const { data: uploadData, error } = await supabase.storage.from('posts').upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { alert('Upload failed'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
    const { data: newPin } = await supabase.from('room_pins').insert({
      room_id: room.id, user_id: currentUser.id,
      image_url: urlData.publicUrl, caption: caption.trim()
    }).select('*, profiles(name, username)').single()
    if (newPin) setPins(prev => [newPin, ...prev])
    setFile(null); setPreview(null); setCaption(''); setShowUpload(false); setUploading(false)
  }

  async function deletePin(pinId: string) {
    if (!confirm('Delete this pin?')) return
    await supabase.from('room_pins').delete().eq('id', pinId).eq('user_id', currentUser.id)
    if (openPin?.id === pinId) setOpenPin(null)
  }

  function cancelUpload() {
    setFile(null); setPreview(null); setCaption(''); setShowUpload(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px', minWidth: '36px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>{room.name} <span className="live-dot" /></div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Visual board · {pins.length} pin{pins.length !== 1 ? 's' : ''}</div>
        </div>
        {joined && <button onClick={() => setShowUpload(true)} style={{ padding: '7px 13px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer' }}>📌 Add pin</button>}
        {!joined
          ? <button onClick={joinRoom} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
          : <div style={{ padding: '5px 10px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓</div>
        }
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && cancelUpload()}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }} className="fade-up">
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px' }}>Add a Pin</div>
            {!preview ? (
              <div onClick={() => fileInputRef.current?.click()} style={{ height: '200px', border: '2px dashed var(--border2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '10px', marginBottom: '14px' }}>
                <span style={{ fontSize: '36px' }}>📷</span>
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>Click to choose an image</span>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>JPG, PNG up to 10MB</span>
              </div>
            ) : (
              <div style={{ position: 'relative', marginBottom: '14px', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={preview} alt="Preview" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }} />
                <button onClick={() => { setPreview(null); setFile(null); if (fileInputRef.current) fileInputRef.current.value = '' }} style={{ position: 'absolute', top: '8px', right: '8px', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Add a caption… (optional)" style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 13px', color: 'var(--text1)', fontSize: '13px', outline: 'none', fontFamily: 'inherit', marginBottom: '14px' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={cancelUpload} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text2)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button onClick={uploadPin} disabled={!file || uploading} style={{ flex: 2, padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '600', opacity: !file || uploading ? .5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {uploading ? <><div className="spinner" />Uploading…</> : '📌 Pin it'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin detail modal — bottom sheet on mobile, side panel on desktop */}
      {openPin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(12px)', zIndex: 900, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setOpenPin(null)}>

          {/* Sheet */}
          <div style={{ background: 'var(--bg2)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '680px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="fade-up">

            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--bg5, #333)' }} />
            </div>

            {/* Author + close */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 16px 10px', flexShrink: 0 }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getColor(openPin.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                {(openPin.profiles?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text1)' }}>{openPin.profiles?.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{timeAgo(openPin.created_at)}</div>
              </div>
              {openPin.user_id === currentUser.id && (
                <button onClick={() => deletePin(openPin.id)} style={{ padding: '5px 12px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: '8px', color: 'var(--red)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              )}
              <button onClick={() => setOpenPin(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '4px', flexShrink: 0 }}>×</button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

              {/* Image — full width */}
              <div style={{ background: '#000', width: '100%' }}>
                <img src={openPin.image_url} alt={openPin.caption || 'Pin'} style={{ width: '100%', maxHeight: '70vw', objectFit: 'contain', display: 'block' }} />
              </div>

              {/* Caption */}
              {openPin.caption && (
                <div style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text1)', lineHeight: '1.5', borderBottom: '1px solid var(--border)' }}>{openPin.caption}</div>
              )}

              {/* Like + Save */}
              <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => toggleLike(openPin.id)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${likedPins.has(openPin.id) ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, background: likedPins.has(openPin.id) ? 'rgba(239,68,68,.1)' : 'var(--bg3)', color: likedPins.has(openPin.id) ? 'var(--red)' : 'var(--text2)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
                  {likedPins.has(openPin.id) ? '❤️' : '🤍'} {openPin.likes || 0}
                </button>
                <button onClick={() => toggleSave(openPin.id)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `1px solid ${savedPins.has(openPin.id) ? 'rgba(234,179,8,.3)' : 'var(--border)'}`, background: savedPins.has(openPin.id) ? 'rgba(234,179,8,.08)' : 'var(--bg3)', color: savedPins.has(openPin.id) ? 'var(--yellow)' : 'var(--text2)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontFamily: 'inherit' }}>
                  🔖 {savedPins.has(openPin.id) ? 'Saved' : 'Save'}
                </button>
              </div>

              {/* Comments */}
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(pinComments[openPin.id] || []).length === 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', padding: '16px 0' }}>No comments yet. Be first!</div>
                )}
                {(pinComments[openPin.id] || []).map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: getColor(c.profiles?.name || 'U'), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#fff' }}>
                      {(c.profiles?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text1)', lineHeight: '1.5' }}>
                      <span style={{ fontWeight: '600', marginRight: '6px' }}>{c.profiles?.name}</span>
                      {c.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comment input — pinned to bottom */}
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0, background: 'var(--bg2)', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
              <input value={commentInput} onChange={e => setCommentInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && postComment(openPin.id)} placeholder="Add a comment…" style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '24px', padding: '9px 16px', color: 'var(--text1)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
              <button onClick={() => postComment(openPin.id)} disabled={!commentInput.trim()} style={{ padding: '9px 16px', background: 'var(--accent)', border: 'none', borderRadius: '24px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', opacity: !commentInput.trim() ? .5 : 1, fontFamily: 'inherit' }}>Post</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><div className="spinner" /> Loading pins…</div>}

        {!loading && pins.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📌</div>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text2)', marginBottom: '6px' }}>No pins yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>{joined ? 'Be the first to add a pin!' : 'Join to start pinning.'}</div>
            {joined && <button onClick={() => setShowUpload(true)} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📌 Add first pin</button>}
            {!joined && <button onClick={joinRoom} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join Room</button>}
          </div>
        )}

        {!loading && pins.length > 0 && (
          <div style={{ columns: 'auto', columnWidth: '140px', columnGap: '8px' }}>
            {pins.map(pin => (
              <div key={pin.id} onClick={() => openPinModal(pin)} style={{ breakInside: 'avoid', marginBottom: '10px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', display: 'block', background: 'var(--bg2)', transition: 'transform .2s' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)'; const o = e.currentTarget.querySelector('.pin-overlay') as HTMLElement; if (o) o.style.opacity = '1' }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; const o = e.currentTarget.querySelector('.pin-overlay') as HTMLElement; if (o) o.style.opacity = '0' }}
              >
                <img src={pin.image_url} alt={pin.caption || 'Pin'} style={{ width: '100%', maxHeight: '320px', display: 'block', objectFit: 'cover' }} loading="lazy" />
                <div className="pin-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 55%)', opacity: 0, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px' }}>
                  {pin.caption && <div style={{ fontSize: '12px', fontWeight: '500', color: '#fff', marginBottom: '5px' }}>{pin.caption}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.75)' }}>{likedPins.has(pin.id) ? '❤️' : '🤍'} {pin.likes || 0}</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.75)' }}>💬</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.6)', marginLeft: 'auto' }}>{pin.profiles?.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
