import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg0)',
      flexDirection: 'column', gap: '14px', textAlign: 'center', padding: '20px'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '8px' }}>🚪</div>
      <div style={{ fontWeight: '800', fontSize: '28px', color: 'var(--text1)' }}>404</div>
      <div style={{ fontWeight: '600', fontSize: '16px', color: 'var(--text2)', marginBottom: '4px' }}>
        This room doesn&apos;t exist
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '320px' }}>
        The page you&apos;re looking for has moved or never existed.
      </div>
      <Link href="/feed" style={{
        marginTop: '12px', padding: '10px 24px',
        background: 'var(--accent)', border: 'none', borderRadius: '10px',
        color: '#fff', fontSize: '13px', fontWeight: '600',
        textDecoration: 'none', display: 'inline-block'
      }}>Go to Feed</Link>
    </div>
  )
}