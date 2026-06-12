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

  // Get rooms user has joined
  const { data: joinedRooms } = await supabase
    .from('room_members')
    .select('room_id')
    .eq('user_id', user.id)

  // Get people user follows
  const { data: following } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const joinedRoomIds = (joinedRooms || []).map((r: any) => r.room_id)
  const followingIds = (following || []).map((f: any) => f.following_id)

  let posts: any[] = []

  // If user has joined rooms or follows people — show their content
  if (joinedRoomIds.length > 0 || followingIds.length > 0) {
    const conditions: string[] = []
    if (joinedRoomIds.length > 0) {
      conditions.push(`room_id.in.(${joinedRoomIds.join(',')})`)
    }
    if (followingIds.length > 0) {
      conditions.push(`user_id.in.(${followingIds.join(',')})`)
    }

    const { data } = await supabase
      .from('posts')
      .select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)')
      .or(conditions.join(','))
      .order('created_at', { ascending: false })
      .limit(30)

    posts = data || []
  }

  // If user has no content (new user) — show trending posts
  if (posts.length === 0) {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)')
      .order('like_count', { ascending: false })
      .limit(30)
    posts = data || []
  }

  // Get liked + saved post IDs
  const { data: likes } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', user.id)

  const { data: savedPosts } = await supabase
    .from('saved_posts')
    .select('post_id')
    .eq('user_id', user.id)

  // Get rooms user has joined for the post creation dropdown
  const { data: roomsForPost } = await supabase
    .from('room_members')
    .select('rooms(id, name, emoji)')
    .eq('user_id', user.id)

  // Get suggested rooms (not yet joined)
  const { data: suggestedRooms } = await supabase
    .from('rooms')
    .select('id, name, emoji, category, member_count, online_count')
    .not('id', 'in', `(${joinedRoomIds.length > 0 ? joinedRoomIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
    .order('member_count', { ascending: false })
    .limit(5)

  const likedIds = (likes || []).map((l: any) => l.post_id)
  const savedIds = (savedPosts || []).map((s: any) => s.post_id)
  const userRooms = (roomsForPost || []).map((r: any) => r.rooms).filter(Boolean)
  const isNewUser = joinedRoomIds.length === 0 && followingIds.length === 0

  return (
    <FeedClient
      posts={posts}
      likedIds={likedIds}
      savedIds={savedIds}
      profile={profile}
      rooms={userRooms}
      currentUserId={user.id}
      isNewUser={isNewUser}
      suggestedRooms={suggestedRooms || []}
    />
  )
}