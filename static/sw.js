const CACHE_NAME = 'steinid-v2';
const urlsToCache = [
    '/',
    '/static/css/style.css',
    '/static/js/app.js',
    '/static/js/identifikator.js',
    '/static/js/kategorier.js',
    '/static/manifest.json',
    '/static/images/icon-192x192.png',
    '/static/images/icon-512x512.png',
    '/static/images/favicon-16x16.png',
    '/static/images/favicon-32x32.png',
    '/static/images/favicon.ico',
    '/static/images/apple-touch-icon.png'
];

// Installer service worker
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

// Hent fra cache
self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                // Returner cached versjon hvis den finnes
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

// Oppdater cache
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});