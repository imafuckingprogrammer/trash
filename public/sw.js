// LibroVision Service Worker
// Provides advanced caching strategies for optimal performance

const CACHE_NAME = 'librovision-v1';
const API_CACHE_NAME = 'librovision-api-v1';
const IMAGE_CACHE_NAME = 'librovision-images-v1';
const STATIC_CACHE_NAME = 'librovision-static-v1';

// Cache duration constants (in milliseconds)
const CACHE_DURATIONS = {
  STATIC: 30 * 24 * 60 * 60 * 1000, // 30 days
  API: 5 * 60 * 1000, // 5 minutes
  IMAGES: 7 * 24 * 60 * 60 * 1000, // 7 days
  PAGES: 24 * 60 * 60 * 1000, // 1 day
};

// URLs to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add other critical static assets
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/books',
  '/api/users',
  '/api/reviews',
  '/api/lists',
];

// Image domains to cache
const IMAGE_DOMAINS = [
  'books.google.com',
  'books.googleusercontent.com',
  'covers.openlibrary.org',
  'images-na.ssl-images-amazon.com',
  'lh3.googleusercontent.com',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting(),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== IMAGE_CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME
            ) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim(),
    ])
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

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isApiRequest(url)) {
    event.respondWith(handleApiRequest(request));
  } else if (isImageRequest(url)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isPageRequest(url)) {
    event.respondWith(handlePageRequest(request));
  }
});

// Check if request is an API call
function isApiRequest(url) {
  return url.pathname.startsWith('/api/') || 
         API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
}

// Check if request is for an image
function isImageRequest(url) {
  return IMAGE_DOMAINS.some(domain => url.hostname.includes(domain)) ||
         url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
}

// Check if request is for a static asset
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i) ||
         url.pathname.startsWith('/_next/static/');
}

// Check if request is for a page
function isPageRequest(url) {
  return url.origin === self.location.origin && 
         !url.pathname.startsWith('/api/') &&
         !isStaticAsset(url) &&
         !isImageRequest(url);
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    console.log('Network failed for API request, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Check if cached response is still fresh
      const cachedDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();
      
      if (now - cachedDate < CACHE_DURATIONS.API) {
        return cachedResponse;
      }
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'API not available offline' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cached image is still fresh
    const cachedDate = new Date(cachedResponse.headers.get('date') || 0);
    const now = new Date();
    
    if (now - cachedDate < CACHE_DURATIONS.IMAGES) {
      return cachedResponse;
    }
  }
  
  try {
    // Fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache the image
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // Return cached version if available
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return placeholder image
    return new Response('', { status: 404 });
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  
  // Try cache first
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache the asset
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache the page
      const responseClone = response.clone();
      await cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    const offlineResponse = await cache.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  console.log('Handling background sync...');
  
  // Get pending actions from IndexedDB
  const pendingActions = await getPendingActions();
  
  for (const action of pendingActions) {
    try {
      await retryAction(action);
      await removePendingAction(action.id);
    } catch (error) {
      console.log('Failed to retry action:', action, error);
    }
  }
}

// Get pending actions from IndexedDB
async function getPendingActions() {
  // This would integrate with IndexedDB to store offline actions
  // For now, return empty array
  return [];
}

// Retry a failed action
async function retryAction(action) {
  const { method, url, body, headers } = action;
  
  const response = await fetch(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to retry action: ${response.status}`);
  }
  
  return response;
}

// Remove pending action from IndexedDB
async function removePendingAction(actionId) {
  // This would remove the action from IndexedDB
  console.log('Removing pending action:', actionId);
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data,
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const { action, data } = event;
  
  let url = '/';
  
  if (action) {
    // Handle action clicks
    url = data?.actionUrls?.[action] || '/';
  } else if (data?.url) {
    // Handle notification body click
    url = data.url;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCache(data?.cacheName));
      break;
      
    case 'PRELOAD_ROUTES':
      event.waitUntil(preloadRoutes(data?.routes || []));
      break;
      
    default:
      console.log('Unknown message type:', type);
  }
});

// Clear specific cache
async function clearCache(cacheName) {
  if (cacheName) {
    await caches.delete(cacheName);
  } else {
    // Clear all caches
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

// Preload specific routes
async function preloadRoutes(routes) {
  const cache = await caches.open(CACHE_NAME);
  
  for (const route of routes) {
    try {
      const response = await fetch(route);
      if (response.ok) {
        await cache.put(route, response);
      }
    } catch (error) {
      console.log('Failed to preload route:', route, error);
    }
  }
}

console.log('LibroVision Service Worker loaded'); 