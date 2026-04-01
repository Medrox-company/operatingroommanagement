import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Operating Room Control | NEXT-GEN',
  description: 'Operating Room Control — přehled a řízení operačních sálů',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  )
}
