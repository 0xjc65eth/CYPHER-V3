/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  // output: 'export', // Removed - using standard hybrid mode for API routes
  trailingSlash: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ordinals.com' },
      { protocol: 'https', hostname: 'magiceden.io' },
      { protocol: 'https', hostname: 'api.coinmarketcap.com' },
      { protocol: 'https', hostname: 'api.ordiscan.com' },
      { protocol: 'https', hostname: 'img-cdn.magiceden.dev' },
      { protocol: 'https', hostname: 'creator-hub-prod.s3.us-east-2.amazonaws.com' },
      { protocol: 'https', hostname: '*.ipfs.nftstorage.link' },
      { protocol: 'https', hostname: 'api-mainnet.magiceden.dev' },
      { protocol: 'https', hostname: 'ord.cdn.magiceden.dev' },
    ],
  },
  experimental: {
    optimizePackageImports: ['@tremor/react', 'recharts'],
  },
  serverExternalPackages: ['axios', '@supabase/supabase-js', 'ws', 'ioredis', 'nodemailer'],
  typescript: {
    ignoreBuildErrors: true, // TODO: Fix 2917 TS errors gradually, then remove this
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: true, // TODO: Fix ESLint errors gradually, then remove this
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 4,
  },
  cacheMaxMemorySize: 50 * 1024 * 1024, // 50 MB fetch cache
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

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
}

module.exports = nextConfig