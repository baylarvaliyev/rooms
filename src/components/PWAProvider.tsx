'use client'

import { useEffect, useState } from 'react'

export default function PWAProvider() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }

    // Already installed as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setTimeout(() => setShowBanner(true), 30000)
    }

    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  async function install() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShowBanner(false)
    setInstallPrompt(null)
  }

  if (!showBanner || installed) return null

  return (
    <div style={{
      position: 'fixed', bottom: '70px', left: '12px', right: '12px',
      background: 'var(--bg2)', border: '1px solid var(--border2)',
      borderRadius: '14px', padding: '14px 16px', zIndex: 200,
      display: 'flex', alignItems: 'center', gap: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      animation: 'fadeUp .3s ease'
    }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', color: '#fff' }}>R</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>Install Rooms</div>
        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Add to home screen for the best experience</div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button onClick={() => setShowBanner(false)} style={{ padding: '6px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', fontSize: '12px', cursor: 'pointer' }}>Later</button>
        <button onClick={install} style={{ padding: '6px 12px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Install</button>
      </div>
    </div>
  )
}
