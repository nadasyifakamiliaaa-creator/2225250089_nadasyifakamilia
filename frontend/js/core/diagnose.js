// Diagnosis kesalahan siswa sesuai taksonomi docs/03 bagian 3 (fungsi murni).
// Mengembalikan kode kesalahan + parameter; teks petunjuk dibuat oleh hints.js.
import { computeKey, itemData, storyKeys } from './answer-key.js';
import { DEFAULT_TOLERANCE, isAccepted, isClose } from './check.js';
import { frequencyProducts, roundTo, runningTotals, sum, truncateTo } from './mean.js';

export const ERROR_CODES = Object.freeze({
  N: 'E-N',
  SUM: 'E-SUM',
  SUM_MISS: 'E-SUM-MISS',
  DIV_N1: 'E-DIV-N1',
  DIV: 'E-DIV',
  FREQ_N: 'E-FREQ-N',
  FREQ_SUM: 'E-FREQ-SUM',
  SELECT: 'E-SELECT',
  ROUND: 'E-ROUND',
  INTERP: 'E-INTERP',
  UNDERSTAND: 'E-UNDERSTAND',
  MISSING: 'E-MISSING',
  CALC: 'E-CALC',
  OTHER: 'E-OTHER',
});

/**
 * @typedef {{ correct: boolean, code: string|null, params: Record<string, unknown> }} Diagnosis
 */

const ok = (params = {}) => ({ correct: true, code: null, params });
const fail = (code, params = {}) => ({ correct: false, code, params });

/**
 * Diagnosis satu langkah jawaban.
 * @param {object} item butir soal (format docs/04)
 * @param {'understand'|'select'|'n'|'sum'|'divide'|'interpret'|'answer'|'choice'} step
 * @param {number|string[]|number} answer angka (sudah dibaca parseNumber), daftar kunci angka
 *   terpilih (select), atau indeks opsi (interpret/choice)
 * @param {{ n?: number, sum?: number }} [previous] jawaban siswa di langkah sebelumnya
 * @returns {Diagnosis}
 */
export function diagnose(item, step, answer, previous = {}) {
  switch (step) {
    case 'n':
      return diagnoseCount(item, answer);
    case 'sum':
      return diagnoseSum(item, answer);
    case 'divide':
      return diagnoseMean(item, answer, previous);
    case 'answer':
      return diagnoseSingleAnswer(item, answer);
    case 'select':
      return diagnoseSelection(item, answer);
    case 'understand':
      return diagnoseChoice(item.understand.options, answer, ERROR_CODES.UNDERSTAND);
    case 'interpret':
      return diagnoseChoice(item.interpret.options, answer);
    case 'choice':
      return diagnoseChoice(item.options, answer);
    default:
      throw new Error(`Langkah tidak dikenal: ${step}`);
  }
}

function options(item) {
  return { tolerance: item.tolerance ?? DEFAULT_TOLERANCE, decimals: item.decimals ?? null };
}

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function diagnoseCount(item, answer) {
  if (!isNumber(answer)) return fail(ERROR_CODES.OTHER);
  const { n } = computeKey(item);
  if (answer === n) return ok();
  if (item.type === 'frequency_mean' && answer === item.table.length) {
    return fail(ERROR_CODES.FREQ_N, { nCorrect: n, frequencies: item.table.map((row) => row.f) });
  }
  return fail(ERROR_CODES.N, { nCorrect: n, nStudent: answer });
}

/** Data yang dijumlahkan: data asli, atau hasil nilai × frekuensi untuk tabel frekuensi. */
function addends(item) {
  return item.type === 'frequency_mean' ? frequencyProducts(item.table) : itemData(item);
}

function diagnoseSum(item, answer) {
  if (!isNumber(answer)) return fail(ERROR_CODES.OTHER);
  const key = computeKey(item);
  const { tolerance } = options(item);
  if (isClose(answer, key.sum, tolerance)) return ok();

  if (item.type === 'frequency_mean') {
    const valuesOnly = sum(item.table.map((row) => row.x));
    if (isClose(answer, valuesOnly, tolerance)) return fail(ERROR_CODES.FREQ_SUM);
  }

  const terms = addends(item);
  const missingIndex = terms.findIndex((value) => isClose(key.sum - answer, value, tolerance));
  if (missingIndex >= 0) {
    return fail(ERROR_CODES.SUM_MISS, { missing: terms[missingIndex], index: missingIndex });
  }
  return fail(ERROR_CODES.SUM, { runningTotals: runningTotals(terms) });
}

/** Apakah jawaban = nilai tepat yang dibulatkan/dipotong ke 0–3 angka desimal (selain kunci)? */
function isRoundingSlip(answer, exact) {
  for (let decimals = 0; decimals <= 3; decimals += 1) {
    if (isClose(answer, roundTo(exact, decimals), 1e-9)) return true;
    if (isClose(answer, truncateTo(exact, decimals), 1e-9)) return true;
  }
  return false;
}

function diagnoseMean(item, answer, previous) {
  if (!isNumber(answer)) return fail(ERROR_CODES.OTHER);
  const opts = options(item);
  const { n, sum: total, divide: exact } = computeKey(item);
  const accepted = (value) => isAccepted(answer, value, opts);

  if (accepted(exact)) return ok();

  // Membagi dengan n − 1 atau n + 1.
  if (n > 1 && (accepted(total / (n - 1)) || accepted(total / (n + 1)))) {
    return fail(ERROR_CODES.DIV_N1, { n, sum: total });
  }

  // Tabel frekuensi: membagi dengan banyak baris, atau menjumlah nilai tanpa dikali frekuensi.
  if (item.type === 'frequency_mean') {
    const rows = item.table.length;
    const valuesOnly = sum(item.table.map((row) => row.x));
    if (accepted(valuesOnly / rows) || accepted(valuesOnly / n)) {
      return fail(ERROR_CODES.FREQ_SUM);
    }
    if (accepted(total / rows)) {
      return fail(ERROR_CODES.FREQ_N, { nCorrect: n, frequencies: item.table.map((row) => row.f) });
    }
  }

  // Dicek sebelum "data terlewat": 4 atau 5 untuk 4,5 lebih mungkin salah bulat daripada data hilang.
  if (isRoundingSlip(answer, exact)) {
    return fail(ERROR_CODES.ROUND, { decimals: opts.decimals });
  }

  const hasPrevious = isNumber(previous.n) && isNumber(previous.sum);

  // Soal jawaban tunggal (tanpa langkah sebelumnya): cari data yang terlewat.
  if (!hasPrevious && item.type !== 'frequency_mean') {
    const data = itemData(item);
    for (const [index, value] of data.entries()) {
      if (n > 1 && accepted((total - value) / (n - 1))) {
        return fail(ERROR_CODES.N, { nCorrect: n, nStudent: n - 1 });
      }
      if (accepted((total - value) / n)) {
        return fail(ERROR_CODES.SUM_MISS, { missing: value, index });
      }
    }
  }

  if (hasPrevious) {
    const previousCorrect = previous.n === n && isClose(previous.sum, total, opts.tolerance);
    if (previousCorrect) return fail(ERROR_CODES.DIV, { n, sum: total });
    // Pembagian siswa konsisten dengan n/jumlah yang salah → sumber kesalahannya di langkah awal.
    if (previous.n !== 0 && accepted(previous.sum / previous.n)) {
      return previous.n !== n
        ? fail(ERROR_CODES.N, { nCorrect: n, nStudent: previous.n })
        : fail(ERROR_CODES.SUM, { runningTotals: runningTotals(addends(item)) });
    }
  }

  return fail(ERROR_CODES.OTHER);
}

function diagnoseSingleAnswer(item, answer) {
  if (!isNumber(answer)) return fail(ERROR_CODES.OTHER);
  const { answer: exact } = computeKey(item);
  if (isAccepted(answer, exact, options(item))) return ok();
  if (isRoundingSlip(answer, exact)) return fail(ERROR_CODES.ROUND, { decimals: item.decimals ?? null });
  if (item.type === 'missing_value') {
    // Petunjuk: jumlah semua data = rata-rata × banyak data, lalu kurangi data yang diketahui.
    return fail(ERROR_CODES.MISSING, {
      targetMean: item.targetMean,
      totalCount: item.totalCount,
      total: roundTo(item.targetMean * item.totalCount, 10),
      knownSum: sum(item.knownData),
    });
  }
  if (item.type === 'number') {
    // Soal hitung prasyarat (cek kesiapan): petunjuk sesuai operasinya.
    return fail(ERROR_CODES.CALC, { op: item.expression.op });
  }
  return fail(ERROR_CODES.OTHER);
}

function diagnoseSelection(item, selectedKeys) {
  if (!Array.isArray(selectedKeys)) return fail(ERROR_CODES.OTHER);
  const selected = new Set(selectedKeys);
  const order = storyKeys(item);
  const relevant = order.filter((key) => item.selectables[key].relevant);

  const extraKey = order.find((key) => selected.has(key) && !item.selectables[key].relevant);
  if (extraKey) {
    const { display, meaning } = item.selectables[extraKey];
    return fail(ERROR_CODES.SELECT, { kind: 'extra', key: extraKey, display, meaning });
  }

  const chosenRelevant = relevant.filter((key) => selected.has(key)).length;
  if (chosenRelevant < relevant.length) {
    return fail(ERROR_CODES.SELECT, {
      kind: 'missing',
      nCorrect: relevant.length,
      nStudent: chosenRelevant,
    });
  }
  return ok();
}

function diagnoseChoice(choices, index, wrongCode = ERROR_CODES.INTERP) {
  const choice = Number.isInteger(index) ? choices[index] : undefined;
  if (!choice) return fail(ERROR_CODES.OTHER);
  return choice.correct ? ok({ feedback: choice.feedback }) : fail(wrongCode, { feedback: choice.feedback });
}
