// CAF-SDD-03b2 — the reviewer checks the change against the spec (scope, tasks, AC evidence,
// spec changes after approval, ADRs), not only the quality of the code. The new text lives in the
// reviewer's tracked `## Output`, after the artifact contract line; the tools, `## Input` and the
// verdict skeleton (`## Report Format`) are the ones recorded before this ticket.
// Every `curate sync` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { parseInputAppNames, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced, renderMonoSnapshot } from './helpers/mono-snapshot.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
// T1(d): the one section that carries the new checks. Everything else is unchanged.
const CHANGED = 'Output';
const REVIEWER_REL = path.join(AGENT_DIR, 'caf-reviewer.md');
// CAF-SDD-03e gave the reviewer a Working Pattern of its own (locked in
// test/sdd03e-validator-commands.test.js), so a reviewer from before this ticket now drifts there
// too. Every other check here is unchanged.
const WP = 'Working Pattern (PIV)';
const SYNCED = [`${REVIEWER_REL}#${CHANGED}`, `${REVIEWER_REL}#${WP}`];

// Recorded from main before this ticket touched src/ (T2). Never regenerated.
const OLD_REVIEWER = Object.fromEntries(
  FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd03b2', `reviewer.${f}.json`), 'utf8'))])
);

// AC-5. The list the harness enforces, as recorded by T1(b).
const EXPECTED_TOOLS = [
  { fixture: 'mono-pnpm', tools: ['Read', 'Write', 'Bash'] },
  { fixture: 'single-nuxt', tools: ['Read', 'Write', 'Bash'] },
];

const EXPECTED_HEADERS = [
  'Role',
  'Scope',
  'Allowed Tools',
  'Input',
  'Output',
  'Working Pattern (PIV)',
  'Verify Checklist',
  'Retry Logic',
  'Report Format',
];

// AC-5. The verdict skeleton as T1(c) recorded it: the lines of `review-notes.md` and the three
// values caf-orchestrator's parsers read.
const VERDICT_SKELETON = [
  '```',
  '## Review Notes — {TICKET-ID}',
  'Ticket: {TICKET-ID}',
  'Agent: caf-reviewer',
  'Verdict: APPROVE | CHANGES REQUESTED | DEFER',
  '',
  '### Security Audit',
  '{security findings, or "None" if none}',
  '',
  '### Qualitative Review',
  '{code quality notes}',
  '',
  '### Verdict Rationale',
  '{reasoning for the verdict above}',
  '',
  '### For Developer',
  '{notes for the developer, if relevant}',
  '```',
].join('\n');

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));

const reviewerOf = (fixture) => rendered[fixture].reviewer.content;
const outputOf = (fixture) => trackedSections(reviewerOf(fixture))[CHANGED];
const headersOf = (md) => parseSections(md).sections.map((s) => s.header);
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

/** The lines under a `### <title>` heading up to the next `### ` heading, as one line. */
function step(body, heading) {
  const lines = body.split('\n');
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `"${heading}" is in the reviewer's "## ${CHANGED}"`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('### '));
  // Reflowed to one line so an assertion never depends on where a sentence wraps.
  return (end === -1 ? rest : rest.slice(0, end)).join(' ').replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------------------------
// AC-1 .. AC-4 — what the reviewer is told to check
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: reviewer on ${fixture} — reads the spec, the tasks, the reports, the ADRs and the diff`, () => {
    const readStep = step(outputOf(fixture), '### 1. Read');
    assert.ok(readStep.includes('`.caf/tasks/{TICKET-ID}/`'), 'names the artifact folder');
    for (const required of ['`requirements.md`', '`tasks.md`', '`verify-report.md`']) assert.ok(readStep.includes(required), required);
    assert.match(readStep, /`design\.md`, if present/);
    assert.match(readStep, /`validate-report\.md`, if present/);
    assert.match(readStep, /ADRs in `\.caf\/knowledge\/decisions\/`/);
    assert.match(readStep, /diff of the change \(`git diff`, `git log`\)/);
  });

  test(`AC-2: reviewer on ${fixture} — scope deviation and task not done, each naming the task or the Scope item`, () => {
    const scope = step(outputOf(fixture), '### 2. Scope');
    assert.match(scope, /file or (?:a )?change in the diff that no task of `tasks\.md` and no item of Scope In covers/);
    assert.match(scope, /scope deviation/i);
    assert.match(scope, /task of `tasks\.md` that the diff does not reflect/);
    assert.match(scope, /task not done/i);
    assert.match(scope, /Every finding names the task id or the Scope item/);
  });

  test(`AC-3: reviewer on ${fixture} — every AC mapped to task and evidence; unproven ACs need a human check; no re-run`, () => {
    const ac = step(outputOf(fixture), '### 3. Acceptance criteria');
    assert.match(ac, /every AC of `requirements\.md` to the task\(s\) that serve it and to its evidence line in `verify-report\.md`/);
    for (const kind of ['`manual`', '`build-only`', '`none`']) assert.ok(ac.includes(kind), kind);
    assert.match(ac, /no evidence line/);
    assert.match(ac, /`needs human check`/);
    assert.match(ac, /not counted as passed/);
    assert.match(ac, /does not run the tests or the verification gate again/);
  });

  test(`AC-4: reviewer on ${fixture} — spec changed after approval blocks, proposed spec changes go to a human, ADR violations are named`, () => {
    const rule = step(outputOf(fixture), '### 4. Spec integrity and ADRs');
    assert.match(rule, /commit that set `Status: APPROVED`/);
    assert.match(rule, /change to the goal, the scope or an AC of `requirements\.md` in a commit after that one is a blocking finding/);
    assert.match(rule, /`## Proposed Spec Changes` of `verify-report\.md`[^.]*always raised to a human/);
    assert.match(rule, /contradicts an ADR[^.]*reported with the name of that ADR/);
  });

  // -------------------------------------------------------------------------------------------
  // AC-5 — tools, verdict skeleton, no edits
  // -------------------------------------------------------------------------------------------

  test(`AC-5: reviewer on ${fixture} — tools and verdict skeleton are the ones recorded before this ticket; it edits nothing`, () => {
    const md = reviewerOf(fixture);
    const old = OLD_REVIEWER[fixture];
    assert.equal(rendered[fixture].reviewer.file, 'caf-reviewer.md');
    assert.match(md, /^---\nname: caf-reviewer\n/);

    const expected = EXPECTED_TOOLS.find((e) => e.fixture === fixture).tools;
    assert.deepEqual(frontmatterTools(md), expected);
    assert.deepEqual(old.tools, expected, 'the golden holds the same list');
    assert.match(md, /^tools: \[Read, Write, Bash\]$/m);
    assert.equal(trackedSections(md)['Allowed Tools'], old.sections['Allowed Tools']);

    const format = trackedSections(md)['Report Format'];
    assert.equal(format, old.sections['Report Format'], 'Report Format is byte-identical to the golden');
    assert.ok(format.includes(VERDICT_SKELETON), 'the skeleton is the literal one');
    assert.equal(trackedSections(md)['Retry Logic'], old.sections['Retry Logic']);
    assert.ok(md.includes('Save the report to `.caf/tasks/<TICKET-ID>/review-notes.md`.'), 'same output path');

    const never = step(outputOf(fixture), '### What the Reviewer never does');
    assert.match(never, /Edit code, tests or the spec \(`requirements\.md`, `tasks\.md`\)/);
    assert.match(never, /only file it writes is `review-notes\.md`/);
  });

  // -------------------------------------------------------------------------------------------
  // AC-6 — nothing else changed, no new header
  // -------------------------------------------------------------------------------------------

  test(`AC-6: reviewer on ${fixture} — only "## ${CHANGED}" differs from the golden, and no header was added`, () => {
    const md = reviewerOf(fixture);
    const old = OLD_REVIEWER[fixture];
    const now = trackedSections(md);

    assert.deepEqual(headersOf(md), EXPECTED_HEADERS);
    assert.deepEqual(headersOf(md), headersOf(old.content));
    assert.deepEqual(Object.keys(now), Object.keys(old.sections));
    for (const header of Object.keys(old.sections)) {
      if (header === CHANGED) assert.notEqual(now[header], old.sections[header], 'Output carries the new checks');
      else if (header === WP) assert.notEqual(now[header], old.sections[header], 'CAF-SDD-03e: the reviewer pattern');
      else assert.equal(now[header], old.sections[header], `"## ${header}" must be byte-identical`);
    }
    assert.equal(now.Input, old.sections.Input);

    // The old Output line is still the first line of Output, and outside `## Output` not one
    // byte changed (untracked sections and the frontmatter included).
    assert.equal(now[CHANGED].split('\n')[0], old.sections[CHANGED]);
    assert.equal(now[CHANGED].split('\n')[0], 'Produces `review-notes.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.');
    assert.equal(md.replace(now[CHANGED], old.sections[CHANGED]).replace(now[WP], old.sections[WP]), old.content);
  });

  test(`reviewer on ${fixture} — the new text splits no section, adds no TODO, no placeholder and no verdict word`, () => {
    const body = outputOf(fixture);
    assert.ok(!/^## /m.test(body), 'a `## ` line would be read as a section boundary');
    assert.ok(!/\bTODO\b/.test(body), 'check-drafts counts TODO per agent');
    assert.deepEqual(findUnresolvedPlaceholders(reviewerOf(fixture)), findUnresolvedPlaceholders(OLD_REVIEWER[fixture].content));
    // The verdict values stay in Report Format alone (Retry Logic: "do not restate or invent them").
    assert.ok(!/CHANGES REQUESTED|\bDEFER\b|\bAPPROVE\b|NEEDS_HUMAN/.test(body));
    assert.deepEqual(
      body.split('\n').filter((l) => l.startsWith('### ')),
      ['### 1. Read', '### 2. Scope', '### 3. Acceptance criteria', '### 4. Spec integrity and ADRs', '### Where the findings go', '### What the Reviewer never does']
    );
    // Findings land in parts the skeleton already has.
    const where = step(body, '### Where the findings go');
    for (const part of [...where.matchAll(/`(### [^`]+)`/g)].map((m) => m[1])) assert.ok(VERDICT_SKELETON.split('\n').includes(part), part);
    assert.match(where, /`### Qualitative Review`/);
    assert.match(where, /`### For Developer`/);
    assert.match(where, /`### Verdict Rationale`/);
  });
}

test('the evidence kinds the reviewer names are the five of the verify-report format', async () => {
  const handoff = (await renderMonoSnapshot()).files['.caf/workflows/agent-handoff.md'];
  const kinds = [...handoff.matchAll(/^- AC-\d+: ([a-z-]+) — /gm)].map((m) => m[1]);
  assert.deepEqual(kinds, ['automated-test', 'command', 'build-only', 'manual', 'none']);
  const ac = step(outputOf('mono-pnpm'), '### 3. Acceptance criteria');
  const named = [...new Set([...ac.matchAll(/`([a-z-]+)`/g)].map((m) => m[1]))].filter((k) => kinds.includes(k));
  assert.deepEqual(named.sort(), [...kinds].sort());
});

// ---------------------------------------------------------------------------------------------
// AC-7 — curate sync from a reviewer generated before this ticket
// ---------------------------------------------------------------------------------------------

/** Temp copy of the fixture: the OLD reviewer plus every other agent as rendered now, all baselined. */
function repoWithOldReviewer(fixture, { reviewer = OLD_REVIEWER[fixture].content, baselineFrom = reviewer, baseline = true } = {}) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03b2-sync-');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  const others = Object.entries(rendered[fixture])
    .filter(([kind]) => kind !== 'reviewer')
    .map(([, a]) => ({ file: a.file, content: a.content }));
  const manifest = { version: 1, files: {} };
  for (const { file, content, from } of [{ file: 'caf-reviewer.md', content: reviewer, from: baselineFrom }, ...others]) {
    const relPath = path.join(AGENT_DIR, file);
    fs.writeFileSync(path.join(dir, relPath), content, 'utf8');
    const { lines, sections } = parseSections(from ?? content);
    for (const s of sections) setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
  if (baseline) writeManifest(dir, manifest);
  return { dir, others };
}

const sync = (dir, dryRun) => silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
// Agent definitions only: a real run also leaves `.caf-sync-state.json` next to them.
const agentTree = (dir) =>
  Object.fromEntries(Object.entries(snapshotTree(path.join(dir, AGENT_DIR))).filter(([rel]) => rel.endsWith('.md')));

for (const fixture of FIXTURE_NAMES) {
  test(`AC-7: ${fixture} — the old reviewer's Output is synced to the new text (dry-run, then write), no other agent file changes`, async () => {
    assert.equal(OLD_REVIEWER[fixture].file, 'caf-reviewer.md');
    const { dir, others } = repoWithOldReviewer(fixture);
    const before = agentTree(dir);

    const dry = await sync(dir, true);
    assert.deepEqual(dry.drifted, SYNCED);
    assert.deepEqual(dry.updated, []);
    assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

    const real = await sync(dir, false);
    assert.deepEqual(real.drifted, SYNCED);
    assert.deepEqual(real.needsAttention, []);
    assert.deepEqual(real.unverifiable, []);
    assert.deepEqual(real.updated, [path.join(dir, REVIEWER_REL)]);
    // only those sections differ between the two templates, so the synced file IS the new render
    const now = read(dir, REVIEWER_REL);
    assert.equal(now, reviewerOf(fixture));
    assert.match(now, /^### 3\. Acceptance criteria$/m);
    assert.equal(trackedSections(now).Input, OLD_REVIEWER[fixture].sections.Input, 'Input is untouched by the sync');
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

    const after = agentTree(dir);
    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(again.updated, []);
    assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
  });

  test(`AC-7: ${fixture} — a reviewer whose Output the user edited is not overwritten (CONFLICT)`, async () => {
    const old = OLD_REVIEWER[fixture].content;
    const edited = old.replace('for the next agent to read.', 'for the next agent to read, and post a summary to the ticket.');
    assert.notEqual(edited, old);
    const { dir } = repoWithOldReviewer(fixture, { reviewer: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      // CAF-SDD-03e: the untouched Working Pattern is an ordinary DRIFT now; Output stays the user's.
      assert.deepEqual(result.drifted, [`${REVIEWER_REL}#${WP}`]);
      assert.deepEqual(result.updated, dryRun ? [] : [path.join(dir, REVIEWER_REL)]);
      assert.deepEqual(result.needsAttention, [{ file: REVIEWER_REL, header: CHANGED, status: SECTION_STATUS.CONFLICT }]);
      if (dryRun) assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(trackedSections(read(dir, REVIEWER_REL))[CHANGED], trackedSections(edited)[CHANGED]);
    assert.equal(read(dir, REVIEWER_REL), edited.replace(OLD_REVIEWER[fixture].sections[WP], trackedSections(reviewerOf(fixture))[WP]));
  });

  test(`AC-7: ${fixture} — a section the user customized stays theirs (CUSTOMIZATION) while Output is synced`, async () => {
    const old = OLD_REVIEWER[fixture].content;
    const from = 'Never leave `review-notes.md` unwritten:';
    const to = 'Never leave `review-notes.md` unwritten (team rule):';
    const edited = old.replace(from, to);
    assert.notEqual(edited, old);
    const { dir, others } = repoWithOldReviewer(fixture, { reviewer: edited, baselineFrom: old });

    const result = await sync(dir, false);
    assert.deepEqual(result.needsAttention, [{ file: REVIEWER_REL, header: 'Retry Logic', status: SECTION_STATUS.CUSTOMIZATION }]);
    assert.deepEqual(result.drifted, SYNCED);
    const now = read(dir, REVIEWER_REL);
    assert.equal(trackedSections(now)['Retry Logic'], trackedSections(edited)['Retry Logic'], 'the customized section is kept byte for byte');
    assert.equal(now, reviewerOf(fixture).replace(from, to));
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, file);
  });

  test(`AC-7: ${fixture} — without a manifest baseline nothing is written (UNTRACKED)`, async () => {
    const { dir } = repoWithOldReviewer(fixture, { baseline: false });
    const before = agentTree(dir);
    const result = await sync(dir, false);
    assert.deepEqual(result.drifted, []);
    assert.deepEqual(result.updated, []);
    assert.ok(result.needsAttention.some((n) => n.file === REVIEWER_REL && n.header === CHANGED && n.status === SECTION_STATUS.UNTRACKED));
    assert.deepEqual(agentTree(dir), before);
    assert.ok(!fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), 'no baseline is invented');
  });
}

test('AC-7: mono-pnpm — the app list of the reviewer Input survives the sync', async () => {
  const APPS = ['apps/web', 'apps/api'];
  assert.deepEqual(parseInputAppNames(OLD_REVIEWER['mono-pnpm'].sections.Input), APPS, 'precondition: the old Input names the apps');
  assert.deepEqual(parseInputAppNames(OLD_REVIEWER['single-nuxt'].sections.Input), [], 'SINGLE_REPO has no list');

  for (const dryRun of [true, false]) {
    const { dir } = repoWithOldReviewer('mono-pnpm');
    const result = await sync(dir, dryRun);
    assert.deepEqual(result.drifted, SYNCED, 'Input is never among the drifted sections');
    assert.deepEqual(result.unverifiable, []);
    const input = trackedSections(read(dir, REVIEWER_REL)).Input;
    assert.equal(input, OLD_REVIEWER['mono-pnpm'].sections.Input);
    assert.deepEqual(parseInputAppNames(input), APPS);
    assert.ok(input.includes('implementation agent (apps/web, apps/api)'));
  }
});
