// Kasus uji wajib dari docs/08 bagian A.3, ditambah kasus tepi.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ERROR_CODES as E, diagnose } from '../js/core/diagnose.js';
import { hintFor, praiseFor } from '../js/core/hints.js';

const RANI = { type: 'stepwise_mean', data: [70, 80, 75, 85, 90] };
const FREQ = {
  type: 'frequency_mean',
  table: [
    { x: 6, f: 2 },
    { x: 7, f: 5 },
    { x: 8, f: 3 },
  ],
};
const WARUNG = {
  type: 'story_mean',
  prompt: 'Pada [[d1]] warung buka. Senin [[a]], Selasa [[b]], Rabu [[c]], Kamis [[d]]. Harga [[p]].',
  selectables: {
    d1: { display: 'tanggal 3 Maret', value: 3, relevant: false, meaning: 'tanggal warung dibuka' },
    a: { display: '24', value: 24, relevant: true },
    b: { display: '30', value: 30, relevant: true },
    c: { display: '27', value: 27, relevant: true },
    d: { display: '31', value: 31, relevant: true },
    p: { display: '12.000', value: 12000, relevant: false, meaning: 'harga satu bungkus nasi' },
  },
  interpret: {
    question: 'Apa arti hasilnya?',
    options: [
      { text: 'Sama rata sekitar 28 per hari', correct: true, feedback: 'Tepat.' },
      { text: 'Setiap hari tepat 28', correct: false, feedback: 'Senin hanya 24.' },
    ],
  },
};

// ---- Tabel docs/08 A.3 ----

test('A.3: n = 4 pada data Rani → E-N', () => {
  const result = diagnose(RANI, 'n', 4);
  assert.equal(result.code, E.N);
  assert.deepEqual(result.params, { nCorrect: 5, nStudent: 4 });
});

test('A.3: jumlah 310 (90 terlewat) → E-SUM-MISS', () => {
  const result = diagnose(RANI, 'sum', 310);
  assert.equal(result.code, E.SUM_MISS);
  assert.equal(result.params.missing, 90);
});

test('A.3: jumlah 395 → E-SUM', () => {
  const result = diagnose(RANI, 'sum', 395);
  assert.equal(result.code, E.SUM);
  assert.deepEqual(result.params.runningTotals, [70, 150, 225, 310, 400]);
});

test('A.3: rata-rata 100 (400 : 4) → E-DIV-N1', () => {
  assert.equal(diagnose(RANI, 'divide', 100).code, E.DIV_N1);
  assert.equal(diagnose(RANI, 'divide', 100, { n: 5, sum: 400 }).code, E.DIV_N1);
});

test('A.3: rata-rata 85 dengan n & jumlah benar → E-DIV', () => {
  assert.equal(diagnose(RANI, 'divide', 85, { n: 5, sum: 400 }).code, E.DIV);
});

test('A.3: tabel frekuensi, n = 3 (banyak baris) → E-FREQ-N', () => {
  const result = diagnose(FREQ, 'n', 3);
  assert.equal(result.code, E.FREQ_N);
  assert.deepEqual(result.params.frequencies, [2, 5, 3]);
});

test('A.3: tabel frekuensi, jumlah 21 (tanpa dikali frekuensi) → E-FREQ-SUM', () => {
  assert.equal(diagnose(FREQ, 'sum', 21).code, E.FREQ_SUM);
});

test('A.3: 24, 30, 27, 31 → rata-rata 28 benar', () => {
  assert.ok(diagnose(WARUNG, 'divide', 28).correct);
  assert.ok(diagnose(WARUNG, 'divide', 28.0).correct);
});

// ---- Langkah yang benar ----

test('jawaban benar di setiap langkah', () => {
  assert.deepEqual(diagnose(RANI, 'n', 5), { correct: true, code: null, params: {} });
  assert.ok(diagnose(RANI, 'sum', 400).correct);
  assert.ok(diagnose(RANI, 'divide', 80).correct);
  assert.ok(diagnose(FREQ, 'n', 10).correct);
  assert.ok(diagnose(FREQ, 'sum', 71).correct);
  assert.ok(diagnose(FREQ, 'divide', 7.1).correct);
});

// ---- Rata-rata: kasus lain ----

test('rata-rata jawaban tunggal: satu data terlewat dan n ikut berkurang → E-N', () => {
  // (400 − 90) : 4 = 77,5
  assert.equal(diagnose(RANI, 'divide', 77.5).code, E.N);
});

test('rata-rata jawaban tunggal: satu data tidak dijumlahkan tetapi n benar → E-SUM-MISS', () => {
  // (400 − 90) : 5 = 62
  const result = diagnose(RANI, 'divide', 62);
  assert.equal(result.code, E.SUM_MISS);
  assert.equal(result.params.missing, 90);
});

test('rata-rata: pembulatan keliru → E-ROUND', () => {
  const item = { type: 'stepwise_mean', data: [3, 5, 4, 6], decimals: 1 }; // 4,5
  assert.equal(diagnose(item, 'divide', 4).code, E.ROUND);
  assert.equal(diagnose(item, 'divide', 5).code, E.ROUND);
  assert.ok(diagnose(item, 'divide', 4.5).correct);
});

test('rata-rata: nilai dibulatkan sesuai `decimals` diterima', () => {
  const item = { type: 'stepwise_mean', data: [80, 81, 80], decimals: 1 }; // 80,333…
  assert.ok(diagnose(item, 'divide', 80.3).correct);
  assert.ok(diagnose(item, 'divide', 80.33).correct);
  assert.equal(diagnose(item, 'divide', 80).code, E.ROUND);
});

test('rata-rata: pembagian konsisten dengan n yang salah → sumber kesalahan E-N', () => {
  // Siswa menulis n = 6 dan jumlah 400, lalu 400 : 6 = 66,67
  assert.equal(diagnose(RANI, 'divide', 66.67, { n: 6, sum: 400 }).code, E.DIV_N1);
  // n = 2 (jauh dari 5): 400 : 2 = 200
  assert.equal(diagnose(RANI, 'divide', 200, { n: 2, sum: 400 }).code, E.N);
});

test('rata-rata: pembagian konsisten dengan jumlah yang salah → sumber kesalahan E-SUM', () => {
  assert.equal(diagnose(RANI, 'divide', 79, { n: 5, sum: 395 }).code, E.SUM);
});

test('rata-rata tabel frekuensi: jumlah dibagi banyak baris → E-FREQ-N', () => {
  assert.equal(diagnose(FREQ, 'divide', 71 / 3).code, E.FREQ_N);
});

test('rata-rata tabel frekuensi: nilai tanpa frekuensi → E-FREQ-SUM', () => {
  assert.equal(diagnose(FREQ, 'divide', 7).code, E.FREQ_SUM); // 21 : 3
});

test('rata-rata: jawaban acak → E-OTHER', () => {
  assert.equal(diagnose(RANI, 'divide', 12).code, E.OTHER);
});

test('masukan bukan angka → E-OTHER', () => {
  assert.equal(diagnose(RANI, 'n', Number.NaN).code, E.OTHER);
  assert.equal(diagnose(RANI, 'sum', null).code, E.OTHER);
});

// ---- Soal cerita ----

test('pilah: memilih tanggal → E-SELECT (extra) dengan makna angkanya', () => {
  const result = diagnose(WARUNG, 'select', ['d1', 'a', 'b', 'c', 'd']);
  assert.equal(result.code, E.SELECT);
  assert.equal(result.params.kind, 'extra');
  assert.equal(result.params.meaning, 'tanggal warung dibuka');
});

test('pilah: ada data yang belum dipilih → E-SELECT (missing)', () => {
  const result = diagnose(WARUNG, 'select', ['a', 'b']);
  assert.deepEqual(result.params, { kind: 'missing', nCorrect: 4, nStudent: 2 });
});

test('pilah: semua data relevan saja → benar', () => {
  assert.ok(diagnose(WARUNG, 'select', ['d', 'c', 'b', 'a']).correct);
});

test('maknai: opsi salah → E-INTERP dengan umpan balik opsi itu', () => {
  const result = diagnose(WARUNG, 'interpret', 1);
  assert.equal(result.code, E.INTERP);
  assert.equal(result.params.feedback, 'Senin hanya 24.');
  assert.ok(diagnose(WARUNG, 'interpret', 0).correct);
  assert.equal(diagnose(WARUNG, 'interpret', 9).code, E.OTHER);
});

// ---- Soal jawaban tunggal ----

test('number & missing_value', () => {
  const sumItem = { type: 'number', expression: { op: 'sum', operands: [12, 15, 18] } };
  assert.ok(diagnose(sumItem, 'answer', 45).correct);
  assert.equal(diagnose(sumItem, 'answer', 44).code, E.CALC);
  const missing = { type: 'missing_value', knownData: [70, 80, 75, 85], targetMean: 80, totalCount: 5 };
  assert.ok(diagnose(missing, 'answer', 90).correct);
});

test('langkah tidak dikenal melempar galat', () => {
  assert.throws(() => diagnose(RANI, 'akar', 1));
});

// ---- Teks petunjuk ----

test('hintFor: setiap kode punya petunjuk tingkat 1 dan 2 yang berbeda', () => {
  const cases = [
    [E.N, { nCorrect: 5, nStudent: 4 }],
    [E.SUM, {}],
    [E.SUM_MISS, { missing: 90 }],
    [E.DIV_N1, { n: 5, sum: 400 }],
    [E.DIV, { n: 5, sum: 400 }],
    [E.FREQ_N, { frequencies: [2, 5, 3] }],
    [E.FREQ_SUM, {}],
    [E.SELECT, { kind: 'extra', display: '12.000', meaning: 'harga' }],
    [E.SELECT, { kind: 'missing', nCorrect: 4, nStudent: 2 }],
    [E.ROUND, { decimals: 1 }],
    [E.OTHER, {}],
  ];
  for (const [code, params] of cases) {
    const level1 = hintFor(code, 1, params);
    const level2 = hintFor(code, 2, params);
    assert.ok(level1.length > 0 && level2.length > 0, code);
    assert.notEqual(level1, level2, code);
    assert.ok(!/salah!/i.test(level1 + level2), `${code}: hindari "Salah!"`);
  }
});

test('hintFor: angka tampil dengan format Indonesia', () => {
  assert.equal(hintFor(E.SUM_MISS, 2, { missing: 12000 }), 'Data 12.000 belum ikut dijumlahkan.');
  assert.equal(hintFor(E.FREQ_N, 2, { frequencies: [2, 5, 3] }), 'Jumlahkan semua frekuensi: 2 + 5 + 3.');
});

test('praiseFor: menyebut alasan', () => {
  const key = { n: 5, sum: 400, divide: 80 };
  assert.equal(praiseFor('n', key), 'Benar, banyak datanya 5.');
  assert.equal(praiseFor('divide', key), 'Benar. 400 dibagi 5 data = 80.');
  assert.equal(praiseFor('divide', { n: 4, sum: 18, divide: 4.5 }), 'Benar. 18 dibagi 4 data = 4,5.');
});
