/**
 * Vayu Mitra's service worker: shows air alerts while the app is closed.
 *
 * Alerts arrive as Firebase Cloud Messaging data messages, so this worker
 * needs no Firebase code: it reads the title and body the server wrote and
 * shows them, and a tap opens (or focuses) the app.
 */

/** The notification fields from an FCM data message, or null when it is not one of ours. */
function readAlert(event) {
  try {
    const payload = event.data?.json();
    const data = payload?.data;
    return typeof data?.title === 'string' && typeof data?.body === 'string' ? data : null;
  } catch {
    return null;
  }
}

self.addEventListener('push', (event) => {
  const alert = readAlert(event);
  if (alert === null) return;
  event.waitUntil(
    self.registration.showNotification(alert.title, {
      body: alert.body,
      icon: '/favicon.svg',
      tag: 'vayu-air-alert',
      data: { url: '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => new URL(client.url).pathname === '/');
      return open === undefined ? self.clients.openWindow('/') : open.focus();
    }),
  );
});
