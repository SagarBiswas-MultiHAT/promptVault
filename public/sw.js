/* PromptVault's deliberately small offline shell. */
const CACHE_NAME = 'promptvault-shell-v1';
const PRECACHE_ALWAYS = ['/manifest.json', '/theme-init.js'];

function extractShellAssets(html) {
  return [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map((match) => match[1]).filter(Boolean);
}

function extractChunkAssets(source) {
  return [...source.matchAll(/["']\.\/([^"'?#]+\.(?:js|css))["']/g)].map((match) => `/assets/${match[1]}`).filter(Boolean);
}

async function cacheAsset(cache, asset) {
  try {
    const response = await fetch(asset);
    if (!response.ok) return '';

    const contentType = response.headers.get('content-type') ?? '';
    const shouldScan = contentType.includes('javascript') || contentType.includes('text/css');
    const cachedResponse = response.clone();
    const source = shouldScan ? await response.text() : '';
    await cache.put(asset, cachedResponse);
    return source;
  } catch {
    // Runtime caching can fill this asset on the next connected visit.
    return '';
  }
}

async function cacheAssetTree(cache, assets) {
  const queued = [...new Set(assets)];
  const seen = new Set();

  while (queued.length > 0) {
    const asset = queued.shift();
    if (!asset || seen.has(asset)) continue;
    seen.add(asset);

    const source = await cacheAsset(cache, asset);
    if (!source) continue;

    for (const referencedAsset of extractChunkAssets(source)) {
      if (!seen.has(referencedAsset)) queued.push(referencedAsset);
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const shell = await fetch('/');
    await cache.put('/', shell.clone());
    const html = await shell.text();
    await cacheAssetTree(cache, [...PRECACHE_ALWAYS, ...extractShellAssets(html)]);
  })());
  self.skipWaiting();
});
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreVary: true })) || (await caches.match('/')) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())));
      return response;
    })),
  );
});
