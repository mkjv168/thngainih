const CACHE = 'v1';
const SHELL = ['./', './index.html', './styles.css', './js/config.js', './js/app.js', './js/i18n.js', './js/analytics.js', './i18n/en.json', './i18n/km.json', './assets/fonts/inter-latin-var.woff2', './assets/fonts/kantumruy-khmer-var.woff2', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const dataURL = new URL('./data/content.json', self.registration.scope);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = async () => {
      const response = await fetch(event.request);
      if (!response.ok) throw new Error('Network response failed');
      await cache.put(event.request, response.clone());
      return response;
    };
    if (url.pathname === dataURL.pathname) {
      try { return await network(); }
      catch { return await cache.match(event.request) || Response.error(); }
    }
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try { return await network(); }
    catch {
      if (event.request.mode === 'navigate') return await cache.match('./index.html') || Response.error();
      return Response.error();
    }
  })());
});
