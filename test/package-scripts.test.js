// CAF-SDD-03a (AC-8) — the pattern fallback in matchVerifyScripts must never pick a watch-mode
// script or an npm lifecycle hook as a verify gate. An agent told to run `test:watch` hangs
// forever; `pretest` alone runs nothing that verifies. When those are the only candidates the
// slot is null, which the templates render as a TODO gap for a human to fill.

import test from 'node:test';
import assert from 'node:assert/strict';

import { matchVerifyScripts } from '../src/utils/package-scripts.js';
import { makeRepo } from './helpers/make-repo.js';

const SLOTS = ['test', 'lint', 'typecheck', 'build'];

/** Matched script for `slot` in a package.json declaring `names` (in this order). */
function pick(slot, names) {
  const scripts = Object.fromEntries(names.map((name) => [name, 'true']));
  const dir = makeRepo({ 'package.json': { name: 'pkg', scripts } }, 'caf-package-scripts-');
  return matchVerifyScripts(dir, '.')[slot];
}

for (const slot of SLOTS) {
  test(`${slot}: a watch-mode script alone leaves the slot null`, () => {
    assert.equal(pick(slot, [`${slot}:watch`]), null);
    assert.equal(pick(slot, [`${slot}-watch`]), null);
    assert.equal(pick(slot, [`watch:${slot}`]), null);
    assert.equal(pick(slot, ['watch']), null);
  });

  test(`${slot}: watch + lifecycle hook + exact name picks the exact name`, () => {
    assert.equal(pick(slot, [`${slot}:watch`, `pre${slot}`, slot]), slot);
  });

  test(`${slot}: watch + a non-watch variant picks the variant`, () => {
    assert.equal(pick(slot, [`${slot}:watch`, `${slot}:ci`]), `${slot}:ci`);
  });

  test(`${slot}: lifecycle hooks alone leave the slot null`, () => {
    assert.equal(pick(slot, [`pre${slot}`, `post${slot}`]), null);
    assert.equal(pick(slot, [`pre${slot}:ci`, `post${slot}:ci`]), null);
  });

  test(`${slot}: exact match still wins over the pattern, whatever the declaration order`, () => {
    assert.equal(pick(slot, [`${slot}:ci`, slot]), slot);
    assert.equal(pick(slot, [slot, `${slot}:ci`]), slot);
    // Even the exact name of a slot is taken as-is — exact match is not filtered.
    assert.equal(pick(slot, [`pre${slot}`, `${slot}:watch`, `${slot}:ci`, slot]), slot);
  });

  test(`${slot}: no matching script at all is still null`, () => {
    assert.equal(pick(slot, ['dev', 'start']), null);
    assert.equal(pick(slot, []), null);
  });
}

test('test:e2e stays selectable', () => {
  assert.equal(pick('test', ['test:e2e']), 'test:e2e');
  assert.equal(pick('test', ['test:watch', 'test:e2e']), 'test:e2e');
});

test('a name that merely starts with pre/post is not a lifecycle hook', () => {
  assert.equal(pick('lint', ['prettier:lint']), 'prettier:lint');
  assert.equal(pick('build', ['postcss:build']), 'postcss:build');
  assert.equal(pick('build', ['preview:build']), 'preview:build');
});

test('a pre/post hook of another existing script is skipped', () => {
  // `prebuild:test` is the hook of `build:test`, so `build:test` is the candidate.
  assert.equal(pick('test', ['prebuild:test', 'build:test']), 'build:test');
});

test('typecheck spellings: hooks skipped, real scripts kept', () => {
  assert.equal(pick('typecheck', ['pretype-check', 'type-check']), 'type-check');
  assert.equal(pick('typecheck', ['precheck-types']), null);
  assert.equal(pick('typecheck', ['check-types:watch', 'check-types']), 'check-types');
});

test('"watch" must be a whole segment', () => {
  assert.equal(pick('test', ['test:watcher']), 'test:watcher');
  assert.equal(pick('test', ['test:WATCH']), null);
});

test('slots are matched independently', () => {
  const scripts = { 'test:watch': 'x', 'lint:fix': 'x', prebuild: 'x', build: 'x', typecheck: 'x' };
  const dir = makeRepo({ 'package.json': { name: 'pkg', scripts } }, 'caf-package-scripts-');
  assert.deepEqual(matchVerifyScripts(dir, '.'), { lint: 'lint:fix', typecheck: 'typecheck', test: null, build: 'build' });
});

// CAF-SDD-03a2 (AC-6) — camelCase watch scripts (`testWatch`) are watch mode too.
test('camelCase: a *Watch script alone leaves the slot null', () => {
  assert.equal(pick('test', ['testWatch']), null);
  assert.equal(pick('build', ['buildWatch']), null);
  assert.equal(pick('lint', ['lintWatch']), null);
  assert.equal(pick('typecheck', ['typecheckWatch']), null);
  assert.equal(pick('test', ['watchTest']), null);
  assert.equal(pick('test', ['test:unitWatch']), null);
});

test('camelCase: a *Watch script next to the real one picks the real one', () => {
  assert.equal(pick('test', ['testWatch', 'test']), 'test');
  assert.equal(pick('build', ['buildWatch', 'build']), 'build');
  assert.equal(pick('test', ['testWatch', 'testCi']), 'testCi');
});

test('camelCase: "watch" as a mere substring is not watch mode', () => {
  assert.equal(pick('build', ['watchman:build']), 'watchman:build');
  assert.equal(pick('test', ['testWatcher']), 'testWatcher');
  assert.equal(pick('test', ['stopwatch:test']), 'stopwatch:test');
});
