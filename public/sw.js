const VERSION = 'v1';
const SHELL_CACHE = `usdtoworld-shell-${VERSION}`;
const RUNTIME_CACHE = `usdtoworld-runtime-${VERSION}`;
const RATE_CACHE = `usdtoworld-rate-${VERSION}`;

// Stable, un-hashed routes we can safely precache at install time.
const SHELL_URLS = [
  '/',
  '/offline/',
  '/favicon/site.webmanifest',
  '/favicon/favicon.svg',
  '/favicon/favicon-96x96.png',
  '/favicon/apple-touch-icon.png',
];

const RATE_API_HOST = 'open.er-api.com';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, RUNTIME_CACHE, RATE_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Live exchange rate API: network-first, cache the last good response.
  if (url.hostname === RATE_API_HOST) {
    event.respondWith(networkFirstRate(request));
    return;
  }

  // Page navigations: network-first, fall back to cached page, then to /offline/.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Same-origin static assets (hashed JS/CSS, icons, fonts): cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstStatic(request));
  }
});

async function networkFirstRate(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RATE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request, { cacheName: RATE_CACHE });
    if (cached) return cached;
    throw err;
  }
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = (await caches.match(request)) || (await caches.match(new URL('/offline/', self.location.origin)));
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok && request.method === 'GET') {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return cached || Response.error();
  }
}
