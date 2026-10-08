// A minimal service worker: it makes the app installable, and nothing more.
// It does not cache anything or touch requests yet (the offline queue, #14, will change that),
// so the app and the realtime connection behave exactly as they do in a browser tab.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
// Chrome on Android used to require a fetch handler to offer "Install". Leaving it
// empty lets every request go straight to the network.
self.addEventListener('fetch', () => {})
