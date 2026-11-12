// Soal cerita (Pahami–Pilah), nilai yang hilang, dan pembahasannya.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeKey, itemData, storyKeys } from '../js/core/answer-key.js';
import { ERROR_CODES as E, diagnose } from '../js/core/diagnose.js';
import { hintFor, praiseMissing } from '../js/core/hints.js';
import { solutionFor } from '../js/core/solution.js';

const STORY = {
  type: 'story_mean',
  prompt: 'Pada [[t]] dijual [[b]] dan [[a]] roti. Harga [[p]].',
  // Urutan objek sengaja berbeda dari urutan di teks soal.
  selectables: {
    a: { display: '20', value: 20, relevant: true },
    p: { display: '5.000', value: 5000, relevant: false, meaning: 'harga roti' },
    t: { display: 'tanggal 3', value: 3, relevant: false, meaning: 'tanggal' },
    b: { display: '10', value: 10, relevant: true },
  },
  understand: {
    question: 'Apa yang ditanyakan?',
    options: [
      { text: 'Rata-rata roti terjual', correct: true, feedback: 'Tepat.' },
      { text: 'Harga roti', correct: false, feedback: 'Harga sudah diketahui.' },
    ],
  },
};

const MISSING = { type: 'missing_value', knownData: [70, 80, 65], targetMean: 75, totalCount: 4 };

test('storyKeys dan itemData mengikuti urutan di teks soal', () => {
  assert.deepEqual(storyKeys(STORY), ['t', 'b', 'a', 'p']);
  assert.deepEqual(itemData(STORY), [10, 20]);
  assert.deepEqual(computeKey(STORY), { n: 2, sum: 30, divide: 15 });
});

test('Pahami: opsi salah → E-UNDERSTAND dengan umpan balik opsi', () => {
  const wrong = diagnose(STORY, 'understand', 1);
  assert.equal(wrong.code, E.UNDERSTAND);
  assert.equal(hintFor(wrong.code, 1, wrong.params), 'Harga sudah diketahui.');
  assert.ok(diagnose(STORY, 'understand', 0).correct);
});

test('Pilah: angka pengecoh pertama sesuai urutan teks', () => {
  const result = diagnose(STORY, 'select', ['p', 't', 'a', 'b']);
  assert.equal(result.params.key, 't');
  assert.ok(diagnose(STORY, 'select', ['a', 'b']).correct);
});

test('pembahasan Pahami dan Pilah', () => {
  assert.equal(solutionFor(STORY, 'understand'), 'Yang ditanyakan: Rata-rata roti terjual.');
  assert.equal(
    solutionFor(STORY, 'select'),
    'Data yang dipakai: 10, 20. Angka lain bukan data: "tanggal 3" (tanggal), "5.000" (harga roti).',
  );
});

test('nilai yang hilang: benar, salah bulat, dan E-MISSING', () => {
  assert.deepEqual(computeKey(MISSING), { answer: 85 });
  assert.ok(diagnose(MISSING, 'answer', 85).correct);
  const wrong = diagnose(MISSING, 'answer', 75); // menebak rata-ratanya
  assert.equal(wrong.code, E.MISSING);
  assert.deepEqual(wrong.params, { targetMean: 75, totalCount: 4, total: 300, knownSum: 215 });
  assert.equal(
    hintFor(E.MISSING, 2, wrong.params),
    'Jumlah semua data = 75 × 4 = 300. Jumlah data yang diketahui = 215. Berapa selisihnya?',
  );
  assert.notEqual(hintFor(E.MISSING, 1, wrong.params), hintFor(E.MISSING, 2, wrong.params));
});

test('nilai yang hilang: pembahasan dan ajakan memeriksa', () => {
  assert.equal(
    solutionFor(MISSING, 'answer'),
    'Jumlah semua data = rata-rata × banyak data = 75 × 4 = 300. ' +
      'Jumlah data yang diketahui = 70 + 80 + 65 = 215. Nilai yang dicari = 300 − 215 = 85.',
  );
  assert.equal(praiseMissing(MISSING, 85), 'Benar. Periksa: (215 + 85) : 4 = 75.');
});
