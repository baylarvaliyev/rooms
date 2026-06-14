import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only allow admins
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/feed')

  const [
    { count: userCount },
    { count: roomCount },
    { count: postCount },
    { count: messageCount },
    { data: recentUsers },
    { data: recentRooms },
    { data: recentPosts },
    { data: reports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('messages').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('id, name, username, created_at, reputation, is_banned, is_shadowbanned, ban_reason, is_admin').order('created_at', { ascending: false }).limit(20),
    supabase.from('rooms').select('id, name, emoji, category, member_count, created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('posts').select('id, content, created_at, like_count, comment_count, profiles(name)').order('created_at', { ascending: false }).limit(20),
    supabase.from('reports').select('*, posts(content)').order('created_at', { ascending: false }).limit(100),
  ])

  return (
    <AdminClient
      stats={{ userCount, roomCount, postCount, messageCount }}
      recentUsers={recentUsers || []}
      recentRooms={recentRooms || []}
      recentPosts={recentPosts || []}
      reports={reports || []}
      currentUserId={user.id}
    />
  )
}