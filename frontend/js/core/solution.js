// Teks pembahasan per langkah (fungsi murni). Ditampilkan setelah percobaan ke-3
// atau saat siswa menekan "Lihat pembahasan" (docs/03 bagian 4).
import { computeKey, itemData, storyKeys } from './answer-key.js';
import { frequencyProducts, roundTo } from './mean.js';
import { formatNumber } from './number-format.js';

const fmt = (value) => formatNumber(value);

/** Teks rata-rata, ditambah keterangan pembulatan bila perlu. */
function meanText(item, exact) {
  const decimals = item.decimals ?? 2;
  const rounded = roundTo(exact, decimals);
  const text = formatNumber(rounded, { decimals });
  return rounded === exact ? text : `${text} (dibulatkan)`;
}

/**
 * @param {object} item butir soal
 * @param {'n'|'sum'|'divide'|'answer'} step
 */
export function solutionFor(item, step) {
  const key = computeKey(item);
  if (item.type === 'frequency_mean' && (step === 'n' || step === 'sum')) {
    return frequencySolution(item, step, key);
  }
  const data = itemData(item);
  switch (step) {
    case 'n':
      return `Ada ${fmt(key.n)} data: ${data.map(fmt).join(', ')}. Jadi banyak data = ${fmt(key.n)}.`;
    case 'sum':
      return `${data.map(fmt).join(' + ')} = ${fmt(key.sum)}.`;
    case 'divide':
      return `Rata-rata = jumlah : banyak data = ${fmt(key.sum)} : ${fmt(key.n)} = ${meanText(item, key.divide)}.`;
    case 'understand': {
      const asked = item.understand.options[correctOptionIndex(item.understand.options)];
      return `Yang ditanyakan: ${asked.text}.`;
    }
    case 'select':
      return selectionSolution(item);
    case 'answer':
      if (item.type === 'missing_value') return missingSolution(item, key);
      if (item.type === 'number') return expressionSolution(item.expression, key.answer);
      return `Jawabannya ${meanText(item, key.answer)}.`;
    default:
      throw new Error(`Langkah tidak dikenal: ${step}`);
  }
}

/** Pembahasan tabel frekuensi: n = Σf, jumlah = Σ(x × f). */
function frequencySolution(item, step, key) {
  if (step === 'n') {
    const frequencies = item.table.map((row) => fmt(row.f)).join(' + ');
    return `Banyak data = jumlah semua frekuensi = ${frequencies} = ${fmt(key.n)}.`;
  }
  const products = item.table.map((row) => `(${fmt(row.x)} × ${fmt(row.f)})`).join(' + ');
  const values = frequencyProducts(item.table).map(fmt).join(' + ');
  return `${products} = ${values} = ${fmt(key.sum)}.`;
}

/** Pembahasan Pilah: angka mana yang data, dan arti angka-angka pengecoh. */
function selectionSolution(item) {
  const keys = storyKeys(item);
  const data = keys.filter((k) => item.selectables[k].relevant).map((k) => item.selectables[k].display);
  const others = keys
    .filter((k) => !item.selectables[k].relevant)
    .map((k) => `"${item.selectables[k].display}" (${item.selectables[k].meaning})`);
  const dataText = `Data yang dipakai: ${data.join(', ')}.`;
  return others.length ? `${dataText} Angka lain bukan data: ${others.join(', ')}.` : dataText;
}

/** Pembahasan nilai yang hilang: jumlah semua data − jumlah data yang diketahui. */
function missingSolution(item, key) {
  const total = item.targetMean * item.totalCount;
  const knownSum = item.knownData.reduce((sumSoFar, value) => sumSoFar + value, 0);
  return (
    `Jumlah semua data = rata-rata × banyak data = ${fmt(item.targetMean)} × ${fmt(item.totalCount)} = ${fmt(total)}. ` +
    `Jumlah data yang diketahui = ${item.knownData.map(fmt).join(' + ')} = ${fmt(knownSum)}. ` +
    `Nilai yang dicari = ${fmt(total)} − ${fmt(knownSum)} = ${fmt(key.answer)}.`
  );
}

const OPERATOR = { sum: ' + ', product: ' × ', divide: ' : ' };

function expressionSolution({ op, operands }, answer) {
  return `${operands.map(fmt).join(OPERATOR[op])} = ${fmt(answer)}.`;
}

/** Teks soal seperti dibaca siswa: [[kunci]] pada soal cerita diganti angka tampilannya. */
export function promptText(item) {
  if (item.type !== 'story_mean') return item.prompt;
  return item.prompt.replace(/\[\[([\w-]+)\]\]/g, (_, key) => item.selectables[key].display);
}

/** Indeks opsi yang benar pada daftar pilihan. */
export function correctOptionIndex(options) {
  return options.findIndex((option) => option.correct);
}
