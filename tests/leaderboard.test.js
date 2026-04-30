import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/leaderboard.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

test('leaderboard.js navigation functions', async (t) => {
  const mockLocation = { href: '' };
  const mockLocalStorage = {
    store: {},
    setItem(key, value) { this.store[key] = value; },
    getItem(key) { return this.store[key]; }
  };
  const mockConsole = {
    log: [],
    info: [],
    error: [],
    warn: []
  };

  const createMockElement = () => ({
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {} },
    addEventListener: () => {},
    style: {},
    setAttribute: () => {},
    textContent: '',
    className: ''
  });

  const context = {
    firebase: {
      firestore: () => ({
        collection: () => ({
          orderBy: () => ({
            limit: () => ({
              get: () => Promise.resolve({ size: 0, docs: [], forEach: () => {} }),
              startAfter: () => ({
                limit: () => ({
                  get: () => Promise.resolve({ size: 0, docs: [], forEach: () => {} })
                })
              })
            })
          })
        })
      })
    },
    document: {
      getElementById: () => createMockElement(),
      createElement: () => createMockElement(),
    },
    window: {
      location: mockLocation
    },
    localStorage: mockLocalStorage,
    console: {
      log: (...args) => mockConsole.log.push(args.join(' ')),
      error: (...args) => mockConsole.error.push(args.join(' ')),
      info: (...args) => mockConsole.info.push(args.join(' ')),
      warn: (...args) => mockConsole.warn.push(args.join(' '))
    },
    // We need to define these because they are called globally at the end
    setTimeout: global.setTimeout,
    setInterval: global.setInterval,
  };

  context.window.switchTab = null; // Will be set by script

  vm.createContext(context);
  vm.runInContext(scriptContent, context);

  await t.test('gotoview updates window.location.href', () => {
    mockLocation.href = '';
    context.gotoview();
    assert.strictEqual(mockLocation.href, '/viewboard');
  });

  await t.test('gotohome updates window.location.href', () => {
    mockLocation.href = '';
    context.gotohome();
    assert.strictEqual(mockLocation.href, '/');
  });

  await t.test('handleViewSaveState sets localStorage and calls gotoview', () => {
    mockLocation.href = '';
    mockLocalStorage.store = {};
    const testState = 'test-save-state';
    context.handleViewSaveState(testState);
    assert.strictEqual(mockLocalStorage.store['minesweeperViewState'], testState);
    assert.strictEqual(mockLocation.href, '/viewboard');
  });
});
