export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg0)', flexDirection: 'column', gap: '14px'
    }}>
      <div style={{
        width: '40px', height: '40px',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        borderRadius: '11px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: '800', fontSize: '20px', color: '#fff',
        animation: 'glow 2s ease-in-out infinite'
      }}>R</div>
      <div className="spinner" />
    </div>
  )
}