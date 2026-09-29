/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  allowedDevOrigins: ['192.168.1.102'],
  async rewrites() {
    return [
      {
        source: '/api/developer/:path*',
        destination: '/api/marketing/developer/:path*',
      },
      {
        source: '/api/developer',
        destination: '/api/marketing/developer',
      },
    ];
  },
};

export default nextConfig;
