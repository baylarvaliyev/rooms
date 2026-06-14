import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1, // 10% of transactions
  debug: false,
  enabled: process.env.NODE_ENV === 'production',
  ignoreErrors: [
    // Ignore common non-critical errors
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'Load failed',
    'Failed to fetch',
  ],
})
