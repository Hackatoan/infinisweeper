import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Evaluate just the pure _nextBestScore helper from script.js in isolation.
const src = fs.readFileSync(path.resolve('public/script.js'), 'utf8');
const start = src.indexOf('function _nextBestScore');
const end = src.indexOf('function showBestScore');
assert.ok(start !== -1 && end > start, '_nextBestScore not found in script.js');
const ctx = vm.createContext({});
vm.runInContext(src.slice(start, end) + '\nthis._nextBestScore = _nextBestScore;', ctx);
const { _nextBestScore } = ctx;

test('first game sets a new best', () => {
  assert.deepStrictEqual({ ..._nextBestScore(12, NaN) }, { best: 12, isNew: true });
});

test('higher score replaces the stored best', () => {
  assert.deepStrictEqual({ ..._nextBestScore(50, 40) }, { best: 50, isNew: true });
});

test('equal or lower score keeps the stored best', () => {
  assert.deepStrictEqual({ ..._nextBestScore(40, 40) }, { best: 40, isNew: false });
  assert.deepStrictEqual({ ..._nextBestScore(3, 40) }, { best: 40, isNew: false });
});

test('zero score with no history is not a best', () => {
  assert.deepStrictEqual({ ..._nextBestScore(0, NaN) }, { best: 0, isNew: false });
});
