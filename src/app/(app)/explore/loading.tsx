export default function Loading() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', animation: 'pulse 1.5s infinite' }}>
            <div style={{ height: '90px', background: 'var(--bg4)' }} />
            <div style={{ padding: '12px' }}>
              <div style={{ height: '13px', background: 'var(--bg4)', borderRadius: '6px', marginBottom: '8px', width: '70%' }} />
              <div style={{ height: '10px', background: 'var(--bg4)', borderRadius: '6px', width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
