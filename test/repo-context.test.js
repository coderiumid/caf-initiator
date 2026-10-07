// CAF-INIT-SINGLE-REPO — the centralized repo-mode detector (utils/repo-context.js).
// Finding no workspaces is not an error: it is SINGLE_REPO with exactly one app at the repo root.
// The MONOREPO path must keep producing exactly what it produced before this ticket — guarded by
// a snapshot recorded from `main` (test/fixtures/snapshots/mono-pnpm.json, see
// test/helpers/mono-snapshot.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectRepoContext, resolveModeOverride, REPO_MODE } from '../src/utils/repo-context.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { MONO_FIXTURE, renderMonoSnapshot, silenced } from './helpers/mono-snapshot.js';
import { makeRepo } from './helpers/make-repo.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const SINGLE_FIXTURE = path.join(FIXTURES, 'single-nuxt');
const MONO_SNAPSHOT = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'snapshots', 'mono-pnpm.json'), 'utf8'));

const sortByPath = (apps) => [...apps].sort((a, b) => a.path.localeCompare(b.path));

test('single package without workspaces → SINGLE_REPO with exactly one app at the repo root', async () => {
  const ctx = await detectRepoContext({ dir: SINGLE_FIXTURE });
  assert.equal(ctx.mode, REPO_MODE.SINGLE_REPO);
  assert.equal(ctx.modeSource, 'detected');
  assert.equal(ctx.apps.length, 1);
  assert.equal(ctx.apps[0].name, 'website-cms-v2');
  assert.equal(ctx.apps[0].path, '.');
  assert.equal(ctx.apps[0].framework, 'Nuxt');
  assert.equal(ctx.pkgManager, 'pnpm');
});

test('detectStack exposes the mode and keeps the legacy shape for a single package', async () => {
  const stack = await silenced(() => detectStack({ dir: SINGLE_FIXTURE, explicitGlobs: undefined }));
  assert.equal(stack.mode, REPO_MODE.SINGLE_REPO);
  assert.equal(stack.isMonorepo, false);
  assert.equal(stack.packageManager, 'pnpm');
  assert.equal(stack.apps.length, 1);
});

test('single package is not reported as a warning', async () => {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  try {
    await detectStack({ dir: SINGLE_FIXTURE, explicitGlobs: undefined });
  } finally {
    console.log = original;
  }
  const output = lines.join('\n');
  assert.match(output, /mode: .*SINGLE_REPO/);
  assert.doesNotMatch(output, /warning/i);
});

test('pnpm monorepo → MONOREPO, apps from pnpm-workspace.yaml', async () => {
  const ctx = await detectRepoContext({ dir: MONO_FIXTURE });
  assert.equal(ctx.mode, REPO_MODE.MONOREPO);
  assert.equal(ctx.pkgManager, 'pnpm');
  assert.deepEqual(
    sortByPath(ctx.apps).map((a) => ({ name: a.name, path: a.path })),
    [
      { name: '@mono/api', path: 'apps/api' },
      { name: '@mono/web', path: 'apps/web' },
    ]
  );
});

test('regression: MONOREPO detection + every rendered file is byte-identical to the pre-change snapshot', async () => {
  const current = await renderMonoSnapshot();
  assert.deepEqual(current.stack, MONO_SNAPSHOT.stack);
  assert.deepEqual(Object.keys(current.files), Object.keys(MONO_SNAPSHOT.files));
  for (const [file, content] of Object.entries(MONO_SNAPSHOT.files)) {
    assert.equal(current.files[file], content, `${file} changed on the MONOREPO path`);
  }
});

test('every monorepo marker → MONOREPO', async () => {
  const markers = {
    'turbo.json': '{}',
    'nx.json': '{}',
    'lerna.json': '{}',
    'pnpm-workspace.yaml': "packages:\n  - 'apps/*'\n",
  };
  for (const [file, content] of Object.entries(markers)) {
    const dir = makeRepo({ 'package.json': { name: 'm' }, [file]: content });
    const ctx = await detectRepoContext({ dir });
    assert.equal(ctx.mode, REPO_MODE.MONOREPO, `${file} should mean MONOREPO`);
  }
  const dir = makeRepo({ 'package.json': { name: 'm', workspaces: ['apps/*'] } });
  assert.equal((await detectRepoContext({ dir })).mode, REPO_MODE.MONOREPO, 'workspaces field should mean MONOREPO');
});

test('--mode single overrides a detected monorepo', async () => {
  const ctx = await detectRepoContext({ dir: MONO_FIXTURE, mode: 'single' });
  assert.equal(ctx.mode, REPO_MODE.SINGLE_REPO);
  assert.equal(ctx.modeSource, 'override');
  assert.deepEqual(
    ctx.apps.map((a) => ({ name: a.name, path: a.path })),
    [{ name: 'mono-pnpm', path: '.' }]
  );

  const stack = await silenced(() => detectStack({ dir: MONO_FIXTURE, explicitGlobs: undefined, mode: 'single' }));
  assert.equal(stack.mode, REPO_MODE.SINGLE_REPO);
  assert.equal(stack.isMonorepo, false);
});

test('--mode mono overrides a detected single package', async () => {
  const ctx = await detectRepoContext({ dir: SINGLE_FIXTURE, mode: 'mono' });
  assert.equal(ctx.mode, REPO_MODE.MONOREPO);
  assert.equal(ctx.modeSource, 'override');
  // Nothing is invented: no workspace package exists, so the list is empty rather than guessed.
  assert.deepEqual(ctx.apps, []);

  const stack = await silenced(() => detectStack({ dir: SINGLE_FIXTURE, explicitGlobs: undefined, mode: 'mono' }));
  assert.equal(stack.isMonorepo, true);
});

test('an unknown mode is rejected, not silently ignored', async () => {
  assert.throws(() => resolveModeOverride('multi'), /unknown --mode "multi"/);
  await assert.rejects(() => detectRepoContext({ dir: SINGLE_FIXTURE, mode: 'multi' }), /unknown --mode/);
  assert.equal(resolveModeOverride(undefined), null);
  assert.equal(resolveModeOverride('single'), REPO_MODE.SINGLE_REPO);
  assert.equal(resolveModeOverride('mono'), REPO_MODE.MONOREPO);
});

test('package manager falls back to the lockfile when package.json has no packageManager field', async () => {
  const lockfiles = {
    'pnpm-lock.yaml': 'pnpm',
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'bun.lockb': 'bun',
  };
  for (const [lockfile, expected] of Object.entries(lockfiles)) {
    const dir = makeRepo({ 'package.json': { name: 'app' }, [lockfile]: '' });
    const ctx = await detectRepoContext({ dir });
    assert.equal(ctx.pkgManager, expected, `${lockfile} should mean ${expected}`);
    assert.equal(ctx.apps[0].packageManager, expected);
  }
});

test('packageManager field wins over a lockfile', async () => {
  const dir = makeRepo({ 'package.json': { name: 'app', packageManager: 'yarn@4.1.0' }, 'pnpm-lock.yaml': '' });
  assert.equal((await detectRepoContext({ dir })).pkgManager, 'yarn');
});

test('no packageManager field and no lockfile → null, never a guessed package manager', async () => {
  const dir = makeRepo({ 'package.json': { name: 'app' } });
  assert.equal((await detectRepoContext({ dir })).pkgManager, null);
});

test('missing package.json name falls back to the repo folder name', async () => {
  const dir = makeRepo({ 'package.json': { dependencies: { vue: '3' } } }, 'caf-noname-');
  const ctx = await detectRepoContext({ dir });
  assert.equal(ctx.mode, REPO_MODE.SINGLE_REPO);
  assert.equal(ctx.apps[0].name, path.basename(dir));
  assert.equal(ctx.apps[0].path, '.');
});
