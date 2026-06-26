// Service worker — makes the app installable AND receives web-push so a
// closed/locked phone still gets the "time to move" alerts.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Network passthrough; no offline caching (the app needs Supabase live).
});

// A push arrived (works even when the app is closed) → show a notification.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "Grace's Hen";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "grace-broadcast",
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: data.url || "/tonight" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tapping the notification focuses the app (or opens it).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
