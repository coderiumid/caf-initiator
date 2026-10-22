// CAF-INIT-SMART-01 AC6 — --yes, non-TTY, and the flags: no question is ever shown.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { runSmartScaffold, splitList } from '../src/commands/scaffold-flow.js';
import { promptCount, resetPromptCount } from '../src/utils/ask.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(HERE, '..', 'src', 'index.js');
const FIXTURE = path.join(HERE, 'fixtures', 'mono-pnpm');

// stdin is not a TTY here (stdio 'ignore'), exactly the case D9 is about.
function cli(dir, args) {
  const r = spawnSync(process.execPath, [INDEX, 'scaffold', '--dir', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 90000 });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

const noSignal = () => {
  const dir = copyFixture(FIXTURE);
  fs.rmSync(path.join(dir, '.linear'), { recursive: true });
  return dir;
};

test('AC6: --yes with no tracker signal fails, names --tracker, writes nothing', () => {
  const dir = noSignal();
  const before = snapshotTree(dir);
  const r = cli(dir, ['--yes']);
  assert.notEqual(r.code, 0);
  assert.match(r.err, /--tracker/);
  assert.deepEqual(snapshotTree(dir), before);
});

test('AC6: --yes with several tracker signals fails the same way', () => {
  const dir = copyFixture(FIXTURE);
  fs.writeFileSync(path.join(dir, 'atlassian.yml'), 'x: 1\n');
  const r = cli(dir, ['--yes']);
  assert.notEqual(r.code, 0);
  assert.match(r.err, /several trackers/);
  assert.match(r.err, /--tracker/);
});

test('AC6: no TTY and no --yes shows no prompt: ambiguous fails, a clear signal just runs', () => {
  const dir = noSignal();
  const r = cli(dir, []);
  assert.notEqual(r.code, 0);
  assert.match(r.err, /--tracker/);

  const ok = cli(copyFixture(FIXTURE), []);
  assert.equal(ok.code, 0, ok.err);
});

test('AC6: --tracker settles an ambiguous repo; --yes writes the drafts with that tracker', () => {
  const dir = noSignal();
  const r = cli(dir, ['--yes', '--tracker', 'gitlab']);
  assert.equal(r.code, 0, r.err);
  assert.match(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), /Tracker: GitLab Issues/);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'agents', 'caf-planner.md')));
});

test('AC6: an unknown --tracker / --apps / --agents value exits 1 and writes nothing', () => {
  for (const args of [['--tracker', 'trello'], ['--apps', 'nope'], ['--agents', 'planner,wizard']]) {
    const dir = copyFixture(FIXTURE);
    const before = snapshotTree(dir);
    const r = cli(dir, ['--yes', ...args]);
    assert.equal(r.code, 1, args.join(' '));
    assert.deepEqual(snapshotTree(dir), before);
  }
});

test('AC6: --agents limits the agent files; --apps none scans no app', () => {
  const dir = copyFixture(FIXTURE);
  const r = cli(dir, ['--yes', '--agents', 'planner,reviewer', '--apps', 'none']);
  assert.equal(r.code, 0, r.err);
  assert.deepEqual(fs.readdirSync(path.join(dir, '.claude', 'agents')).sort(), ['caf-planner.md', 'caf-reviewer.md']);
  assert.ok(!fs.existsSync(path.join(dir, '.caf', 'knowledge', 'golden-examples')));
});

test('AC6: --tracker/--apps/--agents are refused on a single target', () => {
  const r = cli(copyFixture(FIXTURE), ['adr', '--tracker', 'jira']);
  assert.equal(r.code, 1);
  assert.match(r.err, /bare/);
});

test('AC6: in-process, an unattended run never reaches a question', async () => {
  const dir = copyFixture(FIXTURE);
  resetPromptCount(0);
  const result = await silenced(() => runSmartScaffold({ dir, agentDir: '.claude/agents', interactive: false }));
  assert.equal(result.ok, true);
  assert.equal(promptCount(), 0);
  const yes = await silenced(() => runSmartScaffold({ dir: copyFixture(FIXTURE), agentDir: '.claude/agents', interactive: true, yes: true }));
  assert.equal(yes.ok, true);
  assert.equal(promptCount(), 0);
});

test('splitList accepts commas and repeats', () => {
  assert.deepEqual(splitList('a, b,c'), ['a', 'b', 'c']);
  assert.deepEqual(splitList(['a', 'b,c']), ['a', 'b', 'c']);
  assert.deepEqual(splitList(undefined), []);
});
