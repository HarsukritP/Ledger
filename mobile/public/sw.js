/* Ledger Service Worker — handles web push notifications */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/* ── Push received ─────────────────────────────────────────── */
self.addEventListener("push", (event) => {
  let payload = { title: "Ledger", body: "", data: {} };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    payload.body = event.data ? event.data.text() : "";
  }

  const iconMap = {
    briefing: "/icon-briefing.png",
    low_balance: "/icon-alert.png",
    cashflow_risk: "/icon-alert.png",
    default: "/icon.png",
  };
  const type = payload.data?.type || "default";

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: iconMap[type] || iconMap.default,
      badge: "/badge.png",
      tag: type,           // collapse same-type notifications
      renotify: true,
      data: payload.data,
      vibrate: [100, 50, 100],
    })
  );
});

/* ── Notification click ─────────────────────────────────────── */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const type = event.notification.data?.type;

  // Route to relevant page based on notification type
  const routes = {
    briefing: "/",
    low_balance: "/(app)",
    cashflow_risk: "/(app)/forecast",
  };
  const path = routes[type] || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus existing window if open
        for (const client of clients) {
          if ("focus" in client) return client.focus();
        }
        // Otherwise open a new window
        return self.clients.openWindow(path);
      })
  );
});
