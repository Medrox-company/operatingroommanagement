import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Povolení cross-origin požadavků během vývoje (Vercel preview, v0 sandbox)
  allowedDevOrigins: [
    'localhost',
    '*.vusercontent.net',
    '*.vercel.app',
  ],
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
  },
}

export default nextConfig
