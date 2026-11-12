// Titik masuk aplikasi: router, tombol instal, dan Service Worker.
import { initSync } from './data/sync.js';
import { initInstall } from './install.js';
import { startRouter } from './router.js';
import { h } from './ui/dom.js';
import { STR } from './ui/strings.js';
import * as home from './ui/views/home.js';
import * as lesson from './ui/views/lesson.js';
import { messageView } from './ui/views/message.js';
import * as progressView from './ui/views/progress-view.js';
import * as questionnaire from './ui/views/questionnaire.js';
import * as quiz from './ui/views/quiz.js';
import * as readiness from './ui/views/readiness.js';
import * as settings from './ui/views/settings.js';
import * as topicMenu from './ui/views/topic-menu.js';

const routes = [
  { pattern: /^\/$/, view: home },
  { pattern: /^\/mean\/?$/, view: topicMenu },
  { pattern: /^\/mean\/kesiapan\/?$/, view: readiness },
  { pattern: /^\/mean\/kuis\/?$/, view: quiz },
  { pattern: /^\/mean\/(\d{2})(?:\/(\d+|selesai))?\/?$/, view: lesson },
  { pattern: /^\/progres\/?$/, view: progressView },
  { pattern: /^\/pengaturan\/?$/, view: settings },
  { pattern: /^\/kuesioner\/?$/, view: questionnaire },
];

initInstall();
startRouter(document.getElementById('main'), routes, messageView(STR.notFound));
registerServiceWorker();
initSync();

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');

      // SW baru sudah terpasang tetapi menunggu → tawarkan muat ulang (bukan otomatis).
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateBanner(registration.waiting);
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(worker);
          }
        });
      });
    } catch (error) {
      console.warn('Service Worker gagal didaftarkan:', error);
    }
  });

  // Kunjungan pertama: SW baru mengambil alih halaman (clients.claim) — itu bukan pembaruan,
  // jadi jangan memuat ulang (isian siswa bisa hilang). Muat ulang hanya bila ada versi lama.
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

function showUpdateBanner(worker) {
  const banner = document.getElementById('update-banner');
  banner.replaceChildren(
    h('p', {}, STR.update.message),
    h(
      'button',
      {
        type: 'button',
        className: 'btn btn-primary',
        onClick: () => worker.postMessage({ type: 'SKIP_WAITING' }),
      },
      STR.update.reload,
    ),
  );
  banner.hidden = false;
}
