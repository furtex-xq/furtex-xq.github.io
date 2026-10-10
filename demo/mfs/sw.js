/* Офлайн-кэш Math for Speed: приложение работает без интернета */

const CACHE = 'mfs-v27';

const ASSETS = [
  './',
  './index.html',
  './i18n.js',
  './lang-cs.js',
  './lang-en.js',
  './lang-uk.js',
  './lang-pl.js',
  './lang-de.js',
  './fonts.css',
  './styles.css',
  './animations.css',
  './features.css',
  './profile.css',
  './plus.css',
  './hooks.js',
  './icons.js',
  './features.js',
  './gen.js',
  './sound.js',
  './fx.js',
  './native.js',
  './ui.js',
  './extras.js',
  './modes.js',
  './learn.js',
  './meta.js',
  './insights.js',
  './polish.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/inter-400-latin.woff2',
  './fonts/inter-400-cyrillic.woff2',
  './fonts/outfit-600-latin.woff2',
  './fonts/caveat-600-latin.woff2',
  './fonts/caveat-600-cyrillic.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Сначала пробуем сеть (и обновляем кэш), а без сети берём из кэша.
// Так обновления приложения применяются сразу, но офлайн всё работает.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
  );
});
