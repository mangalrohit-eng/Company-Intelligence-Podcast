/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true, // Enable gzip compression
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Static export configuration:
  // - Disabled by default (works for Vercel and local dev)
  // - Enable only for AWS S3/CloudFront deployment by setting ENABLE_STATIC_EXPORT=true
  // - Vercel handles Next.js natively, so no static export needed
  // - Local dev needs dynamic routes, so no static export
  ...(process.env.ENABLE_STATIC_EXPORT === 'true'
    ? { output: 'export' }
    : {}),
  // Optimize production builds
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    // Make Amplify credentials available to API routes (server-side only)
    // Note: These are NOT exposed to client-side (no NEXT_PUBLIC_ prefix)
    AMPLIFY_ACCESS_KEY_ID: process.env.AMPLIFY_ACCESS_KEY_ID,
    AMPLIFY_SECRET_ACCESS_KEY: process.env.AMPLIFY_SECRET_ACCESS_KEY,
    S3_BUCKET_MEDIA: process.env.S3_BUCKET_MEDIA,
    REGION: process.env.REGION,
    ACCOUNT_ID: process.env.ACCOUNT_ID,
  },
  // Note: rewrites() is not supported with static export
  // API routes won't work with static export - use API Gateway endpoints instead
  // async rewrites() {
  //   return [
  //     {
  //       source: '/output/:path*',
  //       destination: '/api/serve-file/:path*',
  //     },
  //   ];
  // },
};

export default nextConfig;

