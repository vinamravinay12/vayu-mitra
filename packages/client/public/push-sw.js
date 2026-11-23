/**
 * Vayu Mitra's service worker: shows air alerts while the app is closed.
 *
 * Alerts arrive as standard Web Push messages, encrypted by the server with
 * this browser's subscription keys and decrypted by the browser. The payload
 * is the title and body the server wrote; a tap opens (or focuses) the app.
 */

/** The notification fields from a push message, or null when it is not one of ours. */
function readAlert(event) {
  try {
    const fields = event.data?.json();
    return typeof fields?.title === 'string' && typeof fields?.body === 'string' ? fields : null;
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
