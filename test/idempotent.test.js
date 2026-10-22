// CAF-INIT-SMART-01 AC8 — existing files are skipped and reported; --dry-run writes nothing; the
// conflict question (D8) defaults to skipping.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { runSmartScaffold } from '../src/commands/scaffold-flow.js';
import { promptCount, resetPromptCount } from '../src/utils/ask.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(HERE, '..', 'src', 'index.js');
const FIXTURE = path.join(HERE, 'fixtures', 'mono-pnpm');

function cli(dir, args) {
  const r = spawnSync(process.execPath, [INDEX, 'scaffold', '--dir', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 90000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

async function attended(dir, answers) {
  prompts.inject(answers);
  resetPromptCount(answers.length);
  try {
    return await silenced(() => runSmartScaffold({ dir, agentDir: '.claude/agents', interactive: true }));
  } finally {
    prompts._injected = [];
  }
}

test('AC8: --dry-run writes nothing', () => {
  const dir = copyFixture(FIXTURE);
  const before = snapshotTree(dir);
  const r = cli(dir, ['--yes', '--dry-run']);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /dry-run complete/);
  assert.deepEqual(snapshotTree(dir), before);
});

test('AC8: a second run changes nothing and reports the files as already there', () => {
  const dir = copyFixture(FIXTURE);
  assert.equal(cli(dir, ['--yes']).code, 0);
  const after1 = snapshotTree(dir);
  const second = cli(dir, ['--yes']);
  assert.equal(second.code, 0, second.err);
  assert.deepEqual(snapshotTree(dir), after1);
  assert.match(second.out, /skip .*CLAUDE\.md \(already exists\)/);
  assert.match(second.out, /0 to create/);
});

test('AC8: an existing file that differs is kept, shown as skipped in the summary, and --yes never overwrites', () => {
  const dir = copyFixture(FIXTURE);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'my own notes\n');
  const r = cli(dir, ['--yes']);
  assert.equal(r.code, 0, r.err);
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 'my own notes\n');
  assert.match(r.out, /1 exist and differ/);
  assert.match(r.out, /skip\s+CLAUDE\.md/);
});

test('D8: attended run — the conflict question defaults to skipping everything', async () => {
  const dir = copyFixture(FIXTURE);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'my own notes\n');
  await attended(dir, ['Y', 'skip']);
  assert.equal(promptCount(), 2);
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 'my own notes\n');
});

test('D8: overwrite all replaces the conflicting file', async () => {
  const dir = copyFixture(FIXTURE);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'my own notes\n');
  await attended(dir, ['Y', 'all']);
  assert.match(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), /# CLAUDE\.md/);
});

test('D8: one by one asks per file with N as the default, and only the ticked one is replaced', async () => {
  const dir = copyFixture(FIXTURE);
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'my own notes\n');
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'my agents\n');
  await attended(dir, ['Y', 'each', true, false]);
  assert.equal(promptCount(), 4);
  // Conflicts are asked in write order: CLAUDE.md first (yes), AGENTS.md second (no).
  assert.match(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), /# CLAUDE\.md/);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'my agents\n');
});

test('D8: no conflict means no conflict question', async () => {
  const dir = copyFixture(FIXTURE);
  await attended(dir, ['Y']);
  assert.equal(promptCount(), 1);
});
