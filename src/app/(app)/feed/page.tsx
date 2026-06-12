import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get posts from all rooms, newest first
  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(name, username), rooms(name, emoji, category)')
    .order('created_at', { ascending: false })
    .limit(30)

  // Get which posts current user liked
  const { data: likes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', user.id)

  const likedIds = new Set((likes || []).map((l: any) => l.post_id))

  // Get rooms for create post dropdown
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, emoji')
    .order('name')

  return (
    <FeedClient
      posts={posts || []}
      likedIds={[...likedIds]}
      profile={profile}
      rooms={rooms || []}
      currentUserId={user.id}
    />
  )
}