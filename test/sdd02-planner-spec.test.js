// CAF-SDD-02 — the planner writes the spec (Specify, Clarify, Plan, Tasks), the verify-report
// format carries one evidence line per AC plus a place for proposed spec changes, and the
// `caf-traceability` skill ships as a DRAFT (mapped to planner/frontend/backend, pointed at by
// no agent until a human removes its banner).
// Every `curate sync` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { skillsTarget, usableSkillPaths } from '../src/commands/skills.js';
import { buildAgentHandoffMd } from '../src/templates/agent-handoff-md.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import * as skillMd from '../src/templates/skill-md.js';
import { SKILL_NAMES, SKILLS_BY_KIND, skillsForKind, skillPath, buildSkillFiles, hasSkillDraftBanner, hasSkillDraftAgentNotice } from '../src/templates/skill-md.js';
import { KNOWN_KINDS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, makeRepo, snapshotTree } from './helpers/make-repo.js';
import { silenced, renderMonoSnapshot } from './helpers/mono-snapshot.js';
import { constraintsBody, swapConstraints } from './helpers/swap-constraints.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
// The planner's spec workflow lives in its tracked `## Output`, after the artifact contract line.
const SPEC = 'Output';
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');

// Recorded from main before this ticket touched src/ (T2). Never regenerated.
const OLD_PLANNER = Object.fromEntries(
  FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd02', `planner.${f}.json`), 'utf8'))])
);

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));

const plannerOf = (fixture) => rendered[fixture].planner.content;
const specOf = (fixture) => trackedSections(plannerOf(fixture))[SPEC];

// What `curate sync` makes of an older planner since CAF-SDD-02c: the planner also got `Glob` and
// `Grep`, so `## Allowed Tools` drifts along with `## Output`, and the frontmatter `tools:` line,
// which sync never writes, stays the old one. Since CAF-SDD-02d `## Input` drifts too: it names
// the status of `requirements.md` as a `Status:` line (test/sdd02d-planner-audit.test.js).
const OLD_TOOLS_LINE = 'tools: [Read, Write]';
const NEW_TOOLS_LINE = 'tools: [Read, Write, Glob, Grep]';
// `## Constraints` is not tracked (CAF-SDD-03c2b changed it): sync leaves the old one in place.
const syncedOf = (fixture) => swapConstraints(plannerOf(fixture).replace(NEW_TOOLS_LINE, OLD_TOOLS_LINE), OLD_PLANNER[fixture].content);
const DRIFTED = [`${PLANNER_REL}#Allowed Tools`, `${PLANNER_REL}#Input`, `${PLANNER_REL}#${SPEC}`];

/** The lines of `### <n>. <title>` up to the next `### ` heading. */
function step(body, heading) {
  const lines = body.split('\n');
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `"${heading}" is in the planner's "## ${SPEC}"`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('### '));
  // Reflowed to one line so an assertion never depends on where a sentence wraps.
  return (end === -1 ? rest : rest.slice(0, end)).join(' ').replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------------------------
// AC-1 .. AC-5 — the planner template
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: planner on ${fixture} — Specify, Clarify, Plan, Tasks in order, artifacts in .caf/tasks, slug for chat`, () => {
    const body = specOf(fixture);
    const headings = body.split('\n').filter((l) => l.startsWith('### '));
    assert.deepEqual(headings.slice(0, 4), ['### 1. Specify', '### 2. Clarify', '### 3. Plan', '### 4. Tasks']);

    const flat = body.replace(/\s+/g, ' ');
    assert.ok(flat.includes('`.caf/tasks/{TICKET-ID}/`'), 'names the artifact folder');
    assert.match(step(body, '### 1. Specify'), /Write `requirements\.md`/);
    assert.match(step(body, '### 4. Tasks'), /Write `tasks\.md`/);
    assert.match(flat, /no ticket ID[^.]*\bslug\b/, 'a chat request without a ticket ID gets a slug');
    assert.deepEqual(findUnresolvedPlaceholders(plannerOf(fixture)).filter((p) => !/feature-name|TICKET-ID/.test(p)), []);
  });

  test(`AC-2: planner on ${fixture} — Clarify: at most 5 questions, BLOCKING stops with NEEDS_CLARIFICATION, no tasks, today's stop token on the ticket path`, () => {
    const clarify = step(specOf(fixture), '### 2. Clarify');
    assert.match(clarify, /at most 5 questions/i);
    assert.match(clarify, /`BLOCKING`/);
    assert.match(clarify, /`Status: NEEDS_CLARIFICATION` in `requirements\.md`/);
    assert.match(clarify, /stop/i);
    assert.match(clarify, /do not write[^.]*`tasks\.md`[^.]*while a `?BLOCKING`? question is unanswered/i);
    // ticket path: CAF-SDD-03c2b — the same stop as the chat path, `NEEDS_CLARIFICATION`, no
    // `tasks.md` (before it: `NEEDS_HUMAN` plus a blocked note; held by test/sdd03c2b-planner-clarify.test.js)
    assert.match(clarify, /headless/);
    assert.doesNotMatch(clarify, /`Status: NEEDS_HUMAN`/);
  });

  test(`AC-3: planner on ${fixture} — an APPROVED spec is not changed; proposals go to verify-report.md`, () => {
    const rule = step(specOf(fixture), '### An approved spec is a contract');
    assert.match(rule, /`Status: APPROVED`/);
    assert.match(rule, /do not change its goal, scope or acceptance criteria/);
    assert.match(rule, /proposed change[^.]*`verify-report\.md`/);
    assert.match(rule, /a human decides/);
  });

  test(`AC-4: planner on ${fixture} — Tasks: every task names its AC ids, every AC has a task, test task before implementation`, () => {
    const tasks = step(specOf(fixture), '### 4. Tasks');
    assert.match(tasks, /Every task (?:line )?ends with the AC ids it serves/);
    assert.ok(tasks.includes('`(AC-1, AC-3)`'));
    assert.match(tasks, /Every AC is served by at least one task/);
    assert.match(tasks, /`Verify: automated test`[^.]*test[^.]*before[^.]*implement/);
  });

  // The artifacts, paths and stop tokens the planner definition named before this ticket (T1),
  // written out literally: deriving them from the old golden would let one drop out unnoticed.
  test(`AC-5: planner on ${fixture} — name, tools, artifacts and status tokens are the ones recorded before this ticket`, () => {
    const md = plannerOf(fixture);
    assert.equal(rendered[fixture].planner.file, 'caf-planner.md');
    assert.match(md, /^---\nname: caf-planner\n/);
    // `Glob` and `Grep` were added at CAF-SDD-02c; still no `Edit`, no `Bash`.
    assert.deepEqual(frontmatterTools(md), ['Read', 'Write', 'Glob', 'Grep']);
    assert.match(md, /^tools: \[Read, Write, Glob, Grep\]$/m);

    for (const literal of [
      'Produces `requirements.md`, `tasks.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.',
      'Write for artifacts in `.caf/tasks/{TICKET-ID}/`',
      // CAF-SDD-03c2 removed the "Fallback — Discovery draft without a ticket" flow from Input, and
      // with it five literals this list held: the `.caf/discovery/{TICKET-ID}/prd.md` path, the two
      // `requirements.md` lines about it (`... as usual, with the `Status:` line` and `... directly
      // with `Status: NEEDS_HUMAN``), `and still create `tasks.md``, and `## Open Questions`.
      // The headless stop token `Status: NEEDS_HUMAN` + `tasks.md` blocked of `## Constraints` was
      // replaced by CAF-SDD-03c2b (`Status: NEEDS_CLARIFICATION`, no `tasks.md`).
      '`## Frontend Tasks` / `## Backend Tasks`',
      '`[SYSTEM CONTEXT: Environment = headless...]`',
      '`verify-report.md` with **`Status: SUCCESS`**',
      '`verify-report.md` with Status: NEEDS_HUMAN',
    ]) {
      assert.ok(md.includes(literal), `planner still says: ${literal}`);
    }

    // Stronger than the list: the old Output line is still the first line of Output, and outside
    // `## Output` not one byte changed — but for the tools line and `## Allowed Tools`, which
    // CAF-SDD-02c changed (test/sdd02c-spec-active.test.js holds those two), and `## Input`,
    // which CAF-SDD-02d changed (test/sdd02d-planner-audit.test.js holds its three lines).
    const old = OLD_PLANNER[fixture];
    assert.deepEqual(frontmatterTools(old.content), ['Read', 'Write']);
    assert.equal(specOf(fixture).split('\n')[0], old.sections[SPEC]);
    assert.notEqual(specOf(fixture), old.sections[SPEC]);
    const restored = md
      .replace(NEW_TOOLS_LINE, OLD_TOOLS_LINE)
      .replace(trackedSections(md)['Allowed Tools'], old.sections['Allowed Tools'])
      .replace(trackedSections(md).Input, old.sections.Input)
      .replace(specOf(fixture), old.sections[SPEC])
      .replace(constraintsBody(md), () => constraintsBody(old.content));
    assert.equal(restored, old.content);
  });

  test(`planner on ${fixture} — the spec format is referenced to caf-spec, not copied`, () => {
    const body = specOf(fixture);
    assert.match(body, /`caf-spec` skill/);
    // none of the six template headings of caf-spec, and no `## ` line at all (it would split the section)
    assert.ok(!/^## /m.test(body));
    assert.ok(!/Constraints and Assumptions|Decisions Already Made/.test(body));
    assert.ok(!/\bTODO\b/.test(body), 'check-drafts counts TODO per agent');
    assert.deepEqual(parseSections(plannerOf(fixture)).sections.map((s) => s.header), parseSections(OLD_PLANNER[fixture].content).sections.map((s) => s.header));
  });

  test(`only the planner changed on ${fixture}: every other kind keeps its Output artifact line and the generic Working Pattern`, () => {
    const generic = [
      "1. PLAN — write a plan first, don't touch code yet",
      '2. IMPLEMENT — execute per the plan',
      '3. VERIFY — run the Verify Checklist below before declaring done',
    ].join('\n');
    const discovery = [
      "1. PLAN — first determine what's still unknown and needs to be asked of a human",
      '2. IMPLEMENT — write the document',
      '3. VERIFY — run the Verify Checklist below before claiming completion',
    ].join('\n');
    const line = (artifact) => `Produces ${artifact} in \`.caf/tasks/{TICKET-ID}/\` for the next agent to read.`;
    const OUTPUT = {
      architect: line('`design.md`'),
      qa: line('`qa-report.md`'),
      documentation: line('update `docs/` (parallel, non-blocking)'),
      devops: 'TODO: which artifact is produced for the next agent',
    };
    // CAF-SDD-03c2: the validator is a candidate now; its Output and Working Pattern are locked in
    // test/sdd03b1-validator.test.js and test/sdd03e-validator-commands.test.js.
    const kinds = Object.keys(rendered[fixture]).filter((k) => k !== 'planner' && k !== 'validator');
    assert.ok(kinds.length >= 7);
    for (const kind of kinds) {
      const sections = trackedSections(rendered[fixture][kind].content);
      // CAF-SDD-03e: the reviewer has a Working Pattern of its own (test/sdd03e-validator-commands.test.js).
      if (kind === 'reviewer') assert.notEqual(sections['Working Pattern (PIV)'], generic, kind);
      else assert.equal(sections['Working Pattern (PIV)'], kind === 'pm' || kind === 'ux-designer' ? discovery : generic, kind);
      if (kind in OUTPUT) assert.equal(sections.Output, OUTPUT[kind], kind);
      // CAF-SDD-03b2: the reviewer's Output keeps its artifact line and now carries the spec checks
      // after it (locked in test/sdd03b2-reviewer-spec.test.js).
      else if (kind === 'reviewer') assert.equal(sections.Output.split('\n')[0], line('`review-notes.md`'), kind);
      // CAF-SDD-03d: same for the implementation agents — artifact line first, then the spec rules
      // (locked in test/sdd03d-implementation-spec.test.js).
      else if (['frontend', 'backend', 'implementer'].includes(kind)) assert.equal(sections.Output.split('\n')[0], line('code + `verify-report.md`'), kind);
      else assert.ok(['auditor', 'pm', 'ux-designer'].includes(kind), `${kind}: Output not covered`);
      assert.ok(!sections.Output.includes('### 1. Specify'), kind);
    }
    assert.equal(trackedSections(plannerOf(fixture))['Working Pattern (PIV)'], generic, 'planner keeps the generic PIV text too');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6 — verify-report format (single generated source: .caf/workflows/agent-handoff.md)
// ---------------------------------------------------------------------------------------------

// Copy of caf-orchestrator's readVerifyReport() (src/infrastructure/reports/report-reader.ts):
// the whole file is tested, not just the Status line. Separate npm package, so a copy, as in
// reviewer-report-format.test.js.
const ORCHESTRATOR_VERIFY_STATUS = (raw) => (/\bSUCCESS\b/.test(raw) ? 'SUCCESS' : 'NEEDS_HUMAN');

async function handoffSkeleton() {
  const md = (await renderMonoSnapshot()).files['.caf/workflows/agent-handoff.md'];
  const lines = md.split('\n');
  const at = lines.indexOf('## Format `verify-report.md`');
  assert.ok(at > 0);
  const open = lines.indexOf('```markdown', at);
  const close = lines.indexOf('```', open + 1);
  return { md, section: lines.slice(at, lines.indexOf('## Additional Agents (Custom)')).join('\n'), skeleton: lines.slice(open + 1, close) };
}

// CAF-SDD-02b added the `command` form (second line) — five forms since then.
test('AC-6: verify-report format — one evidence line per AC, in one of five forms', async () => {
  const { skeleton, section } = await handoffSkeleton();
  const at = skeleton.indexOf('## Acceptance Criteria');
  assert.ok(at > 0, 'the skeleton has an Acceptance Criteria part');
  const evidence = skeleton.slice(at + 1, skeleton.indexOf('', at));
  assert.deepEqual(evidence, [
    '- AC-1: automated-test — <file>::<test name>',
    '- AC-2: command — <command> | <exit code or output observed>',
    '- AC-3: build-only — <command that passed>; no test exists for this behavior',
    '- AC-4: manual — <steps a human must run, or steps already run>',
    '- AC-5: none — <why>',
  ]);
  const flat = section.replace(/\s+/g, ' ');
  assert.match(flat, /one line per AC/i);
  assert.match(flat, /exactly one of the five forms/);
  assert.match(flat, /number of passing tests is never evidence/i);
});

test('AC-6: verify-report format — a "Proposed Spec Changes" part, `-` when there is none', async () => {
  const { skeleton, section } = await handoffSkeleton();
  const at = skeleton.indexOf('## Proposed Spec Changes');
  assert.ok(at > skeleton.indexOf('## Acceptance Criteria'));
  assert.equal(skeleton[at + 1], '-');
  const flat = section.replace(/\s+/g, ' ');
  assert.match(flat, /`Status: APPROVED`[^.]*never edit/i);
  assert.match(flat, /`-` when there is none/);
});

test('AC-6: verify-report format — the Status line keeps its shape and still reads right for caf-orchestrator', async () => {
  const { skeleton, section } = await handoffSkeleton();
  assert.equal(skeleton[0], '# Verify Report');
  assert.equal(skeleton[2], 'Status: SUCCESS | NEEDS_HUMAN');
  assert.deepEqual(skeleton.filter((l) => /^Status:/.test(l)), ['Status: SUCCESS | NEEDS_HUMAN']);
  assert.ok(section.includes('`\\bSUCCESS\\b`'), 'still says what the orchestrator greps for');

  // The word the orchestrator greps for appears on the Status line only: a report that fills the
  // skeleton in and chooses NEEDS_HUMAN must not read as SUCCESS because of the new parts.
  const filled = (status) => skeleton.map((l) => (l.startsWith('Status:') ? `Status: ${status}` : l)).join('\n');
  assert.equal(ORCHESTRATOR_VERIFY_STATUS(filled('SUCCESS')), 'SUCCESS');
  assert.equal(ORCHESTRATOR_VERIFY_STATUS(filled('NEEDS_HUMAN')), 'NEEDS_HUMAN');
  // what was there before stays
  for (const kept of ['## Checklist', '- [ ] lint', '- [ ] typecheck', '- [ ] test', '- [ ] build', '## Notes']) {
    assert.ok(skeleton.includes(kept), kept);
  }
});

test('AC-6: the handoff builder is the same text whatever the roster', () => {
  const roster = { known: [{ slug: 'caf-implementer', label: 'Implementer', present: true }], custom: [] };
  const md = buildAgentHandoffMd({ roster });
  assert.ok(md.includes('- AC-1: automated-test — <file>::<test name>'));
  assert.ok(md.includes('## Proposed Spec Changes\n-\n'));
  assert.deepEqual(findUnresolvedPlaceholders(md), []);
});

// ---------------------------------------------------------------------------------------------
// AC-7 — the caf-traceability skill
// ---------------------------------------------------------------------------------------------

const TRACE_REL = '.claude/skills/caf-traceability/SKILL.md';
// sha256 of the ticket source (no trailing newline in that file): since CAF-SDD-02b
// .ai/tasks/CAF-SDD-02b/caf-traceability.source.v2.md, which adds the `command` evidence form.
// `.ai/` is not committed, so the hash is what proves the skill is the source, byte for byte.
const TRACE_SOURCE_SHA256 = 'a1a89ede52d423f20d5df08111988dbaef97e27460a715767ce54ddc437d536c';
const BANNER = [
  '> DRAFT: this skill has not been tested with real agent dispatches yet.',
  '> Remove this banner only after that test is done.',
  '> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.',
];

const buildTraceabilitySkill = () => {
  assert.equal(typeof skillMd.buildTraceabilitySkill, 'function', 'skill-md.js exports buildTraceabilitySkill');
  return skillMd.buildTraceabilitySkill();
};
const runSkills = (opts) => silenced(() => skillsTarget(opts));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const pointersIn = (md) => [...md.matchAll(/^- `([^`]+\/SKILL\.md)`$/gm)].map((m) => m[1]);

async function check(dir) {
  const saved = process.exitCode;
  process.exitCode = undefined;
  try {
    const result = await silenced(() => checkDrafts({ dir }));
    return { ...result, exitCode: process.exitCode };
  } finally {
    process.exitCode = saved;
  }
}

test('AC-7: caf-traceability is the ticket source verbatim, at most 90 lines, registered once', () => {
  const md = buildTraceabilitySkill();
  assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
  assert.equal(crypto.createHash('sha256').update(md.slice(0, -1)).digest('hex'), TRACE_SOURCE_SHA256);
  assert.ok(md.trimEnd().split('\n').length <= 90, `${md.trimEnd().split('\n').length} lines`);
  assert.equal(md, buildTraceabilitySkill());

  assert.equal(skillPath('caf-traceability'), TRACE_REL);
  assert.equal(SKILL_NAMES.filter((n) => n === 'caf-traceability').length, 1);
  assert.equal(SKILL_NAMES[SKILL_NAMES.length - 1], 'caf-traceability', 'appended: the order of the older skills is unchanged');
  for (const mode of ['SINGLE_REPO', 'MONOREPO']) {
    const file = buildSkillFiles({ mode, verifyApps: [] }).find((f) => f.name === 'caf-traceability');
    assert.equal(file.content, md);
    assert.equal(file.relPath, TRACE_REL);
    assert.equal(file.draft, true);
  }
  assert.deepEqual(findUnresolvedPlaceholders(md), []);
  assert.deepEqual(md.split('\n').filter((l) => l.startsWith('>')), BANNER);
  // a skill name must never equal a command name (.claude/commands/caf-*.md)
  const commands = fs.readdirSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'templates'))
    .map((f) => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'templates', f), 'utf8'));
  assert.ok(!commands.some((src) => /\/caf-traceability\b/.test(src)), 'no /caf-traceability command');
});

for (const fixture of FIXTURE_NAMES) {
  test(`AC-7: scaffold skills writes caf-traceability with its frontmatter and the 3-line DRAFT banner — ${fixture}`, async () => {
    const dir = copyFixture(fixtureDir(fixture));
    assert.ok(!fs.existsSync(path.join(dir, TRACE_REL)));
    const result = await runSkills({ dir });
    assert.ok(result.written.includes(path.join(dir, TRACE_REL)));
    assert.ok(result.drafts.includes('caf-traceability'));

    const md = read(dir, TRACE_REL);
    assert.equal(md, buildTraceabilitySkill());
    const fm = md.match(/^---\n([\s\S]*?)\n---\n/)[1].split('\n');
    assert.deepEqual(fm.map((l) => l.split(':')[0]), ['name', 'description']);
    assert.equal(fm[0], 'name: caf-traceability');
    const lines = md.split('\n');
    const at = lines.indexOf(BANNER[0]);
    assert.ok(at > 0 && at < 15);
    assert.deepEqual(lines.slice(at - 1, at + 4), ['', ...BANNER, '']);
    assert.ok(hasSkillDraftBanner(md) && hasSkillDraftAgentNotice(md));
    assert.ok(lines.length - 1 <= 90);
  });

  test(`AC-7: an existing caf-traceability/SKILL.md is never overwritten — ${fixture}`, async () => {
    const dir = copyFixture(fixtureDir(fixture));
    fs.mkdirSync(path.dirname(path.join(dir, TRACE_REL)), { recursive: true });
    fs.writeFileSync(path.join(dir, TRACE_REL), 'edited by the team\n');
    const first = await runSkills({ dir });
    assert.equal(read(dir, TRACE_REL), 'edited by the team\n');
    assert.ok(first.skipped.includes(path.join(dir, TRACE_REL)));
    assert.ok(!first.written.includes(path.join(dir, TRACE_REL)));
    const tree = snapshotTree(dir);
    await runSkills({ dir });
    assert.deepEqual(snapshotTree(dir), tree);
  });

  test(`AC-7: --dry-run reports the same list and writes nothing — ${fixture}`, async () => {
    const dir = copyFixture(fixtureDir(fixture));
    const before = snapshotTree(dir);
    const dry = await runSkills({ dir, dryRun: true });
    assert.deepEqual(snapshotTree(dir), before);
    assert.deepEqual(dry.written, []);
    assert.ok(dry.drafts.includes('caf-traceability'));

    const real = await runSkills({ dir });
    assert.deepEqual(dry.drafts, real.drafts);
    assert.deepEqual(dry.skipped, real.skipped);
    assert.deepEqual(dry.collisions, real.collisions);
    const added = Object.keys(snapshotTree(dir)).filter((rel) => !(rel in before)).sort();
    assert.deepEqual(added, SKILL_NAMES.map(skillPath).sort());
    assert.ok(added.includes(TRACE_REL));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-8 — mapping, and no pointer while the banner is there
// ---------------------------------------------------------------------------------------------

test('AC-8: caf-traceability maps to planner, frontend, backend and validator, and to nothing else', () => {
  const mapped = [...KNOWN_KINDS, 'implementation'].filter((kind) => skillsForKind(kind).includes('caf-traceability'));
  assert.deepEqual(mapped.sort(), ['backend', 'frontend', 'planner', 'validator']);
  assert.deepEqual(skillsForKind('planner'), ['caf-scope-discipline', 'caf-no-guess', 'caf-spec', 'caf-traceability']);
  for (const kind of ['frontend', 'backend']) {
    assert.deepEqual(skillsForKind(kind), ['caf-verify', 'caf-scope-discipline', 'caf-no-guess', 'caf-escalate', 'caf-traceability']);
  }
  // the kinds that share the implementation list are untouched
  for (const kind of ['implementer', 'implementation']) {
    assert.deepEqual(skillsForKind(kind), ['caf-verify', 'caf-scope-discipline', 'caf-no-guess', 'caf-escalate']);
  }
  for (const names of Object.values(SKILLS_BY_KIND)) assert.deepEqual(names, SKILL_NAMES.filter((n) => names.includes(n)));
});

test('AC-8: while the DRAFT banner is there no agent points at caf-traceability, and check-drafts gains no FAIL', async () => {
  const agent = (kind, skills) => buildAgentMd({ name: kind, role: 'r', scope: 's', kind, appNames: [], slug: `caf-${kind}`, skills });
  const kinds = ['planner', 'frontend', 'backend'];
  const scripts = { lint: 'x', typecheck: 'x', test: 'x', build: 'x' };
  const dir = makeRepo(
    {
      'package.json': { name: 'r', scripts },
      'pnpm-lock.yaml': '',
      ...Object.fromEntries(kinds.map((k) => [`${AGENT_DIR}/caf-${k}.md`, agent(k)])),
    },
    'caf-sdd02-pointer-'
  );
  const before = await check(dir);

  prompts.inject([true, true, true]);
  const result = await runSkills({ dir });
  prompts._injected.length = 0;
  assert.ok(result.drafts.includes('caf-traceability'));
  assert.equal(result.pointers.added.length, 3);

  for (const kind of kinds) {
    // an agent that existed: the `## Skills` it was offered
    const existing = read(dir, `${AGENT_DIR}/caf-${kind}.md`);
    const { lines, sections } = parseSections(existing);
    const skills = sectionBody(lines, sections.find((s) => s.header === 'Skills'));
    assert.ok(pointersIn(existing).length > 0, kind);
    assert.ok(!skills.includes('caf-traceability'), `${kind}: no pointer at a DRAFT skill`);
    // an agent generated now
    const paths = usableSkillPaths(dir, kind);
    assert.ok(!paths.includes(TRACE_REL), kind);
    assert.ok(!pointersIn(agent(kind, paths)).includes(TRACE_REL), kind);
    assert.ok(skillsForKind(kind).includes('caf-traceability'), `${kind}: mapped all the same`);
  }

  const tree = snapshotTree(dir);
  const after = await check(dir);
  assert.deepEqual(snapshotTree(dir), tree, 'check-drafts is read-only');
  assert.equal(after.fails, before.fails);
  assert.equal(after.fails, 0, JSON.stringify(after.findings.filter((f) => f.level === 'FAIL')));
  assert.deepEqual(after.findings.filter((f) => f.file === TRACE_REL && f.level === 'FAIL'), []);
});

// ---------------------------------------------------------------------------------------------
// AC-10 — curate sync from a planner generated before this ticket
// ---------------------------------------------------------------------------------------------

/** Temp copy of the fixture: the OLD planner plus every other agent as rendered now, all baselined. */
function repoWithOldPlanner(fixture, { planner = OLD_PLANNER[fixture].content, baselineFrom = planner, baseline = true } = {}) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd02-sync-');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  const others = Object.entries(rendered[fixture])
    .filter(([kind]) => kind !== 'planner')
    .map(([, a]) => ({ file: a.file, content: a.content }));
  const manifest = { version: 1, files: {} };
  for (const { file, content, from } of [{ file: 'caf-planner.md', content: planner, from: baselineFrom }, ...others]) {
    const relPath = path.join(AGENT_DIR, file);
    fs.writeFileSync(path.join(dir, relPath), content, 'utf8');
    const { lines, sections } = parseSections(from ?? content);
    for (const s of sections) setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
  if (baseline) writeManifest(dir, manifest);
  return { dir, others };
}

const sync = (dir, dryRun) => silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
// Agent definitions only: a real run also leaves `.caf-sync-state.json` (the declined-section
// memory) next to them, which is not an agent file.
const agentTree = (dir) =>
  Object.fromEntries(Object.entries(snapshotTree(path.join(dir, AGENT_DIR))).filter(([rel]) => rel.endsWith('.md')));

for (const fixture of FIXTURE_NAMES) {
  test(`AC-10: ${fixture} — the old planner's changed section is synced to the new text, no other agent file changes`, async () => {
    assert.equal(OLD_PLANNER[fixture].file, 'caf-planner.md');
    const { dir, others } = repoWithOldPlanner(fixture);
    const before = agentTree(dir);

    const dry = await sync(dir, true);
    assert.deepEqual(dry.drifted, DRIFTED);
    assert.deepEqual(dry.updated, []);
    assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

    const real = await sync(dir, false);
    assert.deepEqual(real.drifted, DRIFTED);
    assert.deepEqual(real.needsAttention, []);
    assert.deepEqual(real.unverifiable, []);
    assert.deepEqual(real.updated, [path.join(dir, PLANNER_REL)]);
    // the tracked sections are the new render; the frontmatter is not synced
    assert.equal(read(dir, PLANNER_REL), syncedOf(fixture));
    assert.match(read(dir, PLANNER_REL), /^### 2\. Clarify$/m);
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

    const after = agentTree(dir);
    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(again.updated, []);
    assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
  });

  test(`AC-10: ${fixture} — a planner whose Output the user edited is not overwritten (CONFLICT)`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('for the next agent to read.', 'for the next agent to read, and post a summary to the ticket.');
    assert.notEqual(edited, old);
    const { dir } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      // `## Allowed Tools` (CAF-SDD-02c) and `## Input` (CAF-SDD-02d) were not edited, so they
      // are synced; the edited Output is not
      assert.deepEqual(result.drifted, [`${PLANNER_REL}#Allowed Tools`, `${PLANNER_REL}#Input`]);
      assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: SPEC, status: SECTION_STATUS.CONFLICT }]);
      if (dryRun) assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(trackedSections(read(dir, PLANNER_REL))[SPEC], trackedSections(edited)[SPEC]);
    assert.equal(
      read(dir, PLANNER_REL),
      edited
        .replace(trackedSections(edited)['Allowed Tools'], trackedSections(plannerOf(fixture))['Allowed Tools'])
        .replace(trackedSections(edited).Input, trackedSections(plannerOf(fixture)).Input)
    );
  });

  test(`AC-10: ${fixture} — a section the user customized stays theirs (CUSTOMIZATION) while the untouched one is synced`, async () => {
    // The customized section was `## Input` until CAF-SDD-02d changed its template too (an
    // edited Input is a CONFLICT now). `## Retry Logic` is one whose template did not change.
    const old = OLD_PLANNER[fixture].content;
    const swap = (text) => text.replace('retry up to 3x', 'retry up to 2x');
    const edited = swap(old);
    assert.notEqual(edited, old);
    const { dir, others } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });

    const result = await sync(dir, false);
    assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Retry Logic', status: SECTION_STATUS.CUSTOMIZATION }]);
    assert.deepEqual(result.drifted, DRIFTED);
    const now = read(dir, PLANNER_REL);
    assert.equal(trackedSections(now)['Retry Logic'], trackedSections(edited)['Retry Logic'], 'the customized section is kept byte for byte');
    assert.equal(now, swap(syncedOf(fixture)));
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, file);
  });

  test(`AC-10: ${fixture} — without a manifest baseline nothing is written (UNTRACKED)`, async () => {
    const { dir } = repoWithOldPlanner(fixture, { baseline: false });
    const before = agentTree(dir);
    const result = await sync(dir, false);
    assert.deepEqual(result.drifted, []);
    assert.deepEqual(result.updated, []);
    assert.ok(result.needsAttention.some((n) => n.file === PLANNER_REL && n.header === SPEC && n.status === SECTION_STATUS.UNTRACKED));
    assert.deepEqual(agentTree(dir), before);
    assert.ok(!fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), 'no baseline is invented');
  });
}
