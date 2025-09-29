// Service Worker for caching and performance optimization
const CACHE_NAME = 'lc-workflow-v1';
const STATIC_CACHE = 'lc-workflow-static-v1';
const RUNTIME_CACHE = 'lc-workflow-runtime-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/_next/static/media/',
  '/favicon.ico',
  '/manifest.json'
];

// API cache configuration
const API_CACHE_CONFIG = {
  '/api/': {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 50
  },
  '/api/analytics': {
    maxAge: 10 * 60 * 1000, // 10 minutes
    maxEntries: 20
  }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheConfig = API_CACHE_CONFIG[url.pathname] || API_CACHE_CONFIG['/api/'];

  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', url.pathname);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return error response if no cache
    return new Response(JSON.stringify({
      error: 'Network error and no cached data available',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  const url = new URL(request.url);

  // For HTML pages, try network first, then cache
  if (request.headers.get('accept')?.includes('text/html')) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // Return offline page if available
      return caches.match('/');
    }
  }

  // For static assets, use cache-first strategy
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch resource:', url.pathname);
    return new Response('Resource not available', { status: 404 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle any offline actions that need to be synced
  // This could include form submissions, analytics data, etc.
  console.log('[SW] Processing background sync');
}

// Push notifications (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: data.url
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic cleanup of old cache entries
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEANUP_CACHE') {
    event.waitUntil(cleanupCache());
  }
});

async function cleanupCache() {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();

  const now = Date.now();
  const expiredKeys = [];

  for (const request of keys) {
    const response = await cache.match(request);
    if (response) {
      const date = response.headers.get('date');
      if (date) {
        const age = now - new Date(date).getTime();
        const maxAge = getMaxAgeForRequest(request.url);

        if (age > maxAge) {
          expiredKeys.push(request);
        }
      }
    }
  }

  await Promise.all(expiredKeys.map(request => cache.delete(request)));

  console.log(`[SW] Cleaned up ${expiredKeys.length} expired cache entries`);
}

function getMaxAgeForRequest(url) {
  if (url.includes('/api/analytics')) {
    return API_CACHE_CONFIG['/api/analytics'].maxAge;
  }
  if (url.includes('/api/')) {
    return API_CACHE_CONFIG['/api/'].maxAge;
  }
  return 24 * 60 * 60 * 1000; // 24 hours for other resources
}