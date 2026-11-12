import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeKey, evaluateExpression, itemData } from '../js/core/answer-key.js';
import { checkNumberInput, isAccepted, isClose } from '../js/core/check.js';

test('isClose: toleransi bawaan 0,01', () => {
  assert.ok(isClose(80, 80.01));
  assert.ok(!isClose(80, 80.02));
  assert.ok(isClose(0.1 + 0.2, 0.3, 0));
});

test('isAccepted: nilai tepat atau nilai yang dibulatkan sesuai `decimals`', () => {
  const exact = 241 / 3; // 80,333…
  assert.ok(isAccepted(80.33, exact));
  assert.ok(!isAccepted(80.3, exact));
  assert.ok(isAccepted(80.3, exact, { decimals: 1 }));
  assert.ok(!isAccepted(80, exact, { decimals: 1 }));
  assert.ok(!isAccepted(Number.NaN, exact));
});

test('checkNumberInput: status kosong / tidak terbaca / benar / salah', () => {
  assert.deepEqual(checkNumberInput('', 80), { status: 'empty', value: null });
  assert.deepEqual(checkNumberInput('delapan', 80), { status: 'invalid', value: null });
  assert.deepEqual(checkNumberInput('80', 80), { status: 'correct', value: 80 });
  assert.deepEqual(checkNumberInput('28,0', 28), { status: 'correct', value: 28 });
  assert.deepEqual(checkNumberInput('81', 80), { status: 'incorrect', value: 81 });
});

test('computeKey: stepwise_mean', () => {
  const item = { type: 'stepwise_mean', data: [6, 9, 11, 14] };
  assert.deepEqual(computeKey(item), { n: 4, sum: 40, divide: 10 });
});

test('computeKey: story_mean hanya memakai angka yang relevan', () => {
  const item = {
    type: 'story_mean',
    prompt: 'Pada [[d1]] warung buka. Senin [[a]], Selasa [[b]], Rabu [[c]], Kamis [[d]]. Harga [[p]].',
    selectables: {
      d1: { value: 3, relevant: false },
      a: { value: 24, relevant: true },
      b: { value: 30, relevant: true },
      c: { value: 27, relevant: true },
      d: { value: 31, relevant: true },
      p: { value: 12000, relevant: false },
    },
  };
  assert.deepEqual(itemData(item), [24, 30, 27, 31]);
  assert.deepEqual(computeKey(item), { n: 4, sum: 112, divide: 28 });
});

test('computeKey: frequency_mean, missing_value, number', () => {
  const table = [
    { x: 6, f: 2 },
    { x: 7, f: 5 },
    { x: 8, f: 3 },
  ];
  assert.deepEqual(computeKey({ type: 'frequency_mean', table }), { n: 10, sum: 71, divide: 7.1 });
  assert.deepEqual(
    computeKey({ type: 'missing_value', knownData: [70, 80, 75, 85], targetMean: 80, totalCount: 5 }),
    { answer: 90 },
  );
  assert.deepEqual(
    computeKey({ type: 'number', expression: { op: 'sum', operands: [12, 15, 18] } }),
    { answer: 45 },
  );
});

test('evaluateExpression: operasi dasar', () => {
  assert.equal(evaluateExpression({ op: 'divide', operands: [400, 5] }), 80);
  assert.equal(evaluateExpression({ op: 'product', operands: [7, 5] }), 35);
  assert.throws(() => evaluateExpression({ op: 'pangkat', operands: [2, 3] }));
});
