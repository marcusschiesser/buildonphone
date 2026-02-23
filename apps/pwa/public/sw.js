// Service Worker for Claw2go PWA
// Strategy:
//   - App shell (navigation): network-first with cache fallback
//   - Next.js static assets (/_next/static/): cache-first (immutable hashed files)
//   - Default app sources (/default-apps/): stale-while-revalidate
//   - API routes (/api/): network-only (never cache)

const SHELL_CACHE = 'claw2go-shell-v1';
const STATIC_CACHE = 'claw2go-static-v1';
const ASSETS_CACHE = 'claw2go-assets-v1';

const APP_SHELL_URLS = ['/', '/create', '/manifest.webmanifest'];

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove stale caches ───────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = new Set([SHELL_CACHE, STATIC_CACHE, ASSETS_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !currentCaches.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never intercept API calls — always go to the network
  if (url.pathname.startsWith('/api/')) return;

  // Next.js immutable static assets — cache-first (filenames are content-hashed)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Default app JSX sources — stale-while-revalidate
  if (url.pathname.startsWith('/default-apps/')) {
    event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE));
    return;
  }

  // Static public assets (images, manifest, icons) — stale-while-revalidate
  if (
    url.pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|webmanifest|woff2?|ttf)$/)
  ) {
    event.respondWith(staleWhileRevalidate(request, ASSETS_CACHE));
    return;
  }

  // HTML navigation requests — network-first with app shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  // Next.js chunked JS/CSS that isn't under /_next/static/ — stale-while-revalidate
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }
});

// ── Strategy helpers ─────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached ?? networkFetch;
}

async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback: serve the cached root shell
    const cached =
      (await caches.match(request)) ?? (await caches.match('/'));
    if (cached) return cached;
    // Last resort — empty offline page
    return new Response('<h1>You are offline</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
