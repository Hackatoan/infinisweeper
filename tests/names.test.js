import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// script.js boots the whole game on load, so pull out just the name-filter
// block (from the word lists through _isBadName) and evaluate it in isolation.
const src = fs.readFileSync(path.resolve('public/script.js'), 'utf8');
const start = src.indexOf('const _BAD_SUBSTRINGS');
const end = src.indexOf('async function submitScore');
assert.ok(start !== -1 && end > start, 'name filter block not found in script.js');

const ctx = vm.createContext({});
vm.runInContext(
  src.slice(start, end) + '\nthis._cleanName = _cleanName; this._isBadName = _isBadName;',
  ctx
);
const { _cleanName, _isBadName } = ctx;

test('_isBadName accepts ordinary names that contain short banned substrings', () => {
  for (const n of ['Skillz', 'Hello', 'Classic', 'Passion', 'Massive', 'Bass', 'Shellshock',
    'Scrapper', 'Cockatiel', 'Dickens', 'Spice', 'Grape', 'Essex', 'Sussex', 'Killer',
    'Assassin', 'Hackatoan', 'Player 1', 'Nazir']) {
    assert.strictEqual(_isBadName(n), false, `${n} should be allowed`);
  }
});

test('_isBadName rejects slurs and profanity anywhere in the name', () => {
  for (const n of ['fuck', 'xXfuckXx', 'SHIT', 'big_bitch', 'hitler99', 'f u c k', 'pussycat']) {
    assert.strictEqual(_isBadName(n), true, `${n} should be rejected`);
  }
});

test('_isBadName rejects short banned words as whole words', () => {
  for (const n of ['ass', 'Hell', 'kill', 'SEX', 'ass123', 'hell_boy', 'Kill Bill', 'sexy', 'nazi', 'asses']) {
    assert.strictEqual(_isBadName(n), true, `${n} should be rejected`);
  }
});

test('_isBadName is case-insensitive and splits camelCase', () => {
  assert.strictEqual(_isBadName('HeLL'), true);
  assert.strictEqual(_isBadName('HellBoy'), true);
  assert.strictEqual(_isBadName('SexyBeast'), true);
  assert.strictEqual(_isBadName('ClassAct'), false);
});

test('_isBadName folds leetspeak', () => {
  for (const n of ['h3ll', '@ss', 'k1ll', 'sh1t', 'f4ck'.replace('4', 'u')]) {
    assert.strictEqual(_isBadName(n), true, `${n} should be rejected`);
  }
  assert.strictEqual(_isBadName('H3llo'), false);
});

test('_isBadName handles whitespace and empty input', () => {
  assert.strictEqual(_isBadName(''), false);
  assert.strictEqual(_isBadName(null), false);
  assert.strictEqual(_isBadName('   '), false);
  assert.strictEqual(_isBadName('  hell  '), true);
});

test('_cleanName trims, collapses whitespace, limits length, strips non-ASCII', () => {
  assert.strictEqual(_cleanName('  a   b  '), 'a b');
  assert.strictEqual(_cleanName('x'.repeat(40)).length, 40);
  assert.strictEqual(_cleanName('x'.repeat(50)).length, 40);
  assert.strictEqual(_cleanName('café\u{1F600}x'), 'cafx');
  assert.strictEqual(_cleanName(''), '');
  assert.strictEqual(_cleanName(undefined), '');
});
