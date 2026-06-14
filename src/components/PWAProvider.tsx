'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function PWAProvider() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSBanner, setShowIOSBanner] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(async reg => {
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
        // Subscribe to push after SW is ready
        await subscribeToPush(reg)
      }).catch(console.error)
    }

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isStandalone) { setIsInstalled(true); return }

    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    if (ios) {
      const dismissed = localStorage.getItem('ios-banner-dismissed')
      if (!dismissed) setTimeout(() => setShowIOSBanner(true), 8000)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      const dismissed = localStorage.getItem('install-banner-dismissed')
      if (!dismissed) setTimeout(() => setShowBanner(true), 8000)
    }
    window.addEventListener('beforeinstallprompt', handler as any)
    return () => window.removeEventListener('beforeinstallprompt', handler as any)
  }, [])

  async function subscribeToPush(reg: ServiceWorkerRegistration) {
    try {
      // Check if already have permission
      if (Notification.permission === 'denied') return
      if (Notification.permission === 'default') {
        // Don't ask immediately — wait for user to trigger it
        return
      }
      // Already granted — subscribe
      await doSubscribe(reg)
    } catch (e) {
      // Push not supported
    }
  }

  async function doSubscribe(reg?: ServiceWorkerRegistration) {
    try {
      const r = reg || await navigator.serviceWorker.ready
      const existing = await r.pushManager.getSubscription()
      if (existing) { await saveSub(existing); return }

      const sub = await r.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      await saveSub(sub)
    } catch (e) {
      console.log('Push subscribe error:', e)
    }
  }

  async function saveSub(sub: PushSubscription) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON() })
    })
  }

  async function requestPushPermission() {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      await doSubscribe()
    }
  }

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
      <div style={{ position: 'fixed', bottom: '70px', left: '12px', right: '12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '14px 16px', zIndex: 200, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg, #f09433, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px', color: '#fff' }}>R</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '2px' }}>Install Rooms</div>
          <div style={{ fontSize: '12px', color: 'var(--text3)' }}>Fast, instant, works offline</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button onClick={dismissBanner} style={{ padding: '7px 10px', background: 'none', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text3)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>Later</button>
          <button onClick={install} style={{ padding: '7px 14px', background: 'var(--ig-gradient)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: '600', fontFamily: 'inherit' }}>Install</button>
        </div>
      </div>
    )
  }

  // iOS install instructions
  if (showIOSBanner) {
    return (
      <div style={{ position: 'fixed', bottom: '70px', left: '12px', right: '12px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '16px', padding: '16px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontWeight: '700', fontSize: '14px' }}>Install Rooms on iPhone</div>
          <button onClick={dismissBanner} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { step: '1️⃣', text: <>Tap the <strong>Share</strong> button ⬆ at the bottom</> },
            { step: '2️⃣', text: <>Scroll and tap <strong>"Add to Home Screen"</strong></> },
            { step: '3️⃣', text: <>Tap <strong>"Add"</strong> — opens like a real app</> },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text2)' }}>
              <span style={{ fontSize: '20px' }}>{step}</span> {text}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}
