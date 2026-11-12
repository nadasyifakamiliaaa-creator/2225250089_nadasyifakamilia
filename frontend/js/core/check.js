// Membandingkan jawaban angka dengan kunci (fungsi murni).
import { roundTo } from './mean.js';
import { parseNumber } from './number-format.js';

export const DEFAULT_TOLERANCE = 0.01;

/** |a − b| ≤ toleransi (dengan sedikit kelonggaran untuk galat pembulatan biner). */
export function isClose(a, b, tolerance = DEFAULT_TOLERANCE) {
  return Math.abs(a - b) <= tolerance + 1e-9;
}

/**
 * Jawaban diterima jika dekat dengan nilai tepat ATAU dengan nilai tepat yang dibulatkan
 * ke `decimals` angka di belakang koma. Contoh: 80,333… dengan decimals 1 → 80,3 dan 80,33 diterima.
 * @param {number} answer
 * @param {number} exact
 * @param {{ tolerance?: number, decimals?: number|null }} [options]
 */
export function isAccepted(answer, exact, { tolerance = DEFAULT_TOLERANCE, decimals = null } = {}) {
  if (!Number.isFinite(answer)) return false;
  if (isClose(answer, exact, tolerance)) return true;
  return decimals !== null && decimals !== undefined && isClose(answer, roundTo(exact, decimals), tolerance);
}

/**
 * Periksa isian siswa (teks) terhadap kunci.
 * @returns {{ status: 'empty'|'invalid'|'correct'|'incorrect', value: number|null }}
 */
export function checkNumberInput(raw, key, options = {}) {
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { status: 'empty', value: null };
  }
  const value = parseNumber(String(raw));
  if (value === null) return { status: 'invalid', value: null };
  return { status: isAccepted(value, key, options) ? 'correct' : 'incorrect', value };
}
