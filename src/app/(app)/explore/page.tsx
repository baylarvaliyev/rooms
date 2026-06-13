import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ExploreClient from './ExploreClient'

export default async function ExplorePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // All queries in parallel
  const [
    { data: rooms },
    { data: recentPosts },
    { data: recentMessages },
  ] = await Promise.all([
    supabase.from('rooms').select('*, profiles(name, username)').order('member_count', { ascending: false }),
    supabase.from('posts').select('room_id').gte('created_at', since),
    supabase.from('messages').select('room_id').gte('created_at', since),
  ])

  // Build trending score
  const activityScore: Record<string, number> = {}
  ;(recentPosts || []).forEach((p: any) => { activityScore[p.room_id] = (activityScore[p.room_id] || 0) + 3 })
  ;(recentMessages || []).forEach((m: any) => { activityScore[m.room_id] = (activityScore[m.room_id] || 0) + 1 })

  const roomsWithScore = (rooms || []).map((r: any) => ({ ...r, trending_score: activityScore[r.id] || 0 }))
  const trendingRooms = [...roomsWithScore].sort((a, b) => b.trending_score - a.trending_score).slice(0, 6)

  return <ExploreClient rooms={roomsWithScore} trendingRooms={trendingRooms} />
}
