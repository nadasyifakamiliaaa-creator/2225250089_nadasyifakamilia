// Log belajar untuk penelitian (F11). Etika: data HANYA dicatat bila siswa mengisi kode kelas
// dan kode siswa dari guru — tanpa kode, tidak ada yang disimpan maupun dikirim.
// Tidak ada nama, email, atau data pribadi lain; hanya kode siswa (docs/08 B.6).
import { CONFIG } from '../config.js';
import { putRecord } from './db.js';
import { getIdentity } from './store.js';
import { scheduleSync } from './sync.js';

/** Siswa ikut penelitian = sudah mengisi kode kelas dan kode siswa. */
export function isLogging() {
  const { classCode, studentCode } = getIdentity();
  return Boolean(classCode && studentCode);
}

/** Skala beban kognitif ditampilkan bila kelas dalam mode penelitian (atau dipaksa di config.js). */
export function isResearchMode() {
  return CONFIG.researchMode || (isLogging() && getIdentity().research === true);
}

function newClientId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Masukkan satu event ke antrian (IndexedDB "outbox"), lalu jadwalkan pengiriman.
 * @param {'attempt'|'effort'|'explain'|'quiz'|'progress'} type
 * @param {Record<string, unknown>} data lihat backend/app/schemas.py
 */
export async function logEvent(type, data) {
  if (!isLogging()) return;
  await putRecord('outbox', {
    clientId: newClientId(),
    type,
    createdAt: new Date().toISOString(),
    ...data,
  });
  scheduleSync();
}

/** Ubah event dari pengerja soal menjadi event "attempt". */
export function logAttempt(event, { context, subtopicId = null }) {
  return logEvent('attempt', {
    context,
    subtopicId,
    itemId: event.itemId,
    step: event.step,
    answer: String(event.answer ?? '').slice(0, 200),
    isCorrect: event.isCorrect,
    errorCode: event.errorCode ?? null,
    attemptNo: event.attemptNo,
    revealed: event.revealed,
    durationMs: event.durationMs ?? null,
  });
}
