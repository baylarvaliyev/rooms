const CACHE_NAME = 'rooms-v3'
const SHELL_CACHE = 'rooms-shell-v3'

// App shell — pages that should be cached and served instantly
const SHELL_URLS = [
  '/',
  '/feed',
  '/explore',
  '/messages',
  '/notifications',
  '/profile',
  '/leaderboard',
  '/settings',
  '/search',
  '/manifest.json',
  '/icon.svg',
]

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return cache.addAll(SHELL_URLS).catch(err => {
        console.log('Shell cache error:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SHELL_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET
  if (event.request.method !== 'GET') return

  // Skip Supabase — always fresh
  if (url.hostname.includes('supabase.co')) return

  // Skip Daily.co
  if (url.hostname.includes('daily.co')) return

  // Skip YouTube
  if (url.hostname.includes('youtube.com') || url.hostname.includes('ytimg.com')) return

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return

  // For navigation requests (page clicks) — serve from cache first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) {
            // Return cached immediately, update in background
            fetch(event.request).then(response => {
              if (response.ok) {
                caches.open(SHELL_CACHE).then(cache => cache.put(event.request, response))
              }
            }).catch(() => {})
            return cached
          }
          // Not cached — try network, fallback to /feed shell
          return fetch(event.request).catch(() => caches.match('/feed'))
        })
    )
    return
  }

  // For static assets (_next/static) — cache forever
  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // For everything else — network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting()
})
