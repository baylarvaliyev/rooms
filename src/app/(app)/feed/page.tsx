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

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(name, username), rooms(name, emoji, category)')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: likes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', user.id)

  const { data: savedPosts } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', user.id)

  const { data: rooms } = await supabase
    .from('room_members')
    .select('rooms(id, name, emoji)')
    .eq('user_id', user.id)

  const likedIds = (likes || []).map((l: any) => l.post_id)
  const savedIds = (savedPosts || []).map((s: any) => s.post_id)
  const userRooms = (rooms || []).map((r: any) => r.rooms).filter(Boolean)

  return (
    <FeedClient
      posts={posts || []}
      likedIds={likedIds}
      savedIds={savedIds}
      profile={profile}
      rooms={userRooms}
      currentUserId={user.id}
    />
  )
}