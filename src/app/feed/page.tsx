import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center' }} className="fade-up">
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚀</div>
        <div style={{
          fontWeight: '800', fontSize: '24px', marginBottom: '8px'
        }}>
          Welcome, {profile?.name || user.email}!
        </div>
        <div style={{ color: 'var(--text3)', fontSize: '14px' }}>
          You are logged in. Feed coming next.
        </div>
      </div>
    </div>
  )
}