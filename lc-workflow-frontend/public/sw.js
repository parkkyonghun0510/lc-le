// Service Worker for offline support and caching
const CACHE_NAME = 'lc-workflow-v1';
const STATIC_CACHE_NAME = 'lc-workflow-static-v1';
const DYNAMIC_CACHE_NAME = 'lc-workflow-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/files',
  '/files/mobile',
  '/manifest.json',
  // Add other critical assets
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/v1\/files/,
  /\/api\/v1\/folders/,
  /\/api\/v1\/applications/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      // Cache successful responses for GET requests
      if (shouldCacheApiResponse(url.pathname)) {
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Try cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator header
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Served-From-Cache', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    // Return offline response for file lists
    if (url.pathname.includes('/files')) {
      return new Response(JSON.stringify({
        items: [],
        total: 0,
        page: 1,
        size: 50,
        offline: true
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Response': 'true'
        }
      });
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests
async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Return cached page or offline page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return caches.match('/');
  }
}

// Check if request is for a static asset
function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  return (
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf')
  );
}

// Check if API response should be cached
function shouldCacheApiResponse(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

// Background sync for file uploads
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'file-upload') {
    event.waitUntil(processUploadQueue());
  }
  
  if (event.tag === 'data-sync') {
    event.waitUntil(syncPendingChanges());
  }
});

// Process queued file uploads
async function processUploadQueue() {
  try {
    // Get queued uploads from IndexedDB
    const uploads = await getQueuedUploads();
    
    for (const upload of uploads) {
      try {
        const formData = new FormData();
        formData.append('file', upload.file);
        if (upload.applicationId) formData.append('application_id', upload.applicationId);
        if (upload.folderId) formData.append('folder_id', upload.folderId);
        if (upload.documentType) formData.append('document_type', upload.documentType);
        if (upload.fieldName) formData.append('field_name', upload.fieldName);
        
        const response = await fetch('/api/v1/files/upload', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          await removeFromUploadQueue(upload.id);
          
          // Notify clients of successful upload
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'UPLOAD_SUCCESS',
                data: { uploadId: upload.id, filename: upload.file.name }
              });
            });
          });
        }
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  } catch (error) {
    console.error('Failed to process upload queue:', error);
  }
}

// Sync pending changes
async function syncPendingChanges() {
  try {
    // Invalidate caches to force fresh data
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const keys = await cache.keys();
    
    for (const key of keys) {
      if (key.url.includes('/api/v1/files') || key.url.includes('/api/v1/folders')) {
        await cache.delete(key);
      }
    }
    
    // Notify clients to refresh data
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'DATA_SYNC_COMPLETE'
        });
      });
    });
  } catch (error) {
    console.error('Failed to sync pending changes:', error);
  }
}

// IndexedDB helpers for upload queue
async function getQueuedUploads() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('UploadQueue', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('uploads')) {
        db.createObjectStore('uploads', { keyPath: 'id' });
      }
    };
  });
}

async function removeFromUploadQueue(uploadId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('UploadQueue', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      const deleteRequest = store.delete(uploadId);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(data.url || '/') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(data.url || '/');
      }
    })
  );
});

// Message handling from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'QUEUE_UPLOAD':
      queueUpload(data);
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'CLEAR_CACHE':
      clearCache().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// Queue upload for background sync
async function queueUpload(uploadData) {
  try {
    const request = indexedDB.open('UploadQueue', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');
      
      const upload = {
        id: Date.now().toString(),
        ...uploadData,
        timestamp: Date.now()
      };
      
      store.add(upload);
      
      // Register background sync
      self.registration.sync.register('file-upload');
    };
  } catch (error) {
    console.error('Failed to queue upload:', error);
  }
}

// Get cache status
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

// Clear all caches
async function clearCache() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}