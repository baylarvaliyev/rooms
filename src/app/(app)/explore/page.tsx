import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ExploreClient from './ExploreClient'

export default async function ExplorePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get rooms with recent post + message activity for trending
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, profiles(name, username)')
    .order('member_count', { ascending: false })

  // Count posts per room in last 7 days for trending score
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('room_id')
    .gte('created_at', since)

  const { data: recentMessages } = await supabase
    .from('messages')
    .select('room_id')
    .gte('created_at', since)

  // Build activity score per room
  const activityScore: Record<string, number> = {}
  ;(recentPosts || []).forEach((p: any) => {
    activityScore[p.room_id] = (activityScore[p.room_id] || 0) + 3
  })
  ;(recentMessages || []).forEach((m: any) => {
    activityScore[m.room_id] = (activityScore[m.room_id] || 0) + 1
  })

  // Sort rooms: trending first (by activity), then by member count
  const roomsWithScore = (rooms || []).map((r: any) => ({
    ...r,
    trending_score: activityScore[r.id] || 0
  }))

  const trendingRooms = [...roomsWithScore].sort((a, b) => b.trending_score - a.trending_score).slice(0, 6)
  const allRooms = roomsWithScore

  return <ExploreClient rooms={allRooms} trendingRooms={trendingRooms} />
}
