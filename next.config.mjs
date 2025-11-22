/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone mode for containerization
  async rewrites() {
    return [
      {
        source: '/output/:path*',
        destination: '/api/serve-file/:path*',
      },
    ];
  },
};

export default nextConfig;

