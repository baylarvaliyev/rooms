'use client'

export default function Error({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg0)', flexDirection: 'column',
      gap: '14px', padding: '20px', textAlign: 'center'
    }}>
      <div style={{ fontSize: '40px' }}>⚠️</div>
      <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--text1)' }}>Something went wrong</div>
      <div style={{ fontSize: '13px', color: 'var(--text3)', maxWidth: '380px' }}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
        <button onClick={reset} style={{
          padding: '9px 20px', background: 'var(--accent)', border: 'none',
          borderRadius: '9px', color: '#fff', fontSize: '13px',
          fontWeight: '600', cursor: 'pointer'
        }}>Try again</button>
        <button onClick={() => window.location.href = '/feed'} style={{
          padding: '9px 20px', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: '9px',
          color: 'var(--text2)', fontSize: '13px', cursor: 'pointer'
        }}>Go home</button>
      </div>
    </div>
  )
}