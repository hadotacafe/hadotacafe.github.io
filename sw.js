const CACHE_NAME = "hadota-images-v1";

self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("hadota-images-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isImage = request.destination === "image" || /\.(?:avif|gif|jpe?g|png|webp|svg)$/i.test(url.pathname);
  if (!isImage) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const refresh = fetch(request).then(response => {
      if (response && (response.ok || response.type === "opaque")) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    }).catch(() => cached);

    return cached || await refresh;
  })());
});
