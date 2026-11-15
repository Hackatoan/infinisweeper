import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Evaluate just the pure _shareScoreText helper from script.js in isolation.
const src = fs.readFileSync(path.resolve('public/script.js'), 'utf8');
const start = src.indexOf('function _shareScoreText');
const end = src.indexOf('function _tplText');
assert.ok(start !== -1 && end > start, '_shareScoreText not found in script.js');
const ctx = vm.createContext({});
vm.runInContext(src.slice(start, end) + '\nthis._shareScoreText = _shareScoreText;', ctx);
const { _shareScoreText } = ctx;

const URL = 'https://infinisweeper.hackatoa.com/';

test('fills score and url into a localized template', () => {
  assert.strictEqual(
    _shareScoreText('Ich habe {score} Felder aufgedeckt {url}', 42, URL),
    `Ich habe 42 Felder aufgedeckt ${URL}`,
  );
});

test('falls back to English when the template is missing', () => {
  const out = _shareScoreText('', 7, URL);
  assert.ok(out.includes('7 safe cells'));
  assert.ok(out.endsWith(URL));
});

test('trims template whitespace from textContent', () => {
  assert.strictEqual(_shareScoreText('  {score} {url}\n', 3, URL), `3 ${URL}`);
});
