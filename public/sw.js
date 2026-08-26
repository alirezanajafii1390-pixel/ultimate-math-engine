/* Math Engine — Service Worker
 * Strategy:
 *  - App shell (index.html / "/"): network-first, falling back to cache
 *    when offline, so client-side routing (BrowserRouter) still works for
 *    any URL when there's no network.
 *  - Same-origin built assets (JS/CSS/fonts, Vite content-hashes their
 *    filenames): cache-first — a cache hit is always the correct version,
 *    since any content change ships under a new hashed filename.
 *  - Cross-origin requests are never intercepted.
 *
 * Bump VERSION on release to invalidate the previous cache; old caches are
 * removed on activate.
 */
const VERSION = 'v1';
const CACHE_NAME = `math-engine-${VERSION}`;

// Resolve relative to the SW's own location so this works whether the app
// is deployed at a domain root or under a subpath (see vite base: './').
const SHELL_URL = new URL('./', self.location).href;

const PRECACHE_URLS = [
  SHELL_URL,
  `${SHELL_URL}manifest.webmanifest`,
  `${SHELL_URL}favicon.svg`,
  `${SHELL_URL}favicon-32.png`,
  `${SHELL_URL}apple-touch-icon.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              // Don't let one missing/blocked asset fail the whole install.
              console.warn('[sw] precache skipped:', url, err);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: any client-side route (e.g. "/converter") must
  // fall back to the cached app shell offline, since only the real server
  // has that path — React Router takes it from there once mounted.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(SHELL_URL, copy));
          return res;
        })
        .catch(() => caches.open(CACHE_NAME).then((c) => c.match(SHELL_URL))),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
      }),
    ),
  );
});
