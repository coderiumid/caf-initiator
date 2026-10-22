// CAF-INIT-DOCS-REMOVE amendment 3 (AC-17 to AC-21) — the bare `scaffold` chain runs the skills
// step right after Agents. Every other step is replaced by a spy so the chain order and the answers
// are what is under test; the skills step itself is the real one.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { runScaffold, CHAIN_ORDER, TARGETS } from '../src/commands/scaffold.js';
import { skillsTarget } from '../src/commands/skills.js';
import { listDraftFiles } from '../src/commands/complete-drafts.js';
import { SKILL_NAMES, skillPath } from '../src/templates/skill-md.js';
import { silenced } from './helpers/mono-snapshot.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(HERE, '..', 'src', 'index.js');
// The README of mono-pnpm names Linear, so Setup asks nothing.
const FIXTURE = path.join(HERE, 'fixtures', 'mono-pnpm');

const skillsDir = (dir) => path.join(dir, '.claude', 'skills');

// Runs the bare chain with every step but skills stubbed. `answers` are the step confirms in
// CHAIN_ORDER order. Returns the labels of the steps that ran, in order.
async function chain(dir, answers) {
  const real = {};
  const ran = [];
  for (const key of CHAIN_ORDER) {
    if (key === 'skills') continue;
    real[key] = TARGETS[key].run;
    TARGETS[key].run = async () => {
      ran.push(key);
      return { written: [], skipped: [] };
    };
  }
  const realSkills = TARGETS.skills.run;
  TARGETS.skills.run = async (ctx) => {
    ran.push('skills');
    return realSkills(ctx);
  };
  prompts.inject(answers);
  try {
    await silenced(() => runScaffold({ dir, dryRun: false, agentDir: '.claude/agents' }));
  } finally {
    for (const key of Object.keys(real)) TARGETS[key].run = real[key];
    TARGETS.skills.run = realSkills;
  }
  return ran;
}

const allYes = () => CHAIN_ORDER.map(() => true);
const skipSkills = () => CHAIN_ORDER.map((key) => key !== 'skills');

test('AC-17: skills is the step right after agents, and --help names it in that place', () => {
  assert.equal(CHAIN_ORDER[CHAIN_ORDER.indexOf('agents') + 1], 'skills');
  assert.equal(CHAIN_ORDER.indexOf('complete-drafts'), CHAIN_ORDER.length - 1);
  const help = execFileSync(process.execPath, [INDEX, 'scaffold', '--help'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  assert.match(help, /Agents → Skills → Task Completion/);
});

test('AC-17: the chain runs the steps in CHAIN_ORDER', async () => {
  const dir = copyFixture(FIXTURE);
  assert.deepEqual(await chain(dir, allYes()), CHAIN_ORDER);
});

test('AC-18: .claude/skills from the chain is byte-identical to `scaffold skills` run alone', async () => {
  const viaChain = copyFixture(FIXTURE);
  const alone = copyFixture(FIXTURE);
  await chain(viaChain, allYes());
  await silenced(() => skillsTarget({ dir: alone }));

  const a = snapshotTree(skillsDir(viaChain));
  const b = snapshotTree(skillsDir(alone));
  assert.equal(Object.keys(a).length, SKILL_NAMES.length);
  assert.deepEqual(a, b);
});

test('AC-20: answering no to the skills step writes no skill and the chain goes on', async () => {
  const dir = copyFixture(FIXTURE);
  const before = process.exitCode;
  const ran = await chain(dir, skipSkills());
  assert.ok(!fs.existsSync(skillsDir(dir)));
  assert.ok(!ran.includes('skills'));
  assert.deepEqual(ran, CHAIN_ORDER.filter((key) => key !== 'skills'));
  assert.equal(process.exitCode, before);
});

test('AC-21: a second full run does not overwrite a skill that exists, even an edited one', async () => {
  const dir = copyFixture(FIXTURE);
  await chain(dir, allYes());
  const file = path.join(dir, skillPath('caf-no-guess'));
  fs.appendFileSync(file, '\nteam edit\n');
  const edited = fs.readFileSync(file, 'utf8');
  const before = snapshotTree(skillsDir(dir));

  await chain(dir, allYes());
  assert.equal(fs.readFileSync(file, 'utf8'), edited);
  assert.deepEqual(snapshotTree(skillsDir(dir)), before);
});

test('with the chain, a zero-agent repo still gets the skills and nothing fails', async () => {
  const dir = copyFixture(FIXTURE);
  await chain(dir, allYes());
  assert.equal(fs.readdirSync(skillsDir(dir)).length, SKILL_NAMES.length);
});

// Decision 2 of the checkpoint: the skills are in the /caf-complete-drafts inventory because of
// listDraftFiles, not because of the chain — a repo that ran `scaffold skills` alone has them too.
test('listDraftFiles already lists the skills after `scaffold skills` alone', async () => {
  const dir = copyFixture(FIXTURE);
  assert.deepEqual((await listDraftFiles(dir)).filter((f) => f.includes('/skills/')), []);
  await silenced(() => skillsTarget({ dir }));
  const listed = (await listDraftFiles(dir)).filter((f) => f.startsWith('.claude/skills/'));
  assert.deepEqual(listed, SKILL_NAMES.map(skillPath).sort());
});
