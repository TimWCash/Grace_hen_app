// Minimal service worker — makes the app installable on Android/Chrome and is
// the hook point for future web-push. Network passthrough; no offline caching
// (the app needs Supabase live anyway).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Pass through to network (default). Handler present so Chrome treats the
  // app as installable.
});
