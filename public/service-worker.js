const CACHE = "pet-v1";
const PRECACHE = ["/offline.html"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Never intercept API routes or auth — always go to network
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    if (url.pathname.startsWith("/_next/static/")) {
      // Static JS/CSS bundles: cache-first
      e.respondWith(
        caches.match(e.request).then(
          (cached) =>
            cached ??
            fetch(e.request).then((res) => {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, clone));
              return res;
            })
        )
      );
    }
    return;
  }

  // App icons: cache-first
  if (url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) =>
          cached ??
          fetch(e.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Navigation (HTML pages): network-first, offline fallback
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(
        () => caches.match(e.request) ?? caches.match("/offline.html")
      )
    );
    return;
  }
});
