// CAF-SDD-03c2c — `/caf-run` replaces `/caf-run-pipeline`, `/caf-plan-ticket` is no longer written,
// and a SINGLE_REPO with two whole-repo agents routes by the `tasks.md` section.
//
// `test/fixtures/pre-sdd03c2c/` is the render from before this ticket (file sets, the real command
// scaffold, the builders of `/caf-run-pipeline` and `/caf-plan-ticket`) — never regenerate it.
// Every scaffold below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agents, buildCandidates, buildSingleRepoCandidates, HIDDEN_COMMAND_FILES, isOfferedCandidate } from '../src/commands/agents.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { buildPlanTicketMd } from '../src/templates/ticket-preview-commands.js';
import { buildRunPipelineMd } from '../src/templates/run-pipeline-command.js';
import { VARIANTS, variantName, renderDefaultFileSet } from './helpers/default-file-set.js';
import { COMMAND_DIR, renderCommands } from './helpers/commands-render.js';
import { fixtureDir } from './helpers/frozen-kinds.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { curateOldRepo, makeOldRepo } from './helpers/old-repo.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd03c2c');
const golden = (id) => JSON.parse(fs.readFileSync(path.join(GOLDEN, `${id}.json`), 'utf8'));
const ANSI = /\u001b\[[0-9;]*m/g;

const OLD_NAME = 'caf-run-pipeline.md';
const NEW_NAME = 'caf-run.md';
const rename = (text) => text.replaceAll('/caf-run-pipeline', '/caf-run');

const COMMANDS = [
  ['mono-pnpm', undefined, 'commands.mono-pnpm'],
  ['single-nuxt', undefined, 'commands.single-nuxt'],
  ['single-nuxt', 'frontend', 'commands.single-nuxt.frontend'],
  ['single-nuxt', 'backend', 'commands.single-nuxt.backend'],
];

const rendered = {};
async function now(fixture, role) {
  const key = `${fixture}.${role || ''}`;
  if (!rendered[key]) rendered[key] = await renderCommands(fixture, { role });
  return rendered[key];
}

async function printed(fn) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' ').replace(ANSI, ''));
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return lines;
}

async function injected(answers, fn) {
  prompts.inject(answers);
  try {
    return await fn();
  } finally {
    prompts._injected.length = 0;
  }
}

// ---------------------------------------------------------------------------------------------
// AC-1 — the default file set
// ---------------------------------------------------------------------------------------------

for (const variant of VARIANTS) {
  const name = variantName(variant);
  test(`AC-1: ${name} — caf-run.md is written; caf-run-pipeline.md and caf-plan-ticket.md are not; the rest is the golden`, async () => {
    const old = golden(`file-set.${name}`);
    const current = await renderDefaultFileSet(variant);
    const strip = (list) => list.filter((f) => !f.endsWith(OLD_NAME) && !f.endsWith('caf-plan-ticket.md'));

    assert.ok(old.commands.includes(OLD_NAME) && old.commands.includes('caf-plan-ticket.md'), 'precondition, in the golden');
    assert.ok(current.commands.includes(NEW_NAME));
    assert.ok(current.commands.includes('caf-plan.md'));
    assert.ok(!current.commands.includes(OLD_NAME));
    assert.ok(!current.commands.includes('caf-plan-ticket.md'));
    assert.deepEqual(strip(current.commands).filter((f) => f !== NEW_NAME), strip(old.commands));
    assert.deepEqual(current.agents, old.agents);
    assert.deepEqual(current.offered, old.offered);
    assert.deepEqual(current.cafDirs, old.cafDirs);
    assert.deepEqual(
      strip(current.files).filter((f) => !f.endsWith(NEW_NAME)),
      strip(old.files)
    );
    assert.ok(current.files.includes(`${COMMAND_DIR}/${NEW_NAME}`));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-2 — /caf-run is /caf-run-pipeline with the name changed
// ---------------------------------------------------------------------------------------------

test('AC-2: the builder, with the golden inputs, equals the golden /caf-run-pipeline after the rename (gate qa and validator, MONOREPO)', () => {
  const g = golden('run-pipeline');
  for (const id of ['mono.qa', 'mono.validator', 'single-frontend.validator', 'single-backend.validator']) {
    const { input, content } = g[id];
    assert.equal(buildRunPipelineMd(input), rename(content), id);
  }
});

for (const [fixture, role, id] of COMMANDS) {
  const twoWholeRepo = fixture === 'single-nuxt' && !role;
  test(`AC-2: ${id} — caf-run.md is the golden caf-run-pipeline.md after the rename${twoWholeRepo ? ', but for the routing step (AC-3)' : ''}`, async () => {
    const old = golden(id).files[OLD_NAME];
    const current = (await now(fixture, role)).files[NEW_NAME];
    assert.ok(old);
    assert.ok(!current.includes('caf-run-pipeline'));
    if (twoWholeRepo) return; // compared outside the routing step in AC-3
    assert.equal(current, rename(old));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-3 — two whole-repo agents route by the tasks.md section
// ---------------------------------------------------------------------------------------------

const ROUTING_START = '**How to choose which agent to spawn**';
const ROUTING_END = 'If multiple agents have tasks, run them **sequentially, not in parallel**';
const flat = (s) => s.replace(/\s+/g, ' ');
const routing = (text) => {
  const start = text.indexOf(ROUTING_START);
  const end = text.indexOf(ROUTING_END);
  assert.ok(start >= 0 && end > start, 'routing step found');
  return text.slice(start, end);
};
const withoutRouting = (text) => text.slice(0, text.indexOf(ROUTING_START)) + text.slice(text.indexOf(ROUTING_END));

test('AC-3: single-nuxt default — the routing step names the tasks.md sections; the rest of the command is the golden', async () => {
  const old = golden('commands.single-nuxt').files[OLD_NAME];
  const current = (await now('single-nuxt')).files[NEW_NAME];

  assert.notEqual(routing(current), routing(rename(old)));
  assert.equal(withoutRouting(current), withoutRouting(rename(old)));

  const step = flat(routing(current));
  assert.match(step, /## Frontend Tasks.*caf-frontend/);
  assert.match(step, /## Backend Tasks.*caf-backend/);
  assert.match(step, /outside (both|these two)[^.]*ask the user|ask the user[^.]*outside (both|these two)/i);
  assert.match(step, /no tasks[^.]*DO NOT spawn/i);
  assert.ok(!/matches more than one/.test(step), 'the "more than one agent" question is gone');
  assert.ok(!/\bTODO\b/.test(step));
});

test('AC-3: the builder gives the section routing only to two agents that both cover the whole repo', () => {
  const base = { agentDir: '.claude/agents', hasArchitect: true, gate: 'validator' };
  const two = (paths) =>
    buildRunPipelineMd({ ...base, implementationRoles: ['caf-frontend', 'caf-backend'], appPaths: { 'caf-frontend': paths[0], 'caf-backend': paths[1] } });

  assert.match(flat(routing(two([['.'], ['.']]))), /## Frontend Tasks/);
  // scoped by --scope, or by app in a monorepo: the scope match stays
  for (const paths of [[['src/ui'], ['src/api']], [['apps/web'], ['apps/api']], [['.'], ['src/api']]]) {
    assert.ok(!/## Frontend Tasks/.test(routing(two(paths))), JSON.stringify(paths));
  }
  // one agent only: nothing to choose between
  for (const role of ['caf-frontend', 'caf-backend']) {
    const md = buildRunPipelineMd({ ...base, implementationRoles: [role], appPaths: { [role]: ['.'] } });
    assert.ok(!/## Frontend Tasks/.test(routing(md)), role);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-4 — a repo that already has caf-run-pipeline.md
// ---------------------------------------------------------------------------------------------

async function scaffoldAgents(dir) {
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const offered = buildSingleRepoCandidates(stack.apps[0], [], undefined).filter(isOfferedCandidate);
  return injected([offered, true, false, false], () => printed(() => agents({ dir, dryRun: false })));
}

for (const custom of [false, true]) {
  test(`AC-4: a repo with ${custom ? 'a customized ' : 'a '}caf-run-pipeline.md — it stays byte-identical, caf-run.md is written, one note is printed`, async () => {
    const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c2c-note-');
    const old = path.join(dir, COMMAND_DIR, OLD_NAME);
    fs.mkdirSync(path.dirname(old), { recursive: true });
    const content = custom ? '# my own run command\n\nedited by hand\n' : golden('commands.single-nuxt').files[OLD_NAME];
    fs.writeFileSync(old, content);

    const lines = await scaffoldAgents(dir);

    assert.equal(fs.readFileSync(old, 'utf8'), content);
    assert.ok(fs.existsSync(path.join(dir, COMMAND_DIR, NEW_NAME)));
    const notes = lines.filter((l) => l.includes(OLD_NAME));
    assert.equal(notes.length, 1, notes.join('\n'));
    assert.match(notes[0], /already exists/);
    assert.match(lines.join('\n'), /delete (it|the old file)? ?by hand/i);
  });
}

test('AC-4: a repo without caf-run-pipeline.md prints no such note', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c2c-nonote-');
  const lines = await scaffoldAgents(dir);
  assert.ok(fs.existsSync(path.join(dir, COMMAND_DIR, NEW_NAME)));
  assert.deepEqual(lines.filter((l) => l.includes(OLD_NAME)), []);
});

test('AC-4: a dry run writes nothing and leaves an existing caf-run-pipeline.md alone', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c2c-dry-');
  const old = path.join(dir, COMMAND_DIR, OLD_NAME);
  fs.mkdirSync(path.dirname(old), { recursive: true });
  fs.writeFileSync(old, 'mine\n');
  const before = snapshotTree(dir);
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const offered = buildSingleRepoCandidates(stack.apps[0], [], undefined).filter(isOfferedCandidate);
  await injected([offered, true, false, false], () => printed(() => agents({ dir, dryRun: true })));
  assert.deepEqual(snapshotTree(dir), before);
});

// ---------------------------------------------------------------------------------------------
// AC-5 — /caf-plan-ticket: no longer written, builder kept
// ---------------------------------------------------------------------------------------------

test('AC-5: caf-plan-ticket.md is in HIDDEN_COMMAND_FILES (nine files) and its builder still renders the golden text', () => {
  assert.ok(HIDDEN_COMMAND_FILES.includes('caf-plan-ticket.md'));
  assert.equal(HIDDEN_COMMAND_FILES.length, 9);
  assert.ok(!HIDDEN_COMMAND_FILES.includes('caf-plan.md'));
  assert.ok(!HIDDEN_COMMAND_FILES.includes(NEW_NAME));
  const g = golden('plan-ticket');
  assert.equal(buildPlanTicketMd(g.input), g.content);
});

test('AC-5: a caf-plan-ticket.md already in the repo is not touched by a new scaffold', async () => {
  const dir = copyFixture(fixtureDir('mono-pnpm'), 'caf-sdd03c2c-planticket-');
  const file = path.join(dir, COMMAND_DIR, 'caf-plan-ticket.md');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'old plan-ticket\n');
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const web = stack.apps.find((a) => a.path === 'apps/web');
  const api = stack.apps.find((a) => a.path === 'apps/api');
  const picked = buildCandidates({ frontend: [web], backend: [api] }, []).filter(isOfferedCandidate);
  await injected([[web], [api], picked, false, false, false], () => printed(() => agents({ dir, dryRun: false })));
  assert.equal(fs.readFileSync(file, 'utf8'), 'old plan-ticket\n');
  assert.ok(fs.existsSync(path.join(dir, COMMAND_DIR, 'caf-plan.md')));
});

// ---------------------------------------------------------------------------------------------
// AC-6 — /caf-review and /caf-fix-review change only by the name
// ---------------------------------------------------------------------------------------------

for (const [fixture, role, id] of COMMANDS) {
  for (const file of ['caf-review.md', 'caf-fix-review.md', 'caf-plan.md', 'caf-complete-drafts.md']) {
    test(`AC-6: ${id} — ${file} is the golden after the rename and nothing else`, async () => {
      const old = golden(id).files[file];
      const current = (await now(fixture, role)).files[file];
      assert.equal(current, rename(old));
      if (file.endsWith('review.md')) {
        assert.ok(old.includes('/caf-run-pipeline') || file === 'caf-plan.md', 'precondition: the golden names the old command');
      }
    });
  }
}

// ---------------------------------------------------------------------------------------------
// AC-7 — nothing offers the old names
// ---------------------------------------------------------------------------------------------

test('AC-7: no scaffolded command and no text agents() prints names /caf-run-pipeline or /caf-plan-ticket', async () => {
  for (const [fixture, role] of COMMANDS) {
    const { files } = await now(fixture, role);
    for (const [name, text] of Object.entries(files)) {
      assert.ok(!/caf-run-pipeline|caf-plan-ticket/.test(text), `${fixture}/${name}`);
    }
  }
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c2c-text-');
  const lines = await scaffoldAgents(dir);
  assert.ok(!/caf-run-pipeline|caf-plan-ticket/.test(lines.join('\n')));
  assert.ok(lines.some((l) => l.includes('/caf-run')), 'the offer names /caf-run');
});

test('AC-7: git grep over src finds no old name except the ones the ticket keeps', () => {
  let out = '';
  try {
    out = execFileSync('git', ['grep', '-n', '-E', 'caf-run-pipeline|caf-plan-ticket', '--', 'src'], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) {
    if (e.status !== 1) throw e;
  }
  const allowed = [
    /HIDDEN_COMMAND_FILES|file: 'caf-plan-ticket\.md'|caf-plan-ticket\.md'/, // the list and the builder's file name
    /caf-run-pipeline\.md/, // AC-4: the note and the existence check
    /^\S+:\d+:\s*(\/\/|\*)/, // comments (history)
  ];
  const stray = out.split('\n').filter(Boolean).filter((l) => !allowed.some((re) => re.test(l)));
  assert.deepEqual(stray, []);
});

// ---------------------------------------------------------------------------------------------
// AC-8 — curate on an old repo is unchanged
// ---------------------------------------------------------------------------------------------

for (const fixture of ['mono-pnpm', 'single-nuxt']) {
  test(`AC-8: ${fixture} — curate audit on the old repo reports exactly what was recorded`, async () => {
    const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'pre-sdd03c1', `curate-old-repo.${fixture}.json`), 'utf8'));
    const repo = await makeOldRepo(fixture);
    const { report } = await curateOldRepo(repo.dir);
    assert.deepEqual(report.audit, recorded.audit);
  });
}
