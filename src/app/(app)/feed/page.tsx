import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import FeedClient from './FeedClient'

export default async function FeedPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Run independent queries in parallel
  const [
    { data: profile },
    { data: joinedRooms },
    { data: following },
    { data: likes },
    { data: savedPosts },
    { data: roomsForPost },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('room_members').select('room_id').eq('user_id', user.id),
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('likes').select('post_id').eq('user_id', user.id),
    supabase.from('saved_posts').select('post_id').eq('user_id', user.id),
    supabase.from('room_members').select('rooms(id, name, emoji)').eq('user_id', user.id),
  ])

  const joinedRoomIds = (joinedRooms || []).map((r: any) => r.room_id)
  const followingIds = (following || []).map((f: any) => f.following_id)

  // Posts + suggested rooms in parallel
  const conditions: string[] = []
  if (joinedRoomIds.length > 0) conditions.push(`room_id.in.(${joinedRoomIds.join(',')})`)
  if (followingIds.length > 0) conditions.push(`user_id.in.(${followingIds.join(',')})`)

  const fallbackId = '00000000-0000-0000-0000-000000000000'
  const notInIds = joinedRoomIds.length > 0 ? joinedRoomIds.join(',') : fallbackId

  const [postsResult, { data: suggestedRooms }] = await Promise.all([
    conditions.length > 0
      ? supabase.from('posts').select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)').or(conditions.join(',')).order('created_at', { ascending: false }).limit(30)
      : supabase.from('posts').select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)').order('like_count', { ascending: false }).limit(30),
    supabase.from('rooms').select('id, name, emoji, category, member_count, online_count').not('id', 'in', `(${notInIds})`).order('member_count', { ascending: false }).limit(5),
  ])

  let posts = postsResult.data || []

  // Fallback to trending if no results
  if (posts.length === 0 && conditions.length > 0) {
    const { data: trending } = await supabase.from('posts').select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)').order('like_count', { ascending: false }).limit(30)
    posts = trending || []
  }

  return (
    <FeedClient
      posts={posts}
      likedIds={(likes || []).map((l: any) => l.post_id)}
      savedIds={(savedPosts || []).map((s: any) => s.post_id)}
      profile={profile}
      rooms={(roomsForPost || []).map((r: any) => r.rooms).filter(Boolean)}
      currentUserId={user.id}
      isNewUser={joinedRoomIds.length === 0 && followingIds.length === 0}
      suggestedRooms={suggestedRooms || []}
    />
  )
}
