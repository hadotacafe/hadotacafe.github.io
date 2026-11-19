const CACHE_NAME = "hadota-images-v1";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("hadota-images-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isImage =
    request.destination === "image" ||
    /\.(?:avif|gif|jpe?g|png|webp|svg)$/i.test(url.pathname);

  if (!isImage) return;

  const cacheReady = caches.open(CACHE_NAME).then(async cache => ({
    cache,
    cached: await cache.match(request)
  }));

  const networkRefresh = cacheReady.then(async ({ cache, cached }) => {
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      if (cached) return cached;
      throw error;
    }
  });

  event.respondWith(
    cacheReady.then(({ cached }) => cached || networkRefresh)
  );

  // Keep the background refresh alive when a cached image is returned.
  event.waitUntil(networkRefresh.then(() => undefined).catch(() => undefined));
});
