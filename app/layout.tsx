import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Operating Room Control | NEXT-GEN',
  description: 'Operating Room Control - overview and management of operating rooms',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs">
      <body className="bg-black text-white antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
