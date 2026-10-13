// CAF-SDD-03d — the implementation agents (frontend, backend, implementer) are spec-aware: they
// read the task folder before changing code, treat every AC as a contract, never write the spec
// or the tasks, report evidence per AC in the words the validator and the reviewer judge, and
// stop with a proposal when the spec is unclear. The text lives in their tracked `## Output`,
// after the artifact contract line; everything else is the render recorded before this ticket.
// Every `curate sync` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { buildOutputSection } from '../src/templates/agent-md.js';
import { KNOWN_KINDS, SYNCABLE_SECTIONS, detectKind, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced, renderMonoSnapshot } from './helpers/mono-snapshot.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { IMPLEMENTATION_CASES, renderImplementationAgents } from './helpers/implementation-agents.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const GOLDEN = path.join(FIXTURES, 'pre-sdd03d');
// The one section that carries the new rules. Everything else is unchanged.
const CHANGED = 'Output';
const CHANGED_KINDS = ['frontend', 'backend', 'implementer'];
// Changed by a later ticket, on purpose: the planner's Output got more rules at CAF-SDD-02d
// (held against its own golden in test/sdd02d-planner-audit.test.js).
const CHANGED_LATER = ['planner'];
const CONTRACT = 'Produces code + `verify-report.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.';

// Recorded from main before this ticket touched src/ (T2). Never regenerated.
const OLD = Object.fromEntries(IMPLEMENTATION_CASES.map(({ id }) => [id, JSON.parse(fs.readFileSync(path.join(GOLDEN, `${id}.json`), 'utf8'))]));
const OLD_OUTPUT_BY_KIND = JSON.parse(fs.readFileSync(path.join(GOLDEN, 'output-by-kind.json'), 'utf8'));

const EXPECTED_HEADERS = ['Role', 'Scope', 'Allowed Tools', 'Input', 'Output', 'Working Pattern (PIV)', 'Verify Checklist', 'Retry Logic'];
const STEPS = ['### 1. Read', '### 2. When to stop before coding', '### 3. Every AC is a contract', '### 4. Never edit the spec', '### 5. Evidence per AC'];

const NOW = await renderImplementationAgents();
const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));

const outputOf = (id) => NOW[id].sections[CHANGED];
const headersOf = (md) => parseSections(md).sections.map((s) => s.header);
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

/** The lines under a `### <title>` heading up to the next `### ` heading, as one line. */
function step(body, heading) {
  const lines = body.split('\n');
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `"${heading}" is in "## ${CHANGED}"`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('### '));
  // Reflowed to one line so an assertion never depends on where a sentence wraps.
  return (end === -1 ? rest : rest.slice(0, end)).join(' ').replace(/\s+/g, ' ');
}

test('the cases cover frontend and backend in MONOREPO, and implementer plus both --role agents in SINGLE_REPO', () => {
  assert.deepEqual(
    IMPLEMENTATION_CASES.map((c) => `${c.kind}|${c.fixture}|${NOW[c.id].file}`),
    [
      'frontend|mono-pnpm|caf-frontend.md',
      'backend|mono-pnpm|caf-backend.md',
      'implementer|single-nuxt|caf-implementer.md',
      'frontend|single-nuxt|caf-frontend.md',
      'backend|single-nuxt|caf-backend.md',
    ]
  );
  for (const { id, kind } of IMPLEMENTATION_CASES) assert.equal(detectKind(path.join(AGENT_DIR, NOW[id].file)), kind);
});

// ---------------------------------------------------------------------------------------------
// AC-1 .. AC-5 — what the agent is told
// ---------------------------------------------------------------------------------------------

for (const { id } of IMPLEMENTATION_CASES) {
  test(`AC-1: ${id} — reads requirements.md, tasks.md and verify-report.md (if present) before changing code`, () => {
    const readStep = step(outputOf(id), '### 1. Read');
    assert.match(readStep, /Before changing any code, read the files that already exist in the task folder/);
    assert.match(readStep, /`requirements\.md`, `tasks\.md`, and `verify-report\.md` if present/);
    assert.ok(outputOf(id).includes('`.caf/tasks/{TICKET-ID}/`'), 'names the task folder');
  });

  test(`AC-2: ${id} — every AC is a contract, the ACs in scope are implemented, an AC that cannot be met is reported`, () => {
    const contract = step(outputOf(id), '### 3. Every AC is a contract');
    assert.match(contract, /Every AC of `requirements\.md` is a contract/);
    assert.match(contract, /implement each AC that falls in the scope of this agent \(see Scope\)/);
    assert.match(contract, /An AC you cannot satisfy is reported, never skipped silently/);
  });

  test(`AC-3: ${id} — never writes requirements.md or tasks.md, proposals go to "## Proposed Spec Changes"`, () => {
    const never = step(outputOf(id), '### 4. Never edit the spec');
    assert.match(never, /Do not write `requirements\.md` or `tasks\.md`, not even a status line/);
    assert.match(never, /Write the proposed change in `verify-report\.md` under `## Proposed Spec Changes`/);
    assert.match(never, /keeping what that file already holds/);
  });

  test(`AC-4: ${id} — five evidence kinds, the three that are not counted as passed, and the pointer to agent-handoff`, () => {
    const evidence = step(outputOf(id), '### 5. Evidence per AC');
    assert.match(evidence, /one line per AC of `requirements\.md`, in exactly one of five forms/);
    assert.match(evidence, /`manual`, `build-only` and `none` are not counted as passed/);
    assert.match(evidence, /full layout of `verify-report\.md` is in `\.caf\/workflows\/agent-handoff\.md`/);
    assert.match(evidence, /Name the test; the number of passing tests is never evidence\./);
  });

  test(`AC-5: ${id} — stops with Status: NEEDS_HUMAN on NEEDS_CLARIFICATION, an unanswered BLOCKING question, or an unclear spec; DRAFT and APPROVED go on`, () => {
    const stop = step(outputOf(id), '### 2. When to stop before coding');
    assert.match(stop, /`Status: NEEDS_CLARIFICATION`/);
    assert.match(stop, /question marked `BLOCKING` has no `Answer:`/);
    assert.match(stop, /Write `verify-report\.md` with `Status: NEEDS_HUMAN` and the reason, then stop/);
    assert.match(stop, /`Status: DRAFT` and `Status: APPROVED` do not stop the work/);

    const never = step(outputOf(id), '### 4. Never edit the spec');
    assert.match(never, /ambiguous/);
    assert.match(never, /contradicts the code/);
    assert.match(never, /stop with `Status: NEEDS_HUMAN` and the reason in `verify-report\.md`/);
  });
}

test('AC-4: the evidence lines are the five of the verify-report format, and the kinds are the validator\'s', async () => {
  const handoff = (await renderMonoSnapshot()).files['.caf/workflows/agent-handoff.md'];
  const handoffLines = handoff.split('\n').filter((l) => /^- AC-\d+: [a-z-]+ — /.test(l));
  assert.equal(handoffLines.length, 5);
  const kinds = handoffLines.map((l) => l.match(/^- AC-\d+: ([a-z-]+) — /)[1]);
  assert.deepEqual(kinds, ['automated-test', 'command', 'build-only', 'manual', 'none']);

  // The validator names the same five, in the same words.
  const validator = buildOutputSection('validator');
  for (const kind of kinds) assert.ok(validator.includes(`\`${kind}\``), `validator names ${kind}`);

  for (const { id } of IMPLEMENTATION_CASES) {
    const lines = outputOf(id).split('\n');
    const forms = lines.filter((l) => /^\s*- `AC-n: /.test(l)).map((l) => l.trim());
    // Same text as the handoff skeleton, with the example number replaced by `n`.
    assert.deepEqual(
      forms,
      handoffLines.map((l) => `- \`${l.slice(2).replace(/^AC-\d+/, 'AC-n')}\``),
      id
    );
    // No evidence kind of its own: every `AC-n: <kind>` is one of the five.
    const named = [...outputOf(id).matchAll(/AC-n: ([a-z-]+) — /g)].map((m) => m[1]);
    assert.deepEqual(named, kinds, id);
    // The sentences taken from the verify-report format are there word for word.
    const evidence = step(outputOf(id), '### 5. Evidence per AC');
    const flatHandoff = handoff.replace(/\s+/g, ' ');
    for (const sentence of [
      'Name the test; the number of passing tests is never evidence.',
      'An AC marked `Verify: manual` is reported as `manual`, an AC marked `Verify: command:` as `command` with the result observed, and an area with no test runner as `build-only` or `manual` — not as `automated-test`.',
    ]) {
      assert.ok(flatHandoff.includes(sentence), `handoff: ${sentence}`);
      assert.ok(evidence.includes(sentence), `${id}: ${sentence}`);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// AC-6 — nothing else changed
// ---------------------------------------------------------------------------------------------

for (const { id } of IMPLEMENTATION_CASES) {
  test(`AC-6: ${id} — only "## ${CHANGED}" differs from the golden; tools, Allowed Tools and every other byte are the same`, () => {
    const now = NOW[id];
    const old = OLD[id];
    assert.equal(now.file, old.file);
    assert.deepEqual(now.tools, old.tools);
    assert.deepEqual(frontmatterTools(now.content), ['Read', 'Write', 'Edit', 'Bash']);
    assert.deepEqual(headersOf(now.content), EXPECTED_HEADERS);
    assert.deepEqual(headersOf(now.content), headersOf(old.content));
    assert.deepEqual(Object.keys(now.sections), Object.keys(old.sections));
    for (const header of Object.keys(old.sections)) {
      if (header === CHANGED) assert.notEqual(now.sections[header], old.sections[header], 'Output carries the new rules');
      else assert.equal(now.sections[header], old.sections[header], `"## ${header}" must be byte-identical`);
    }

    // The old Output line is still the first line of Output, and the rest of Output is the new
    // rules only: outside them not one byte changed (untracked sections and frontmatter included).
    assert.equal(old.sections[CHANGED], CONTRACT);
    assert.equal(now.sections[CHANGED].split('\n')[0], CONTRACT);
    assert.ok(now.sections[CHANGED].startsWith(`${CONTRACT}\n\n`));
    assert.equal(now.content.replace(now.sections[CHANGED], old.sections[CHANGED]), old.content);
  });

  test(`AC-6: ${id} — "## Skills" is unchanged`, () => {
    const now = NOW[id];
    const old = OLD[id];
    assert.ok(!headersOf(now.content).includes('Skills'), 'rendered without pointers, as before');
    if (old.contentWithSkills == null) {
      assert.equal(now.contentWithSkills, null);
      return;
    }
    const skillsOf = (md) => {
      const { lines, sections } = parseSections(md);
      return sectionBody(lines, sections.find((s) => s.header === 'Skills'));
    };
    assert.equal(skillsOf(now.contentWithSkills), skillsOf(old.contentWithSkills));
    assert.equal(now.contentWithSkills.replace(now.sections[CHANGED], old.sections[CHANGED]), old.contentWithSkills);
  });

  test(`${id} — the new text splits no section, adds no TODO and no placeholder`, () => {
    const body = outputOf(id);
    assert.ok(!/^## /m.test(body), 'a `## ` line would be read as a section boundary');
    assert.ok(!/\bTODO\b/.test(body), 'check-drafts counts TODO per agent');
    assert.deepEqual(findUnresolvedPlaceholders(NOW[id].content), findUnresolvedPlaceholders(OLD[id].content));
    assert.deepEqual(body.split('\n').filter((l) => l.startsWith('### ')), STEPS);
    // The word caf-orchestrator greps verify-report.md for stays in Retry Logic alone.
    assert.ok(!/\bSUCCESS\b/.test(body));
  });
}

test('AC-6: the three kinds share one text, whatever the fixture or the role', () => {
  const texts = new Set(IMPLEMENTATION_CASES.map(({ id }) => outputOf(id)));
  assert.equal(texts.size, 1);
  for (const kind of CHANGED_KINDS) {
    assert.equal(buildOutputSection(kind), [...texts][0]);
    assert.equal(SYNCABLE_SECTIONS.Output(kind), [...texts][0]);
  }
});

test('AC-6: the `implementation` fallback and every other kind keep the Output they had', () => {
  assert.deepEqual(Object.keys(OLD_OUTPUT_BY_KIND).sort(), [...KNOWN_KINDS, 'implementation'].sort());
  for (const [kind, old] of Object.entries(OLD_OUTPUT_BY_KIND)) {
    if (CHANGED_KINDS.includes(kind) || CHANGED_LATER.includes(kind)) assert.notEqual(buildOutputSection(kind), old, kind);
    else assert.equal(buildOutputSection(kind), old, `${kind}: Output must be byte-identical`);
  }
  assert.equal(buildOutputSection('implementation'), CONTRACT);
  assert.equal(SYNCABLE_SECTIONS.Output('implementation'), CONTRACT);
  assert.equal(detectKind(path.join(AGENT_DIR, 'web.md')), 'implementation', 'precondition: an unknown name is the fallback kind');
});

// ---------------------------------------------------------------------------------------------
// AC-7 — curate sync from agents generated before this ticket
// ---------------------------------------------------------------------------------------------

// One repo per set of implementation agents that can exist together.
const REPOS = [
  { label: 'mono-pnpm (frontend + backend)', fixture: 'mono-pnpm', ids: ['frontend.mono-pnpm', 'backend.mono-pnpm'] },
  { label: 'single-nuxt (implementer)', fixture: 'single-nuxt', ids: ['implementer.single-nuxt'] },
  { label: 'single-nuxt (--role frontend)', fixture: 'single-nuxt', ids: ['frontend.single-nuxt'] },
  { label: 'single-nuxt (--role backend)', fixture: 'single-nuxt', ids: ['backend.single-nuxt'] },
];

/**
 * Temp copy of the fixture: the OLD implementation agents plus every other agent as rendered now,
 * all baselined. `edits` maps an id to the content put on disk in place of the old render (the
 * baseline stays the old render: a user edit made after the baseline).
 */
function repoWithOldAgents({ fixture, ids }, { edits = {}, baseline = true } = {}) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03d-sync-');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  const others = Object.entries(rendered[fixture])
    .filter(([kind]) => !CHANGED_KINDS.includes(kind))
    .map(([, a]) => ({ file: a.file, content: a.content }));
  const old = ids.map((id) => ({ file: OLD[id].file, content: edits[id] ?? OLD[id].content, from: OLD[id].content }));
  const manifest = { version: 1, files: {} };
  for (const { file, content, from } of [...old, ...others]) {
    const relPath = path.join(AGENT_DIR, file);
    fs.writeFileSync(path.join(dir, relPath), content, 'utf8');
    const { lines, sections } = parseSections(from ?? content);
    for (const s of sections) setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
  if (baseline) writeManifest(dir, manifest);
  return { dir, others };
}

const sync = (dir, dryRun) => silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
const rel = (id) => path.join(AGENT_DIR, OLD[id].file);
// Agent definitions only: a real run also leaves `.caf-sync-state.json` next to them.
const agentTree = (dir) =>
  Object.fromEntries(Object.entries(snapshotTree(path.join(dir, AGENT_DIR))).filter(([file]) => file.endsWith('.md')));

for (const repo of REPOS) {
  const { label, ids } = repo;
  const drifted = ids.map((id) => `${rel(id)}#${CHANGED}`).sort();

  test(`AC-7: ${label} — the old Output is synced to the new text (dry-run, then write), no other section or file changes`, async () => {
    const { dir, others } = repoWithOldAgents(repo);
    const before = agentTree(dir);

    const dry = await sync(dir, true);
    assert.deepEqual([...dry.drifted].sort(), drifted);
    assert.deepEqual(dry.updated, []);
    assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

    const real = await sync(dir, false);
    assert.deepEqual([...real.drifted].sort(), drifted);
    assert.deepEqual(real.needsAttention, []);
    assert.deepEqual(real.unverifiable, []);
    assert.deepEqual([...real.updated].sort(), ids.map((id) => path.join(dir, rel(id))).sort());
    for (const id of ids) {
      // only that section differs between the two templates, so the synced file IS the new render
      const now = read(dir, rel(id));
      assert.equal(now, NOW[id].content, id);
      assert.match(now, /^### 5\. Evidence per AC$/m);
      for (const header of Object.keys(OLD[id].sections)) {
        if (header !== CHANGED) assert.equal(trackedSections(now)[header], OLD[id].sections[header], `${id}: "## ${header}" is untouched by the sync`);
      }
      assert.deepEqual(frontmatterTools(now), OLD[id].tools);
    }
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

    const after = agentTree(dir);
    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(again.updated, []);
    assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
  });

  test(`AC-7: ${label} — an agent whose Output the user edited is not overwritten (CONFLICT)`, async () => {
    const edits = Object.fromEntries(
      ids.map((id) => [id, OLD[id].content.replace('for the next agent to read.', 'for the next agent to read, and post a summary to the ticket.')])
    );
    for (const id of ids) assert.notEqual(edits[id], OLD[id].content);
    const { dir } = repoWithOldAgents(repo, { edits });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      assert.deepEqual(result.drifted, []);
      assert.deepEqual(result.updated, []);
      assert.deepEqual(
        result.needsAttention.map((n) => `${n.file}#${n.header}#${n.status}`).sort(),
        ids.map((id) => `${rel(id)}#${CHANGED}#${SECTION_STATUS.CONFLICT}`).sort()
      );
      assert.deepEqual(agentTree(dir), before);
    }
    for (const id of ids) assert.equal(read(dir, rel(id)), edits[id]);
  });

  test(`AC-7: ${label} — a section the user customized stays theirs (CUSTOMIZATION) while Output is synced`, async () => {
    const from = 'Verify fails → fix, retry up to 3x';
    const to = 'Verify fails → fix, retry up to 2x (team rule)';
    const edits = Object.fromEntries(ids.map((id) => [id, OLD[id].content.replace(from, to)]));
    for (const id of ids) assert.notEqual(edits[id], OLD[id].content);
    const { dir, others } = repoWithOldAgents(repo, { edits });

    const result = await sync(dir, false);
    assert.deepEqual(
      result.needsAttention.map((n) => `${n.file}#${n.header}#${n.status}`).sort(),
      ids.map((id) => `${rel(id)}#Retry Logic#${SECTION_STATUS.CUSTOMIZATION}`).sort()
    );
    assert.deepEqual([...result.drifted].sort(), drifted);
    for (const id of ids) {
      const now = read(dir, rel(id));
      assert.equal(trackedSections(now)['Retry Logic'], trackedSections(edits[id])['Retry Logic'], 'the customized section is kept byte for byte');
      assert.equal(now, NOW[id].content.replace(from, to));
    }
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, file);
  });

  test(`AC-7: ${label} — without a manifest baseline nothing is written (UNTRACKED)`, async () => {
    const { dir } = repoWithOldAgents(repo, { baseline: false });
    const before = agentTree(dir);
    const result = await sync(dir, false);
    assert.deepEqual(result.drifted, []);
    assert.deepEqual(result.updated, []);
    for (const id of ids) {
      assert.ok(result.needsAttention.some((n) => n.file === rel(id) && n.header === CHANGED && n.status === SECTION_STATUS.UNTRACKED), id);
    }
    assert.deepEqual(agentTree(dir), before);
    assert.ok(!fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), 'no baseline is invented');
  });
}

test('AC-7: mono-pnpm — only one of the two agents customized: that one is kept, the other is synced', async () => {
  const repo = REPOS[0];
  const kept = 'backend.mono-pnpm';
  const synced = 'frontend.mono-pnpm';
  const edited = OLD[kept].content.replace('for the next agent to read.', 'for the next agent to read, and post a summary to the ticket.');
  const { dir } = repoWithOldAgents(repo, { edits: { [kept]: edited } });

  const result = await sync(dir, false);
  assert.deepEqual(result.drifted, [`${rel(synced)}#${CHANGED}`]);
  assert.deepEqual(result.needsAttention, [{ file: rel(kept), header: CHANGED, status: SECTION_STATUS.CONFLICT }]);
  assert.equal(read(dir, rel(kept)), edited);
  assert.equal(read(dir, rel(synced)), NOW[synced].content);
});
