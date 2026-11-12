import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clampScreen,
  expandScreens,
  isItemScreen,
  nextSubtopic,
  recommendedSubtopic,
  subtopicSlug,
} from '../js/core/lesson-plan.js';
import { correctOptionIndex, solutionFor } from '../js/core/solution.js';

const LESSON = {
  screens: [
    { type: 'context', text: 'A' },
    { type: 'faded_example', itemRef: 'p-1', givenSteps: ['list'] },
    { type: 'practice', itemRefs: ['p-2', 'p-3'] },
  ],
};

const TOPIC = {
  subtopics: [
    { id: 'mean-01', file: '01.json' },
    { id: 'mean-02', file: '02.json' },
    { id: 'mean-03', file: null },
    { id: 'mean-04', file: '04.json' },
  ],
};

test('expandScreens: layar latihan dipecah satu soal per layar', () => {
  const screens = expandScreens(LESSON);
  assert.equal(screens.length, 4);
  assert.deepEqual(screens[2], { type: 'practice_item', itemRef: 'p-2', index: 1, total: 2 });
  assert.deepEqual(screens[3], { type: 'practice_item', itemRef: 'p-3', index: 2, total: 2 });
});

test('isItemScreen', () => {
  const screens = expandScreens(LESSON);
  assert.deepEqual(screens.map(isItemScreen), [false, true, true, true]);
});

test('subtopicSlug dan clampScreen', () => {
  assert.equal(subtopicSlug('mean-02'), '02');
  assert.equal(clampScreen('3', 9), 3);
  assert.equal(clampScreen('99', 9), 9);
  assert.equal(clampScreen('0', 9), 1);
  assert.equal(clampScreen(undefined, 9), 1);
  assert.equal(clampScreen('abc', 9), 1);
});

test('nextSubtopic melewati subbab yang belum ditulis', () => {
  assert.equal(nextSubtopic(TOPIC, 'mean-01').id, 'mean-02');
  assert.equal(nextSubtopic(TOPIC, 'mean-02').id, 'mean-04');
  assert.equal(nextSubtopic(TOPIC, 'mean-04'), null);
  assert.equal(nextSubtopic(TOPIC, 'tidak-ada'), null);
});

test('recommendedSubtopic: subbab pertama yang belum selesai', () => {
  assert.equal(recommendedSubtopic(TOPIC, {}).id, 'mean-01');
  assert.equal(recommendedSubtopic(TOPIC, { 'mean-01': { status: 'done' } }).id, 'mean-02');
  const allDone = { 'mean-01': { status: 'done' }, 'mean-02': { status: 'done' }, 'mean-04': { status: 'done' } };
  assert.equal(recommendedSubtopic(TOPIC, allDone), null);
});

test('solutionFor: pembahasan setiap langkah', () => {
  const item = { type: 'stepwise_mean', data: [70, 80, 75, 85, 90] };
  assert.equal(solutionFor(item, 'n'), 'Ada 5 data: 70, 80, 75, 85, 90. Jadi banyak data = 5.');
  assert.equal(solutionFor(item, 'sum'), '70 + 80 + 75 + 85 + 90 = 400.');
  assert.equal(solutionFor(item, 'divide'), 'Rata-rata = jumlah : banyak data = 400 : 5 = 80.');
});

test('solutionFor: format Indonesia dan keterangan pembulatan', () => {
  const money = { type: 'stepwise_mean', data: [10000, 12000] };
  assert.equal(solutionFor(money, 'sum'), '10.000 + 12.000 = 22.000.');
  const repeating = { type: 'stepwise_mean', data: [80, 81, 80], decimals: 1 };
  assert.equal(
    solutionFor(repeating, 'divide'),
    'Rata-rata = jumlah : banyak data = 241 : 3 = 80,3 (dibulatkan).',
  );
});

test('correctOptionIndex', () => {
  assert.equal(correctOptionIndex([{ correct: false }, { correct: true }]), 1);
});
