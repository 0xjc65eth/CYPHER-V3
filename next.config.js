/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: __dirname,
  },
  images: {
    domains: ['assets.coingecko.com', 'avatars.githubusercontent.com'],
  }
};

module.exports = nextConfig;
