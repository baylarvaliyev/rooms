import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'Join Live Experiences'
  const subtitle = searchParams.get('subtitle') || 'Real-time rooms for every interest'
  const emoji = searchParams.get('emoji') || '🚀'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #06070a 0%, #0c0e13 50%, #11141b 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Background glow */}
        <div style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          display: 'flex',
        }} />

        {/* Logo */}
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          fontWeight: '800',
          color: '#fff',
          marginBottom: '24px',
          boxShadow: '0 0 60px rgba(99,102,241,0.4)',
        }}>
          {emoji === '🚀' ? 'R' : emoji}
        </div>

        {/* Title */}
        <div style={{
          fontSize: '56px',
          fontWeight: '800',
          color: '#eef0f5',
          textAlign: 'center',
          marginBottom: '16px',
          maxWidth: '900px',
          lineHeight: 1.1,
          display: 'flex',
        }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{
          fontSize: '24px',
          color: '#9ba4b8',
          textAlign: 'center',
          maxWidth: '700px',
          display: 'flex',
        }}>
          {subtitle}
        </div>

        {/* Bottom badge */}
        <div style={{
          position: 'absolute',
          bottom: '36px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '30px',
        }}>
          <div style={{ fontSize: '18px', display: 'flex' }}>R</div>
          <div style={{ fontSize: '18px', color: '#818cf8', fontWeight: '600', display: 'flex' }}>rooms-rbp4.vercel.app</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
