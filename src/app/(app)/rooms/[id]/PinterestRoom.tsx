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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadPins()

    // Real-time new pins
    const channel = supabase.channel(`pins:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'room_pins',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        const { data } = await supabase
          .from('room_pins')
          .select('*, profiles(name, username)')
          .eq('id', payload.new.id)
          .single()
        if (data) setPins(prev => [data, ...prev])
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'room_pins',
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        setPins(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPins() {
    setLoading(true)
    const { data } = await supabase
      .from('room_pins')
      .select('*, profiles(name, username)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
    setPins(data || [])
    setLoading(false)
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
    const { data: uploadData, error } = await supabase.storage
      .from('posts')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (error) { alert('Upload failed'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
    await supabase.from('room_pins').insert({
      room_id: room.id,
      user_id: currentUser.id,
      image_url: urlData.publicUrl,
      caption: caption.trim()
    })
    setFile(null)
    setPreview(null)
    setCaption('')
    setShowUpload(false)
    setUploading(false)
  }

  async function deletePin(pinId: string) {
    if (!confirm('Delete this pin?')) return
    await supabase.from('room_pins').delete().eq('id', pinId).eq('user_id', currentUser.id)
  }

  function cancelUpload() {
    setFile(null)
    setPreview(null)
    setCaption('')
    setShowUpload(false)
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
        {joined && (
          <button onClick={() => setShowUpload(true)} style={{ padding: '7px 13px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            📌 Add pin
          </button>
        )}
        {!joined
          ? <button onClick={joinRoom} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
          : <div style={{ padding: '5px 10px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓</div>
        }
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => e.target === e.currentTarget && cancelUpload()}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px' }} className="fade-up">
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '16px' }}>Add a Pin</div>

            {!preview ? (
              <div onClick={() => fileInputRef.current?.click()} style={{ height: '200px', border: '2px dashed var(--border2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: '10px', marginBottom: '14px', transition: 'border-color .2s' }}
                onMouseOver={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent2)'}
                onMouseOut={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'}
              >
                <span style={{ fontSize: '36px' }}>📷</span>
                <span style={{ fontSize: '13px', color: 'var(--text3)' }}>Click to choose an image</span>
                <span style={{ fontSize: '11px', color: 'var(--text3)' }}>JPG, PNG, GIF up to 10MB</span>
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div className="spinner" /> Loading pins…
          </div>
        )}

        {!loading && pins.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📌</div>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text2)', marginBottom: '6px' }}>No pins yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>
              {joined ? 'Be the first to add a pin!' : 'Join the room to start pinning.'}
            </div>
            {joined && (
              <button onClick={() => setShowUpload(true)} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>📌 Add first pin</button>
            )}
            {!joined && (
              <button onClick={joinRoom} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join Room</button>
            )}
          </div>
        )}

        {/* Masonry grid */}
        {!loading && pins.length > 0 && (
          <div style={{ columns: '2', columnGap: '10px' }}>
            {pins.map(pin => (
              <div key={pin.id} style={{ breakInside: 'avoid', marginBottom: '10px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', display: 'block', background: 'var(--bg2)' }}
                onMouseOver={e => {
                  const overlay = e.currentTarget.querySelector('.pin-overlay') as HTMLElement
                  if (overlay) overlay.style.opacity = '1'
                }}
                onMouseOut={e => {
                  const overlay = e.currentTarget.querySelector('.pin-overlay') as HTMLElement
                  if (overlay) overlay.style.opacity = '0'
                }}
              >
                <img src={pin.image_url} alt={pin.caption || 'Pin'} style={{ width: '100%', display: 'block', objectFit: 'cover' }} loading="lazy" />

                {/* Overlay */}
                <div className="pin-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, transparent 50%)', opacity: 0, transition: 'opacity .2s', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '10px' }}>
                  {pin.caption && (
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#fff', marginBottom: '6px', lineHeight: '1.4' }}>{pin.caption}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: getColor(pin.profiles?.name || 'U'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '700', color: '#fff' }}>
                        {(pin.profiles?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.8)' }}>{pin.profiles?.name}</span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,.5)' }}>· {timeAgo(pin.created_at)}</span>
                    </div>
                    {pin.user_id === currentUser.id && (
                      <button onClick={e => { e.stopPropagation(); deletePin(pin.id) }} style={{ padding: '3px 8px', borderRadius: '6px', border: 'none', background: 'rgba(239,68,68,.7)', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                    )}
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
