// Daily.co Voice/Video Room API
// Version: 1.1
import { NextRequest, NextResponse } from 'next/server'

const DAILY_API = 'https://api.daily.co/v1'
const DAILY_KEY = process.env.DAILY_API_KEY!

async function dailyFetch(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${DAILY_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DAILY_KEY}`
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  const data = await res.json()
  return { data, ok: res.ok }
}

export async function POST(req: NextRequest) {
  try {
    const { action, roomName, isOwner, userName } = await req.json()

    if (action === 'get-or-create-room') {
      // Daily room names: only lowercase letters, numbers, hyphens, max 255 chars
      const safeName = roomName.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)

      // Try to get existing room
      let roomUrl = ''
      const { data: existing, ok: existsOk } = await dailyFetch(`/rooms/${safeName}`)

      if (existsOk && existing.url) {
        roomUrl = existing.url
      } else {
        // Create new room
        const { data: created, ok: createdOk } = await dailyFetch('/rooms', 'POST', {
          name: safeName,
          properties: {
            enable_chat: false,
            enable_knocking: false,
            enable_screenshare: false,
            start_audio_off: true,
            start_video_off: true,
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
          }
        })
        if (!createdOk) {
          console.error('Daily create room error:', created)
          return NextResponse.json({ error: created.error || 'Failed to create room' }, { status: 400 })
        }
        roomUrl = created.url
      }

      // Generate meeting token
      const { data: tokenData, ok: tokenOk } = await dailyFetch('/meeting-tokens', 'POST', {
        properties: {
          room_name: safeName,
          is_owner: isOwner,
          user_name: userName || 'Guest',
          start_audio_off: !isOwner,
          enable_recording: false,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4,
          close_tab_on_exit: false,
          redirect_on_meeting_exit: false,
        }
      })

      if (!tokenOk) {
        console.error('Daily token error:', tokenData)
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 400 })
      }

      return NextResponse.json({ url: roomUrl, token: tokenData.token })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('Daily API route error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
