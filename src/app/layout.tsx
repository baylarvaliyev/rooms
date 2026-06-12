import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rooms — Join Live Experiences',
  description: 'Live experience social network. Join rooms, not feeds.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ background: 'var(--bg0)' }}>
        {children}
      </body>
    </html>
  )
}