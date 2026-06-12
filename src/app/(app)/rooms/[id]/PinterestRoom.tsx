'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const SAMPLE_PINS = [
  { id: 1, emoji: '🌅', h: 220, c1: '#1a1a05', c2: '#3a3a10', cap: 'Golden Hour · Baku' },
  { id: 2, emoji: '🏔️', h: 160, c1: '#051a1a', c2: '#103a3a', cap: 'Mountain Vista' },
  { id: 3, emoji: '🌊', h: 195, c1: '#051020', c2: '#102040', cap: 'Ocean Blues' },
  { id: 4, emoji: '🌺', h: 175, c1: '#200510', c2: '#401020', cap: 'Bloom Season' },
  { id: 5, emoji: '🏙️', h: 240, c1: '#050510', c2: '#101030', cap: 'City Lights' },
  { id: 6, emoji: '🌿', h: 160, c1: '#051505', c2: '#103010', cap: 'Forest Path' },
  { id: 7, emoji: '🎨', h: 185, c1: '#15051a', c2: '#301040', cap: 'Abstract Study' },
  { id: 8, emoji: '☕', h: 155, c1: '#1a1005', c2: '#3a2010', cap: 'Morning Ritual' },
]

export default function PinterestRoom({ room, currentUser, isMember }: any) {
  const [pins, setPins] = useState(SAMPLE_PINS)
  const [joined, setJoined] = useState(isMember)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  async function joinRoom() {
    await supabase.from('room_members').insert({ room_id: room.id, user_id: currentUser.id, role: 'member' })
    setJoined(true)
  }

  function toggleSave(id: number) {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !joined) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${currentUser.id}/pin-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (!error && data) {
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(path)
      const newPin = {
        id: Date.now(),
        imageUrl: urlData.publicUrl,
        emoji: '📸',
        h: Math.floor(Math.random() * 100) + 160,
        c1: '#0a0a0a',
        c2: '#1a1a1a',
        cap: 'Your pin'
      }
      setPins(prev => [newPin as any, ...prev])
    }
    setUploading(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--bg1)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => router.push('/explore')} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '18px' }}>←</button>
        <div style={{ fontSize: '20px' }}>{room.emoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '7px' }}>{room.name} <span className="live-dot" /></div>
          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Visual board · {room.member_count} members</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {joined && (
            <>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ padding: '7px 14px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text2)', fontSize: '13px', cursor: 'pointer' }}
              >{uploading ? '…' : '📌 Add pin'}</button>
            </>
          )}
          {!joined
            ? <button onClick={joinRoom} style={{ padding: '7px 16px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>Join</button>
            : <div style={{ padding: '5px 12px', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--green)', fontWeight: '500' }}>✓ Joined</div>
          }
        </div>
      </div>

      {/* Masonry grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        <div style={{ columns: '3', columnGap: '10px' }}>
          {pins.map(pin => (
            <div
              key={pin.id}
              style={{
                breakInside: 'avoid', marginBottom: '10px',
                borderRadius: '12px', overflow: 'hidden',
                border: '1px solid var(--border)', position: 'relative',
                cursor: 'pointer', transition: 'transform .2s',
                display: 'block'
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.01)'
                const overlay = e.currentTarget.querySelector('.pin-overlay') as HTMLElement
                if (overlay) overlay.style.opacity = '1'
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLElement).style.transform = 'none'
                const overlay = e.currentTarget.querySelector('.pin-overlay') as HTMLElement
                if (overlay) overlay.style.opacity = '0'
              }}
            >
              {(pin as any).imageUrl ? (
                <img
                  src={(pin as any).imageUrl}
                  alt={pin.cap}
                  style={{ width: '100%', display: 'block', objectFit: 'cover' }}
                />
              ) : (
                <div style={{
                  height: `${pin.h}px`,
                  background: `linear-gradient(135deg, ${pin.c1}, ${pin.c2})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '48px'
                }}>{pin.emoji}</div>
              )}
              {/* Overlay */}
              <div className="pin-overlay" style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)',
                opacity: 0, transition: 'opacity .2s',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', padding: '10px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#fff', marginBottom: '6px' }}>{pin.cap}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); toggleSave(pin.id) }}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', border: 'none',
                      background: saved.has(pin.id) ? '#ef4444' : 'rgba(255,255,255,.2)',
                      color: '#fff', fontSize: '11px', cursor: 'pointer', fontWeight: '600'
                    }}
                  >{saved.has(pin.id) ? '❤️ Saved' : '🔖 Save'}</button>
                  <button style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,.2)', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>🔗</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}