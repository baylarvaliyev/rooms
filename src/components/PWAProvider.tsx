'use client'

import { useEffect, useState } from 'react'

export default function PWAProvider() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSBanner, setShowIOSBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage('skipWaiting')
              window.location.reload()
            }
          })
        })
      }).catch(console.error)
    }

    // Already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) { setIsInstalled(true); return }

    // Detect iOS
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    // iOS doesn't support beforeinstallprompt — show manual instructions
    if (ios) {
      const dismissed = localStorage.getItem('ios-banner-dismissed')
      if (!dismissed) setTimeout(() => setShowIOSBanner(true), 5000)
      return
    }

    // Android/Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      const dismissed = localStorage.getItem('install-banner-dismissed')
      if (!dismissed) setTimeout(() => setShowBanner(true), 8000)
    }
    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  async function install() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setShowBanner(false)
    setInstallPrompt(null)
  }

  function dismissBanner() {
    setShowBanner(false)
    setShowIOSBanner(false)
    localStorage.setItem('install-banner-dismissed', '1')
    localStorage.setItem('ios-banner-dismissed', '1')
  }

  if (isInstalled) return null

  // Android/Chrome install banner
  if (showBanner && installPrompt) {
    return (
      <div style={{ position: 'fixed', bottom: '70px', left: '12px', right: '12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '14px 16px', zIndex: 200, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 32px rgba(0,0,0,.5)', animation: 'fadeUp .3s ease' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px', color: '#fff' }}>R</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>Install Rooms</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Fast, instant, works offline</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={dismissBanner} style={{ padding: '7px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px' }}>Later</button>
          <button onClick={install} style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Install</button>
        </div>
      </div>
    )
  }

  // iOS install instructions
  if (showIOSBanner) {
    return (
      <div style={{ position: 'fixed', bottom: '70px', left: '12px', right: '12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '16px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,.5)', animation: 'fadeUp .3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: '14px' }}>Install Rooms on iPhone</div>
          <button onClick={dismissBanner} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
            <span style={{ fontSize: '20px' }}>1️⃣</span> Tap the <strong>Share</strong> button <span style={{ fontSize: '16px' }}>⬆</span> at the bottom
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
            <span style={{ fontSize: '20px' }}>2️⃣</span> Scroll down and tap <strong>"Add to Home Screen"</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
            <span style={{ fontSize: '20px' }}>3️⃣</span> Tap <strong>"Add"</strong> — done! Opens like a real app
          </div>
        </div>
      </div>
    )
  }

  return null
}
