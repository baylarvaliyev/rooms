import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, rooms(name, emoji)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const { data: rooms } = await supabase
    .from('room_members')
    .select('*, rooms(id, name, emoji, category, member_count, online_count)')
    .eq('user_id', user.id)

  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', user.id)

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', user.id)

  const { data: achievements } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id)

  return (
    <ProfileClient
      profile={profile}
      posts={posts || []}
      rooms={rooms || []}
      followersCount={followersCount || 0}
      followingCount={followingCount || 0}
      achievements={achievements || []}
    />
  )
}