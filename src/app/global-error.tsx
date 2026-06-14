'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ background: '#000', color: '#fff', fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>😔</div>
          <h2 style={{ fontWeight: '700', fontSize: '20px', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: '#737373', fontSize: '14px', marginBottom: '24px' }}>An unexpected error occurred. Our team has been notified.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={reset} style={{ padding: '10px 20px', background: '#e1306c', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
              Try again
            </button>
            <button onClick={() => router.push('/feed')} style={{ padding: '10px 20px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontSize: '14px' }}>
              Go home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
