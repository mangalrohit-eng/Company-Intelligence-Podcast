/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // For optimized deployment
  images: {
    domains: [process.env.CLOUDFRONT_DOMAIN || 'localhost'],
    unoptimized: true, // For static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_BASE_URL + '/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

