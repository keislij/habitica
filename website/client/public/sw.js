/* Service worker for the self-hosted family chores instance.
 *
 * DESIGN CONSTRAINT: this runs on children's iPads. A service worker that
 * serves cached responses in preference to the network can pin a stale build
 * past a deploy, and clearing it on iOS means talking a child through Safari's
 * settings. There is no remote kill switch for a wedged SW. So this one is
 * deliberately NETWORK-FIRST for everything it handles: the cache is only ever
 * consulted when the network actually fails. It cannot serve a stale app to an
 * online device, which is the whole reason a SW was withheld until now.
 *
 * It exists for two things only:
 *   1. the app opening at all when the wifi drops mid-use
 *   2. Chrome/Android installability, which requires a fetch handler
 *
 * iOS Add-to-Home-Screen does NOT require this file and never did.
 */

const VERSION = 'chores-v1';
const OFFLINE_URL = '/static/offline.html';

// Precache only the offline page. Deliberately NOT the app shell: caching
// index.html is exactly how a SW pins a stale build, because index.html is what
// names the hashed asset bundles.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

// Drop every cache that is not the current version, then take control at once
// so a new deploy is in charge immediately rather than after a tab close.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Escape hatch: posting {type:'UNREGISTER'} makes the worker remove itself and
// wipe its caches, so a wedged install can be cleared from the page rather than
// from device settings.
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'UNREGISTER') {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => self.registration.unregister())
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(c => c.navigate(c.url))),
    );
  }
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Never touch anything that is not a same-origin GET. In particular the API
  // must always go straight to the network -- a cached chore board would show a
  // child stale gold, or hide a chore a parent just assigned.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network-first, falling back to the offline page. Note the
  // fallback is NOT the app -- showing a cached app shell whose asset hashes no
  // longer exist is precisely the permanent-blank-screen failure this instance
  // already suffered once.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Static assets: network-first, cache purely as an offline fallback. Hashed
  // filenames under /assets/ mean a cached copy is only ever returned for a URL
  // that is still current, so this cannot resurrect an old build.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/static/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
  }
});
