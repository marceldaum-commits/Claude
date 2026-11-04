// Abschalt-Service-Worker für die alte Adresse (kali-level-up.pages.dev):
// ersetzt den alten Offline-Cache, löscht ihn und leitet offene Fenster auf die neue Adresse.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate('https://www.nachtfalter.tech/');
})()));
