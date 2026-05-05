import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { ServiceWorkerRegister } from './service-worker-register'
import './globals.css'

export const metadata: Metadata = {
  title: 'Operační Sály - NEXT-GEN',
  description: 'Systém pro správu a monitoring operačních sálů v reálném čase',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Operační Sály',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0f1e',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" className="bg-background">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Operační Sály" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ServiceWorkerRegister />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
