// O'chel Foods Admin — Service Worker
// Handles push notifications and basic offline navigation caching.
// Version: 1 — bump CACHE_NAME to force update.

const CACHE_NAME = "ochel-admin-v1";

// ── Install: cache the shell so the app loads when offline ───────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(["/", "/admin"]))
      .catch(() => {
        /* If caching fails (e.g. offline install), skip gracefully */
      })
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// ── Fetch: network-first for navigation, skip non-GET ────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(event.request)
        .then((cached) => cached || caches.match("/"))
        .then((r) => r || Response.error())
    )
  );
});

// ── Push: show notification ────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "New Order", body: event.data.text() };
  }

  const show = self.registration.showNotification(payload.title || "New Order", {
    body: payload.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    data: { url: payload.url || "/admin/orders" },
    tag: payload.tag || "new-order",
    // requireInteraction and vibrate are Android-only — omitting them keeps
    // the notification working correctly on both Android and iOS 16.4+.
  });

  event.waitUntil(show);
});

// ── Notification click: open or focus the dashboard ──────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin/orders";

  const focus = self.clients
    .matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      const existing = clients.find((c) => "focus" in c);
      if (existing) {
        existing.focus();
        return existing.navigate(targetUrl);
      }
      return self.clients.openWindow(targetUrl);
    });

  event.waitUntil(focus);
});
