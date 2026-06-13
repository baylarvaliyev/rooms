import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function sitemap() {
  const baseUrl = 'https://rooms-rbp4.vercel.app'

  const supabase = await createServerSupabaseClient()
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, updated_at')
    .order('member_count', { ascending: false })
    .limit(100)

  const roomUrls = (rooms || []).map((r: any) => ({
    url: `${baseUrl}/rooms/${r.id}`,
    lastModified: r.updated_at || new Date().toISOString(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.3 },
    ...roomUrls,
  ]
}
