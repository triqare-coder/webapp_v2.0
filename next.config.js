/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration (moved from experimental)
  turbopack: {
    // Let Next.js auto-detect the root to silence warnings
    root: process.cwd(),
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.clerk.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ]
  },

  // Redirect configuration
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
      {
        source: '/erteam',
        destination: '/erteam/dashboard',
        permanent: true,
      },
      {
        source: '/transport',
        destination: '/transport/dashboard',
        permanent: true,
      },
    ]
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Webpack configuration for optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks.chunks = 'all'
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      }
    }

    return config
  },

  // Output configuration for static export (if needed)
  output: 'standalone', // For Docker deployments

  // Disable source maps in production for security
  productionBrowserSourceMaps: false,

  // Enable compression
  compress: true,

  // Power by header removal
  poweredByHeader: false,

  // Strict mode for better performance
  reactStrictMode: true,

  // ESLint configuration
  eslint: {
    // Disable ESLint during builds (already handled in CI/CD)
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    // Type checking is handled separately
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
