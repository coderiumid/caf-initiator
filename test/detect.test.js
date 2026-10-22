// CAF-INIT-SMART-01 AC1 — read-only detection on the mono-pnpm fixture.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectProject, hostFromRemoteUrl } from '../src/utils/detect.js';
import { copyFixture, makeRepo, snapshotTree } from './helpers/make-repo.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mono-pnpm');

function withGit(dir, { remote, head = 'ref: refs/heads/main\n', originHead } = {}) {
  fs.mkdirSync(path.join(dir, '.git', 'refs', 'remotes', 'origin'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git', 'HEAD'), head);
  if (remote) fs.writeFileSync(path.join(dir, '.git', 'config'), `[remote "origin"]\n\turl = ${remote}\n`);
  if (originHead) fs.writeFileSync(path.join(dir, '.git', 'refs', 'remotes', 'origin', 'HEAD'), `ref: refs/remotes/origin/${originHead}\n`);
}

test('AC1: mono-pnpm fixture — package manager, monorepo, apps, stack, slug, scripts', async () => {
  const dir = copyFixture(FIXTURE);
  withGit(dir, { remote: 'git@github.com:acme/mono.git', originHead: 'develop' });
  const d = await detectProject({ dir });
  assert.equal(d.mode, 'MONOREPO');
  assert.equal(d.packageManager, 'pnpm');
  assert.equal(d.monorepoTool, 'pnpm workspaces');
  assert.deepEqual(d.apps.map((a) => a.path), ['apps/api', 'apps/web']);
  const [api, web] = d.apps;
  assert.equal(api.framework, 'NestJS');
  assert.equal(web.framework, 'Nuxt');
  assert.equal(api.slug, 'api');
  assert.equal(web.slug, 'web');
  assert.deepEqual([api.scripts.test, api.scripts.lint, api.scripts.build], ['test', 'lint', 'build']);
  assert.equal(web.scripts.runnable, null);
  assert.equal(d.defaultBranch, 'develop');
  assert.equal(d.gitHost, 'github');
});

test('AC1: default branch falls back to the current branch; no .git means no git facts', async () => {
  const dir = copyFixture(FIXTURE);
  withGit(dir, { remote: 'https://gitlab.com/acme/mono.git', head: 'ref: refs/heads/trunk\n' });
  const d = await detectProject({ dir });
  assert.equal(d.defaultBranch, 'trunk');
  assert.equal(d.gitHost, 'gitlab');
  const bare = await detectProject({ dir: copyFixture(FIXTURE) });
  assert.equal(bare.defaultBranch, null);
  assert.equal(bare.gitHost, null);
  assert.equal(bare.remoteUrl, null);
});

test('AC1: single repo — lockfile decides the package manager, the root is the only app', async () => {
  const dir = makeRepo({
    'package.json': { name: 'solo', scripts: { dev: 'vite', test: 'vitest' }, dependencies: { vue: '^3' } },
    'yarn.lock': '',
    'src/main.js': 'export default 1',
  });
  const d = await detectProject({ dir });
  assert.equal(d.mode, 'SINGLE_REPO');
  assert.equal(d.packageManager, 'yarn');
  assert.equal(d.apps.length, 1);
  assert.equal(d.apps[0].path, '.');
  assert.equal(d.apps[0].scripts.runnable, 'dev');
  assert.equal(d.apps[0].hasCode, true);
});

test('AC1: remote url -> host', () => {
  assert.equal(hostFromRemoteUrl('https://github.com/a/b.git'), 'github');
  assert.equal(hostFromRemoteUrl('git@gitlab.com:a/b.git'), 'gitlab');
  assert.equal(hostFromRemoteUrl('git@gitlab.example.org:a/b.git'), 'gitlab');
  assert.equal(hostFromRemoteUrl('git@bitbucket.org:a/b.git'), null);
  assert.equal(hostFromRemoteUrl(null), null);
});

test('AC1: detection writes nothing', async () => {
  const dir = copyFixture(FIXTURE);
  withGit(dir, { remote: 'git@github.com:acme/mono.git' });
  const before = snapshotTree(dir);
  await detectProject({ dir });
  assert.deepEqual(snapshotTree(dir), before);
});
