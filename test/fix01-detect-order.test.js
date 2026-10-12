// CAF-FIX-01 — the app list from detectStack is in a deterministic order.
//
// Before this ticket the order was whatever fast-glob emitted: entries arrive as the directory
// reads complete, so two calls on the same directory could return `apps/api, apps/web` or the
// reverse (CAF-SDD-03b1 verify-report, unexpected finding #1). The order is now decided in
// `findApps` (src/utils/repo-context.js): by app path, in code-unit order.

// Must stay the first import: it replaces fs.readdir before fast-glob is loaded.
import { withListingOrder, LISTING_ORDERS } from './helpers/readdir-order.js';

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectRepoContext } from '../src/utils/repo-context.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeRepo } from './helpers/make-repo.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const MONO_FIXTURE = path.join(FIXTURES, 'mono-pnpm');
const SINGLE_FIXTURE = path.join(FIXTURES, 'single-nuxt');
const MONO_SNAPSHOT = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'snapshots', 'mono-pnpm.json'), 'utf8'));

const ORDERS = Object.keys(LISTING_ORDERS);
const REPEAT = 50;

const stackOf = (dir, opts = {}) => silenced(() => detectStack({ dir, explicitGlobs: undefined, ...opts }));
const paths = (stack) => stack.apps.map((a) => a.path);

// Seven workspace packages over two patterns, so a shuffle has something to shuffle. Two of them
// carry a database marker: `database` is built from the app list and must follow its order.
function makeWideRepo() {
  const pkg = (name) => ({ name, version: '0.0.0' });
  return makeRepo(
    {
      'package.json': { name: 'wide', private: true, workspaces: ['packages/*', 'apps/*'] },
      'apps/web/package.json': pkg('@wide/web'),
      'apps/api/package.json': pkg('@wide/api'),
      'apps/admin/package.json': pkg('@wide/admin'),
      'apps/docs/package.json': pkg('@wide/docs'),
      'packages/ui/package.json': pkg('@wide/ui'),
      'packages/config/package.json': pkg('@wide/config'),
      'packages/Zeta/package.json': pkg('@wide/zeta'),
      'apps/web/.env.example': 'DATABASE_URL=mysql://localhost/web\n',
      'apps/api/.env.example': 'DATABASE_URL=postgres://localhost/api\n',
    },
    'caf-fix01-wide-'
  );
}
// Code-unit order of the path: `Z` (0x5A) sorts before `c` (0x63), whatever the locale says.
const WIDE_ORDER = [
  'apps/admin',
  'apps/api',
  'apps/docs',
  'apps/web',
  'packages/Zeta',
  'packages/config',
  'packages/ui',
];

test('the stub decides the listing order: reversed and shuffled differ from normal', () => {
  const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  assert.deepEqual(LISTING_ORDERS.normal(names), names);
  assert.deepEqual(LISTING_ORDERS.reversed(names), [...names].reverse());
  const shuffled = LISTING_ORDERS.shuffled(names);
  assert.deepEqual([...shuffled].sort(), names);
  assert.notDeepEqual(shuffled, names);
  assert.notDeepEqual(shuffled, [...names].reverse());
  assert.deepEqual(LISTING_ORDERS.shuffled(names), shuffled);
});

test('AC-1: mono-pnpm — a reversed directory listing gives the same app order as a normal one', async () => {
  const normal = await withListingOrder('normal', () => stackOf(MONO_FIXTURE));
  const reversed = await withListingOrder('reversed', () => stackOf(MONO_FIXTURE));
  assert.deepEqual(paths(normal), ['apps/api', 'apps/web']);
  assert.deepEqual(paths(reversed), paths(normal));
  assert.deepEqual(reversed, normal);
});

test('AC-1: seven workspace packages — reversed and shuffled listings give the same app order as a normal one', async () => {
  const dir = makeWideRepo();
  const normal = await withListingOrder('normal', () => stackOf(dir));
  const reversed = await withListingOrder('reversed', () => stackOf(dir));
  const shuffled = await withListingOrder('shuffled', () => stackOf(dir));
  assert.deepEqual(paths(normal), WIDE_ORDER);
  assert.deepEqual(paths(reversed), WIDE_ORDER);
  assert.deepEqual(paths(shuffled), WIDE_ORDER);
  assert.deepEqual(reversed, normal);
  assert.deepEqual(shuffled, normal);
});

test('AC-1: the database findings follow the app order under every listing order', async () => {
  const dir = makeWideRepo();
  for (const order of ORDERS) {
    const stack = await withListingOrder(order, () => stackOf(dir));
    assert.deepEqual(
      stack.database.map((d) => `${d.scope}:${d.type}`),
      ['apps/api:postgresql', 'apps/web:mysql'],
      `listing order: ${order}`
    );
  }
});

test(`AC-2: mono-pnpm — ${REPEAT} calls on the real file system all return the order in the snapshot`, async () => {
  for (let i = 0; i < REPEAT; i += 1) {
    const stack = await stackOf(MONO_FIXTURE);
    assert.deepEqual(stack.apps, MONO_SNAPSHOT.stack.apps, `call ${i + 1}`);
  }
});

for (const order of ORDERS) {
  test(`AC-2: mono-pnpm — ${REPEAT} calls under a ${order} listing all return the order in the snapshot`, async () => {
    await withListingOrder(order, async () => {
      for (let i = 0; i < REPEAT; i += 1) {
        const stack = await stackOf(MONO_FIXTURE);
        assert.deepEqual(stack.apps, MONO_SNAPSHOT.stack.apps, `call ${i + 1}`);
        assert.deepEqual(stack.database, MONO_SNAPSHOT.stack.database, `call ${i + 1}`);
      }
    });
  });

  test(`AC-2: mono-pnpm with --mode mono — ${REPEAT} calls under a ${order} listing are identical`, async () => {
    await withListingOrder(order, async () => {
      for (let i = 0; i < REPEAT; i += 1) {
        const stack = await stackOf(MONO_FIXTURE, { mode: 'mono' });
        assert.deepEqual(stack.apps, MONO_SNAPSHOT.stack.apps, `call ${i + 1}`);
      }
    });
  });

  test(`AC-2: single-nuxt — ${REPEAT} calls under a ${order} listing are identical: one app at the repo root`, async () => {
    await withListingOrder(order, async () => {
      const first = await stackOf(SINGLE_FIXTURE);
      assert.deepEqual(paths(first), ['.']);
      for (let i = 1; i < REPEAT; i += 1) {
        assert.deepEqual(await stackOf(SINGLE_FIXTURE), first, `call ${i + 1}`);
      }
    });
  });

  test(`AC-2: seven workspace packages — ${REPEAT} calls under a ${order} listing are identical`, async () => {
    const dir = makeWideRepo();
    await withListingOrder(order, async () => {
      const first = await stackOf(dir);
      assert.deepEqual(paths(first), WIDE_ORDER);
      for (let i = 1; i < REPEAT; i += 1) {
        assert.deepEqual(await stackOf(dir), first, `call ${i + 1}`);
      }
    });
  });
}

test(`AC-2: single-nuxt and the seven-package repo — ${REPEAT} calls on the real file system are identical`, async () => {
  const wide = makeWideRepo();
  const firstSingle = await stackOf(SINGLE_FIXTURE);
  const firstWide = await stackOf(wide);
  assert.deepEqual(paths(firstWide), WIDE_ORDER);
  for (let i = 1; i < REPEAT; i += 1) {
    assert.deepEqual(await stackOf(SINGLE_FIXTURE), firstSingle, `call ${i + 1}`);
    assert.deepEqual(await stackOf(wide), firstWide, `call ${i + 1}`);
  }
});

test('AC-2: detectRepoContext itself returns the ordered list (the order is decided at the source)', async () => {
  const dir = makeWideRepo();
  for (const order of ORDERS) {
    const ctx = await withListingOrder(order, () => detectRepoContext({ dir }));
    assert.deepEqual(ctx.apps.map((a) => a.path), WIDE_ORDER, `listing order: ${order}`);
  }
});

test('AC-2: explicit globs are ordered by app path too, not by the order the globs were given', async () => {
  const dir = makeWideRepo();
  const ctx = await withListingOrder('reversed', () =>
    detectRepoContext({ dir, explicitGlobs: ['packages/*', 'apps/*'] })
  );
  assert.deepEqual(ctx.apps.map((a) => a.path), WIDE_ORDER);
});
