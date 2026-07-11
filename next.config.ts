import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: [
    'localhost',
    '*.vusercontent.net',
  ],
}

export default nextConfig
