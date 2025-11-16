/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'export', // Static export for S3/CloudFront
  trailingSlash: true, // Ensures routes work in S3
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable for production build
  },
  images: {
    unoptimized: true, // Required for static export
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
  },
};

module.exports = nextConfig;

