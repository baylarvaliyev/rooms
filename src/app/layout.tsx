import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PWAProvider from '@/components/PWAProvider'
import ThemeProvider from '@/components/ThemeProvider'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

const inter = Inter({ subsets: ['latin'] })

const APP_URL = 'https://rooms-rbp4.vercel.app'
const APP_NAME = 'Rooms'
const APP_DESC = 'Join live rooms, not just feeds. Real-time chat, debates, music, voice and more — all in one social platform.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Rooms — Join Live Experiences',
    template: '%s · Rooms',
  },
  description: APP_DESC,
  keywords: ['social network', 'live rooms', 'real-time chat', 'community', 'voice rooms', 'debate', 'music rooms'],
  authors: [{ name: 'Rooms' }],
  creator: 'Rooms',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: APP_NAME,
    title: 'Rooms — Join Live Experiences',
    description: APP_DESC,
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Rooms — Join Live Experiences',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rooms — Join Live Experiences',
    description: APP_DESC,
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png',   sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-152.png', sizes: '152x152', type: 'image/png' },
    ],
    shortcut: '/favicon-32.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rooms" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152.png" />
      </head>
      <body className={inter.className} style={{ background: 'var(--bg0)' }}>
        <ThemeProvider>
          {children}
          <PWAProvider />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
