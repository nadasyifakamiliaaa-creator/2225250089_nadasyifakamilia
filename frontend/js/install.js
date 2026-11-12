// Tombol "Instal Aplikasi" (F10). Chrome Android/desktop memicu `beforeinstallprompt`;
// Safari iOS tidak, jadi untuk iOS ditampilkan petunjuk manual.

let deferredPrompt = null;
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

export function initInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  );
}

export function canPromptInstall() {
  return deferredPrompt !== null && !isStandalone();
}

export function isIosBrowser() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
  return iOS && !isStandalone();
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  notify();
  return outcome === 'accepted';
}

/** Dengarkan perubahan status instal. Mengembalikan fungsi untuk berhenti mendengarkan. */
export function onInstallChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
