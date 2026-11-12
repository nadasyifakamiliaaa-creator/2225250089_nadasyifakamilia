import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  count,
  frequencyCount,
  frequencyMean,
  frequencyProducts,
  frequencySum,
  mean,
  missingValue,
  roundTo,
  runningTotals,
  sum,
  truncateTo,
} from '../js/core/mean.js';

const RANI = [70, 80, 75, 85, 90];
const TABLE = [
  { x: 6, f: 2 },
  { x: 7, f: 5 },
  { x: 8, f: 3 },
];

test('mean: nilai ulangan Rani (artefak wawancara) → n 5, jumlah 400, rata-rata 80', () => {
  assert.equal(count(RANI), 5);
  assert.equal(sum(RANI), 400);
  assert.equal(mean(RANI), 80);
});

test('mean: hasil desimal', () => {
  assert.equal(mean([3, 5, 4, 6]), 4.5);
  assert.equal(mean([36.5, 36.7, 36.6]), 36.6);
});

test('mean: galat biner dibersihkan', () => {
  assert.equal(sum([0.1, 0.2]), 0.3);
});

test('mean: data kosong melempar galat', () => {
  assert.throws(() => mean([]), RangeError);
});

test('runningTotals: jumlah sementara untuk Tabel Data', () => {
  assert.deepEqual(runningTotals(RANI), [70, 150, 225, 310, 400]);
  assert.deepEqual(runningTotals([]), []);
});

test('tabel frekuensi: n = Σf, jumlah = Σ(x·f)', () => {
  assert.equal(frequencyCount(TABLE), 10);
  assert.deepEqual(frequencyProducts(TABLE), [12, 35, 24]);
  assert.equal(frequencySum(TABLE), 71);
  assert.equal(frequencyMean(TABLE), 7.1);
});

test('missingValue: nilai kelima agar rata-rata 80', () => {
  assert.equal(missingValue([70, 80, 75, 85], 80, 5), 90);
});

test('roundTo dan truncateTo', () => {
  assert.equal(roundTo(80.3333, 1), 80.3);
  assert.equal(roundTo(4.45, 1), 4.5);
  assert.equal(roundTo(2.5, 0), 3);
  assert.equal(truncateTo(80.39, 1), 80.3);
  assert.equal(truncateTo(4.5, 0), 4);
});
