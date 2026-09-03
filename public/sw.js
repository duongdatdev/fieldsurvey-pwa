/**
 * FieldSurvey PWA - Service Worker
 * Version: 1.0.0
 * 
 * Implements full Service Worker Lifecycle:
 * - INSTALL: Pre-caches the App Shell
 * - ACTIVATE: Purges old cache versions and claims clients
 * - FETCH: Implements all 5 Cache Strategies:
 *   1. Cache-First (App shell, static scripts, stylesheets, icons)
 *   2. Network-First (Dynamic survey definitions)
 *   3. Stale-While-Revalidate (Templates and documentation)
 *   4. Cache-Only (Offline fallback page)
 *   5. Network-Only (Google Apps Script submissions & POST requests)
 * - SYNC: Background Sync API fallback
 */

const CACHE_NAME_APP_SHELL = 'field-survey-shell-v1';
const CACHE_NAME_DYNAMIC = 'field-survey-dynamic-v1';
const CACHE_NAME_TEMPLATES = 'field-survey-templates-v1';
const CACHE_NAME_OFFLINE = 'field-survey-offline-v1';

const ALL_CACHES = [
  CACHE_NAME_APP_SHELL,
  CACHE_NAME_DYNAMIC,
  CACHE_NAME_TEMPLATES,
  CACHE_NAME_OFFLINE,
];

// App Shell Resources for Cache-First Strategy
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon.svg',
];

// ============================================================================
// LIFECYCLE: INSTALL
// Pre-cache critical application shell
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install event fired. Caching App Shell...');
  event.waitUntil(
    (async () => {
      // Pre-cache App Shell
      const shellCache = await caches.open(CACHE_NAME_APP_SHELL);
      await shellCache.addAll(APP_SHELL_ASSETS);

      // Pre-cache Offline Fallback (Cache-Only resource)
      const offlineCache = await caches.open(CACHE_NAME_OFFLINE);
      await offlineCache.add('/offline.html');

      console.log('[ServiceWorker] Pre-caching complete. Calling skipWaiting()...');
      return self.skipWaiting();
    })()
  );
});

// ============================================================================
// LIFECYCLE: ACTIVATE
// Delete outdated cache buckets and immediately take control
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate event fired. Purging stale caches...');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => !ALL_CACHES.includes(name))
          .map((staleName) => {
            console.log(`[ServiceWorker] Deleting stale cache: ${staleName}`);
            return caches.delete(staleName);
          })
      );
      await self.clients.claim();
      console.log('[ServiceWorker] Clients claimed. Active and controlling page.');
    })()
  );
});

// ============================================================================
// LIFECYCLE: FETCH (5 CACHE STRATEGIES)
// ============================================================================
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // --------------------------------------------------------------------------
  // STRATEGY 5: NETWORK-ONLY
  // Purpose: Submissions to Google Apps Script or remote database must NEVER
  // be cached to prevent duplicate or stale POSTs.
  // --------------------------------------------------------------------------
  if (
    req.method !== 'GET' ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('script.googleusercontent.com') ||
    url.pathname.includes('/submitResponse') ||
    url.pathname.includes('/syncResponses')
  ) {
    // console.log(`[SW: Strategy 5 Network-Only] ${req.url}`);
    event.respondWith(fetch(req));
    return;
  }

  // --------------------------------------------------------------------------
  // STRATEGY 4: CACHE-ONLY
  // Purpose: Critical pre-cached offline resources (e.g. /offline.html).
  // Strictly read from cache without touching the network.
  // --------------------------------------------------------------------------
  if (url.pathname === '/offline.html') {
    // console.log(`[SW: Strategy 4 Cache-Only] ${req.url}`);
    event.respondWith(
      caches.match('/offline.html').then((cached) => {
        return cached || new Response('Offline emergency asset missing', { status: 404 });
      })
    );
    return;
  }

  // --------------------------------------------------------------------------
  // STRATEGY 3: STALE-WHILE-REVALIDATE
  // Purpose: Non-critical dynamic resources, templates, and documentation.
  // Return cached version instantly, while asynchronously updating cache in background.
  // --------------------------------------------------------------------------
  if (url.pathname.startsWith('/templates/') || url.pathname.startsWith('/docs/')) {
    // console.log(`[SW: Strategy 3 Stale-While-Revalidate] ${req.url}`);
    event.respondWith(
      caches.open(CACHE_NAME_TEMPLATES).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // --------------------------------------------------------------------------
  // STRATEGY 2: NETWORK-FIRST
  // Purpose: Remote survey catalog and dynamic live updates.
  // Always try network first for fresh survey definitions; fall back to cache offline.
  // --------------------------------------------------------------------------
  if (url.pathname.startsWith('/api/surveys') || url.searchParams.has('dynamicCatalog')) {
    // console.log(`[SW: Strategy 2 Network-First] ${req.url}`);
    event.respondWith(
      (async () => {
        const dynamicCache = await caches.open(CACHE_NAME_DYNAMIC);
        try {
          // Attempt network fetch with 3.5s timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const networkResponse = await fetch(req, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse.status === 200) {
            dynamicCache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (networkError) {
          const cached = await dynamicCache.match(req);
          if (cached) {
            return cached;
          }
          throw networkError;
        }
      })()
    );
    return;
  }

  // --------------------------------------------------------------------------
  // STRATEGY 1: CACHE-FIRST
  // Purpose: App Shell, static scripts, stylesheets, fonts, and icons.
  // Return from cache immediately; fetch from network only if missing.
  // --------------------------------------------------------------------------
  event.respondWith(
    (async () => {
      // 1. Check App Shell cache
      const cached = await caches.match(req);
      if (cached) {
        return cached;
      }

      // 2. Fetch from network and dynamically cache valid GET responses
      try {
        const networkResponse = await fetch(req);
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          req.method === 'GET' &&
          (url.origin === self.location.origin || url.hostname.includes('fonts.gstatic.com'))
        ) {
          const shellCache = await caches.open(CACHE_NAME_APP_SHELL);
          shellCache.put(req, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // If navigation request fails and no cache, serve offline fallback
        if (req.mode === 'navigate') {
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
        }
        throw err;
      }
    })()
  );
});

// ============================================================================
// BACKGROUND SYNC API (PROGRESSIVE ENHANCEMENT)
// ============================================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-field-responses') {
    console.log('[ServiceWorker] Background Sync event triggered: sync-field-responses');
    event.waitUntil(
      (async () => {
        // Broadcast message to all active clients to trigger synchronization
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'TRIGGER_BACKGROUND_SYNC',
            timestamp: Date.now(),
          });
        });
      })()
    );
  }
});

// Notify clients on update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
