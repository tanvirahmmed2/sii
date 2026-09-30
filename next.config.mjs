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
      {
        source: '/api/creator/:path*',
        destination: '/api/marketing/creator/:path*',
      },
      {
        source: '/api/creator',
        destination: '/api/marketing/creator',
      },
      {
        source: '/api/live_chats/:path*',
        destination: '/api/marketing/live_chats/:path*',
      },
      {
        source: '/api/live_chats',
        destination: '/api/marketing/live_chats',
      },
      {
        source: '/api/themes/:path*',
        destination: '/api/marketing/themes/:path*',
      },
      {
        source: '/api/themes',
        destination: '/api/marketing/themes',
      },
      {
        source: '/api/packages/:path*',
        destination: '/api/marketing/packages/:path*',
      },
      {
        source: '/api/packages',
        destination: '/api/marketing/packages',
      },
      {
        source: '/api/reviews/:path*',
        destination: '/api/marketing/reviews/:path*',
      },
      {
        source: '/api/reviews',
        destination: '/api/marketing/reviews',
      },
      {
        source: '/api/subscribers/:path*',
        destination: '/api/marketing/subscribers/:path*',
      },
      {
        source: '/api/subscribers',
        destination: '/api/marketing/subscribers',
      },
      {
        source: '/api/blogs/:path*',
        destination: '/api/marketing/blogs/:path*',
      },
      {
        source: '/api/blogs',
        destination: '/api/marketing/blogs',
      },
    ];
  },
};

export default nextConfig;