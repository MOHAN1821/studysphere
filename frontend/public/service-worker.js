// StudySphere offline app shell. Cache the current Vite build assets dynamically.
const CACHE_VERSION = "v1.0.1";
const CACHE_NAME = `studysphere-${CACHE_VERSION}`;
const API_CACHE_PATTERN = /^\/api\/(tasks|notes|learning|calendar|planner|focus|analytics|settings|achievements|goals|notifications)/;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch("/", { cache: "reload" });
    if (response.ok) {
      await cache.put("/", response.clone());
      await cache.put("/index.html", response.clone());
      const html = await response.text();
      const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\\?[^"]*)?)"/g)]
        .map(match => match[1])
        .filter(path => path.startsWith("/"));
      await Promise.all(assets.map(path => cache.add(path).catch(() => undefined)));
    }
    await cache.add("/manifest.json").catch(() => undefined);
    await cache.add("/favicon.svg").catch(() => undefined);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("studysphere-") && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  const url = new URL(request.url);
  if (API_CACHE_PATTERN.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request)) || new Response(
          JSON.stringify({ error: "offline", cached: false, message: "No cached response is available." }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
    })());
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("/", response.clone());
          await cache.put("/index.html", response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match("/index.html")) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try { return await fetch(request); } catch { return Response.error(); }
  })());
});
