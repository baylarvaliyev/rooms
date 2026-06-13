import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import InvitePage from './InvitePage'

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createServerSupabaseClient()

  // Look up invite
  const { data: invite } = await supabase
    .from('room_invites')
    .select('*, rooms(id, name, emoji, description, category, member_count, type)')
    .eq('code', code)
    .single()

  if (!invite || !invite.rooms) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <div style={{ fontSize: '48px' }}>🔗</div>
        <div style={{ fontWeight: '700', fontSize: '22px', color: '#fff' }}>Invite not found</div>
        <div style={{ fontSize: '14px', color: '#737373' }}>This invite link may have expired or been removed.</div>
        <a href="/explore" style={{ padding: '10px 24px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Browse Rooms</a>
      </div>
    )
  }

  // Check if expired
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px' }}>
        <div style={{ fontSize: '48px' }}>⏰</div>
        <div style={{ fontWeight: '700', fontSize: '22px', color: '#fff' }}>Invite expired</div>
        <div style={{ fontSize: '14px', color: '#737373' }}>Ask the room owner for a new invite link.</div>
        <a href="/explore" style={{ padding: '10px 24px', background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', textDecoration: 'none' }}>Browse Rooms</a>
      </div>
    )
  }

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()

  return <InvitePage invite={invite} room={invite.rooms} user={user} code={code} />
}
