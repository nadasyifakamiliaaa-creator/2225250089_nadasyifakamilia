import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  adaptiveMessage,
  classifyResult,
  initialAdaptiveState,
  nextAdaptiveState,
} from '../js/core/adaptive.js';
import { splitSteps, tableSupport } from '../js/core/fading.js';
import { findTwin, workedExampleScreen } from '../js/core/lesson-plan.js';
import { solutionFor } from '../js/core/solution.js';

const step = (attempts, correct, revealed = false) => ({ attempts, correct, revealed });
const FIRST_TRY = { steps: { n: step(1, true), sum: step(1, true), divide: step(1, true) } };
const MIXED = { steps: { n: step(2, true), sum: step(1, true), divide: step(1, true) } };
const REVEALED = { steps: { n: step(1, true), sum: step(3, false, true), divide: step(1, true) } };

function run(results) {
  return results.reduce(nextAdaptiveState, initialAdaptiveState());
}

test('classifyResult', () => {
  assert.equal(classifyResult(FIRST_TRY), 'first_try');
  assert.equal(classifyResult(MIXED), 'mixed');
  assert.equal(classifyResult(REVEALED), 'revealed');
  assert.equal(classifyResult({ steps: {} }), 'mixed');
});

test('3 kali benar pada percobaan pertama → penghitung disembunyikan & pesan "fluent"', () => {
  const state = run([FIRST_TRY, FIRST_TRY, FIRST_TRY]);
  assert.deepEqual(state, { firstTryStreak: 3, revealStreak: 0, counterHidden: true });
  assert.equal(adaptiveMessage(state), 'fluent');
  // Pesan tidak diulang pada soal ke-4.
  assert.equal(adaptiveMessage(nextAdaptiveState(state, FIRST_TRY)), null);
});

test('rangkaian terputus oleh soal yang perlu lebih dari satu percobaan', () => {
  const state = run([FIRST_TRY, FIRST_TRY, MIXED, FIRST_TRY]);
  assert.equal(state.firstTryStreak, 1);
  assert.equal(state.counterHidden, false);
});

test('2 kali sampai pembahasan → pesan "review" dan bantuan muncul lagi', () => {
  const fluent = run([FIRST_TRY, FIRST_TRY, FIRST_TRY]);
  const once = nextAdaptiveState(fluent, REVEALED);
  assert.equal(once.counterHidden, false);
  assert.equal(adaptiveMessage(once), null);
  const twice = nextAdaptiveState(once, REVEALED);
  assert.equal(adaptiveMessage(twice), 'review');
});

test('penghitung tetap tersembunyi setelah soal "mixed"', () => {
  const state = run([FIRST_TRY, FIRST_TRY, FIRST_TRY, MIXED]);
  assert.equal(state.counterHidden, true);
});

test('splitSteps', () => {
  const item = { steps: ['n', 'sum', 'divide', 'interpret'] };
  assert.deepEqual(splitSteps(item, ['list', 'n']), { given: ['n'], student: ['sum', 'divide', 'interpret'] });
  assert.deepEqual(splitSteps({}, []), { given: [], student: [] });
});

test('tableSupport', () => {
  assert.deepEqual(tableSupport({ screenType: 'worked_example' }), {
    prechecked: true,
    showTotalCount: true,
    helpHidden: false,
  });
  assert.deepEqual(tableSupport({ screenType: 'faded_example', givenSteps: ['list'], counterHidden: true }), {
    prechecked: true,
    showTotalCount: false,
    helpHidden: false,
  });
  assert.equal(tableSupport({ screenType: 'practice_item', counterHidden: true }).helpHidden, true);
  assert.equal(tableSupport({ screenType: 'practice_item', counterHidden: false }).helpHidden, false);
});

test('findTwin dan workedExampleScreen', () => {
  const items = [{ id: 'a' }, { id: 'a-k', twinOf: 'a' }];
  assert.equal(findTwin(items, 'a').id, 'a-k');
  assert.equal(findTwin(new Map(items.map((i) => [i.id, i])).values(), 'a').id, 'a-k');
  assert.equal(findTwin(items, 'a-k'), null);
  assert.equal(workedExampleScreen([{ type: 'context' }, { type: 'worked_example' }]), 2);
  assert.equal(workedExampleScreen([{ type: 'context' }]), null);
});

test('solutionFor: tabel frekuensi', () => {
  const item = {
    type: 'frequency_mean',
    table: [
      { x: 6, f: 2 },
      { x: 7, f: 5 },
      { x: 8, f: 3 },
    ],
  };
  assert.equal(solutionFor(item, 'n'), 'Banyak data = jumlah semua frekuensi = 2 + 5 + 3 = 10.');
  assert.equal(solutionFor(item, 'sum'), '(6 × 2) + (7 × 5) + (8 × 3) = 12 + 35 + 24 = 71.');
  assert.equal(solutionFor(item, 'divide'), 'Rata-rata = jumlah : banyak data = 71 : 10 = 7,1.');
});
