// CAF-INIT-SMART-01 AC3 + AC4 — summary + `Proceed? (Y/n/e)`: how many questions a run asks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { runSmartScaffold, parseProceedAnswer } from '../src/commands/scaffold-flow.js';
import { promptCount, resetPromptCount } from '../src/utils/ask.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';

const FIXTURE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'mono-pnpm');

// Runs the flow with `answers` injected. The budget makes an unexpected extra question throw
// instead of waiting on stdin.
async function flow(dir, answers, extra = {}) {
  prompts.inject(answers);
  resetPromptCount(answers.length);
  try {
    return await silenced(() => runSmartScaffold({ dir, dryRun: false, agentDir: '.claude/agents', interactive: true, ...extra }));
  } finally {
    prompts._injected = [];
  }
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

test('AC3: a single tracker signal asks exactly one question (Proceed?)', async () => {
  const dir = copyFixture(FIXTURE);
  const result = await flow(dir, ['Y']);
  assert.equal(result.ok, true);
  assert.equal(promptCount(), 1);
  assert.match(read(dir, 'CLAUDE.md'), /Tracker: Linear/);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'agents', 'caf-planner.md')));
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'caf-spec', 'SKILL.md')));
});

test('AC3: an ambiguous tracker asks two questions (picker, then Proceed?)', async () => {
  const dir = copyFixture(FIXTURE);
  fs.writeFileSync(path.join(dir, 'atlassian.yml'), 'x: 1\n');
  const result = await flow(dir, ['Jira', 'Y']);
  assert.equal(result.ok, true);
  assert.equal(promptCount(), 2);
  assert.match(read(dir, 'CLAUDE.md'), /Tracker: Jira/);
});

test('AC3: no tracker signal also asks the picker once, with no choice made for the user', async () => {
  const dir = copyFixture(FIXTURE);
  fs.rmSync(path.join(dir, '.linear'), { recursive: true });
  const result = await flow(dir, ['GitLab Issues', 'Y']);
  assert.equal(promptCount(), 2);
  assert.equal(result.selection.tracker.name, 'GitLab Issues');
  assert.match(read(dir, 'CLAUDE.md'), /Tracker: GitLab Issues/);
});

test('AC4: Enter (empty answer) is Y', async () => {
  assert.equal(parseProceedAnswer(''), 'proceed');
  assert.equal(parseProceedAnswer('Y'), 'proceed');
  assert.equal(parseProceedAnswer('n'), 'cancel');
  assert.equal(parseProceedAnswer('e'), 'edit');
  assert.equal(parseProceedAnswer('what'), null);
  const dir = copyFixture(FIXTURE);
  const result = await flow(dir, ['']);
  assert.equal(result.ok, true);
  assert.ok(fs.existsSync(path.join(dir, 'CLAUDE.md')));
});

test('AC4: n cancels and writes nothing', async () => {
  const dir = copyFixture(FIXTURE);
  const before = snapshotTree(dir);
  const result = await flow(dir, ['n']);
  assert.equal(result.ok, false);
  assert.deepEqual(snapshotTree(dir), before);
});

test('AC4: e opens the pickers, then returns to the summary and asks Proceed? again', async () => {
  const dir = copyFixture(FIXTURE);
  const result = await flow(dir, ['e', ['agents'], ['planner', 'reviewer'], 'Y']);
  assert.equal(result.ok, true);
  assert.equal(promptCount(), 4);
  assert.deepEqual(result.selection.kinds, ['planner', 'reviewer']);
  const agentFiles = fs.readdirSync(path.join(dir, '.claude', 'agents')).sort();
  assert.deepEqual(agentFiles, ['caf-planner.md', 'caf-reviewer.md']);
});

test('AC4: e can change the tracker', async () => {
  const dir = copyFixture(FIXTURE);
  const result = await flow(dir, ['e', ['tracker'], 'GitHub Issues', 'Y']);
  assert.equal(result.selection.tracker.name, 'GitHub Issues');
  assert.match(read(dir, 'AGENTS.md'), /GitHub Issues/);
});

test('--dry-run through the flow writes nothing', async () => {
  const dir = copyFixture(FIXTURE);
  const before = snapshotTree(dir);
  const result = await flow(dir, ['Y'], { dryRun: true });
  assert.equal(result.ok, true);
  assert.deepEqual(snapshotTree(dir), before);
});

// --- ADR is opt-in (follow-up 1) ------------------------------------------------------------

const adrDir = (dir) => path.join(dir, '.caf', 'knowledge', 'decisions');

test('ADR: not drafted by default — recommendation is none, the summary says how to add it', async () => {
  const dir = copyFixture(FIXTURE);
  const result = await flow(dir, ['Y']);
  assert.equal(result.selection.adr, false);
  assert.ok(!fs.existsSync(adrDir(dir)));
});

test('ADR: e can opt in, and the drafts are written', async () => {
  const dir = copyFixture(FIXTURE);
  const result = await flow(dir, ['e', ['adr'], true, 'Y']);
  assert.equal(result.selection.adr, true);
  assert.ok(fs.readdirSync(adrDir(dir)).some((f) => /^adr-001-/.test(f)));
});

test('ADR: --adr opts in without a question', async () => {
  const dir = copyFixture(FIXTURE);
  const result = await flow(dir, ['Y'], { adr: true });
  assert.equal(result.selection.adr, true);
  assert.equal(promptCount(), 1);
  assert.ok(fs.readdirSync(adrDir(dir)).length > 0);
});

// --- /caf-run is generated by the flow; the PR-review commands stay opt-in (follow-up 2) -----

const commandFiles = (dir) => fs.readdirSync(path.join(dir, '.claude', 'commands')).sort();

test('commands: the flow generates /caf-run, not /caf-review or /caf-fix-review', async () => {
  const dir = copyFixture(FIXTURE);
  await flow(dir, ['Y']);
  const files = commandFiles(dir);
  assert.ok(files.includes('caf-run.md'));
  assert.ok(files.includes('caf-plan.md'));
  assert.ok(!files.includes('caf-review.md'));
  assert.ok(!files.includes('caf-fix-review.md'));
});

test('commands: no /caf-run without an implementation agent, and the summary says so', async () => {
  const dir = copyFixture(FIXTURE);
  await flow(dir, ['Y'], { agents: 'planner,reviewer' });
  assert.ok(!commandFiles(dir).includes('caf-run.md'));
});

test('commands: asked on its own, /caf-run still defaults to N (only the unattended flow says yes)', () => {
  const src = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'commands', 'agents.js'), 'utf8');
  const prompt = src.slice(src.indexOf("message: 'Generate /caf-run?'"), src.indexOf("if (generateRun)"));
  assert.match(prompt, /initial: false/);
  assert.match(prompt, /auto: true/);
});
