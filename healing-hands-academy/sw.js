// Service Worker for Who Wants to be a Massage Millionaire

const CACHE_NAME = 'massage-millionaire-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/animations.css',
  '/js/app.js',
  '/js/game-logic.js',
  '/js/claude-api.js',
  '/js/audio-manager.js',
  '/js/lifelines.js',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests when offline
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Background sync for question preloading
self.addEventListener('sync', (event) => {
  if (event.tag === 'preload-questions') {
    event.waitUntil(preloadQuestions());
  }
});

async function preloadQuestions() {
  try {
    // This would typically preload questions when online
    console.log('Background sync: Preloading questions');
    
    // Store in IndexedDB for offline access
    const cache = await caches.open(CACHE_NAME);
    // Implementation would store questions locally
    
  } catch (error) {
    console.error('Failed to preload questions:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});