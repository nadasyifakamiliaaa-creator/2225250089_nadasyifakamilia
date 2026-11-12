// Kunci jawaban dihitung otomatis dari data soal — tidak pernah ditulis manual (docs/04 bagian 4).
// Logika yang sama ada di tools/content_schema.py (Python) untuk validasi konten.
import {
  count,
  frequencyCount,
  frequencyMean,
  frequencySum,
  mean,
  missingValue,
  sum,
} from './mean.js';

/** Kunci angka yang dapat diketuk pada soal cerita, sesuai urutan kemunculan: "[[a]] dan [[b]]" → ['a', 'b'] */
export function storyKeys(item) {
  return [...item.prompt.matchAll(/\[\[([\w-]+)\]\]/g)].map((match) => match[1]);
}

/** Data yang dipakai untuk menghitung, sesuai tipe soal. */
export function itemData(item) {
  switch (item.type) {
    case 'stepwise_mean':
      return item.data;
    case 'story_mean':
      // Urutan sesuai kemunculan di teks soal (sama dengan tools/content_schema.py).
      return storyKeys(item)
        .filter((key) => item.selectables[key].relevant)
        .map((key) => item.selectables[key].value);
    case 'frequency_mean':
      return item.table.flatMap((row) => Array(row.f).fill(row.x));
    case 'missing_value':
      return item.knownData;
    default:
      return [];
  }
}

/** Hitung nilai ekspresi soal tipe `number`: { op: 'sum'|'product'|'divide', operands: [...] } */
export function evaluateExpression({ op, operands }) {
  switch (op) {
    case 'sum':
      return sum(operands);
    case 'product':
      return operands.reduce((total, value) => total * value, 1);
    case 'divide':
      return operands[0] / operands[1];
    default:
      throw new Error(`Operasi tidak dikenal: ${op}`);
  }
}

/**
 * @returns {{ n?: number, sum?: number, divide?: number, answer?: number }}
 *   n = banyak data, sum = jumlah data, divide = rata-rata, answer = jawaban tunggal
 */
export function computeKey(item) {
  switch (item.type) {
    case 'number':
      return { answer: evaluateExpression(item.expression) };
    case 'stepwise_mean':
    case 'story_mean': {
      const data = itemData(item);
      return { n: count(data), sum: sum(data), divide: mean(data) };
    }
    case 'frequency_mean':
      return {
        n: frequencyCount(item.table),
        sum: frequencySum(item.table),
        divide: frequencyMean(item.table),
      };
    case 'missing_value':
      return { answer: missingValue(item.knownData, item.targetMean, item.totalCount) };
    default:
      return {};
  }
}
