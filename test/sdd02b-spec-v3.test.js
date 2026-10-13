// CAF-SDD-02b — `caf-spec` v3 and the `command` evidence form. The two skills are the ticket
// sources verbatim (sha256), the verify-report format carries a fifth evidence form, and the
// planner's `## Output` is aligned with v3 on three points only: facts from the code are not
// questions, an answered question keeps its tag, `Verify:` may be `command:`.
// Both skills were left a DRAFT here. CAF-SDD-02c removed the banner of `caf-spec` (same text,
// see test/sdd02c-spec-active.test.js); `caf-traceability` still has it.
// Every `scaffold skills` and `curate sync` below runs on a temp directory.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import { skillsTarget, usableSkillPaths } from '../src/commands/skills.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { buildSpecSkill, buildTraceabilitySkill, buildSkillFiles, skillPath, hasSkillDraftBanner, hasSkillDraftAgentNotice } from '../src/templates/skill-md.js';
import { KNOWN_KINDS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, makeRepo, snapshotTree } from './helpers/make-repo.js';
import { silenced, renderMonoSnapshot } from './helpers/mono-snapshot.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, renderAgents, trackedSections } from './helpers/frozen-kinds.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const SPEC_REL = skillPath('caf-spec');
const TRACE_REL = skillPath('caf-traceability');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');

// sha256 of .ai/tasks/CAF-SDD-02b/caf-spec.source.v3.md and caf-traceability.source.v2.md (neither
// file ends with a newline). `.ai/` is not committed, so the hash is what proves each skill is
// its source, byte for byte.
// SPEC_V3_SHA256 is the 02b source WITH its DRAFT banner. Since CAF-SDD-02c the skill is that same
// text without the banner: put the banner back and the hash still holds (withBanner below).
const SPEC_V3_SHA256 = '513407ddee832bd32f627fb512c6d03dd189d6a26a24473d522419f44bece0a5';
const TRACE_V2_SHA256 = 'a1a89ede52d423f20d5df08111988dbaef97e27460a715767ce54ddc437d536c';
const BANNER = [
  '> DRAFT: this skill has not been tested with real agent dispatches yet.',
  '> Remove this banner only after that test is done.',
  '> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.',
];

// Recorded before this ticket touched src/ (T2). Never regenerated.
const SDD02_PLANNER = Object.fromEntries(
  FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd02b', `planner.${f}.json`), 'utf8'))])
);
// The caf-spec skill as `scaffold skills` wrote it before this ticket (v2).
const SPEC_V2 = fs.readFileSync(path.join(FIXTURES, 'pre-sdd02b', 'caf-spec.v2.SKILL.md'), 'utf8');

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const plannerOf = (fixture) => rendered[fixture].planner.content;
const outputOf = (fixture) => trackedSections(plannerOf(fixture)).Output;

// What `curate sync` makes of an older planner since CAF-SDD-02c: the planner also got `Glob` and
// `Grep`, so `## Allowed Tools` drifts along with `## Output`, and the frontmatter `tools:` line,
// which sync never writes, stays the old one. Since CAF-SDD-02d `## Input` drifts too: it names
// the status of `requirements.md` as a `Status:` line (test/sdd02d-planner-audit.test.js).
const OLD_TOOLS_LINE = 'tools: [Read, Write]';
const NEW_TOOLS_LINE = 'tools: [Read, Write, Glob, Grep]';
const syncedOf = (fixture) => plannerOf(fixture).replace(NEW_TOOLS_LINE, OLD_TOOLS_LINE);
const DRIFTED = [`${PLANNER_REL}#Allowed Tools`, `${PLANNER_REL}#Input`, `${PLANNER_REL}#Output`];

/** caf-spec as 02b wrote it: the banner block back in place of the blank line 02c left there. */
function withBanner(md) {
  const open = '---\n\n\n# caf-spec';
  assert.equal(md.split(open).length, 2);
  return md.replace(open, `---\n\n${BANNER.join('\n')}\n\n# caf-spec`);
}

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const runSkills = (opts) => silenced(() => skillsTarget(opts));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const lineCount = (md) => md.trimEnd().split('\n').length;

/** The skill is its source plus the one trailing newline every generated skill ends with. */
function assertIsSource(md, hash) {
  assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
  assert.equal(sha256(md.slice(0, -1)), hash);
}

function assertDraftBanner(md) {
  const lines = md.split('\n');
  assert.deepEqual(lines.filter((l) => l.startsWith('>')), BANNER);
  const at = lines.indexOf(BANNER[0]);
  assert.ok(at > 0 && at < 15);
  assert.deepEqual(lines.slice(at - 1, at + 4), ['', ...BANNER, '']);
  assert.ok(hasSkillDraftBanner(md) && hasSkillDraftAgentNotice(md));
}

/** The lines of `### <heading>` up to the next `### ` heading, reflowed to one line. */
function step(body, heading) {
  const lines = body.split('\n');
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `"${heading}" is in the planner's "## Output"`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('### '));
  return (end === -1 ? rest : rest.slice(0, end)).join(' ').replace(/\s+/g, ' ');
}

/** The lines of a `## <heading>` section of a skill, up to the next `## ` heading. */
function skillSection(md, heading) {
  const lines = md.split('\n');
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, heading);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

// ---------------------------------------------------------------------------------------------
// AC-1, AC-2, AC-3 — caf-spec v3
// ---------------------------------------------------------------------------------------------

test('AC-1: caf-spec is the v3 ticket source verbatim (sha256) once its banner is put back, at most 90 lines', () => {
  const md = buildSpecSkill();
  assertIsSource(withBanner(md), SPEC_V3_SHA256);
  assertDraftBanner(withBanner(md));
  assert.ok(!hasSkillDraftBanner(md), 'no banner since CAF-SDD-02c');
  assert.ok(lineCount(md) <= 90, `${lineCount(md)} lines`);
  for (const mode of ['SINGLE_REPO', 'MONOREPO']) {
    const file = buildSkillFiles({ mode, verifyApps: [] }).find((f) => f.name === 'caf-spec');
    assert.equal(file.content, md);
    assert.equal(file.draft, false);
  }
});

test('AC-1: scaffold skills in an empty test repo writes caf-spec identical to the v3 source', async () => {
  const dir = makeRepo({ 'package.json': { name: 'empty' } }, 'caf-sdd02b-empty-');
  assert.ok(!fs.existsSync(path.join(dir, SPEC_REL)));
  const result = await runSkills({ dir });
  assert.ok(result.written.includes(path.join(dir, SPEC_REL)));
  assert.ok(!result.drafts.includes('caf-spec'), 'active since CAF-SDD-02c');

  const md = read(dir, SPEC_REL);
  assertIsSource(withBanner(md), SPEC_V3_SHA256);
  assert.ok(lineCount(md) <= 90);
});

test('AC-2: caf-spec has `Finding:` in section 3 and the three `Verify:` forms', () => {
  const md = buildSpecSkill();
  const lines = md.split('\n');
  const open = lines.indexOf('```markdown');
  const template = lines.slice(open + 1, lines.indexOf('```', open + 1));
  const s3 = template.slice(template.indexOf('## 3. Constraints and Assumptions') + 1, template.indexOf('## 4. Decisions Already Made'));
  assert.ok(s3.some((l) => l.startsWith('- Finding: ')), '`- Finding:` is a line of section 3 of the template');
  assert.ok(template.includes('- AC-1: When <condition>, then <observable result>. Verify: <automated test | command | manual>'));

  const rules = skillSection(md, '## Acceptance Criteria rules');
  const forms = rules.filter((l) => l.startsWith('  - `')).map((l) => l.match(/^ {2}- `([^`]+)`/)[1]);
  assert.deepEqual(forms, ['automated test', 'command: <command> | expect: <exit code or output>', 'manual: <short steps>']);
  assert.ok(rules.some((l) => l.includes('Always write `Verify:` with one of three forms')));
});

test('AC-2: caf-spec says no line numbers, a fact from the code is not a question, an answered question keeps its tag', () => {
  const md = buildSpecSkill();
  assert.ok(skillSection(md, '## Size').some((l) => l.includes('cite the file path, no line numbers')));
  assert.ok(skillSection(md, '## Acceptance Criteria rules').some((l) => l.includes('no line numbers or function names')));

  const questions = skillSection(md, '## Open Questions rules');
  assert.ok(questions.includes('- First check the ticket, the code, the ADRs and `CLAUDE.md`. Whatever you can answer by reading is a fact (section 3) or a `Finding:`, never a question.'));
  assert.ok(questions.some((l) => l.includes('At most 5 questions in the file')));
  assert.ok(questions.some((l) => l.endsWith('Keep the question and its original tag; do not delete or retag it.')));
  assert.ok(skillSection(md, '## Check before finishing').includes('4. No more than 5 questions, none answerable from the code.'));
});

for (const fixture of FIXTURE_NAMES) {
  test(`AC-3: a repo that already has the older caf-spec keeps it; --dry-run reports the same list as the write path — ${fixture}`, async () => {
    assert.notEqual(SPEC_V2, buildSpecSkill(), 'the fixture is the older version');
    const seed = () => {
      const dir = copyFixture(fixtureDir(fixture), 'caf-sdd02b-old-spec-');
      fs.mkdirSync(path.dirname(path.join(dir, SPEC_REL)), { recursive: true });
      fs.writeFileSync(path.join(dir, SPEC_REL), SPEC_V2);
      return dir;
    };

    const dryDir = seed();
    const before = snapshotTree(dryDir);
    const dry = await runSkills({ dir: dryDir, dryRun: true });
    assert.deepEqual(snapshotTree(dryDir), before, 'dry-run writes nothing');
    assert.deepEqual(dry.written, []);

    const dir = seed();
    const real = await runSkills({ dir });
    assert.equal(read(dir, SPEC_REL), SPEC_V2, 'the older caf-spec is byte-identical after the run');
    assert.ok(real.skipped.includes(path.join(dir, SPEC_REL)));
    assert.ok(!real.written.includes(path.join(dir, SPEC_REL)));
    assert.ok(real.written.includes(path.join(dir, TRACE_REL)), 'the skills that were missing are still written');

    const rel = (base, list) => list.map((p) => path.relative(base, p));
    assert.deepEqual(rel(dryDir, dry.skipped), rel(dir, real.skipped));
    assert.deepEqual(rel(dryDir, dry.skipped), [SPEC_REL]);
    assert.deepEqual(dry.drafts, real.drafts);
    assert.deepEqual(dry.collisions, real.collisions);

    const tree = snapshotTree(dir);
    await runSkills({ dir });
    assert.deepEqual(snapshotTree(dir), tree, 'a second run changes nothing');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-4 — caf-traceability v2
// ---------------------------------------------------------------------------------------------

test('AC-4: caf-traceability is the v2 ticket source verbatim (sha256), has the `command` form, DRAFT banner, at most 90 lines', async () => {
  const md = buildTraceabilitySkill();
  assertIsSource(md, TRACE_V2_SHA256);
  assertDraftBanner(md);
  assert.ok(lineCount(md) <= 90, `${lineCount(md)} lines`);

  const report = skillSection(md, '## In verify-report.md');
  assert.ok(report.includes('- `AC-n: command — <command> | <exit code or output observed>`'));
  assert.ok(report.some((l) => l.includes('An AC with `Verify: command:` is reported as `command` with the observed result.')));

  const dir = makeRepo({ 'package.json': { name: 'empty' } }, 'caf-sdd02b-trace-');
  await runSkills({ dir });
  assert.equal(read(dir, TRACE_REL), md);
});

// caf-spec lost its banner at CAF-SDD-02c, so the planner is now pointed at it — and only the
// planner. caf-traceability still has the banner: no agent points at it.
test('AC-4: no agent points at caf-traceability while the banner is there; caf-spec is the planner\'s only', async () => {
  // every agent a fresh scaffold renders, both fixtures
  for (const fixture of FIXTURE_NAMES) {
    for (const [kind, { content }] of Object.entries(rendered[fixture])) {
      assert.ok(!content.includes(TRACE_REL), `${fixture}/${kind}`);
      assert.ok(!content.includes(SPEC_REL), `${fixture}/${kind}`);
    }
  }

  // agents that existed before `scaffold skills`: the `## Skills` section they are offered
  const kinds = ['planner', 'frontend', 'backend'];
  const agent = (kind, skills) => buildAgentMd({ name: kind, role: 'r', scope: 's', kind, appNames: [], slug: `caf-${kind}`, skills });
  const scripts = { lint: 'x', typecheck: 'x', test: 'x', build: 'x' };
  const dir = makeRepo(
    {
      'package.json': { name: 'r', scripts },
      'pnpm-lock.yaml': '',
      ...Object.fromEntries(kinds.map((k) => [`${AGENT_DIR}/caf-${k}.md`, agent(k)])),
    },
    'caf-sdd02b-pointer-'
  );
  prompts.inject([true, true, true]);
  const result = await runSkills({ dir });
  prompts._injected.length = 0;
  assert.equal(result.pointers.added.length, 3);
  assert.ok(result.drafts.includes('caf-traceability') && !result.drafts.includes('caf-spec'));

  for (const kind of kinds) {
    const existing = read(dir, `${AGENT_DIR}/caf-${kind}.md`);
    assert.match(existing, /^## Skills$/m, kind);
    assert.ok(!existing.includes(TRACE_REL), `${kind}: no pointer at caf-traceability`);
    assert.equal(existing.includes(SPEC_REL), kind === 'planner', `${kind}: caf-spec`);
  }
  for (const kind of [...KNOWN_KINDS, 'implementation']) {
    const paths = usableSkillPaths(dir, kind);
    assert.ok(!paths.includes(TRACE_REL), kind);
    assert.equal(paths.includes(SPEC_REL), kind === 'planner', kind);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-5 — verify-report format (.caf/workflows/agent-handoff.md)
// ---------------------------------------------------------------------------------------------

// Copy of caf-orchestrator's readVerifyReport() (src/infrastructure/reports/report-reader.ts), as
// locked in test/sdd02-planner-spec.test.js: the whole file is tested, not just the Status line.
const ORCHESTRATOR_VERIFY_STATUS = (raw) => (/\bSUCCESS\b/.test(raw) ? 'SUCCESS' : 'NEEDS_HUMAN');

async function handoffFormat() {
  const md = (await renderMonoSnapshot()).files['.caf/workflows/agent-handoff.md'];
  const lines = md.split('\n');
  const at = lines.indexOf('## Format `verify-report.md`');
  assert.ok(at > 0);
  const open = lines.indexOf('```markdown', at);
  const close = lines.indexOf('```', open + 1);
  return { section: lines.slice(at, lines.indexOf('## Additional Agents (Custom)')).join('\n'), skeleton: lines.slice(open + 1, close) };
}

test('AC-5: verify-report format — five evidence forms per AC: automated-test, command, build-only, manual, none', async () => {
  const { skeleton, section } = await handoffFormat();
  const at = skeleton.indexOf('## Acceptance Criteria');
  assert.ok(at > 0);
  const evidence = skeleton.slice(at + 1, skeleton.indexOf('', at));
  assert.deepEqual(evidence, [
    '- AC-1: automated-test — <file>::<test name>',
    '- AC-2: command — <command> | <exit code or output observed>',
    '- AC-3: build-only — <command that passed>; no test exists for this behavior',
    '- AC-4: manual — <steps a human must run, or steps already run>',
    '- AC-5: none — <why>',
  ]);
  const flat = section.replace(/\s+/g, ' ');
  assert.match(flat, /exactly one of the five forms/);
  assert.match(flat, /`Verify: command:` as `command` with the result observed/);

  // the same five forms, in the same order, as the caf-traceability skill states them
  const inSkill = skillSection(buildTraceabilitySkill(), '## In verify-report.md')
    .filter((l) => l.startsWith('- `AC-n: '))
    .map((l) => l.slice(3, -1));
  assert.equal(inSkill.length, 5);
  assert.deepEqual(evidence.map((l) => l.replace(/^- AC-\d+: /, 'AC-n: ')), inSkill);
});

test('AC-5: verify-report format — "Proposed Spec Changes" is still there and the Status line still reads right for caf-orchestrator', async () => {
  const { skeleton } = await handoffFormat();
  const at = skeleton.indexOf('## Proposed Spec Changes');
  assert.ok(at > skeleton.indexOf('## Acceptance Criteria'));
  assert.equal(skeleton[at + 1], '-');

  assert.equal(skeleton[0], '# Verify Report');
  assert.equal(skeleton[2], 'Status: SUCCESS | NEEDS_HUMAN');
  assert.deepEqual(skeleton.filter((l) => /^Status:/.test(l)), ['Status: SUCCESS | NEEDS_HUMAN']);
  const filled = (status) => skeleton.map((l) => (l.startsWith('Status:') ? `Status: ${status}` : l)).join('\n');
  assert.equal(ORCHESTRATOR_VERIFY_STATUS(filled('SUCCESS')), 'SUCCESS');
  assert.equal(ORCHESTRATOR_VERIFY_STATUS(filled('NEEDS_HUMAN')), 'NEEDS_HUMAN');
});

// ---------------------------------------------------------------------------------------------
// AC-6 — the planner's `## Output`
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-6: planner on ${fixture} — what the code answers is a fact, at most 5 questions in the file, an answered question keeps its tag`, () => {
    const clarify = step(outputOf(fixture), '### 2. Clarify');
    assert.match(clarify, /Whatever you can answer by reading[^.]*is a fact[^.]*never a question/);
    assert.match(clarify, /At most 5 questions in the file/i);
    assert.match(clarify, /Once a question is answered[^.]*keep the question and its original tag; do not delete or retag it/i);
  });

  test(`AC-6: planner on ${fixture} — \`Verify:\` may be \`command:\``, () => {
    const specify = step(outputOf(fixture), '### 1. Specify');
    assert.match(specify, /`Verify:` in one of three forms/);
    for (const form of ['`automated test`', '`command: <command> | expect: <exit code or output>`', '`manual:`']) {
      assert.ok(specify.includes(form), form);
    }
  });

  // Since CAF-SDD-02c the tools line and `## Allowed Tools` differ too (`Glob`, `Grep`); they are
  // put back here and held by test/sdd02c-spec-active.test.js. Since CAF-SDD-02d `## Input`
  // differs as well (three lines, held by test/sdd02d-planner-audit.test.js) and is put back too.
  test(`AC-6: planner on ${fixture} — everything outside \`## Output\` is byte-identical to the SDD-02 render`, () => {
    const old = SDD02_PLANNER[fixture];
    const md = plannerOf(fixture);
    const output = outputOf(fixture);
    assert.notEqual(output, old.sections.Output, 'the Output text did change');
    // put the SDD-02 Output back: the whole file is then the SDD-02 file, byte for byte
    const restored = md
      .replace(NEW_TOOLS_LINE, OLD_TOOLS_LINE)
      .replace(trackedSections(md)['Allowed Tools'], old.sections['Allowed Tools'])
      .replace(trackedSections(md).Input, old.sections.Input)
      .replace(output, old.sections.Output);
    assert.equal(restored, old.content);

    const frontmatter = (text) => text.slice(0, text.indexOf('\n---\n', 4) + 5);
    assert.equal(frontmatter(md).replace(NEW_TOOLS_LINE, OLD_TOOLS_LINE), frontmatter(old.content));
    const now = trackedSections(md);
    for (const header of ['Working Pattern (PIV)', 'Retry Logic']) {
      assert.equal(now[header], old.sections[header], header);
    }
    const body = (text, header) => {
      const { lines, sections } = parseSections(text);
      return sectionBody(lines, sections.find((s) => s.header === header));
    };
    assert.equal(body(md, 'Constraints'), body(old.content, 'Constraints'));
    assert.deepEqual(parseSections(md).sections.map((s) => s.header), parseSections(old.content).sections.map((s) => s.header));
    // inside Output: same contract line, same steps
    assert.equal(output.split('\n')[0], old.sections.Output.split('\n')[0]);
    const headings = (text) => text.split('\n').filter((l) => l.startsWith('### '));
    assert.deepEqual(headings(output), headings(old.sections.Output));
    assert.ok(!/^## /m.test(output) && !/\bTODO\b/.test(output));
  });

  test(`AC-6: only the planner changed on ${fixture}: every other agent is the same file as before`, () => {
    for (const [kind, { content }] of Object.entries(rendered[fixture])) {
      if (kind === 'planner') continue;
      assert.ok(!content.includes('in one of three forms'), kind);
      assert.ok(!content.includes('original tag'), kind);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-8 — curate sync from a planner generated by SDD-02
// ---------------------------------------------------------------------------------------------

/** Temp copy of the fixture: the SDD-02 planner plus every other agent as rendered now, all baselined. */
function repoWithSdd02Planner(fixture, { planner = SDD02_PLANNER[fixture].content, baselineFrom = planner } = {}) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd02b-sync-');
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
  writeManifest(dir, manifest);
  return { dir, others };
}

const sync = (dir, dryRun) => silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
const agentTree = (dir) =>
  Object.fromEntries(Object.entries(snapshotTree(path.join(dir, AGENT_DIR))).filter(([rel]) => rel.endsWith('.md')));

for (const fixture of FIXTURE_NAMES) {
  test(`AC-8: ${fixture} — the SDD-02 planner's \`## Output\` is synced to the new text, no other agent file changes`, async () => {
    const { dir, others } = repoWithSdd02Planner(fixture);
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
    assert.equal(read(dir, PLANNER_REL), syncedOf(fixture), 'the new render, but for the frontmatter sync never writes');
    assert.ok(read(dir, PLANNER_REL).includes('original tag'));
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

    const after = agentTree(dir);
    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(again.updated, []);
    assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
  });

  test(`AC-8: ${fixture} — a planner whose Output the user customized is not overwritten`, async () => {
    const old = SDD02_PLANNER[fixture].content;
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    assert.notEqual(edited, old);
    const { dir } = repoWithSdd02Planner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      // `## Allowed Tools` (CAF-SDD-02c) and `## Input` (CAF-SDD-02d) were not edited, so they
      // are synced; the edited Output is not
      assert.deepEqual(result.drifted, [`${PLANNER_REL}#Allowed Tools`, `${PLANNER_REL}#Input`]);
      assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Output', status: SECTION_STATUS.CONFLICT }]);
      if (dryRun) assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(
      read(dir, PLANNER_REL),
      edited
        .replace(trackedSections(edited)['Allowed Tools'], trackedSections(plannerOf(fixture))['Allowed Tools'])
        .replace(trackedSections(edited).Input, trackedSections(plannerOf(fixture)).Input)
    );
  });

  // The customized section was `## Input` until CAF-SDD-02d changed its template too (an edited
  // Input is a CONFLICT now). `## Retry Logic` is one whose template did not change.
  test(`AC-8: ${fixture} — a customized Retry Logic stays the user's while the untouched Output is synced`, async () => {
    const old = SDD02_PLANNER[fixture].content;
    const swap = (text) => text.replace('retry up to 3x', 'retry up to 2x');
    const edited = swap(old);
    assert.notEqual(edited, old);
    const { dir, others } = repoWithSdd02Planner(fixture, { planner: edited, baselineFrom: old });

    const result = await sync(dir, false);
    assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Retry Logic', status: SECTION_STATUS.CUSTOMIZATION }]);
    assert.deepEqual(result.drifted, DRIFTED);
    assert.equal(read(dir, PLANNER_REL), swap(syncedOf(fixture)));
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, file);
  });
}
