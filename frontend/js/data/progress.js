// Progres belajar per subbab: layar terakhir, layar terjauh, dan status selesai.
import { addErrorCodes } from '../core/progress-summary.js';
import { clearStore, getAllRecords, getRecord, putRecord } from './db.js';

/**
 * @typedef {{
 *   subtopicId: string,
 *   status: 'not_started'|'started'|'done',
 *   lastScreen: number,
 *   furthestScreen: number,
 *   totalScreens: number,
 *   updatedAt: string,
 * }} Progress
 */

function empty(subtopicId) {
  return {
    subtopicId,
    status: 'not_started',
    lastScreen: 0,
    furthestScreen: 0,
    totalScreens: 0,
    updatedAt: '',
  };
}

/** @returns {Promise<Progress>} */
export async function getProgress(subtopicId) {
  return { ...empty(subtopicId), ...(await getRecord('progress', subtopicId)) };
}

/** @returns {Promise<Record<string, Progress>>} */
export async function getAllProgress() {
  const records = (await getAllRecords('progress')).filter((r) => r.subtopicId !== QUIZ_RECORD_ID);
  return Object.fromEntries(records.map((record) => [record.subtopicId, record]));
}

/** Catat bahwa siswa membuka layar `screen` (1-based). Mengembalikan progres sebelum dicatat. */
export async function recordScreen(subtopicId, screen, totalScreens) {
  const before = await getProgress(subtopicId);
  await putRecord('progress', {
    ...before,
    status: before.status === 'done' ? 'done' : 'started',
    lastScreen: screen,
    furthestScreen: Math.max(before.furthestScreen, screen),
    totalScreens,
    updatedAt: new Date().toISOString(),
  });
  return before;
}

/** Keadaan adaptif subbab (lihat core/adaptive.js), atau null bila belum ada. */
export async function getAdaptive(subtopicId) {
  return (await getProgress(subtopicId)).adaptive ?? null;
}

export async function saveAdaptive(subtopicId, adaptive) {
  const before = await getProgress(subtopicId);
  await putRecord('progress', { ...before, adaptive, updatedAt: new Date().toISOString() });
}

/** Tambahkan kode kesalahan ke penghitung subbab (untuk halaman Progres). */
export async function recordErrors(subtopicId, codes) {
  if (!codes.length) return;
  const before = await getProgress(subtopicId);
  await putRecord('progress', {
    ...before,
    errorCounts: addErrorCodes(before.errorCounts ?? {}, codes),
    updatedAt: new Date().toISOString(),
  });
}

// ---- Kuis: disimpan di store yang sama dengan kunci khusus

export const QUIZ_RECORD_ID = 'mean-quiz';

/** @returns {Promise<{ attempts: number, bestPercent: number, lastPercent: number|null, errorCounts: object }>} */
export async function getQuizRecord() {
  return {
    attempts: 0,
    bestPercent: 0,
    lastPercent: null,
    errorCounts: {},
    ...(await getRecord('progress', QUIZ_RECORD_ID)),
  };
}

export async function saveQuizResult(percent, codes) {
  const before = await getQuizRecord();
  await putRecord('progress', {
    ...before,
    subtopicId: QUIZ_RECORD_ID,
    attempts: before.attempts + 1,
    bestPercent: Math.max(before.bestPercent, percent),
    lastPercent: percent,
    errorCounts: addErrorCodes(before.errorCounts, codes),
    updatedAt: new Date().toISOString(),
  });
}

/** Hapus semua progres di perangkat ini (Pengaturan → Hapus progres). */
export function clearProgress() {
  return clearStore('progress');
}

export async function markDone(subtopicId) {
  const before = await getProgress(subtopicId);
  await putRecord('progress', { ...before, status: 'done', updatedAt: new Date().toISOString() });
}
