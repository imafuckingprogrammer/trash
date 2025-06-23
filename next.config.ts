import type { NextConfig } from 'next';

// Enable bundle analyzer when ANALYZE=true
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Performance optimizations
  experimental: {
    // Optimize CSS
    optimizeCss: true,
    // Enable React compiler (if available)
    reactCompiler: false, // Set to true when React Compiler is stable
  },

  // Server external packages
  serverExternalPackages: ['@tanstack/react-query'],

  // Build optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // TypeScript and ESLint (keeping existing settings for development speed)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Comprehensive image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'books.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'books.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'books.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'covers.openlibrary.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
    // Optimized device and image sizes for book covers
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable modern image formats
    formats: ['image/webp', 'image/avif'],
    // Optimize for book cover images
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days cache for book covers
    // Enable image optimization
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev) {
      // Enable tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Optimize split chunks for better caching and performance
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Framework chunk (React, Next.js)
          framework: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'framework',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // React Query chunk
          reactQuery: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'react-query',
            chunks: 'all',
            priority: 30,
          },
          // UI Library chunk (Radix UI)
          uiLibrary: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'ui-library',
            chunks: 'all',
            priority: 25,
          },
          // Vendor chunk for other dependencies
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            minChunks: 2,
          },
          // App UI components
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui-components',
            chunks: 'all',
            priority: 20,
            minChunks: 2,
          },
          // Common app code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    // Optimize module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      // Optimize React imports
      'react': require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
    };

    // Exclude AI modules from bundle if they're not needed
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/ai/genkit': false,
      '@/ai/flows/generate-book-recommendations': false,
    };

    return config;
  },

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Security headers
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
            value: 'origin-when-cross-origin',
          },
          // Performance headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Cache API responses briefly
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=60',
          },
        ],
      },
    ];
  },

  // Redirects for performance (if needed)
  async redirects() {
    return [
      // Add any necessary redirects here
    ];
  },

  // Rewrites for API optimization (if needed)
  async rewrites() {
    return [
      // Add any necessary rewrites here
    ];
  },

  // Enable compression
  compress: true,

  // Power optimization for development
  poweredByHeader: false,

  // Output configuration for deployment
  output: 'standalone',

  // Enable React strict mode for better development experience
  reactStrictMode: true,
};

export default withBundleAnalyzer(nextConfig);
