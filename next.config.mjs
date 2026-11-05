const rawBase = (process.env.BASE_URL || 'localhost:3000').replace(/^['"]|['"]$/g, '').trim();
const cleanBaseDomain = rawBase.replace(/^https?:\/\//, '').split('/')[0];

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BASE_URL: rawBase,
    NEXT_PUBLIC_BASE_DOMAIN: cleanBaseDomain,
  },
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
  allowedDevOrigins: ['192.168.1.102', '*.localhost:3000', '*.localhost', 'localhost:3000'],
};

export default nextConfig;
