import { trustedOrigin } from './src/lib/trusted-origin.mjs';

/** @type {import('next').NextConfig} */
// A fixed server-side origin; no browser-controlled proxy destinations.
const upstream = trustedOrigin(process.env.API_UPSTREAM_ORIGIN ?? 'http://127.0.0.1:8001');

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The app never uses next/image. Keep the /_next/image optimizer off so it is
  // not served, and so release images can omit `sharp` (LGPL libvips binaries).
  images: { unoptimized: true },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${upstream}/api/:path*` }];
  },
};

export default nextConfig;
