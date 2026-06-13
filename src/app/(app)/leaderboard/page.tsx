import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LeaderboardClient from './LeaderboardClient'

export const revalidate = 300 // cache for 5 minutes

export default async function LeaderboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: topUsers },
    { data: topRooms },
    { data: topPosters },
  ] = await Promise.all([
    supabase.from('profiles').select('id, name, username, avatar_url, reputation').order('reputation', { ascending: false }).limit(20),
    supabase.from('rooms').select('id, name, emoji, category, member_count, online_count').order('member_count', { ascending: false }).limit(10),
    supabase.from('posts').select('user_id, profiles(name, username, avatar_url)').limit(100),
  ])

  const posterCounts: Record<string, { count: number, profile: any }> = {}
  ;(topPosters || []).forEach((p: any) => {
    if (!posterCounts[p.user_id]) posterCounts[p.user_id] = { count: 0, profile: p.profiles }
    posterCounts[p.user_id].count++
  })
  const sortedPosters = Object.entries(posterCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, { count, profile }]) => ({ id, count, ...profile }))

  return (
    <LeaderboardClient
      topUsers={topUsers || []}
      topRooms={topRooms || []}
      topPosters={sortedPosters}
      currentUserId={user.id}
    />
  )
}
