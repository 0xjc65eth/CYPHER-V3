/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export', // Removed - using standard hybrid mode for API routes
  trailingSlash: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ordinals.com' },
      { protocol: 'https', hostname: 'magiceden.io' },
      { protocol: 'https', hostname: 'api.coinmarketcap.com' },
      { protocol: 'https', hostname: 'api.ordiscan.com' },
    ],
  },
  experimental: {
    optimizePackageImports: ['@tremor/react', 'recharts'],
  },
  serverExternalPackages: ['axios', '@supabase/supabase-js', 'ws', 'ioredis'],
  typescript: {
    ignoreBuildErrors: true,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 4,
  },
  cacheMaxMemorySize: 0,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  webpack: (config, { isServer }) => {
    // Fix for SSR issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        buffer: false,
      };
    }

    // Ignore problematic modules during SSR
    if (isServer) {
      config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    }

    config.module.rules.push(
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
      {
        test: /HeartbeatWorker\.js$/,
        type: 'asset/source',
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      }
    );

    config.ignoreWarnings = [
      { module: /node_modules/ },
      { message: /Critical dependency/ },
      { message: /Can't resolve/ },
      { file: /HeartbeatWorker\.js/ },
    ];

    return config;
  },

  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  
  // Headers and rewrites removed for static export compatibility
  // These will be handled by netlify.toml instead
}

module.exports = nextConfig