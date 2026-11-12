// Service Worker RataKu — membuat aplikasi bisa diinstal dan berjalan offline (docs/06 bagian 3.4).
// Setiap rilis: naikkan CACHE_VERSION (samakan dengan js/config.js) dan daftarkan file baru
// di PRECACHE_URLS. Tes tests/test_pwa.py memastikan tidak ada file yang terlewat.

const CACHE_VERSION = '0.7.0';
const CACHE_NAME = `rataku-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './content/index.json',
  './content/mean/01-makna.json',
  './content/mean/02-menghitung.json',
  './content/mean/03-data-banyak.json',
  './content/mean/04-tabel-frekuensi.json',
  './content/mean/05-soal-cerita.json',
  './content/mean/06-bernalar.json',
  './content/mean/items/practice.json',
  './content/mean/items/quiz.json',
  './content/mean/items/readiness.json',
  './content/mean/topic.json',
  './content/questionnaires.json',
  './css/base.css',
  './css/components.css',
  './css/tokens.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './js/app.js',
  './js/config.js',
  './js/core/adaptive.js',
  './js/core/answer-key.js',
  './js/core/check.js',
  './js/core/diagnose.js',
  './js/core/fading.js',
  './js/core/hints.js',
  './js/core/lesson-plan.js',
  './js/core/mean.js',
  './js/core/number-format.js',
  './js/core/progress-summary.js',
  './js/core/quiz.js',
  './js/core/solution.js',
  './js/data/content-loader.js',
  './js/data/db.js',
  './js/data/log.js',
  './js/data/progress.js',
  './js/data/store.js',
  './js/data/sync.js',
  './js/install.js',
  './js/router.js',
  './js/theme-init.js',
  './js/ui/components/data-table.js',
  './js/ui/components/inputs.js',
  './js/ui/components/item-solver.js',
  './js/ui/components/layout.js',
  './js/ui/components/scale.js',
  './js/ui/components/story-text.js',
  './js/ui/components/visuals.js',
  './js/ui/dom.js',
  './js/ui/strings.js',
  './js/ui/views/home.js',
  './js/ui/views/lesson.js',
  './js/ui/views/message.js',
  './js/ui/views/progress-view.js',
  './js/ui/views/questionnaire.js',
  './js/ui/views/quiz.js',
  './js/ui/views/readiness.js',
  './js/ui/views/settings.js',
  './js/ui/views/shared.js',
  './js/ui/views/topic-menu.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('rataku-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API selalu ke jaringan, tidak pernah di-cache.
  if (url.pathname.startsWith('/api/')) return;

  // Navigasi halaman: kembalikan index.html dari cache agar tetap terbuka saat offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(request)),
    );
    return;
  }

  // Konten JSON materi/soal: tampilkan dari cache, perbarui diam-diam di latar belakang.
  if (url.pathname.includes('/content/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Aset aplikasi (CSS, JS, ikon): cache dulu, jaringan bila belum ada.
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}
