// CAF-SDD-02c — `caf-spec` is active (no DRAFT banner) and the planner is pointed at it. The
// planner also gets `Glob` and `Grep` (frontmatter and `## Allowed Tools`, one map) and two rules
// in `## Output`: read the files that already exist before writing, and never write an approved
// `requirements.md` — the proposal goes to `verify-report.md` and the run stops.
// `caf-traceability` stays a DRAFT. `curate sync` carries `## Output` and `## Allowed Tools` to a
// planner generated earlier; `## Skills` and the frontmatter are not synced.
// Every `scaffold skills` and `curate sync` below runs on a temp directory.

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
import { buildSkillsSection, buildToolsSection } from '../src/templates/agent-md.js';
import { buildSpecSkill, buildTraceabilitySkill, buildSkillFiles, skillPath, hasSkillDraftBanner, hasSkillDraftAgentNotice } from '../src/templates/skill-md.js';
import { KNOWN_KINDS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, makeRepo, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { constraintsBody, swapConstraints } from './helpers/swap-constraints.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { sinceSdd06 } from './helpers/since-06.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const SPEC_REL = skillPath('caf-spec');
const TRACE_REL = skillPath('caf-traceability');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');
const PLANNER_POINTERS = ['caf-scope-discipline', 'caf-no-guess', 'caf-spec'].map(skillPath);

// sha256 of .ai/tasks/CAF-SDD-02c/caf-spec.source.v3-final.md, a file of 77 lines that ends with
// one newline. `.ai/` is not committed, so the hash is what proves the skill is its source, byte
// for byte.
const SPEC_FINAL_SHA256 = 'b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0';
// caf-traceability is not touched by this ticket: still the v2 source (no trailing newline there).
const TRACE_V2_SHA256 = 'a1a89ede52d423f20d5df08111988dbaef97e27460a715767ce54ddc437d536c';
const BANNER = [
  '> DRAFT: this skill has not been tested with real agent dispatches yet.',
  '> Remove this banner only after that test is done.',
  '> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.',
];

// Literal on purpose: the frontmatter `tools:` of every kind, and the sha256 of its
// `## Allowed Tools` body as rendered before this ticket. Only the planner row changed.
const TOOLS = {
  planner: ['Read', 'Write', 'Glob', 'Grep'],
  architect: ['Read', 'Write'],
  frontend: ['Read', 'Write', 'Edit', 'Bash'],
  backend: ['Read', 'Write', 'Edit', 'Bash'],
  implementer: ['Read', 'Write', 'Edit', 'Bash'],
  qa: ['Read', 'Write', 'Bash'],
  reviewer: ['Read', 'Write', 'Bash'],
  validator: ['Read', 'Write', 'Bash'],
  documentation: ['Read', 'Write', 'Edit'],
  auditor: ['Read', 'Bash'],
  devops: ['Read', 'Bash'],
  pm: ['Read', 'Write'],
  'ux-designer': ['Read', 'Write'],
};
const ALLOWED_TOOLS_SHA256_BEFORE = {
  architect: '003583690964f306fd1a6a277c71c715441d703e91327dd23187152a8f428d21',
  frontend: 'b9fb058a0e5a42cb80cdea7dd564cbf6153a5ec273c1a5ac830cc5e7c3fe7942',
  backend: 'b9fb058a0e5a42cb80cdea7dd564cbf6153a5ec273c1a5ac830cc5e7c3fe7942',
  implementer: 'b9fb058a0e5a42cb80cdea7dd564cbf6153a5ec273c1a5ac830cc5e7c3fe7942',
  qa: '2eda5bcbc0e7e14d67fde94b7de984cb2b0a48139a13bfff32e965a4e221eb98',
  reviewer: '7280681b670f3b969d9a8e05a8e969b2fe3d41abe967af84af213c4a6ecd21e9',
  documentation: '82e1ac91098b2f986d1dcbba8fe7538c64dc91c2fa92ec0bc57f5028b9f1be92',
  auditor: '3886fdb0cb3ff06c546df65fbdc8f65128951bae920f274d562ceba250b9634b',
  pm: 'f9a0b73388bc79e880e0f8d0a7ff34e88b5c75a7b90d238ca7c09a4ee459043a',
  'ux-designer': 'f9a0b73388bc79e880e0f8d0a7ff34e88b5c75a7b90d238ca7c09a4ee459043a',
  devops: '45b4ffcc83752f793478412de0082e8a200a5062e3e949298286e50da2e31066',
  validator: 'af455094ec6cb19d3b5782f888cc1e9f7994eeecc62675f2c06df9e3f63ed78c',
  implementation: 'b9fb058a0e5a42cb80cdea7dd564cbf6153a5ec273c1a5ac830cc5e7c3fe7942',
};

// The planner's `## Allowed Tools`: the two lines that changed, verbatim.
const PLANNER_TOOLS_LIST = 'The frontmatter `tools` above is the list that applies: `Read`, `Write`, `Glob`, `Grep`.';
const PLANNER_TOOLS_RATIONALE =
  'Read, Glob and Grep (read-only) for ticket/docs context and facts about the repo, Write for artifacts in `.caf/tasks/{TICKET-ID}/`. Does NOT touch code.';

// The two rules added to the planner's `## Output`, verbatim, each one a block of whole lines.
const RULE_READ_FIRST = [
  '- Before writing anything, read the files that already exist in the task folder:',
  '  `requirements.md`, `tasks.md`, `verify-report.md`. A file that is there is the starting point;',
  '  never write over one you have not read in this run.',
];
// Its last sentence was "then stop with `Status: NEEDS_HUMAN`." until CAF-SDD-02d said where that
// status is written (the first line of `verify-report.md`).
const RULE_APPROVED_SPEC = [
  '- Asked to change the content of a `requirements.md` that says `Status: APPROVED`: do not write',
  '  `requirements.md`, not even its status line. Write the proposed change in `verify-report.md`',
  '  under `## Proposed Spec Changes`, keeping what that file already holds, then stop. The status',
  '  of that refusal is the first line of `verify-report.md`, `Status: NEEDS_HUMAN`: it is written',
  '  in that file, never in `requirements.md`.',
];

const golden = (folder) =>
  Object.fromEntries(FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, folder, `planner.${f}.json`), 'utf8'))]));
// Recorded before this ticket touched src/ (T2): the planner as CAF-SDD-02b left it. Never regenerated.
const SDD02B_PLANNER = golden('pre-sdd02c');
// The planner as CAF-SDD-02 left it (recorded by 02b). Never regenerated.
const SDD02_PLANNER = golden('pre-sdd02b');

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const plannerOf = (fixture) => rendered[fixture].planner.content;
const outputOf = (fixture) => trackedSections(plannerOf(fixture)).Output;

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const runSkills = (opts) => silenced(() => skillsTarget(opts));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const pointersIn = (md) => [...md.matchAll(/^- `([^`]+\/SKILL\.md)`$/gm)].map((m) => m[1]);
const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};
const toolsLine = (text) => text.match(/^tools: \[.*\]$/m)[0];
const without = (text, block) => {
  const joined = `${block.join('\n')}\n`;
  assert.equal(text.split(joined).length, 2, `the block is there exactly once: ${block[0]}`);
  return text.replace(joined, '');
};

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

/** The lines of `### <heading>` up to the next `### ` heading. */
function stepLines(body, heading) {
  const lines = body.split('\n');
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `"${heading}" is in the planner's "## Output"`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('### '));
  return end === -1 ? rest : rest.slice(0, end);
}
const flat = (lines) => lines.join(' ').replace(/\s+/g, ' ');

// ---------------------------------------------------------------------------------------------
// AC-1 — caf-spec without the banner, caf-traceability still a DRAFT
// ---------------------------------------------------------------------------------------------

function assertActiveSpec(md) {
  assert.equal(sha256(md), SPEC_FINAL_SHA256);
  assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
  assert.equal(md.split('\n').length - 1, 77);
  assert.deepEqual(md.split('\n').filter((l) => l.startsWith('>')), [], 'no blockquote line, so no `> DRAFT` line');
  assert.ok(!hasSkillDraftBanner(md) && !hasSkillDraftAgentNotice(md));
}

function assertDraftTraceability(md) {
  assert.equal(sha256(md.slice(0, -1)), TRACE_V2_SHA256);
  const lines = md.split('\n');
  assert.deepEqual(lines.filter((l) => l.startsWith('>')), BANNER);
  const at = lines.indexOf(BANNER[0]);
  assert.deepEqual(lines.slice(at - 1, at + 4), ['', ...BANNER, '']);
  assert.ok(hasSkillDraftBanner(md) && hasSkillDraftAgentNotice(md));
}

test('AC-1: caf-spec is the final v3 source byte for byte (sha256), 77 lines, no DRAFT banner; caf-traceability keeps its 3-line banner', () => {
  assertActiveSpec(buildSpecSkill());
  assertDraftTraceability(buildTraceabilitySkill());
  for (const mode of ['SINGLE_REPO', 'MONOREPO']) {
    const files = buildSkillFiles({ mode, verifyApps: [] });
    assert.equal(files.find((f) => f.name === 'caf-spec').draft, false);
    assert.equal(files.find((f) => f.name === 'caf-traceability').draft, true);
  }
});

test('AC-1: scaffold skills in an empty test repo writes that caf-spec, and caf-traceability with its banner', async () => {
  const dir = makeRepo({ 'package.json': { name: 'empty' } }, 'caf-sdd02c-empty-');
  const result = await runSkills({ dir });
  assert.ok(result.written.includes(path.join(dir, SPEC_REL)));
  assertActiveSpec(read(dir, SPEC_REL));
  assertDraftTraceability(read(dir, TRACE_REL));
  assert.ok(!result.drafts.includes('caf-spec'));
  assert.ok(result.drafts.includes('caf-traceability'));
});

// ---------------------------------------------------------------------------------------------
// AC-2 — the planner is pointed at caf-spec by the generator's banner rule
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-2: planner on ${fixture} — \`## Skills\` has three imperative Read pointers, check-drafts has no new FAIL`, async () => {
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd02c-pointer-');
    fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
    fs.writeFileSync(path.join(dir, PLANNER_REL), plannerOf(fixture));
    const before = await check(dir);

    prompts.inject([true]);
    const result = await runSkills({ dir });
    prompts._injected.length = 0;
    assert.deepEqual(result.pointers.added, [path.join(dir, PLANNER_REL)]);

    // what a planner generated now is given, and what an existing one without `## Skills` got
    assert.deepEqual(usableSkillPaths(dir, 'planner'), PLANNER_POINTERS);
    const md = read(dir, PLANNER_REL);
    const skills = bodyOf(md, 'Skills');
    assert.deepEqual(pointersIn(skills), PLANNER_POINTERS);
    assert.equal(skills, bodyOf(`${buildSkillsSection(PLANNER_POINTERS)}\n## End\n`, 'Skills'));
    assert.match(skills, /^MANDATORY FIRST STEP: before you write any answer or call any other tool, call `Read` once for EACH skill file listed below/);
    assert.ok(!md.includes(TRACE_REL));

    const after = await check(dir);
    assert.equal(after.fails, before.fails);
    assert.equal(after.fails, 0, JSON.stringify(after.findings.filter((f) => f.level === 'FAIL')));
    assert.deepEqual(after.findings.filter((f) => f.file === SPEC_REL), []);
  });
}

test('AC-2: caf-spec is pointed at by the planner only, and no kind is pointed at caf-traceability', async () => {
  const dir = makeRepo({ 'package.json': { name: 'r', scripts: { lint: 'x', typecheck: 'x', test: 'x', build: 'x' } }, 'pnpm-lock.yaml': '' }, 'caf-sdd02c-kinds-');
  await runSkills({ dir });
  for (const kind of [...KNOWN_KINDS, 'implementation']) {
    const paths = usableSkillPaths(dir, kind);
    assert.equal(paths.includes(SPEC_REL), kind === 'planner', kind);
    assert.ok(!paths.includes(TRACE_REL), kind);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-3 — tools
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-3: frontmatter \`tools:\` on ${fixture} match the literal table; the planner has Read, Write, Glob, Grep and no Bash or Edit`, () => {
    for (const [kind, { content }] of Object.entries(rendered[fixture])) {
      assert.ok(TOOLS[kind], `${kind} is in the table`);
      assert.deepEqual(frontmatterTools(content), TOOLS[kind], kind);
    }
    assert.match(plannerOf(fixture), /^tools: \[Read, Write, Glob, Grep\]$/m);
    const tools = frontmatterTools(plannerOf(fixture));
    assert.ok(!tools.includes('Bash') && !tools.includes('Edit'));
  });

  test(`AC-3: planner on ${fixture} — \`## Allowed Tools\` lists the four tools, Glob and Grep read-only`, () => {
    const lines = trackedSections(plannerOf(fixture))['Allowed Tools'].split('\n');
    assert.equal(lines[0], PLANNER_TOOLS_LIST);
    assert.equal(lines[2], PLANNER_TOOLS_RATIONALE);
    assert.match(lines[2], /Glob and Grep \(read-only\)/);
    assert.ok(!/`Bash`|`Edit`/.test(lines.join('\n')));
  });
}

test('AC-3: `## Allowed Tools` of every other kind is what it was before this ticket', () => {
  const kinds = [...KNOWN_KINDS, 'implementation'].filter((k) => k !== 'planner');
  assert.deepEqual([...kinds].sort(), Object.keys(ALLOWED_TOOLS_SHA256_BEFORE).sort());
  for (const kind of kinds) {
    // CAF-SDD-03e put the validator's command rules in its `## Allowed Tools` (locked in
    // test/sdd03e-validator-commands.test.js and test/fixtures/pre-sdd03e/); the hash above stays
    // the one recorded before CAF-SDD-02c.
    if (kind === 'validator') assert.notEqual(sha256(buildToolsSection(kind)), ALLOWED_TOOLS_SHA256_BEFORE[kind], kind);
    else assert.equal(sha256(buildToolsSection(kind)), ALLOWED_TOOLS_SHA256_BEFORE[kind], kind);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-4 — the two rules in the planner's `## Output`
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-4: planner on ${fixture} — read the files that already exist before writing`, () => {
    const specify = stepLines(outputOf(fixture), '### 1. Specify');
    assert.deepEqual(specify.slice(0, RULE_READ_FIRST.length), RULE_READ_FIRST, 'the first thing Specify says');
    const text = flat(RULE_READ_FIRST);
    assert.match(text, /^- Before writing anything, read the files that already exist in the task folder/);
    for (const file of ['`requirements.md`', '`tasks.md`', '`verify-report.md`']) assert.ok(text.includes(file), file);
  });

  test(`AC-4: planner on ${fixture} — an approved spec is not written: proposal in verify-report.md, stop with NEEDS_HUMAN`, () => {
    const contract = stepLines(outputOf(fixture), '### An approved spec is a contract');
    const at = contract.indexOf(RULE_APPROVED_SPEC[0]);
    assert.ok(at > 0);
    assert.deepEqual(contract.slice(at, at + RULE_APPROVED_SPEC.length), RULE_APPROVED_SPEC);
    const text = flat(RULE_APPROVED_SPEC);
    assert.match(text, /`requirements\.md` that says `Status: APPROVED`: do not write `requirements\.md`/);
    assert.match(text, /Write the proposed change in `verify-report\.md` under `## Proposed Spec Changes`/);
    assert.match(text, /then stop\. The status of that refusal is the first line of `verify-report\.md`, `Status: NEEDS_HUMAN`/);
  });

  test(`AC-4: planner on ${fixture} — the new text adds no section boundary, no TODO, no heading`, () => {
    const output = outputOf(fixture);
    assert.ok(!/^## /m.test(output) && !/\bTODO\b/.test(output));
    const headings = (text) => text.split('\n').filter((l) => l.startsWith('### '));
    assert.deepEqual(headings(output), headings(SDD02B_PLANNER[fixture].sections.Output));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-5 — nothing else in the planner changed
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  // CAF-SDD-02d changed `## Input` (three lines) and added rules to `## Output`, so "Output minus
  // the two rules is the old Output" no longer holds line for line: that comparison is made
  // against the 02c render in test/sdd02d-planner-audit.test.js. What stays here: the two rules
  // are there once each, and with the three tracked sections put back the file is the golden.
  test(`AC-5: planner on ${fixture} — outside the tools line, two lines of \`## Allowed Tools\`, \`## Input\` and \`## Output\`, the file is the pre-ticket golden byte for byte`, () => {
    const old = SDD02B_PLANNER[fixture];
    const md = plannerOf(fixture);
    assert.notEqual(md, old.content);

    const output = outputOf(fixture);
    assert.notEqual(without(without(output, RULE_READ_FIRST), RULE_APPROVED_SPEC), output);
    assert.equal(output.split('\n')[0], sinceSdd06(old.sections.Output.split('\n')[0]));

    // `## Allowed Tools`: the list line and the rationale line, nothing else
    const tools = trackedSections(md)['Allowed Tools'].split('\n');
    const oldTools = old.sections['Allowed Tools'].split('\n');
    assert.equal(tools.length, oldTools.length);
    assert.deepEqual(tools.flatMap((l, i) => (l === oldTools[i] ? [] : [i])), [0, 2]);

    // put the three old parts back: the whole file is then the golden
    const restored = md
      .replace(toolsLine(md), toolsLine(old.content))
      .replace(trackedSections(md)['Allowed Tools'], old.sections['Allowed Tools'])
      .replace(trackedSections(md).Input, old.sections.Input)
      .replace(output, old.sections.Output)
      .replace(constraintsBody(md), () => constraintsBody(old.content)); // CAF-SDD-03c2b changed it
    assert.equal(restored, old.content);

    const now = trackedSections(md);
    for (const header of ['Working Pattern (PIV)', 'Retry Logic']) assert.equal(now[header], old.sections[header], header);
    assert.deepEqual(parseSections(md).sections.map((s) => s.header), parseSections(old.content).sections.map((s) => s.header));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6 — curate sync on a planner generated earlier
// ---------------------------------------------------------------------------------------------

const OLD_POINTERS = ['caf-scope-discipline', 'caf-no-guess'].map(skillPath);
/** An older planner as it is in a repo that ran `scaffold skills`: `## Skills` with the two pointers it had. */
const withOldSkills = (content) => {
  const anchor = '\n## Constraints\n';
  assert.equal(content.split(anchor).length, 2);
  return content.replace(anchor, `${buildSkillsSection(OLD_POINTERS)}${anchor}`);
};

/** Temp copy of the fixture: an older planner plus every other agent as rendered now, all baselined. */
function repoWithOldPlanner(fixture, { planner, baselineFrom = planner }) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd02c-sync-');
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
// `## Input` drifts as well since CAF-SDD-02d (test/sdd02d-planner-audit.test.js).
const DRIFT_BOTH = [`${PLANNER_REL}#Allowed Tools`, `${PLANNER_REL}#Input`, `${PLANNER_REL}#Output`];

const OLD_PLANNERS = [
  { label: 'the 02b planner', of: (fixture) => SDD02B_PLANNER[fixture].content },
  { label: 'the SDD-02 planner', of: (fixture) => SDD02_PLANNER[fixture].content },
];

for (const fixture of FIXTURE_NAMES) {
  for (const { label, of } of OLD_PLANNERS) {
    test(`AC-6: ${fixture}, ${label} — sync writes \`## Output\` and \`## Allowed Tools\`; \`## Skills\`, the frontmatter and every other agent stay`, async () => {
      const old = withOldSkills(of(fixture));
      const { dir, others } = repoWithOldPlanner(fixture, { planner: old });
      const before = agentTree(dir);

      const dry = await sync(dir, true);
      assert.deepEqual(dry.drifted, DRIFT_BOTH);
      assert.deepEqual(dry.updated, []);
      assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

      const real = await sync(dir, false);
      assert.deepEqual(real.drifted, DRIFT_BOTH);
      assert.deepEqual(real.needsAttention, []);
      assert.deepEqual(real.unverifiable, []);
      assert.deepEqual(real.updated, [path.join(dir, PLANNER_REL)]);

      const now = read(dir, PLANNER_REL);
      const fresh = plannerOf(fixture);
      assert.equal(bodyOf(now, 'Output'), bodyOf(fresh, 'Output'));
      assert.equal(bodyOf(now, 'Allowed Tools'), bodyOf(fresh, 'Allowed Tools'));
      // the two things sync does not carry: a manual rollout step
      assert.equal(bodyOf(now, 'Skills'), bodyOf(old, 'Skills'));
      assert.deepEqual(pointersIn(now), OLD_POINTERS);
      assert.ok(!now.includes(SPEC_REL));
      assert.equal(toolsLine(now), 'tools: [Read, Write]');
      // and the whole file is the fresh render but for those two
      // (`## Constraints` is not tracked: CAF-SDD-03c2b changed it and sync leaves the old one)
      assert.equal(now, swapConstraints(withOldSkills(fresh).replace(toolsLine(fresh), 'tools: [Read, Write]'), old));
      for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

      const after = agentTree(dir);
      const again = await sync(dir, false);
      assert.deepEqual(again.drifted, []);
      assert.deepEqual(again.updated, []);
      assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
    });
  }

  test(`AC-6: ${fixture} — a planner whose Output and Allowed Tools the user customized is not overwritten`, async () => {
    const old = withOldSkills(SDD02B_PLANNER[fixture].content);
    const edited = old
      .replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.')
      .replace('Does NOT touch code.', 'Does NOT touch code. Our team: no MCP server.');
    assert.notEqual(bodyOf(edited, 'Output'), bodyOf(old, 'Output'));
    assert.notEqual(bodyOf(edited, 'Allowed Tools'), bodyOf(old, 'Allowed Tools'));
    const { dir } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      // the untouched `## Input` is synced since CAF-SDD-02d; the two edited sections are not
      assert.deepEqual(result.drifted, [`${PLANNER_REL}#Input`]);
      assert.deepEqual(result.needsAttention, [
        { file: PLANNER_REL, header: 'Allowed Tools', status: SECTION_STATUS.CONFLICT },
        { file: PLANNER_REL, header: 'Output', status: SECTION_STATUS.CONFLICT },
      ]);
      if (dryRun) assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(read(dir, PLANNER_REL), edited.replace(bodyOf(edited, 'Input'), bodyOf(plannerOf(fixture), 'Input')));
  });

  test(`AC-6: ${fixture} — a customized Output stays the user's while the untouched Allowed Tools is synced`, async () => {
    const old = withOldSkills(SDD02B_PLANNER[fixture].content);
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    const { dir, others } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });

    const result = await sync(dir, false);
    assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Output', status: SECTION_STATUS.CONFLICT }]);
    assert.deepEqual(result.drifted, [`${PLANNER_REL}#Allowed Tools`, `${PLANNER_REL}#Input`]);
    const now = read(dir, PLANNER_REL);
    assert.equal(bodyOf(now, 'Output'), bodyOf(edited, 'Output'));
    assert.equal(bodyOf(now, 'Allowed Tools'), bodyOf(plannerOf(fixture), 'Allowed Tools'));
    assert.equal(bodyOf(now, 'Skills'), bodyOf(old, 'Skills'));
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, file);
  });
}
