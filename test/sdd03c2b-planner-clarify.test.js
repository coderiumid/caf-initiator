// CAF-SDD-03c2b — on a ticket run the planner asks for clarification through the status of
// `requirements.md` (`NEEDS_CLARIFICATION`, no `tasks.md`), not through a blocked `tasks.md` note.
// - Planner `## Output` and `## Constraints` say that, and no longer point at the removed
//   "Fallback — Discovery" flow.
// - `curate audit` warns (never a gap) when the planner's `## Constraints` is not the template's:
//   `curate sync` does not carry that section.
// - `INDEX.md` has no `.caf/discovery/` reference; `readAgentRoster` is locked for qa-only,
//   validator-only and both; the unused architecture signatures util is gone.
//
// `test/fixtures/pre-sdd03c2b/` is the default scaffold of each variant from before this ticket
// (every file, with content) — never regenerate it. Every scaffold, `curate audit` and
// `curate sync` below runs on a temp directory.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { curate } from '../src/commands/curate.js';
import { workflow } from '../src/commands/workflow.js';
import { parseSections, sectionBody, SYNCABLE_SECTIONS } from '../src/utils/agent-sections.js';
import { readManifest, setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { readAgentRoster } from '../src/utils/read-agent-roster.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { sinceSdd03c2c } from './helpers/since-03c2c.js';
import { sinceSdd05aFiles } from './helpers/since-05a.js';
import { sinceSdd05bFiles } from './helpers/since-05b.js';
import { CONTENT_VARIANTS, renderScaffoldContents } from './helpers/scaffold-contents.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir } from './helpers/frozen-kinds.js';
import { sinceSdd06Files } from './helpers/since-06.js';
import { sinceSdd07Files } from './helpers/since-07.js'; // CAF-SDD-07

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd03c2b');
const golden = (id) => JSON.parse(fs.readFileSync(path.join(GOLDEN, `${id}.json`), 'utf8'));
const recorded = (fixture) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'pre-sdd03c1', `curate-old-repo.${fixture}.json`), 'utf8'));

const PLANNER = '.claude/agents/caf-planner.md';
const REVIEWER = '.claude/agents/caf-reviewer.md';
const INDEX = '.caf/knowledge/INDEX.md';
const PIV = '.caf/workflows/piv-workflow.md';

// One after the other: a scaffold injects prompt answers, which is process-wide state.
const now = {};
for (const v of CONTENT_VARIANTS) now[v.id] = await renderScaffoldContents(v);

const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  assert.ok(s, `## ${header} is there`);
  return sectionBody(lines, s);
};
const headersOf = (text) => parseSections(text).sections.map((s) => s.header);
const flat = (text) => text.replace(/\s+/g, ' ');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

const DEFAULT_IDS = CONTENT_VARIANTS.filter((v) => v.id.endsWith('.default')).map((v) => v.id);
const fixtureOf = (id) => id.split('.')[0];

// ---------------------------------------------------------------------------------------------
// AC-1 .. AC-3 — the text
// ---------------------------------------------------------------------------------------------

for (const id of DEFAULT_IDS) {
  const planner = now[id].files[PLANNER];
  const output = bodyOf(planner, 'Output');
  const constraints = bodyOf(planner, 'Constraints');

  test(`AC-1: ${id} — on a ticket run an unanswered BLOCKING question ends the run with NEEDS_CLARIFICATION and no tasks.md`, () => {
    const [, ticketRun] = output.split('- Ticket run');
    assert.ok(ticketRun, 'Output has a ticket-run rule');
    const rule = flat(ticketRun.split('\n###')[0]);
    assert.match(rule, /`Status: NEEDS_CLARIFICATION`/);
    assert.match(rule, /`requirements\.md`/);
    assert.match(rule, /`BLOCKING`/);
    assert.match(rule, /no `tasks\.md`/);
    assert.match(rule, /stop/);
    // not the blocked note, and not NEEDS_HUMAN standing in for NEEDS_CLARIFICATION
    assert.doesNotMatch(rule, /NEEDS_HUMAN/);
    assert.doesNotMatch(rule, /in place of/);
    assert.doesNotMatch(output, /blocked/i);
    assert.doesNotMatch(output, /only case where it is written/);
  });

  test(`AC-2: ${id} — Constraints: a headless run never waits for chat; it escalates with NEEDS_CLARIFICATION, the unanswered BLOCKING questions and no tasks.md`, () => {
    const text = flat(constraints);
    assert.match(text, /NEVER allowed to end a run waiting for chat confirmation/);
    assert.match(text, /\[SYSTEM CONTEXT: Environment = headless\.\.\.\]/);
    assert.match(text, /`requirements\.md`/);
    assert.match(text, /`Status: NEEDS_CLARIFICATION`/);
    assert.match(text, /`BLOCKING`/);
    assert.match(text, /`Answer:`/);
    assert.match(text, /no `tasks\.md`/);
    assert.doesNotMatch(text, /NEEDS_HUMAN/);
  });

  test(`AC-3: ${id} — neither section says Fallback, Discovery or a blocked tasks.md; the refusal of a spec change is still NEEDS_HUMAN, first line of verify-report.md`, () => {
    for (const [name, text] of [['Output', output], ['Constraints', constraints]]) {
      assert.doesNotMatch(text, /Fallback/, name);
      assert.doesNotMatch(text, /Discovery/, name);
      assert.doesNotMatch(text, /blocked/i, name);
    }
    const refusal = flat(output);
    assert.match(refusal, /The status of that refusal is the first line of `verify-report\.md`, `Status: NEEDS_HUMAN`/);
    assert.match(refusal, /`DRAFT`, `NEEDS_CLARIFICATION`, `APPROVED` and `NEEDS_HUMAN`/);
    // the new text keeps the rules of the file: no tasks.md at all while a BLOCKING question is open
    assert.match(refusal, /do not write `tasks\.md` at all while a `BLOCKING` question is unanswered/);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-4 — only the two sections differ
// ---------------------------------------------------------------------------------------------

for (const { id } of CONTENT_VARIANTS) {
  test(`AC-4: ${id} — the planner differs from the pre-ticket golden in ## Output and ## Constraints only; every other file, agents included, is byte-identical`, () => {
    const before = golden(id);
    const after = now[id];
    // CAF-SDD-03c2c: /caf-plan-ticket is not written and /caf-run-pipeline is /caf-run.
    before.files = sinceSdd03c2c(before.files, after.files);
    // CAF-SDD-05a: the golden through that ticket's three text changes (helpers/since-05a.js).
    before.files = sinceSdd07Files(sinceSdd06Files(sinceSdd05bFiles(sinceSdd05aFiles(before.files)))); // CAF-SDD-05b: helpers/since-05b.js; CAF-SDD-06: helpers/since-06.js
    assert.deepEqual(Object.keys(after.files).sort(), Object.keys(before.files).sort());
    assert.deepEqual(after.agents, before.agents);

    const oldPlanner = before.files[PLANNER];
    const newPlanner = after.files[PLANNER];
    assert.deepEqual(headersOf(newPlanner), headersOf(oldPlanner));
    const changed = headersOf(newPlanner).filter((h) => bodyOf(newPlanner, h) !== bodyOf(oldPlanner, h));
    assert.deepEqual(changed, ['Output', 'Constraints']);
    // everything outside the two bodies, frontmatter (`tools:`) included, is the same text
    const strip = (text) => text.replace(bodyOf(text, 'Output'), '').replace(bodyOf(text, 'Constraints'), '');
    assert.equal(strip(newPlanner), strip(oldPlanner));
    assert.match(newPlanner, /^tools: \[Read, Write, Glob, Grep\]$/m);

    for (const rel of Object.keys(before.files)) {
      if (rel === PLANNER) continue;
      assert.equal(after.files[rel], before.files[rel], `${rel} must stay byte-identical`);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-5 — `curate sync` carries ## Output of an old planner, not ## Constraints
// ---------------------------------------------------------------------------------------------

/** The old-repo of `fixture`, its planner replaced by `planner` with the baseline taken from `baselineFrom`. */
async function repoWithPlanner(fixture, planner, baselineFrom = planner) {
  const { dir } = await makeOldRepo(fixture);
  fs.writeFileSync(path.join(dir, PLANNER), planner, 'utf8');
  const manifest = readManifest(dir);
  const { lines, sections } = parseSections(baselineFrom);
  for (const s of sections) setSectionBaseline(manifest, PLANNER, s.header, hashSection(sectionBody(lines, s)));
  writeManifest(dir, manifest);
  return dir;
}

const sync = (dir, dryRun) => silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
const agentTree = (dir) =>
  Object.fromEntries(Object.entries(snapshotTree(path.join(dir, AGENT_DIR))).filter(([rel]) => rel.endsWith('.md')));
const oldPlannerOf = (fixture) => golden(`${fixture}.default`).files[PLANNER];
const newPlannerOf = (fixture) => now[`${fixture}.default`].files[PLANNER];

test('AC-5: ## Constraints is not a syncable section', () => {
  assert.ok(!('Constraints' in SYNCABLE_SECTIONS));
  assert.ok('Output' in SYNCABLE_SECTIONS);
});

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: ${fixture} — sync writes ## Output of the pre-ticket planner, leaves ## Constraints and every other file alone`, async () => {
    const old = oldPlannerOf(fixture);
    const dir = await repoWithPlanner(fixture, old);
    const before = agentTree(dir);

    const dry = await sync(dir, true);
    assert.deepEqual(dry.drifted, [`${PLANNER}#Output`]);
    assert.deepEqual(dry.updated, []);
    assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

    const real = await sync(dir, false);
    assert.deepEqual(real.drifted, [`${PLANNER}#Output`]);
    assert.deepEqual(real.needsAttention, []);
    assert.deepEqual(real.updated, [path.join(dir, PLANNER)]);

    const written = read(dir, PLANNER);
    assert.equal(bodyOf(written, 'Output'), bodyOf(newPlannerOf(fixture), 'Output'));
    assert.equal(bodyOf(written, 'Constraints'), bodyOf(old, 'Constraints'));
    assert.notEqual(bodyOf(written, 'Constraints'), bodyOf(newPlannerOf(fixture), 'Constraints'));
    for (const h of headersOf(written)) {
      if (h !== 'Output') assert.equal(bodyOf(written, h), bodyOf(old, h), h);
    }
    const after = agentTree(dir);
    for (const rel of Object.keys(before)) {
      if (rel !== path.basename(PLANNER)) assert.equal(after[rel], before[rel], `${rel} must stay byte-identical`);
    }

    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(again.updated, []);
  });

  test(`AC-5: ${fixture} — a customized ## Output is not overwritten`, async () => {
    const old = oldPlannerOf(fixture);
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    assert.notEqual(edited, old);
    const dir = await repoWithPlanner(fixture, edited, old);
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      assert.deepEqual(result.drifted, []);
      assert.deepEqual(result.updated, []);
      assert.deepEqual(result.needsAttention, [{ file: PLANNER, header: 'Output', status: SECTION_STATUS.CONFLICT }]);
      assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(read(dir, PLANNER), edited);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6 — the rollout warning for ## Constraints
// ---------------------------------------------------------------------------------------------

async function auditOnly(dir) {
  const saved = process.exitCode;
  const original = console.log;
  const printed = [];
  process.exitCode = undefined;
  console.log = (...args) => printed.push(args.join(' '));
  try {
    const result = await curate({ dir, mode: 'audit-only' });
    return { ...result, printed: printed.join('\n'), exitCode: process.exitCode };
  } finally {
    console.log = original;
    process.exitCode = saved;
  }
}

const CHECK = 'planner-constraints';
const warningsOf = (result, check) => result.warnings.filter((w) => !check || w.check === check);
const layer2 = (result) => result.layers.find((l) => l.name.startsWith('Layer 2')).entries;
const relative = (value, dir) => JSON.parse(JSON.stringify(value).split(JSON.stringify(dir).slice(1, -1)).join('<repo>'));

/** `live` with its ## Constraints body replaced by the pre-ticket one: the planner of a repo scaffolded earlier. */
const withOldConstraints = (fixture) => {
  const live = newPlannerOf(fixture);
  return live.replace(bodyOf(live, 'Constraints'), bodyOf(oldPlannerOf(fixture), 'Constraints'));
};

for (const fixture of FIXTURE_NAMES) {
  test(`AC-6: ${fixture} — a planner whose ## Constraints is not the template's is one warning (not a gap); the recorded report of an old repo is otherwise unchanged`, async () => {
    const { dir } = await makeOldRepo(fixture);
    const clean = await auditOnly(dir);
    assert.deepEqual(warningsOf(clean), [], 'a planner with the template text has no warning');

    fs.writeFileSync(path.join(dir, PLANNER), withOldConstraints(fixture), 'utf8');
    const before = snapshotTree(dir);
    const result = await auditOnly(dir);
    assert.deepEqual(snapshotTree(dir), before, 'audit writes nothing');

    const warnings = warningsOf(result);
    assert.equal(warnings.length, 1);
    const [w] = warnings;
    assert.equal(w.check, CHECK);
    assert.equal(w.filePath, PLANNER);
    assert.match(w.message, /## Constraints/);
    assert.match(w.message, /by hand/);
    assert.match(w.message, /warning/);
    assert.ok(result.printed.includes(w.message));
    assert.deepEqual(layer2(result).filter((e) => e.status === 'warn').map((e) => e.filePath), [PLANNER]);
    assert.match(result.printed, /1 warning\(s\)/);

    // a warning, never a gap: exit code and every count are what they were
    assert.equal(result.exitCode, clean.exitCode);
    assert.equal(result.requiredGaps.length, clean.requiredGaps.length);
    assert.equal(result.optionalGaps.length, clean.optionalGaps.length);
    assert.equal(result.declined.length, clean.declined.length);
    assert.deepEqual(result.sectionCounts, clean.sectionCounts);

    // the report recorded before CAF-SDD-03c1 for this repo, entry for entry, but for that one warning
    const rec = recorded(fixture);
    const layers = relative(result.layers, dir).map((l) => ({ ...l, entries: l.entries.filter((e) => e.status !== 'warn') }));
    assert.deepEqual(layers, rec.audit.layers.map((l) => ({ ...l, entries: l.entries.filter((e) => e.status !== 'warn') })));
    assert.equal(result.requiredGaps.length, rec.audit.requiredGaps);
    assert.equal(result.declined.length, rec.audit.declined);
    assert.deepEqual(result.sectionCounts, rec.audit.sectionCounts);
  });

  test(`AC-6: ${fixture} — no planner warning for another kind with its own ## Constraints, a custom file, or a repo without a planner`, async () => {
    const { dir } = await makeOldRepo(fixture);
    fs.appendFileSync(path.join(dir, REVIEWER), '\n## Constraints\n- Our team: say it twice.\n');
    fs.writeFileSync(path.join(dir, AGENT_DIR, 'security.md'), '---\nname: security\ntools: [Read]\n---\n\n# Agent: Security\n\n## Constraints\nx\n');
    assert.deepEqual(warningsOf(await auditOnly(dir), CHECK), []);

    fs.rmSync(path.join(dir, PLANNER));
    assert.deepEqual(warningsOf(await auditOnly(dir), CHECK), []);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-7 — INDEX.md has no Discovery reference
// ---------------------------------------------------------------------------------------------

for (const id of DEFAULT_IDS) {
  test(`AC-7: ${id} — INDEX.md is no longer scaffolded, so it holds no .caf/discovery/ reference (CAF-INIT-DOCS-REMOVE)`, () => {
    assert.equal(INDEX in now[id].files, false);
    assert.equal(INDEX in golden(id).files, false);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-8 — readAgentRoster and piv-workflow.md for qa-only, validator-only and both
// ---------------------------------------------------------------------------------------------

const ROSTER_CASES = [
  ['(i) only caf-qa.md', ['caf-qa']],
  ['(ii) only caf-validator.md', ['caf-validator']],
  ['(iii) both', ['caf-qa', 'caf-validator']],
];

for (const [label, gate] of ROSTER_CASES) {
  test(`AC-8: ${label} — the roster and piv-workflow.md name exactly the gate that is there`, async () => {
    const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c2b-roster-');
    const agentDir = path.join(dir, AGENT_DIR);
    fs.mkdirSync(agentDir, { recursive: true });
    for (const slug of ['caf-planner', 'caf-reviewer', ...gate]) fs.writeFileSync(path.join(agentDir, `${slug}.md`), `# ${slug}\n`);

    const roster = readAgentRoster(agentDir);
    assert.deepEqual(roster.custom, []);
    const entry = (slug) => roster.known.find((r) => r.slug === slug);
    assert.equal(entry('caf-qa')?.present, gate.includes('caf-qa') ? true : undefined, 'QA');
    assert.equal(entry('caf-validator')?.present, gate.includes('caf-validator') ? true : undefined, 'Validator');
    if (!gate.includes('caf-qa')) assert.equal(entry('caf-qa'), undefined, 'no QA entry at all');
    if (!gate.includes('caf-validator')) assert.equal(entry('caf-validator'), undefined, 'no Validator entry at all');

    await silenced(() => workflow({ dir, dryRun: false }));
    const piv = read(dir, PIV);
    assert.equal(/- \[x\] QA\b/.test(piv), gate.includes('caf-qa'), 'QA ticked');
    assert.equal(/- \[x\] Validator\b/.test(piv), gate.includes('caf-validator'), 'Validator ticked');
    if (!gate.includes('caf-qa')) assert.doesNotMatch(piv, /QA — NOT present/);
    if (!gate.includes('caf-validator')) assert.doesNotMatch(piv, /Validator/);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-9 — the architecture signatures util is gone
// ---------------------------------------------------------------------------------------------

test('AC-9: nothing in src or test mentions the removed architecture signatures util, and the file is gone', () => {
  // built from parts so that this file does not match its own search
  const needle = ['architecture', 'signatures'].join('-');
  assert.ok(!fs.existsSync(path.join(ROOT, 'src', 'utils', `${needle}.js`)));
  let hits = '';
  try {
    hits = execFileSync('git', ['grep', '-n', needle, '--', 'src', 'test'], { cwd: ROOT, encoding: 'utf8' });
  } catch (error) {
    assert.equal(error.status, 1, 'git grep found nothing (exit 1)');
  }
  assert.equal(hits, '');
});
