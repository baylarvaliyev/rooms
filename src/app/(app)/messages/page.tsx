import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MessagesClient from './MessagesClient'

export default async function MessagesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Get all conversations (sent or received)
  const { data: sent } = await supabase
    .from('direct_messages')
    .select('*, profiles!direct_messages_to_user_fkey(id, name, username)')
    .eq('from_user', user.id)
    .order('created_at', { ascending: false })

  const { data: received } = await supabase
    .from('direct_messages')
    .select('*, profiles!direct_messages_from_user_fkey(id, name, username)')
    .eq('to_user', user.id)
    .order('created_at', { ascending: false })

  // Get all users to start new conversations
  const { data: allUsers } = await supabase
    .from('profiles')
    .select('id, name, username')
    .neq('id', user.id)
    .limit(20)

  return (
    <MessagesClient
      currentUser={{ id: user.id, ...profile }}
      allUsers={allUsers || []}
    />
  )
}