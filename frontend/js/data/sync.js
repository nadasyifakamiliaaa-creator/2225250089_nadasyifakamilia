// Kirim antrian log ke server saat online (docs/06 bagian 3.3).
// Gagal kirim tidak pernah mengganggu siswa: data tetap di antrian dan dicoba lagi nanti.
import { CONFIG } from '../config.js';
import { deleteRecords, getAllRecords } from './db.js';
import { getIdentity } from './store.js';

const BATCH_SIZE = 100;
const DELAY_MS = 1500;

let timer = null;
let running = null;

/** Jadwalkan pengiriman sebentar lagi (menggabungkan beberapa event sekaligus). */
export function scheduleSync(delay = DELAY_MS) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    syncNow();
  }, delay);
}

/** Kirim semua isi antrian. Mengembalikan banyak event yang berhasil terkirim. */
export function syncNow() {
  running ??= send().finally(() => {
    running = null;
  });
  return running;
}

async function send() {
  const { classCode, studentCode } = getIdentity();
  if (!classCode || !studentCode || !navigator.onLine) return 0;

  const queue = (await getAllRecords('outbox')).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let sent = 0;
  for (let start = 0; start < queue.length; start += BATCH_SIZE) {
    const batch = queue.slice(start, start + BATCH_SIZE);
    try {
      const response = await fetch(`${CONFIG.apiBase}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode, studentCode, events: batch }),
      });
      if (!response.ok) {
        console.warn('Sinkronisasi ditolak server:', response.status);
        return sent;
      }
    } catch (error) {
      console.warn('Sinkronisasi gagal (offline?):', error);
      return sent;
    }
    await deleteRecords(
      'outbox',
      batch.map((event) => event.clientId),
    );
    sent += batch.length;
  }
  return sent;
}

/** Banyak event yang belum terkirim (untuk ditampilkan di halaman Progres). */
export async function pendingCount() {
  return (await getAllRecords('outbox')).length;
}

/** Pasang pemicu: saat aplikasi dibuka dan saat koneksi kembali. */
export function initSync() {
  window.addEventListener('online', () => scheduleSync(0));
  scheduleSync(0);
}

/**
 * Cek kode kelas ke server.
 * @returns {Promise<{ status: 'ok', classroom: { code: string, name: string, research: boolean } }
 *   | { status: 'unknown' } | { status: 'offline' }>}
 */
export async function checkClassroom(classCode) {
  try {
    const response = await fetch(`${CONFIG.apiBase}/api/classroom/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classCode }),
    });
    if (response.status === 404 || response.status === 422) return { status: 'unknown' };
    if (!response.ok) return { status: 'offline' };
    return { status: 'ok', classroom: await response.json() };
  } catch {
    return { status: 'offline' };
  }
}
