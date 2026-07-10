// Minimal shell-only service worker.
// It never caches API/data/auth responses — only a static offline fallback
// page and this file's own static assets. Its only job is to keep the app
// from showing the browser's default offline error screen.

const CACHE_NAME = "prepex-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever intervene for page navigations. Everything else (data
  // fetches, RSC payloads, static assets, auth calls) goes straight to the
  // network untouched.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.match(OFFLINE_URL).then((response) => response ?? Response.error())
    )
  );
});
