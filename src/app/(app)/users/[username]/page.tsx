import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import UserProfileClient from './UserProfileClient'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const supabase = await createServerSupabaseClient()
  const { data: profile } = await supabase.from('profiles').select('name, username, bio').eq('username', username).single()
  if (!profile) return { title: 'User not found' }
  return {
    title: `${profile.name} (@${profile.username})`,
    description: profile.bio || `${profile.name} is on Rooms. Join the conversation.`,
    openGraph: {
      title: `${profile.name} · Rooms`,
      description: profile.bio || `${profile.name} is on Rooms`,
    },
    twitter: {
      card: 'summary',
      title: `${profile.name} · Rooms`,
      description: profile.bio || `${profile.name} is on Rooms`,
    }
  }
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) redirect('/explore')

  const { data: posts } = await supabase
    .from('posts')
    .select('*, rooms(name, emoji)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id)

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id)

  const { data: isFollowing } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', profile.id)
    .single()

  return (
    <UserProfileClient
      profile={profile}
      posts={posts || []}
      followersCount={followersCount || 0}
      followingCount={followingCount || 0}
      isFollowing={!!isFollowing}
      currentUserId={user.id}
      isOwnProfile={user.id === profile.id}
    />
  )
}