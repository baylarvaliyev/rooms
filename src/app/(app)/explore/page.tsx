import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ExploreClient from './ExploreClient'

export default async function ExplorePage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, profiles(name, username)')
    .order('member_count', { ascending: false })

  return <ExploreClient rooms={rooms || []} />
}