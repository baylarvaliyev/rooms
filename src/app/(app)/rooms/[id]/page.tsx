import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RoomClient from './RoomClient'
import DebateRoom from './DebateRoom'
import PinterestRoom from './PinterestRoom'
import VoiceRoom from './VoiceRoom'
import MusicRoom from './MusicRoom'

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

  const currentUser = { id: user.id, ...user.user_metadata }
  const isMember = !!membership

  if (room.type === 'debate') {
    return <DebateRoom room={room} currentUser={currentUser} isMember={isMember} />
  }

  if (room.type === 'pinterest') {
    return <PinterestRoom room={room} currentUser={currentUser} isMember={isMember} />
  }

  if (room.type === 'voice') {
    return <VoiceRoom room={room} members={members || []} currentUser={currentUser} isMember={isMember} />
  }

  if (room.type === 'music') {
    return <MusicRoom room={room} members={members || []} currentUser={currentUser} isMember={isMember} />
  }

  return (
    <RoomClient
      room={room}
      initialMessages={messages || []}
      members={members || []}
      currentUser={currentUser}
      isMember={isMember}
    />
  )
}