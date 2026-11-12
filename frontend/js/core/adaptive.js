// Aturan adaptif sederhana tanpa AI (docs/03 bagian 2), berlaku per subbab. Fungsi murni.
//   • 3 soal latihan berturut-turut benar pada percobaan pertama → penghitung Tabel Data
//     disembunyikan (bisa dibuka lagi) dan siswa ditawari lanjut ke bagian berikutnya.
//   • 2 soal berturut-turut sampai pembahasan → tawarkan melihat contoh lagi; bantuan muncul lagi.

export const FLUENT_STREAK = 3;
export const REVIEW_STREAK = 2;

/** @typedef {{ firstTryStreak: number, revealStreak: number, counterHidden: boolean }} AdaptiveState */

/** @returns {AdaptiveState} */
export function initialAdaptiveState() {
  return { firstTryStreak: 0, revealStreak: 0, counterHidden: false };
}

/**
 * Golongkan hasil satu soal.
 * @param {{ steps: Record<string, { attempts: number, correct: boolean, revealed: boolean }> }} result
 * @returns {'first_try'|'revealed'|'mixed'}
 */
export function classifyResult(result) {
  const steps = Object.values(result.steps);
  if (steps.some((step) => step.revealed)) return 'revealed';
  if (steps.length > 0 && steps.every((step) => step.correct && step.attempts === 1)) {
    return 'first_try';
  }
  return 'mixed';
}

/**
 * @param {AdaptiveState} state
 * @param {Parameters<typeof classifyResult>[0]} result
 * @returns {AdaptiveState}
 */
export function nextAdaptiveState(state, result) {
  const kind = classifyResult(result);
  const firstTryStreak = kind === 'first_try' ? state.firstTryStreak + 1 : 0;
  const revealStreak = kind === 'revealed' ? state.revealStreak + 1 : 0;
  let counterHidden = state.counterHidden;
  if (firstTryStreak >= FLUENT_STREAK) counterHidden = true;
  if (kind === 'revealed') counterHidden = false; // expertise reversal: bantuan kembali saat kesulitan
  return { firstTryStreak, revealStreak, counterHidden };
}

/**
 * Pesan yang perlu ditampilkan setelah sebuah soal — hanya tepat saat ambang tercapai,
 * agar tidak muncul berulang-ulang.
 * @param {AdaptiveState} state keadaan SETELAH soal dikerjakan
 * @returns {'fluent'|'review'|null}
 */
export function adaptiveMessage(state) {
  if (state.firstTryStreak === FLUENT_STREAK) return 'fluent';
  if (state.revealStreak === REVIEW_STREAK) return 'review';
  return null;
}
