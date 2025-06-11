// ========================================
// STEINID PRO - SERVICE WORKER
// ========================================

const CACHE_NAME = 'steinid-pro-v1.2.0';
const CACHE_VERSION = '1.2.0';

// Files to cache
const urlsToCache = [
    '/',
    '/identifikator',
    '/kategorier',
    '/offline',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/js/identifikator.js',
    '/static/js/kategorier.js',
    '/static/images/icon-192x192.png',
    '/static/images/icon-512x512.png',
    '/static/images/apple-touch-icon.png',
    '/static/manifest.json',
    // External resources
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// API endpoints that should be cached
const apiCacheList = [
    '/api/forslag',
    '/health'
];

// Install event - cache resources
self.addEventListener('install', event => {
    console.log('Service Worker: Install event');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching files');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Files cached successfully');
                // Force activation of new service worker
                return self.skipWaiting();
            })
            .catch(err => {
                console.error('Service Worker: Cache failed:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activate event');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Old caches cleared');
                // Take control of all pages
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Handle different types of requests
    if (request.method !== 'GET') {
        // Handle POST requests (like form submissions)
        return handleNonGetRequest(event);
    }
    
    if (url.pathname.startsWith('/api/')) {
        // Handle API requests
        return handleApiRequest(event);
    }
    
    if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
        // Handle image requests
        return handleImageRequest(event);
    }
    
    // Handle navigation and other requests
    event.respondWith(
        caches.match(request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    console.log('Service Worker: Serving from cache:', request.url);
                    return response;
                }
                
                // Fetch from network
                return fetch(request)
                    .then(response => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone response for caching
                        const responseToCache = response.clone();
                        
                        // Add to cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Network failed, try to serve offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/offline');
                        }
                        
                        // For other requests, return a basic offline response
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// Handle API requests with caching strategy
function handleApiRequest(event) {
    const request = event.request;
    const url = new URL(request.url);
    
    // Cache GET API requests
    if (apiCacheList.some(endpoint => url.pathname.includes(endpoint))) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        // Serve from cache and update in background
                        fetch(request)
                            .then(networkResponse => {
                                if (networkResponse.ok) {
                                    caches.open(CACHE_NAME)
                                        .then(cache => cache.put(request, networkResponse.clone()));
                                }
                            })
                            .catch(() => {
                                // Network failed, but we have cache
                            });
                        
                        return response;
                    }
                    
                    // Not in cache, fetch from network
                    return fetch(request)
                        .then(networkResponse => {
                            if (networkResponse.ok) {
                                const responseToCache = networkResponse.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(request, responseToCache));
                            }
                            return networkResponse;
                        })
                        .catch(() => {
                            // Return offline response for API calls
                            return new Response(JSON.stringify({
                                success: false,
                                error: 'Offline - denne funksjonen krever internettforbindelse',
                                offline: true
                            }), {
                                headers: { 'Content-Type': 'application/json' }
                            });
                        });
                })
        );
    } else {
        // For other API requests, just try network
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Offline - denne funksjonen krever internettforbindelse',
                        offline: true
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
    }
}

// Handle image requests
function handleImageRequest(event) {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                
                return fetch(event.request)
                    .then(response => {
                        if (response.ok) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseToCache));
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return placeholder image for failed image loads
                        return new Response(`
                            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                                <rect width="100%" height="100%" fill="#f8f9fa"/>
                                <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#6c757d">
                                    Bilde ikke tilgjengelig offline
                                </text>
                            </svg>
                        `, {
                            headers: { 'Content-Type': 'image/svg+xml' }
                        });
                    });
            })
    );
}

// Handle non-GET requests (like form submissions)
function handleNonGetRequest(event) {
    if (event.request.url.includes('/api/identifiser')) {
        // Handle offline stone identification
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    // Store request for later sync
                    return storeOfflineRequest(event.request)
                        .then(() => {
                            return new Response(JSON.stringify({
                                success: true,
                                offline: true,
                                message: 'Analysen er lagret offline og vil bli utført når du kommer online igjen.'
                            }), {
                                headers: { 'Content-Type': 'application/json' }
                            });
                        });
                })
        );
    } else {
        // For other POST requests, just try network
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(JSON.stringify({
                        success: false,
                        error: 'Offline - denne funksjonen krever internettforbindelse'
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                })
        );
    }
}

// Store offline requests for later sync
async function storeOfflineRequest(request) {
    const body = await request.text();
    const offlineRequest = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        timestamp: Date.now()
    };
    
    // Store in IndexedDB or localStorage
    try {
        const offlineRequests = JSON.parse(localStorage.getItem('steinid_offline_requests') || '[]');
        offlineRequests.push(offlineRequest);
        localStorage.setItem('steinid_offline_requests', JSON.stringify(offlineRequests));
        console.log('Offline request stored');
    } catch (error) {
        console.error('Failed to store offline request:', error);
    }
}

// Background sync for offline requests
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered');
    
    if (event.tag === 'background-sync') {
        event.waitUntil(syncOfflineRequests());
    }
});

// Sync offline requests when online
async function syncOfflineRequests() {
    try {
        const offlineRequests = JSON.parse(localStorage.getItem('steinid_offline_requests') || '[]');
        
        if (offlineRequests.length === 0) return;
        
        console.log(`Syncing ${offlineRequests.length} offline requests`);
        
        const syncPromises = offlineRequests.map(async (storedRequest, index) => {
            try {
                const response = await fetch(storedRequest.url, {
                    method: storedRequest.method,
                    headers: storedRequest.headers,
                    body: storedRequest.body
                });
                
                if (response.ok) {
                    // Remove synced request
                    offlineRequests.splice(index, 1);
                    console.log(`Synced offline request ${index + 1}`);
                    
                    // Notify user if possible
                    self.registration.showNotification('SteinID Pro', {
                        body: 'Offline analyse er fullført!',
                        icon: '/static/images/icon-192x192.png',
                        badge: '/static/images/icon-192x192.png',
                        tag: 'offline-sync'
                    });
                }
            } catch (error) {
                console.error('Failed to sync request:', error);
            }
        });
        
        await Promise.all(syncPromises);
        
        // Update localStorage
        localStorage.setItem('steinid_offline_requests', JSON.stringify(offlineRequests));
        
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notifications
self.addEventListener('push', event => {
    console.log('Service Worker: Push event received');
    
    const options = {
        body: event.data ? event.data.text() : 'Ny steinanalyse tilgjengelig!',
        icon: '/static/images/icon-192x192.png',
        badge: '/static/images/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Åpne app',
                icon: '/static/images/icon-192x192.png'
            },
            {
                action: 'close',
                title: 'Lukk',
                icon: '/static/images/icon-192x192.png'
            }
        ],
        requireInteraction: true
    };
    
    event.waitUntil(
        self.registration.showNotification('SteinID Pro', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification click received');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // Just close notification
        return;
    } else {
        // Default action - open app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handler for communication with main app
self.addEventListener('message', event => {
    console.log('Service Worker: Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: CACHE_VERSION,
            cacheTime: new Date().toISOString()
        });
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    if (event.tag === 'check-offline-data') {
        event.waitUntil(syncOfflineRequests());
    }
});

// Clean up old data periodically
function cleanupOldData() {
    try {
        const offlineRequests = JSON.parse(localStorage.getItem('steinid_offline_requests') || '[]');
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        const recentRequests = offlineRequests.filter(req => req.timestamp > oneWeekAgo);
        
        if (recentRequests.length !== offlineRequests.length) {
            localStorage.setItem('steinid_offline_requests', JSON.stringify(recentRequests));
            console.log('Service Worker: Cleaned up old offline requests');
        }
    } catch (error) {
        console.error('Service Worker: Cleanup failed:', error);
    }
}

// Run cleanup on activation
self.addEventListener('activate', event => {
    event.waitUntil(
        Promise.resolve(cleanupOldData())
    );
});