// Ringkasan progres: kesalahan yang paling sering dan subbab untuk mempelajarinya lagi. Fungsi murni.

/** Subbab yang paling tepat untuk memperbaiki setiap jenis kesalahan. */
export const ERROR_SUBTOPIC = Object.freeze({
  'E-N': 'mean-03',
  'E-SUM': 'mean-03',
  'E-SUM-MISS': 'mean-03',
  'E-DIV-N1': 'mean-02',
  'E-DIV': 'mean-02',
  'E-ROUND': 'mean-02',
  'E-FREQ-N': 'mean-04',
  'E-FREQ-SUM': 'mean-04',
  'E-SELECT': 'mean-05',
  'E-UNDERSTAND': 'mean-05',
  'E-INTERP': 'mean-05',
  'E-MISSING': 'mean-06',
});

/** Tambahkan daftar kode kesalahan ke penghitung { kode: jumlah }. E-OTHER diabaikan. */
export function addErrorCodes(counts, codes) {
  const next = { ...counts };
  for (const code of codes) {
    if (!code || !(code in ERROR_SUBTOPIC)) continue;
    next[code] = (next[code] ?? 0) + 1;
  }
  return next;
}

/** Semua kode kesalahan dari hasil satu soal (lihat ItemResult di item-solver.js). */
export function codesFromResult(result) {
  return Object.values(result.steps).flatMap((step) => step.codes ?? []);
}

/**
 * Kesalahan terbanyak dari semua catatan progres.
 * @param {Array<{ errorCounts?: Record<string, number> }>} records
 * @param {number} [limit]
 * @returns {Array<{ code: string, count: number, subtopicId: string }>}
 */
export function topErrors(records, limit = 3) {
  const total = {};
  for (const record of records) {
    for (const [code, count] of Object.entries(record.errorCounts ?? {})) {
      total[code] = (total[code] ?? 0) + count;
    }
  }
  return Object.entries(total)
    .filter(([code, count]) => count > 0 && code in ERROR_SUBTOPIC)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([code, count]) => ({ code, count, subtopicId: ERROR_SUBTOPIC[code] }));
}
