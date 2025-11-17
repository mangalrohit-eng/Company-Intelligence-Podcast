/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

