import type { NextConfig } from 'next';

const clerkSources = [
  'https://*.clerk.com',
  'https://*.clerk.accounts.dev',
  'https://clerk.buildonphone.com',
].join(' ');

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net https://unpkg.com https://*.posthog.com https://*.i.posthog.com ${clerkSources}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https: ${clerkSources}`,
  "font-src 'self' data: https:",
  `connect-src 'self' http: https: ws: wss: blob: data: ${clerkSources}`,
  "worker-src 'self' blob:",
  `frame-src 'self' blob: data: https://stackblitz.com https://*.stackblitz.com ${clerkSources}`,
].join('; ');

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',

  // Enable gzip/brotli compression for all responses
  compress: true,

  async headers() {
    return [
      // Long-lived immutable cache for content-hashed Next.js static assets
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Moderate cache for public static assets (including nested paths)
      {
        source: '/:path*.:ext(svg|png|jpg|jpeg|webp|ico|woff2|woff)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // Default app JSX — stale-while-revalidate so updates propagate
      {
        source: '/default-apps/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
        ],
      },
      // Service worker must never be cached so updates are picked up immediately
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Security + CSP headers on all routes
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self)'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
