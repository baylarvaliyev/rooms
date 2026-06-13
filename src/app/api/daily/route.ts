import { NextRequest, NextResponse } from 'next/server'

const DAILY_API = 'https://api.daily.co/v1'
const DAILY_KEY = process.env.DAILY_API_KEY!

async function dailyFetch(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${DAILY_API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DAILY_KEY}` },
    ...(body ? { body: JSON.stringify(body) } : {})
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  const { action, roomName, isOwner } = await req.json()

  if (action === 'get-or-create-room') {
    // Try to get existing room first
    const existing = await dailyFetch(`/rooms/${roomName}`)
    let room = existing
    if (existing.error) {
      // Create new room
      room = await dailyFetch('/rooms', 'POST', {
        name: roomName,
        properties: {
          enable_chat: false,
          enable_knocking: true,        // Members must be let in by owner
          enable_screenshare: false,
          start_audio_off: true,        // Everyone joins muted
          start_video_off: true,        // No video in voice rooms
          max_participants: 50,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h expiry
        }
      })
    }
    if (room.error) return NextResponse.json({ error: room.error }, { status: 400 })

    // Generate a meeting token
    const token = await dailyFetch('/meeting-tokens', 'POST', {
      properties: {
        room_name: roomName,
        is_owner: isOwner,            // Owner can admit/remove participants
        start_audio_off: !isOwner,    // Owner joins with mic, others muted
        enable_recording: false,
      }
    })

    return NextResponse.json({ url: room.url, token: token.token })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
