const CACHE_NAME = 'acl-counter-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Do not intercept Firestore/Google APIs, non-GET requests, or chrome extensions
  if (
    event.request.method !== 'GET' ||
    url.includes('firestore.googleapis.com') ||
    url.includes('google.com') ||
    url.startsWith('chrome-extension:')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      });
    })
  );
});
