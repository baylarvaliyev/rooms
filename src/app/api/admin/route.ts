import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// All admin actions go through this server route
// The server verifies the caller is actually an admin before doing anything

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify admin status server-side — cannot be faked
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    const { action, targetId, reason, data } = await req.json()

    switch (action) {

      case 'ban_user': {
        if (!targetId || !reason) return NextResponse.json({ error: 'Missing targetId or reason' }, { status: 400 })
        // Prevent banning other admins
        const { data: target } = await supabase.from('profiles').select('is_admin').eq('id', targetId).single()
        if (target?.is_admin) return NextResponse.json({ error: 'Cannot ban another admin' }, { status: 403 })
        await supabase.from('profiles').update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: reason,
        }).eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'unban_user': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        await supabase.from('profiles').update({
          is_banned: false, banned_at: null, ban_reason: null
        }).eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'shadowban_user': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        await supabase.from('profiles').update({ is_shadowbanned: true }).eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'unshadowban_user': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        await supabase.from('profiles').update({ is_shadowbanned: false }).eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'edit_user': {
        if (!targetId || !data) return NextResponse.json({ error: 'Missing data' }, { status: 400 })
        const cleanUsername = data.username?.toLowerCase().replace(/[^a-z0-9_]/g, '')
        // Check username uniqueness
        if (cleanUsername) {
          const { data: existing } = await supabase.from('profiles').select('id').eq('username', cleanUsername).neq('id', targetId).single()
          if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
        }
        await supabase.from('profiles').update({
          name: data.name,
          username: cleanUsername,
        }).eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'delete_user_content': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        await Promise.all([
          supabase.from('posts').delete().eq('user_id', targetId),
          supabase.from('messages').delete().eq('user_id', targetId),
          supabase.from('comments').delete().eq('user_id', targetId),
        ])
        return NextResponse.json({ ok: true })
      }

      case 'delete_post': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        await supabase.from('posts').delete().eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'delete_room': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        await supabase.from('rooms').delete().eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'dismiss_report': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        await supabase.from('reports').update({ status: 'dismissed' }).eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'resolve_report': {
        if (!targetId) return NextResponse.json({ error: 'Missing targetId' }, { status: 400 })
        const { data: report } = await supabase.from('reports').select('post_id').eq('id', targetId).single()
        if (report?.post_id) await supabase.from('posts').delete().eq('id', report.post_id)
        await supabase.from('reports').update({ status: 'resolved' }).eq('id', targetId)
        return NextResponse.json({ ok: true })
      }

      case 'search_users': {
        const { q } = data || {}
        if (!q || q.length < 2) return NextResponse.json({ users: [] })
        const { data: users } = await supabase
          .from('profiles')
          .select('id, name, username, reputation, created_at, is_banned, is_shadowbanned, ban_reason, is_admin')
          .or(`name.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(20)
        return NextResponse.json({ users: users || [] })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: any) {
    console.error('Admin API error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
