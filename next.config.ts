import type { NextConfig } from 'next'

// Vložení do cizí stránky (iframe) je zakázané. Výjimkou je vývojový náhled
// v iframe, který už dnes vyžaduje COOKIE_SAMESITE_NONE=1 (viz lib/auth/session.ts).
const allowFraming = process.env.COOKIE_SAMESITE_NONE === '1'

const securityHeaders = [
  // Prohlížeč smí aplikaci otevřít jen přes HTTPS (2 roky). Subdomény záměrně
  // nezahrnujeme, dokud není ověřeno, že všechny běží na HTTPS.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  // Žádné hádání typu obsahu — brání spuštění nahraného souboru jako skriptu.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Adresy s identifikátory sálů a výkonů neodcházejí na cizí weby.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Aplikace nepotřebuje kameru, mikrofon, polohu ani platby; celá obrazovka
  // se používá na časové ose.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  ...(allowFraming
    ? []
    : [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      ]),
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    'localhost',
    '*.vusercontent.net',
  ],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
