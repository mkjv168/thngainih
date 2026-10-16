const CACHE = 'v12-thngai-nih';
const SHELL = ['./privacy/', './privacy/index.html', './js/privacy.js', './js/day.js', './js/lib/locale.js', './', './index.html', './quiz/', './quiz/index.html', './js/vendor/momentkh.js', './js/lib/khmercal.js', './js/modules/today.js', './data/holidays.json', './data/day-colors.json', './styles.css', './js/config.js', './js/app.js', './js/i18n.js', './js/analytics.js', './js/source.js', './js/modules/quiz.js', './js/modules/content.js', './js/result.js', './quiz/quiz.json', './r/index.json', './i18n/en.json', './i18n/km.json', './assets/fonts/inter-latin-var.woff2', './assets/fonts/kantumruy-khmer-var.woff2', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './assets/fonts/moul-subset.woff2', './assets/orn/kbach-border.svg', './assets/orn/kbach-divider.svg', './assets/orn/kbach-corner.svg', './assets/orn/kbach-frame.svg', './assets/orn/kbach-flame.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL.map(url => new Request(url, {cache: 'reload'}))) /* bypass the HTTP cache so a new version never precaches stale files */));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = async () => {
      const response = await fetch(event.request);
      if (!response.ok) throw new Error('Network response failed');
      await cache.put(event.request, response.clone());
      return response;
    };
    const dataPaths = ['data/holidays.json', 'data/day-colors.json'].map(path => new URL(path, self.registration.scope).pathname);
    if (dataPaths.includes(url.pathname)) {
      const cached = await cache.match(event.request);
      const update = network().catch(() => cached || Response.error());
      event.waitUntil(update.then(() => {}));
      return cached || await update;
    }
    if (event.request.mode === 'navigate') {
      try { return await network(); }
      catch {
        const exact = await cache.match(event.request, {ignoreSearch:true});
        const quiz = url.pathname.startsWith(new URL('quiz/',self.registration.scope).pathname);
        return exact || await cache.match(quiz ? './quiz/index.html' : './index.html') || Response.error();
      }
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
