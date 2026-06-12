import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RoomClient from './RoomClient'

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: room } = await supabase
    .from('rooms')
    .select('*, profiles(name, username)')
    .eq('id', id)
    .single()

  if (!room) redirect('/explore')

  const { data: messages } = await supabase
    .from('messages')
    .select('*, profiles(name, username)')
    .eq('room_id', id)
    .order('created_at', { ascending: true })
    .limit(50)

  const { data: members } = await supabase
    .from('room_members')
    .select('*, profiles(name, username)')
    .eq('room_id', id)

  const { data: membership } = await supabase
    .from('room_members')
    .select('id')
    .eq('room_id', id)
    .eq('user_id', user.id)
    .single()

  return (
    <RoomClient
      room={room}
      initialMessages={messages || []}
      members={members || []}
      currentUser={{ id: user.id, ...user.user_metadata }}
      isMember={!!membership}
    />
  )
}