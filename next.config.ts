import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Povolení cross-origin požadavků během vývoje (Vercel preview, v0 sandbox)
  allowedDevOrigins: [
    'localhost',
    '*.vusercontent.net',
    '*.vercel.app',
  ],
}

export default nextConfig
