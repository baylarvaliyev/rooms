import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MessagesClient from './MessagesClient'

export default async function MessagesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // All queries in parallel
  const [{ data: profile }, { data: allUsers }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('id, name, username').neq('id', user.id).limit(50),
  ])

  return (
    <MessagesClient
      currentUser={{ id: user.id, ...profile }}
      allUsers={allUsers || []}
    />
  )
}
