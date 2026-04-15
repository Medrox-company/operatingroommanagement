/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimizations for faster dev
  productionBrowserSourceMaps: false,
  swcMinify: true,
  compress: true,
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Disable minification in dev for faster rebuilds
      config.optimization = {
        ...config.optimization,
        minimize: false,
      };
      
      // Enable cache for faster rebuilds
      config.cache = {
        type: 'filesystem',
        cacheDirectory: '.next/cache',
        managedPaths: ['node_modules'],
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },

  // Headers for better caching
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
      ],
    },
  ],
};

export default nextConfig;
