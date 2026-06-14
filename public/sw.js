const CACHE_NAME = 'rooms-v3'
const SHELL_CACHE = 'rooms-shell-v3'

const SHELL_URLS = [
  '/',
  '/feed',
  '/explore',
  '/messages',
  '/notifications',
  '/profile',
  '/leaderboard',
  '/settings',
  '/manifest.json',
  '/icon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return cache.addAll(SHELL_URLS).catch(() => {})
    }).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== SHELL_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'Rooms', body: event.data.text() } }

  const { title = 'Rooms', body = 'You have a new notification', url = '/notifications', icon = '/icon.svg' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon.svg',
      data: { url },
      vibrate: [100, 50, 100],
    })
  )
})

// Notification click — open the app at the right URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/notifications'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('daily.co')) return
  if (url.hostname.includes('youtube.com') || url.hostname.includes('ytimg.com')) return
  if (url.protocol === 'chrome-extension:') return

  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          fetch(event.request).then(r => { if (r.ok) caches.open(SHELL_CACHE).then(c => c.put(event.request, r)) }).catch(() => {})
          return cached
        }
        return fetch(event.request).catch(() => caches.match('/feed'))
      })
    )
    return
  }

  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(r => {
          if (r.ok) { const clone = r.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)) }
          return r
        })
      })
    )
    return
  }

  event.respondWith(
    fetch(event.request).then(r => {
      if (r.ok) { const clone = r.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, clone)) }
      return r
    }).catch(() => caches.match(event.request))
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
