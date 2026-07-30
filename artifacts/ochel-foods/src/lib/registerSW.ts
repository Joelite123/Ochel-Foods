/**
 * Register the app's service worker.
 * Handles push notifications and basic offline navigation caching.
 * Safe to call unconditionally — exits silently if SW is not supported.
 */
export function registerSW(): void {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Poll for updates every hour
        setInterval(() => registration.update(), 60 * 60 * 1000);
      })
      .catch((err) => {
        // Non-fatal — app still works without the SW
        console.warn("[SW] Registration failed:", err);
      });
  });
}
