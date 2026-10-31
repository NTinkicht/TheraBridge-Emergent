/** @type {import('next').NextConfig} */
// A fixed server-side origin; no browser-controlled proxy destinations.
const upstream = new URL(process.env.API_UPSTREAM_ORIGIN ?? 'http://127.0.0.1:8001');
if (!['http:', 'https:'].includes(upstream.protocol) ||
    upstream.username || upstream.password || upstream.pathname !== '/' ||
    upstream.search || upstream.hash) {
  throw new Error('API_UPSTREAM_ORIGIN must be a trusted HTTP(S) origin without credentials or path');
}

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
    return [{ source: '/api/:path*', destination: `${upstream.origin}/api/:path*` }];
  },
};

export default nextConfig;
