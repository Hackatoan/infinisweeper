import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Evaluate just the pure _zoomKeyDirection helper from script.js in isolation.
const src = fs.readFileSync(path.resolve('public/script.js'), 'utf8');
const start = src.indexOf('function _zoomKeyDirection');
const end = src.indexOf('function handleKeyEvents');
assert.ok(start !== -1 && end > start, '_zoomKeyDirection not found in script.js');
const ctx = vm.createContext({});
vm.runInContext(src.slice(start, end) + '\nthis._zoomKeyDirection = _zoomKeyDirection;', ctx);
const { _zoomKeyDirection } = ctx;

const key = (k, extra = {}) => ({ key: k, target: { tagName: 'BODY' }, ...extra });

test('+ and = zoom in', () => {
  assert.strictEqual(_zoomKeyDirection(key('+')), 1);
  assert.strictEqual(_zoomKeyDirection(key('=')), 1);
});

test('- and _ zoom out', () => {
  assert.strictEqual(_zoomKeyDirection(key('-')), -1);
  assert.strictEqual(_zoomKeyDirection(key('_')), -1);
});

test('other keys are ignored', () => {
  assert.strictEqual(_zoomKeyDirection(key('w')), 0);
  assert.strictEqual(_zoomKeyDirection(key('Enter')), 0);
});

test('modifier combos are left to the browser', () => {
  assert.strictEqual(_zoomKeyDirection(key('=', { ctrlKey: true })), 0);
  assert.strictEqual(_zoomKeyDirection(key('-', { metaKey: true })), 0);
  assert.strictEqual(_zoomKeyDirection(key('+', { altKey: true })), 0);
});

test('typing in a text field does not zoom', () => {
  assert.strictEqual(_zoomKeyDirection(key('-', { target: { tagName: 'INPUT' } })), 0);
  assert.strictEqual(_zoomKeyDirection(key('=', { target: { tagName: 'DIV', isContentEditable: true } })), 0);
});
