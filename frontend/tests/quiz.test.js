import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diagnose } from '../js/core/diagnose.js';
import { hintFor } from '../js/core/hints.js';
import { addErrorCodes, codesFromResult, topErrors } from '../js/core/progress-summary.js';
import { promptText, solutionFor } from '../js/core/solution.js';
import { answeredCount, pickQuiz, quizParts, scoreQuiz, seededRandom, shuffle } from '../js/core/quiz.js';

const MEAN = { id: 'a', level: 'L1', type: 'stepwise_mean', data: [3, 5, 4, 6], decimals: 1 };
const FREQ = {
  id: 'b',
  level: 'L2',
  type: 'frequency_mean',
  table: [
    { x: 6, f: 2 },
    { x: 7, f: 5 },
    { x: 8, f: 3 },
  ],
  interpret: {
    question: '?',
    options: [
      { text: 'benar', correct: true, feedback: 'Tepat.' },
      { text: 'salah', correct: false, feedback: 'Belum.' },
    ],
  },
};
const MISSING = { id: 'c', level: 'L3', type: 'missing_value', knownData: [70, 80, 65], targetMean: 75, totalCount: 4 };
const CHOICE = {
  id: 'd',
  level: 'L3',
  type: 'multiple_choice',
  options: [
    { text: 'x', correct: false, feedback: '' },
    { text: 'y', correct: true, feedback: '' },
  ],
};

test('seededRandom: seed sama → urutan sama', () => {
  const a = seededRandom(42);
  const b = seededRandom(42);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  const value = seededRandom(7)();
  assert.ok(value >= 0 && value < 1);
});

test('shuffle tidak mengubah isi maupun larik asli', () => {
  const list = [1, 2, 3, 4, 5];
  const result = shuffle(list, seededRandom(1));
  assert.deepEqual([...result].sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual(list, [1, 2, 3, 4, 5]);
});

test('pickQuiz: jumlah per level sesuai kisi-kisi, urut L1 → L3', () => {
  const bank = [
    ...Array.from({ length: 5 }, (_, i) => ({ id: `l1-${i}`, level: 'L1' })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: `l2-${i}`, level: 'L2' })),
    ...Array.from({ length: 5 }, (_, i) => ({ id: `l3-${i}`, level: 'L3' })),
  ];
  const ids = pickQuiz(bank, { L1: 3, L2: 4, L3: 3 }, seededRandom(3));
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  assert.deepEqual(
    ids.map((id) => id.slice(0, 2)),
    ['l1', 'l1', 'l1', 'l2', 'l2', 'l2', 'l2', 'l3', 'l3', 'l3'],
  );
  // Seed berbeda → pilihan berbeda (soal baru saat kuis diulang).
  assert.notDeepEqual(ids, pickQuiz(bank, { L1: 3, L2: 4, L3: 3 }, seededRandom(99)));
});

test('pickQuiz: bank kurang → ambil yang ada', () => {
  assert.equal(pickQuiz([{ id: 'x', level: 'L1' }], { L1: 3 }).length, 1);
});

test('quizParts', () => {
  assert.deepEqual(quizParts(MEAN), [{ step: 'divide', kind: 'number' }]);
  assert.deepEqual(quizParts(FREQ), [
    { step: 'divide', kind: 'number' },
    { step: 'interpret', kind: 'choice' },
  ]);
  assert.deepEqual(quizParts(MISSING), [{ step: 'answer', kind: 'number' }]);
  assert.deepEqual(quizParts(CHOICE), [{ step: 'choice', kind: 'choice' }]);
});

test('scoreQuiz: poin per bagian, diagnosis untuk pembahasan', () => {
  const items = [MEAN, FREQ, MISSING, CHOICE];
  const answers = {
    a: { divide: '4,5' },
    b: { divide: '7', interpret: 0 }, // 21 : 3 → E-FREQ-SUM
    c: { answer: '' }, // kosong
    d: { choice: 1 },
  };
  const score = scoreQuiz(items, answers);
  assert.equal(score.max, 5);
  assert.equal(score.points, 3);
  assert.equal(score.percent, 60);
  assert.equal(score.results[1].parts[0].code, 'E-FREQ-SUM');
  assert.equal(score.results[1].points, 1);
  assert.equal(score.results[2].parts[0].answered, false);
  assert.equal(answeredCount(items, answers), 3);
});

test('scoreQuiz: jawaban tidak terbaca dianggap salah', () => {
  const score = scoreQuiz([MEAN], { a: { divide: 'empat' } });
  assert.equal(score.points, 0);
  assert.equal(score.results[0].parts[0].code, 'E-OTHER');
});

test('addErrorCodes dan topErrors', () => {
  let counts = addErrorCodes({}, ['E-N', 'E-N', 'E-OTHER', null, 'E-SELECT']);
  assert.deepEqual(counts, { 'E-N': 2, 'E-SELECT': 1 });
  counts = addErrorCodes(counts, ['E-SELECT', 'E-SELECT']);
  const top = topErrors([{ errorCounts: counts }, { errorCounts: { 'E-MISSING': 1 } }, {}], 2);
  assert.deepEqual(top, [
    { code: 'E-SELECT', count: 3, subtopicId: 'mean-05' },
    { code: 'E-N', count: 2, subtopicId: 'mean-03' },
  ]);
});

test('cek kesiapan: E-CALC dengan petunjuk sesuai operasi, pembahasan berupa hitungan', () => {
  const sumItem = { type: 'number', expression: { op: 'sum', operands: [12, 15, 18] } };
  const divItem = { type: 'number', expression: { op: 'divide', operands: [400, 5] } };
  const wrong = diagnose(sumItem, 'answer', 44);
  assert.equal(wrong.code, 'E-CALC');
  assert.match(hintFor(wrong.code, 2, wrong.params), /dua-dua/);
  assert.match(hintFor('E-CALC', 2, diagnose(divItem, 'answer', 70).params), /perkalian/);
  assert.equal(solutionFor(sumItem, 'answer'), '12 + 15 + 18 = 45.');
  assert.equal(solutionFor(divItem, 'answer'), '400 : 5 = 80.');
});

test('promptText: placeholder soal cerita diganti angka tampilannya', () => {
  const story = {
    type: 'story_mean',
    prompt: 'Harga [[p]] rupiah, terjual [[a]].',
    selectables: { p: { display: '4.000' }, a: { display: '18' } },
  };
  assert.equal(promptText(story), 'Harga 4.000 rupiah, terjual 18.');
  assert.equal(promptText({ type: 'stepwise_mean', prompt: 'Biasa.' }), 'Biasa.');
});

test('codesFromResult', () => {
  const result = { steps: { n: { codes: ['E-N'] }, sum: { codes: [] }, explain: {} } };
  assert.deepEqual(codesFromResult(result), ['E-N']);
});
