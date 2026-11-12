// Kuis akhir (F09): pemilihan soal acak sesuai kisi-kisi dan penilaian. Fungsi murni.
// Dalam kuis tidak ada umpan balik per langkah; siswa hanya menjawab hasil akhir,
// lalu skor dan pembahasan ditampilkan setelah kuis dikumpulkan.
import { diagnose } from './diagnose.js';
import { parseNumber } from './number-format.js';

const LEVEL_ORDER = ['L1', 'L2', 'L3'];

/** Pembangkit bilangan acak yang bisa diulang (seed sama → urutan sama), untuk pengujian. */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Acak urutan salinan larik (Fisher–Yates). */
export function shuffle(list, random = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pilih soal kuis: acak di dalam tiap level, lalu urutkan dari mudah ke sulit (L1 → L3)
 * agar beban kognitif naik bertahap.
 * @param {object[]} bank soal kuis
 * @param {Record<string, number>} blueprint mis. { L1: 3, L2: 4, L3: 3 }
 * @param {() => number} [random]
 * @returns {string[]} id soal terpilih
 */
export function pickQuiz(bank, blueprint, random = Math.random) {
  const picked = [];
  for (const level of LEVEL_ORDER) {
    const count = blueprint[level] ?? 0;
    const pool = bank.filter((item) => item.level === level);
    picked.push(...shuffle(pool, random).slice(0, count));
  }
  return picked.map((item) => item.id);
}

/**
 * Bagian yang dijawab siswa untuk sebuah soal kuis.
 * @returns {Array<{ step: string, kind: 'number'|'choice' }>}
 */
export function quizParts(item) {
  switch (item.type) {
    case 'stepwise_mean':
    case 'frequency_mean':
    case 'story_mean': {
      const parts = [{ step: 'divide', kind: 'number' }];
      // Literasi: tahap Maknai tetap ada dalam kuis.
      if (item.interpret) parts.push({ step: 'interpret', kind: 'choice' });
      return parts;
    }
    case 'missing_value':
    case 'number':
      return [{ step: 'answer', kind: 'number' }];
    case 'multiple_choice':
      return [{ step: 'choice', kind: 'choice' }];
    default:
      return [];
  }
}

/**
 * Nilai jawaban kuis. Setiap bagian bernilai 1 poin.
 * @param {object[]} items soal kuis (berurutan)
 * @param {Record<string, Record<string, string|number|null>>} answers
 *   answers[itemId][step] = teks angka (bagian number) atau indeks opsi (bagian choice)
 */
export function scoreQuiz(items, answers) {
  const results = items.map((item) => {
    const given = answers[item.id] ?? {};
    const parts = quizParts(item).map(({ step, kind }) => {
      const raw = given[step];
      const answered = raw !== undefined && raw !== null && raw !== '';
      if (!answered) return { step, kind, answered, correct: false, code: null, params: {} };
      const value = kind === 'number' ? parseNumber(String(raw)) : raw;
      if (value === null) return { step, kind, answered, correct: false, code: 'E-OTHER', params: {} };
      const diagnosis = diagnose(item, step, value);
      return { step, kind, answered, correct: diagnosis.correct, code: diagnosis.code, params: diagnosis.params };
    });
    const points = parts.filter((part) => part.correct).length;
    return { itemId: item.id, level: item.level, parts, points, max: parts.length };
  });
  const points = results.reduce((total, result) => total + result.points, 0);
  const max = results.reduce((total, result) => total + result.max, 0);
  return { results, points, max, percent: max ? Math.round((points / max) * 100) : 0 };
}

/** Banyak soal yang semua bagiannya sudah diisi. */
export function answeredCount(items, answers) {
  return items.filter((item) =>
    quizParts(item).every(({ step }) => {
      const raw = answers[item.id]?.[step];
      return raw !== undefined && raw !== null && raw !== '';
    }),
  ).length;
}
