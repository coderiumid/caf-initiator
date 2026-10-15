// CAF-SDD-03c3 — SINGLE_REPO gets caf-frontend + caf-backend in place of caf-implementer, and the
// builders of the eight commands that no scaffold writes are gone.
//
// `test/fixtures/pre-sdd03c3/` is the render from before this ticket (single-nuxt default,
// --role frontend, --role backend, mono-pnpm; file set and content) — never regenerate it. Every
// scaffold and every `curate` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import {
  agents,
  buildCandidates,
  buildSingleRepoCandidates,
  HIDDEN_CANDIDATE_KINDS,
  HIDDEN_COMMAND_FILES,
  isOfferedCandidate,
  SUPERSEDED_CANDIDATE_KINDS,
} from '../src/commands/agents.js';
import { curate } from '../src/commands/curate.js';
import { curateBaseline } from '../src/commands/curate-baseline.js';
import { skillsTarget } from '../src/commands/skills.js';
import { workflow } from '../src/commands/workflow.js';
import { runScaffoldTarget } from '../src/commands/scaffold.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { buildRunPipelineMd } from '../src/templates/run-pipeline-command.js';
import { readAgentRoster } from '../src/utils/read-agent-roster.js';
import { renderDefaultFileSet } from './helpers/default-file-set.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { CONTENT_VARIANTS, renderScaffoldContents } from './helpers/scaffold-contents.js';
import { AGENT_DIR, fixtureDir } from './helpers/frozen-kinds.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd03c3');
const golden = (id) => JSON.parse(fs.readFileSync(path.join(GOLDEN, `${id}.json`), 'utf8'));
const ANSI = /\u001b\[[0-9;]*m/g;

const IMPLEMENTER = '.claude/agents/caf-implementer.md';
const FRONTEND = '.claude/agents/caf-frontend.md';
const BACKEND = '.claude/agents/caf-backend.md';
const RUN_PIPELINE = '.claude/commands/caf-run-pipeline.md';
const COMPLETE_DRAFTS = '.claude/commands/caf-complete-drafts.md';
const HANDOFF = '.caf/workflows/agent-handoff.md';
const PIV = '.caf/workflows/piv-workflow.md';
// The two files CAF-SDD-03c2b changed on purpose (the planner's Output and Constraints, INDEX.md):
// test/sdd03c2b-planner-clarify.test.js compares them against a golden of its own.
const CHANGED_BY_03C2B = ['.claude/agents/caf-planner.md', '.caf/knowledge/INDEX.md'];

/** Lines printed by `fn` (colour codes removed), console.log restored afterwards. */
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

const rendered = {};
async function now(id) {
  if (!rendered[id]) {
    const variant = CONTENT_VARIANTS.find((v) => v.id === id);
    rendered[id] = await renderScaffoldContents(variant);
  }
  return rendered[id];
}

// ---------------------------------------------------------------------------------------------
// AC-1 — the default roster
// ---------------------------------------------------------------------------------------------

test('AC-1: single-nuxt default — planner, architect, frontend, backend, validator, reviewer; the commands are the golden commands', async () => {
  const old = golden('single-nuxt.default');
  const current = await now('single-nuxt.default');

  assert.deepEqual(current.offered, ['planner', 'architect', 'frontend', 'backend', 'validator', 'reviewer']);
  assert.deepEqual(current.agents, ['caf-architect.md', 'caf-backend.md', 'caf-frontend.md', 'caf-planner.md', 'caf-reviewer.md', 'caf-validator.md']);
  assert.deepEqual(current.commands, old.commands);

  const expected = Object.keys(old.files)
    .filter((f) => f !== IMPLEMENTER)
    .concat(FRONTEND, BACKEND)
    .sort();
  assert.deepEqual(Object.keys(current.files).sort(), expected);
});

// ---------------------------------------------------------------------------------------------
// AC-2 — --role is unchanged
// ---------------------------------------------------------------------------------------------

for (const id of ['single-nuxt.frontend', 'single-nuxt.backend']) {
  test(`AC-2: ${id} — the file set and every file are byte-for-byte the golden`, async () => {
    const old = golden(id);
    const current = await now(id);
    assert.deepEqual(current.offered, old.offered);
    assert.deepEqual(current.agents, old.agents);
    assert.deepEqual(current.commands, old.commands);
    assert.deepEqual(Object.keys(current.files).sort(), Object.keys(old.files).sort());
    for (const [rel, content] of Object.entries(old.files)) if (!CHANGED_BY_03C2B.includes(rel)) assert.equal(current.files[rel], content, rel);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-3 — the default's two agents are the --role agents
// ---------------------------------------------------------------------------------------------

test('AC-3: caf-frontend.md and caf-backend.md of the default are the --role frontend and --role backend files', async () => {
  const def = await now('single-nuxt.default');
  const frontend = await now('single-nuxt.frontend');
  const backend = await now('single-nuxt.backend');
  assert.equal(def.files[FRONTEND], frontend.files[FRONTEND]);
  assert.equal(def.files[BACKEND], backend.files[BACKEND]);
});

// ---------------------------------------------------------------------------------------------
// AC-4 — implementer is superseded
// ---------------------------------------------------------------------------------------------

test('AC-4: implementer is never offered, in SINGLE_REPO or MONOREPO; it is superseded, not hidden', async () => {
  const single = await detectStack({ dir: fixtureDir('single-nuxt'), explicitGlobs: undefined });
  const mono = await detectStack({ dir: fixtureDir('mono-pnpm'), explicitGlobs: undefined });
  const web = mono.apps.find((a) => a.path === 'apps/web');
  const api = mono.apps.find((a) => a.path === 'apps/api');

  for (const role of [undefined, 'frontend', 'backend', 'implementer']) {
    const offered = buildSingleRepoCandidates(single.apps[0], [], role).filter(isOfferedCandidate).map((c) => c.kind);
    assert.ok(!offered.includes('implementer'), `SINGLE_REPO ${role}`);
  }
  const monoOffered = buildCandidates({ frontend: [web], backend: [api] }, []).filter(isOfferedCandidate).map((c) => c.kind);
  assert.ok(!monoOffered.includes('implementer'));

  assert.ok(SUPERSEDED_CANDIDATE_KINDS.includes('implementer'));
  assert.ok(SUPERSEDED_CANDIDATE_KINDS.includes('qa'));
  assert.ok(!HIDDEN_CANDIDATE_KINDS.includes('implementer'));
  assert.deepEqual([...HIDDEN_CANDIDATE_KINDS].sort(), ['auditor', 'devops', 'documentation', 'pm', 'ux-designer']);
  // The candidate itself is still there for a caller that asks for it (the kind is not removed).
  assert.ok(buildSingleRepoCandidates(single.apps[0], [], 'implementer').some((c) => c.kind === 'implementer'));
});

test('AC-4: `--role implementer` is refused (the picker would offer nothing for it)', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c3-role-');
  const before = snapshotTree(dir);
  const saved = process.exitCode;
  let lines;
  try {
    lines = await printed(() => agents({ dir, dryRun: false, role: 'implementer' }));
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = saved;
  }
  assert.ok(lines.some((l) => /unknown --role "implementer" \(choices: frontend, backend\)/.test(l)), lines.join('\n'));
  assert.deepEqual(snapshotTree(dir), before);
});

// ---------------------------------------------------------------------------------------------
// AC-5 — a repo that has caf-implementer.md
// ---------------------------------------------------------------------------------------------

const IMPLEMENTER_NOTE = /caf-orchestrator[^]*caf-frontend\/caf-backend/;

async function scaffoldAgents(dir) {
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const offered = buildSingleRepoCandidates(stack.apps[0], []).filter(isOfferedCandidate);
  return injected([offered, false, false, false], () => printed(() => agents({ dir, dryRun: false })));
}

for (const [label, content] of [
  ['a generated caf-implementer.md', null],
  ['a customized caf-implementer.md', '---\nname: caf-implementer\n---\n\n# my own implementer\n\nDo not touch.\n'],
]) {
  test(`AC-5: ${label} is left byte-for-byte, frontend and backend are written next to it, one note is printed`, async () => {
    const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c3-implementer-');
    const file = path.join(dir, IMPLEMENTER);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const text = content ?? golden('single-nuxt.default').files[IMPLEMENTER];
    fs.writeFileSync(file, text);

    const lines = await scaffoldAgents(dir);

    assert.equal(fs.readFileSync(file, 'utf8'), text, 'caf-implementer.md is identical');
    assert.ok(fs.existsSync(path.join(dir, FRONTEND)));
    assert.ok(fs.existsSync(path.join(dir, BACKEND)));
    assert.equal(lines.filter((l) => IMPLEMENTER_NOTE.test(l)).length, 1, `exactly one note:\n${lines.join('\n')}`);
  });
}

test('AC-5: a caf-frontend.md that already exists is not overwritten', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c3-frontend-');
  const implementer = path.join(dir, IMPLEMENTER);
  const frontend = path.join(dir, FRONTEND);
  fs.mkdirSync(path.dirname(implementer), { recursive: true });
  fs.writeFileSync(implementer, golden('single-nuxt.default').files[IMPLEMENTER]);
  fs.writeFileSync(frontend, '---\nname: caf-frontend\n---\n\n# my own frontend\n');

  await scaffoldAgents(dir);

  assert.equal(fs.readFileSync(frontend, 'utf8'), '---\nname: caf-frontend\n---\n\n# my own frontend\n');
  assert.ok(fs.existsSync(path.join(dir, BACKEND)), 'the missing one is still written');
});

test('AC-5: a repo without caf-implementer.md gets no note', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c3-nonote-');
  const lines = await scaffoldAgents(dir);
  assert.equal(lines.filter((l) => IMPLEMENTER_NOTE.test(l)).length, 0, lines.join('\n'));
  assert.ok(!fs.existsSync(path.join(dir, IMPLEMENTER)));
});

// ---------------------------------------------------------------------------------------------
// AC-6 — /caf-run-pipeline follows the roster
// ---------------------------------------------------------------------------------------------

test('AC-6: /caf-run-pipeline of the default roster names caf-frontend and caf-backend, not caf-implementer', async () => {
  const current = (await now('single-nuxt.default')).files[RUN_PIPELINE];
  assert.match(current, /caf-frontend/);
  assert.match(current, /caf-backend/);
  assert.doesNotMatch(current, /caf-implementer/);
});

test('AC-6: /caf-run-pipeline rendered for a roster with implementer is byte-for-byte the golden', () => {
  const old = golden('single-nuxt.default').files[RUN_PIPELINE];
  const content = buildRunPipelineMd({
    agentDir: AGENT_DIR,
    implementationRoles: ['caf-implementer'],
    appPaths: { 'caf-implementer': ['.'] },
    hasArchitect: true,
    hasDocumentation: false,
    gate: 'validator',
  });
  assert.equal(content, old);
});

// ---------------------------------------------------------------------------------------------
// AC-7 — the roster readers
// ---------------------------------------------------------------------------------------------

const ROSTER_CASES = [
  ['(i) only caf-implementer.md', ['caf-implementer'], /Implementer/],
  ['(ii) only caf-frontend.md and caf-backend.md', ['caf-frontend', 'caf-backend'], null],
  ['(iii) all three', ['caf-implementer', 'caf-frontend', 'caf-backend'], /Implementer/],
];

for (const [label, slugs, implementerLine] of ROSTER_CASES) {
  test(`AC-7: ${label} — every agent present is checked, none is custom, no "NOT present" Implementer line when it is not there`, async () => {
    const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c3-roster-');
    const agentDir = path.join(dir, AGENT_DIR);
    fs.mkdirSync(agentDir, { recursive: true });
    for (const slug of ['caf-planner', 'caf-validator', 'caf-reviewer', ...slugs]) fs.writeFileSync(path.join(agentDir, `${slug}.md`), `# ${slug}\n`);

    const roster = readAgentRoster(agentDir);
    assert.deepEqual(roster.custom, []);
    for (const slug of slugs) assert.equal(roster.known.find((r) => r.slug === slug)?.present, true, slug);

    await silenced(() => workflow({ dir, dryRun: false }));
    const piv = fs.readFileSync(path.join(dir, PIV), 'utf8');
    const labels = { 'caf-implementer': 'Implementer', 'caf-frontend': 'Frontend', 'caf-backend': 'Backend' };
    for (const slug of slugs) assert.match(piv, new RegExp(`- \\[x\\] ${labels[slug]}\\b`), slug);
    if (!implementerLine) assert.doesNotMatch(piv, /Implementer/, 'no Implementer line at all');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-8 — the other generated files differ from the golden in the agent list only
// ---------------------------------------------------------------------------------------------

function changedLines(before, after) {
  const count = (text) => {
    const map = new Map();
    for (const line of text.split('\n')) map.set(line, (map.get(line) || 0) + 1);
    return map;
  };
  const a = count(before);
  const b = count(after);
  const changed = [];
  for (const [line, n] of a) if ((b.get(line) || 0) < n) changed.push(line);
  for (const [line, n] of b) if ((a.get(line) || 0) < n) changed.push(line);
  return changed;
}

for (const rel of [COMPLETE_DRAFTS, HANDOFF]) {
  test(`AC-8: ${rel} differs from the golden only on lines that name the implementation agents`, async () => {
    const before = golden('single-nuxt.default').files[rel];
    const after = (await now('single-nuxt.default')).files[rel];
    const changed = changedLines(before, after);
    assert.ok(changed.length > 0, 'the agent list did change');
    for (const line of changed) assert.match(line, /implementer|frontend|backend/i, line);
    assert.match(after, /[Ff]rontend/);
    assert.match(after, /[Bb]ackend/);
    assert.doesNotMatch(after, /[Ii]mplementer/);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-9 — mono-pnpm is unchanged
// ---------------------------------------------------------------------------------------------

test('AC-9: mono-pnpm — the file set and every file are byte-for-byte the golden', async () => {
  const old = golden('mono-pnpm.default');
  const current = await now('mono-pnpm.default');
  assert.deepEqual(current.offered, old.offered);
  assert.deepEqual(current.agents, old.agents);
  assert.deepEqual(current.commands, old.commands);
  assert.deepEqual(Object.keys(current.files).sort(), Object.keys(old.files).sort());
  for (const [rel, content] of Object.entries(old.files)) if (!CHANGED_BY_03C2B.includes(rel)) assert.equal(current.files[rel], content, rel);
});

// ---------------------------------------------------------------------------------------------
// AC-10 — the dead builders are gone
// ---------------------------------------------------------------------------------------------

const DEAD_BUILDERS = [
  'buildDiscoveryStartMd',
  'buildDiscoveryToTicketMd',
  'buildAuditScanMd',
  'buildAuditToTicketMd',
  'buildDesignTicketMd',
  'buildQaCheckMd',
  'buildReviewTicketMd',
  'buildFeatureCatalogSyncMd',
];

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(abs) : [abs];
  });
}

test('AC-10: no dead builder name is left in src/', () => {
  const files = sourceFiles(path.join(ROOT, 'src'));
  for (const name of DEAD_BUILDERS) {
    const hits = files.filter((f) => fs.readFileSync(f, 'utf8').includes(name)).map((f) => path.relative(ROOT, f));
    assert.deepEqual(hits, [], name);
  }
});

test('AC-10: the eight commands are still hidden, and their CLI target still says so', async () => {
  assert.equal(HIDDEN_COMMAND_FILES.length, 8);
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c3-catalog-');
  const before = snapshotTree(dir);
  let result;
  const lines = await injected(['todo'], () => printed(async () => (result = await runScaffoldTarget('feature-catalog-sync', { dir, dryRun: false }))));
  assert.deepEqual(result, { written: [], skipped: [] });
  assert.ok(lines.some((l) => /no longer scaffolded/.test(l)), lines.join('\n'));
  assert.deepEqual(snapshotTree(dir), before);
});

test('AC-10: a selection that holds the auditor, PM and UX Designer still writes none of the eight commands', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c3-hidden-');
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const all = buildSingleRepoCandidates(stack.apps[0], []);
  const picked = all.filter((c) => ['planner', 'architect', 'frontend', 'backend', 'reviewer', 'auditor', 'pm', 'ux-designer'].includes(c.kind));
  await injected([picked, true, true, true], () => silenced(() => agents({ dir, dryRun: false })));
  const written = fs.readdirSync(path.join(dir, '.claude', 'commands'));
  assert.ok(written.includes('caf-plan-ticket.md'), 'precondition: the run did write commands');
  assert.deepEqual(written.filter((f) => HIDDEN_COMMAND_FILES.includes(f)), []);
});

// ---------------------------------------------------------------------------------------------
// AC-11 — a complete scaffold audits clean
// ---------------------------------------------------------------------------------------------

async function auditOnly(dir) {
  const saved = process.exitCode;
  process.exitCode = undefined;
  try {
    return await silenced(() => curate({ dir, mode: 'audit-only' }));
  } finally {
    process.exitCode = saved;
  }
}

test('AC-11: single-nuxt — agents, commands, skills, workflow, then curate --audit-only: nothing for frontend, backend or validator', async () => {
  const { dir } = await renderDefaultFileSet({ fixture: 'single-nuxt' });
  await injected(Array(12).fill(true), () => silenced(() => skillsTarget({ dir, dryRun: false })));
  for (const file of ['caf-frontend.md', 'caf-backend.md', 'caf-validator.md']) assert.ok(fs.existsSync(path.join(dir, AGENT_DIR, file)), file);

  const pattern = /caf-frontend|caf-backend|caf-validator/;
  const about = (result) => result.layers.flatMap((l) => l.entries).filter((e) => pattern.test(`${e.filePath} ${e.message}`));

  const fresh = await auditOnly(dir);
  assert.deepEqual(about(fresh).filter((e) => e.status === 'warn' || e.status === 'gap'), []);
  assert.deepEqual(fresh.warnings.filter((w) => pattern.test(w.filePath)), []);
  assert.ok(about(fresh).some((e) => /caf-frontend/.test(e.filePath)), 'the frontend is audited');
  assert.ok(about(fresh).some((e) => /caf-backend/.test(e.filePath)), 'the backend is audited');

  await silenced(() => curateBaseline({ dir, yes: true }));
  const result = await auditOnly(dir);
  assert.deepEqual(about(result).filter((e) => e.status !== 'ok'), [], 'no warning, gap or declined entry for them');
  assert.deepEqual(result.warnings.filter((w) => pattern.test(w.filePath)), []);
});
