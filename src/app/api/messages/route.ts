import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limit = await checkRateLimit(user.id, RATE_LIMITS.messages)
    if (!limit.allowed) {
      return NextResponse.json({
        error: 'Slow down! You are sending messages too fast.',
        code: 'RATE_LIMITED'
      }, { status: 429 })
    }

    const { room_id, content } = await req.json()
    if (!content?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id,
        user_id: user.id,
        content: content.trim(),
      })
      // Return full message with profile so optimistic update can be replaced cleanly
      .select('*, profiles(name, username)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: data, remaining: limit.remaining })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
