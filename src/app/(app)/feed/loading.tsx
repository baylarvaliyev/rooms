export default function Loading() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', marginBottom: '12px', animation: 'pulse 1.5s infinite' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--bg4)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: '12px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '7px', width: '35%' }} />
                <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', width: '20%' }} />
              </div>
            </div>
            <div style={{ height: '13px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '8px', width: '90%' }} />
            <div style={{ height: '13px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '8px', width: '75%' }} />
            <div style={{ height: '13px', background: 'var(--bg4)', borderRadius: '6px', width: '50%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
