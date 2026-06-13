export default function Loading() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ height: '180px', background: 'var(--bg3)', borderRadius: '14px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px', animation: 'pulse 1.5s infinite' }}>
              <div style={{ height: '24px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '6px' }} />
              <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', width: '60%' }} />
            </div>
          ))}
        </div>
        {[1,2].map(i => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '10px', animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: '12px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '8px', width: '40%' }} />
            <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', width: '60%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
