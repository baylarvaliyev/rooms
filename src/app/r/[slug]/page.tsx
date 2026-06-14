import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Metadata } from 'next'

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

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: room } = await supabase.from('rooms').select('name, description, emoji, category').eq('slug', slug).single()
  if (!room) return { title: 'Room not found · Rooms' }
  return {
    title: `${room.emoji} ${room.name} · Rooms`,
    description: room.description || `Join ${room.name} on Rooms — a live ${room.category} community.`,
    openGraph: { title: `${room.emoji} ${room.name}`, description: room.description || `A live ${room.category} community on Rooms`, type: 'website' },
  }
}

export default async function PublicRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: room } = await supabase.from('rooms').select('*, profiles(name, username)').eq('slug', slug).single()

  if (!room) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ fontSize: '48px' }}>🔍</div>
        <div style={{ fontWeight: '700', fontSize: '22px', color: '#fff' }}>Room not found</div>
        <a href="/explore" style={{ padding: '10px 24px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Browse Rooms</a>
      </div>
    )
  }

  const [{ data: recentMessages }, { data: schedules }, { data: { user } }] = await Promise.all([
    room.is_private ? Promise.resolve({ data: [] }) : supabase.from('messages').select('content, created_at, profiles(name)').eq('room_id', room.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('room_schedules').select('*').eq('room_id', room.id).gte('starts_at', new Date().toISOString()).order('starts_at').limit(3),
    supabase.auth.getUser(),
  ])

  const isLoggedIn = !!user

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Cover */}
      <div style={{ height: '200px', background: room.cover_url ? 'none' : (ROOM_COLORS[room.category] || '#111'), position: 'relative', overflow: 'hidden' }}>
        {room.cover_url && <img src={room.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.85))' }} />
        <a href="/" style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px', color: '#fff' }}>R</div>
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '15px' }}>Rooms</span>
        </a>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 16px 48px' }}>
        {/* Room identity */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', marginTop: '-36px', marginBottom: '16px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '16px', border: '3px solid #000', overflow: 'hidden', background: ROOM_COLORS[room.category] || '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>
            {room.icon_url ? <img src={room.icon_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : room.emoji}
          </div>
          <div style={{ flex: 1, paddingBottom: '4px' }}>
            <div style={{ fontWeight: '800', fontSize: '22px', color: '#fff' }}>{room.name}</div>
            <div style={{ fontSize: '13px', color: '#737373' }}>{room.category} · {room.type} room {room.is_private ? '· 🔒 Private' : ''}</div>
          </div>
        </div>

        {room.description && <div style={{ fontSize: '15px', color: '#a8a8a8', lineHeight: '1.6', marginBottom: '20px' }}>{room.description}</div>}

        {/* Stats */}
        <div style={{ display: 'flex', gap: '28px', marginBottom: '24px', padding: '16px', background: '#111', borderRadius: '12px', border: '1px solid #222' }}>
          <div><div style={{ fontWeight: '700', fontSize: '22px', color: '#fff' }}>{(room.member_count || 0).toLocaleString()}</div><div style={{ fontSize: '12px', color: '#737373' }}>Members</div></div>
          {(room.follower_count || 0) > 0 && <div><div style={{ fontWeight: '700', fontSize: '22px', color: '#fff' }}>{room.follower_count.toLocaleString()}</div><div style={{ fontSize: '12px', color: '#737373' }}>Followers</div></div>}
          <div><div style={{ fontWeight: '700', fontSize: '22px', color: '#fff' }}>{room.type}</div><div style={{ fontSize: '12px', color: '#737373' }}>Room type</div></div>
          <div><div style={{ fontWeight: '700', fontSize: '22px', color: '#fff' }}>{room.is_private ? '🔒' : '🌐'}</div><div style={{ fontSize: '12px', color: '#737373' }}>{room.is_private ? 'Private' : 'Public'}</div></div>
        </div>

        {/* CTA */}
        <a href={isLoggedIn ? `/rooms/${room.id}` : `/login?redirect=/rooms/${room.id}`} style={{ display: 'block', padding: '15px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', borderRadius: '12px', color: '#fff', fontWeight: '700', fontSize: '16px', textAlign: 'center', textDecoration: 'none', marginBottom: '28px' }}>
          {room.join_mode === 'invite_only' ? '🔒 Invite Only' : room.join_mode === 'request' ? '✋ Request to Join' : `Join ${room.name} →`}
        </a>

        {/* Upcoming events */}
        {schedules && schedules.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#fff', marginBottom: '12px' }}>📅 Upcoming Events</div>
            {schedules.map((s: any) => (
              <div key={s.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '14px', marginBottom: '10px' }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: '#fff', marginBottom: '4px' }}>{s.title}</div>
                {s.description && <div style={{ fontSize: '13px', color: '#737373', marginBottom: '6px' }}>{s.description}</div>}
                <div style={{ fontSize: '12px', color: '#e1306c' }}>
                  {new Date(s.starts_at).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {s.is_recurring && ` · Every ${s.recurrence}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent chat preview */}
        {!room.is_private && recentMessages && recentMessages.length > 0 && (
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px', color: '#fff', marginBottom: '12px' }}>💬 Recent Activity</div>
            <div style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '16px' }}>
              {[...recentMessages].reverse().map((m: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#333', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>{(m.profiles?.name || 'U').charAt(0).toUpperCase()}</div>
                  <div style={{ fontSize: '13px' }}><span style={{ fontWeight: '600', color: '#fff', marginRight: '6px' }}>{m.profiles?.name}</span><span style={{ color: '#a8a8a8' }}>{m.content}</span></div>
                </div>
              ))}
              <a href={isLoggedIn ? `/rooms/${room.id}` : `/login?redirect=/rooms/${room.id}`} style={{ display: 'block', textAlign: 'center', fontSize: '13px', color: '#e1306c', textDecoration: 'none', marginTop: '4px' }}>Join to see full conversation →</a>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #111' }}>
          <a href="/explore" style={{ fontSize: '13px', color: '#737373', textDecoration: 'none' }}>Browse all rooms on Rooms →</a>
        </div>
      </div>
    </div>
  )
}
