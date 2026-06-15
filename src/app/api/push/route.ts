import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import webpush from 'web-push'

// Do NOT call setVapidDetails at module level — env vars aren't available at build time
// Call it lazily inside the request handler instead

export async function POST(req: NextRequest) {
  try {
    // Set VAPID details lazily inside the handler
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || 'mailto:admin@rooms.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, subscription, notification } = await req.json()

    // Save subscription
    if (action === 'subscribe') {
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription,
      }, { onConflict: 'user_id' })
      return NextResponse.json({ ok: true })
    }

    // Send notification to a specific user
    if (action === 'send') {
      const { to_user_id, title, body, url } = notification
      const { data: sub } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', to_user_id)
        .single()

      if (!sub) return NextResponse.json({ error: 'No subscription' }, { status: 404 })

      await webpush.sendNotification(sub.subscription, JSON.stringify({
        title, body,
        url: url || '/notifications',
        icon: '/icon.svg',
      }))
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('Push error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
