import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatNumber, parseNumber } from '../js/core/number-format.js';

test('parseNumber: koma dan titik sama-sama diterima sebagai desimal', () => {
  assert.equal(parseNumber('80,5'), 80.5);
  assert.equal(parseNumber('80.5'), 80.5);
  assert.equal(parseNumber('28.0'), 28);
  assert.equal(parseNumber(',5'), 0.5);
});

test('parseNumber: bilangan bulat, spasi, dan tanda minus', () => {
  assert.equal(parseNumber('80'), 80);
  assert.equal(parseNumber('  80  '), 80);
  assert.equal(parseNumber('-3'), -3);
  assert.equal(parseNumber('−3'), -3);
  assert.equal(parseNumber('12 000'), 12000);
});

test('parseNumber: titik + tepat 3 angka = pemisah ribuan', () => {
  assert.equal(parseNumber('12.000'), 12000);
  assert.equal(parseNumber('1.250'), 1250);
  assert.equal(parseNumber('1.250.000'), 1250000);
  assert.equal(parseNumber('1.250,5'), 1250.5);
});

test('parseNumber: masukan kosong atau tidak terbaca → null', () => {
  assert.equal(parseNumber(''), null);
  assert.equal(parseNumber('   '), null);
  assert.equal(parseNumber('abc'), null);
  assert.equal(parseNumber('1,2,3'), null);
  assert.equal(parseNumber('1.2.3'), null);
  assert.equal(parseNumber('12.34,5'), null);
  assert.equal(parseNumber(null), null);
});

test('parseNumber: angka langsung dikembalikan', () => {
  assert.equal(parseNumber(7), 7);
  assert.equal(parseNumber(Number.NaN), null);
});

test('formatNumber: format Indonesia', () => {
  assert.equal(formatNumber(80.5), '80,5');
  assert.equal(formatNumber(12000), '12.000');
  assert.equal(formatNumber(80), '80');
  assert.equal(formatNumber(80.333333), '80,33');
  assert.equal(formatNumber(80.333333, { decimals: 1 }), '80,3');
});
