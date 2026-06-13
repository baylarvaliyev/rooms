'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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

export default function InvitePage({ invite, room, user, code }: any) {
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function acceptInvite() {
    if (!user) {
      router.push(`/login?redirect=/invite/${code}`)
      return
    }
    setJoining(true)
    // Check if already a member
    const { data: existing } = await supabase.from('room_members').select('id').eq('room_id', room.id).eq('user_id', user.id).single()
    if (!existing) {
      await supabase.from('room_members').insert({ room_id: room.id, user_id: user.id, role: 'member' })
      await supabase.from('rooms').update({ member_count: (room.member_count || 0) + 1 }).eq('id', room.id)
      await supabase.from('room_invites').update({ uses: (invite.uses || 0) + 1 }).eq('id', invite.id)
    }
    setJoined(true)
    setTimeout(() => router.push(`/rooms/${room.id}`), 1200)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '22px', color: '#fff', margin: '0 auto 10px' }}>R</div>
          <div style={{ fontSize: '13px', color: '#737373' }}>You've been invited to join a room on Rooms</div>
        </div>

        {/* Room card */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,.1)', borderRadius: '20px', overflow: 'hidden', marginBottom: '16px' }}>

          {/* Room banner */}
          <div style={{ height: '140px', background: ROOM_COLORS[room.category] || 'linear-gradient(135deg,#1a0a2e,#0a1a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', position: 'relative' }}>
            {room.emoji}
            <div style={{ position: 'absolute', bottom: '10px', left: '14px', padding: '3px 10px', background: 'rgba(0,0,0,.6)', borderRadius: '20px', fontSize: '11px', color: '#fff', fontWeight: '500' }}>
              {room.type} room
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{ fontWeight: '700', fontSize: '22px', color: '#fff', marginBottom: '6px' }}>{room.name}</div>
            {room.description && <div style={{ fontSize: '14px', color: '#a8a8a8', marginBottom: '14px', lineHeight: '1.5' }}>{room.description}</div>}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: '#fff' }}>{(room.member_count || 0).toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: '#737373' }}>Members</div>
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: '#fff' }}>{room.category}</div>
                <div style={{ fontSize: '11px', color: '#737373' }}>Category</div>
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '18px', color: '#fff' }}>{invite.uses || 0}</div>
                <div style={{ fontSize: '11px', color: '#737373' }}>Used</div>
              </div>
            </div>

            {joined ? (
              <div style={{ width: '100%', padding: '14px', background: 'rgba(34,197,94,.15)', border: '1px solid rgba(34,197,94,.3)', borderRadius: '12px', color: '#22c55e', fontWeight: '600', fontSize: '15px', textAlign: 'center' }}>
                ✓ Joined! Redirecting…
              </div>
            ) : (
              <button onClick={acceptInvite} disabled={joining} style={{ width: '100%', padding: '14px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: '700', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: joining ? .7 : 1, fontFamily: 'inherit' }}>
                {joining ? (
                  <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />Joining…</>
                ) : (
                  user ? `Join ${room.name}` : 'Sign in to Join'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <a href="/explore" style={{ fontSize: '13px', color: '#737373', textDecoration: 'none' }}>Browse all rooms on Rooms →</a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
