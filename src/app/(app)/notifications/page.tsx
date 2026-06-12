import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function NotificationsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  async function markAllRead() {
    'use server'
    const supa = await createServerSupabaseClient()
    const { data: { user } } = await supa.auth.getUser()
    if (user) await supa.from('notifications').update({ read: true }).eq('user_id', user.id)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '22px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '18px' }}>Notifications</div>
          <form action={markAllRead}>
            <button style={{
              padding: '6px 14px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--text2)', fontSize: '12px', cursor: 'pointer'
            }}>Mark all read</button>
          </form>
        </div>

        {notifications && notifications.length > 0 ? (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: '13px', overflow: 'hidden'
          }}>
            {notifications.map((n: any) => (
              <div key={n.id} style={{
                display: 'flex', gap: '12px', padding: '14px',
                borderBottom: '1px solid var(--border)',
                background: n.read ? 'none' : 'rgba(99,102,241,.04)',
                transition: 'background .18s'
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%',
                  background: 'rgba(99,102,241,.15)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  {n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'follow' ? '👥' : '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.55' }}
                    dangerouslySetInnerHTML={{ __html: n.content }} />
                  <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '3px' }}>
                    {new Date(n.created_at).toLocaleDateString()}
                  </div>
                </div>
                {!n.read && (
                  <div style={{
                    width: '7px', height: '7px', background: 'var(--accent)',
                    borderRadius: '50%', flexShrink: 0, marginTop: '5px'
                  }} />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
            <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text2)', marginBottom: '6px' }}>
              No notifications yet
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
              When people like or comment on your posts you will see it here
            </div>
          </div>
        )}
      </div>
    </div>
  )
}