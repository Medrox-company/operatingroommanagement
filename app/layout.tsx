import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Operační sály | Apple Design',
  description: 'Správa operačních sálů s minimalistickým Apple designem',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" className="scroll-smooth">
      <body className="bg-canvas text-ink antialiased font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
