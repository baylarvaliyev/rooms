import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limit = await checkRateLimit(user.id, RATE_LIMITS.posts)
    if (!limit.allowed) {
      return NextResponse.json({
        error: `Too many posts. You can post again in ${limit.resetIn} minutes.`,
        code: 'RATE_LIMITED'
      }, { status: 429 })
    }

    const { content, room_id, media_url, type, poll_question, poll_options } = await req.json()

    if (!content?.trim() && !media_url) {
      return NextResponse.json({ error: 'Post cannot be empty' }, { status: 400 })
    }

    const { data: post, error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: content?.trim() || '',
      room_id,
      media_url,
      type: type || 'post',
    }).select('*, profiles(name, username, avatar_url), rooms(name, emoji, category)').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (type === 'poll' && poll_question && poll_options?.length >= 2) {
      await supabase.from('polls').insert({
        post_id: post.id,
        question: poll_question,
        options: poll_options.filter((o: string) => o.trim()),
        created_by: user.id,
      })
    }

    return NextResponse.json({ post, remaining: limit.remaining })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
