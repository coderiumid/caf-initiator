// CAF-SDD-02d — the planner is stricter and uses one status convention, and `curate audit` warns
// about the two parts of a rollout that `curate sync` does not carry.
// - Planner `## Output`: read a fact before writing it and leave no "not read yet" note, no
//   placeholder section, no `tasks.md` at all while a BLOCKING question is unanswered, the refusal
//   to change an approved spec is the first line of `verify-report.md`, the final message starts
//   with a plain `Status:` line, an `automated test` AC names its test file.
// - Planner `## Input`: the status of `requirements.md` is a `Status:` line, not a heading.
// - `curate audit`: a warning for a frontmatter `tools:` that differs from the kind's template,
//   and one for an active skill of the kind that `## Skills` does not point at. Warnings only.
// Every `scaffold skills`, `curate audit` and `curate sync` below runs on a temp directory.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import { curate } from '../src/commands/curate.js';
import { skillsTarget } from '../src/commands/skills.js';
import { buildSkillsSection, buildToolsSection } from '../src/templates/agent-md.js';
import { buildSpecSkill, skillPath } from '../src/templates/skill-md.js';
import { specV4ToV3 } from './helpers/since-10.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { BREAKDOWN_LINES } from './helpers/since-05b.js';
import { constraintsBody, swapConstraints } from './helpers/swap-constraints.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { sinceSdd06 } from './helpers/since-06.js';

// CAF-SDD-05b put two bullets (8 lines, helpers/since-05b.js) in front of this rule in Specify.
const SDD05B_SPECIFY_LINES = BREAKDOWN_LINES.length;
const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');
const SPEC_REL = skillPath('caf-spec');
const TRACE_REL = skillPath('caf-traceability');
const SPEC_FINAL_SHA256 = 'b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0';

// Recorded before this ticket touched src/ (T2): the planner as CAF-SDD-02c left it. Never regenerated.
const OLD_PLANNER = Object.fromEntries(
  FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd02d', `planner.${f}.json`), 'utf8'))])
);

// The planner as this ticket left it, recorded before CAF-SDD-02e touched src/. Never regenerated.
// CAF-SDD-02e replaced RULE_READ_FACTS (its first sentence is kept, the rest is restated by
// intent — test/sdd02e-planner-read.test.js holds that), so the comparisons that need this
// ticket's own text line for line are made against this render, not against the live one.
const SDD02D_PLANNER = Object.fromEntries(
  FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd02e', `planner.${f}.json`), 'utf8'))])
);

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const plannerOf = (fixture) => rendered[fixture].planner.content;
const outputOf = (fixture) => trackedSections(plannerOf(fixture)).Output;
const inputOf = (fixture) => trackedSections(plannerOf(fixture)).Input;

const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};
const flat = (lines) => lines.join(' ').replace(/\s+/g, ' ');

/** The lines of `### <heading>` up to the next `### ` heading. */
function stepLines(body, heading) {
  const lines = body.split('\n');
  const start = lines.indexOf(heading);
  assert.ok(start >= 0, `"${heading}" is in the planner section`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('### '));
  return end === -1 ? rest : rest.slice(0, end);
}

/** `block` is in `lines`, as whole consecutive lines, exactly once. */
function assertBlock(lines, block) {
  const starts = lines.flatMap((l, i) => (l === block[0] ? [i] : []));
  assert.equal(starts.length, 1, `once: ${block[0]}`);
  assert.deepEqual(lines.slice(starts[0], starts[0] + block.length), block);
}

// ---------------------------------------------------------------------------------------------
// The text this ticket adds or rewrites, verbatim, each one a block of whole lines
// ---------------------------------------------------------------------------------------------

// `## Output`, `### 1. Specify`
const RULE_READ_FACTS = [
  '- A fact about the repo that `Read`, `Glob` or `Grep` can answer is read before it is written',
  '  down. Never leave a note in an artifact that says something was not read yet. What reading',
  '  cannot settle is written as a `Finding:` that says what was looked at and what is not known:',
  '  it makes no claim and asks no question.',
];
const RULE_STATUS_LINE = [
  '- The status of `requirements.md` is one plain line, `Status: <value>`, never a heading. The',
  '  values are `DRAFT`, `NEEDS_CLARIFICATION`, `APPROVED` and `NEEDS_HUMAN`. A spec written with',
  '  no open `BLOCKING` question is `Status: DRAFT`.',
];
const RULE_EMPTY_SECTION = [
  '- A section with nothing to say is written `Tidak ada`. Never a placeholder: not `- -`, not an',
  '  empty section, not `TBD`.',
];
const RULE_NAMED_TEST = [
  '- An AC with `Verify: automated test` names the test file, or the task in `tasks.md` that',
  '  creates that file.',
];
// `### 2. Clarify`
const RULE_NO_TASKS = [
  '- `BLOCKING` and unanswered: set `Status: NEEDS_CLARIFICATION` in `requirements.md` and stop.',
  '  Do not go on to Plan or Tasks, and do not write `tasks.md` at all while a `BLOCKING` question',
  '  is unanswered (it has no `Answer:`): no task breakdown, no placeholder, no marker line.',
];
const RULE_TICKET_RUN = [
  '- Ticket run (the headless marker, see Input and Constraints): nobody answers in chat, so stop',
  '  the way this agent already stops there: `requirements.md` with `Status: NEEDS_HUMAN` in',
  '  place of `NEEDS_CLARIFICATION`, plus the blocked `tasks.md` note described in Input. That',
  '  note is not a task breakdown, and a ticket run is the only case where it is written.',
];
// `### An approved spec is a contract`
const RULE_APPROVED_SPEC = [
  '- Asked to change the content of a `requirements.md` that says `Status: APPROVED`: do not write',
  '  `requirements.md`, not even its status line. Write the proposed change in `verify-report.md`',
  '  under `## Proposed Spec Changes`, keeping what that file already holds, then stop. The status',
  '  of that refusal is the first line of `verify-report.md`, `Status: NEEDS_HUMAN`: it is written',
  '  in that file, never in `requirements.md`.',
];
// `### Before declaring done`
const RULE_FINAL_MESSAGE = [
  '- The final message starts with one plain line, `Status: <value>`: no bold, no backticks, no',
  '  heading mark, nothing before it. The value is the status this run ended on, one of `DRAFT`,',
  '  `NEEDS_CLARIFICATION`, `APPROVED` and `NEEDS_HUMAN`, the same words the artifacts use.',
];
const NEW_OUTPUT_BLOCKS = [
  RULE_READ_FACTS,
  RULE_STATUS_LINE,
  RULE_EMPTY_SECTION,
  RULE_NAMED_TEST,
  RULE_NO_TASKS,
  RULE_TICKET_RUN,
  RULE_APPROVED_SPEC,
  RULE_FINAL_MESSAGE,
];
// The lines of the pre-ticket `## Output` that the blocks above replace (the rest of each block
// was already there).
const OLD_OUTPUT_LINES = [
  '  Do not go on to Plan or Tasks, and do not write the task breakdown in `tasks.md` while a',
  '  `BLOCKING` question is unanswered.',
  '  note is not a task breakdown.',
  '  under `## Proposed Spec Changes`, keeping what that file already holds, then stop with',
  '  `Status: NEEDS_HUMAN`.',
];

// `## Input`: the two places that named the status of `requirements.md` as a heading.
const NEW_INPUT_LINES = [
  '     `requirements.md` as usual, with the `Status:` line described in Output — unaffected by',
  '     headless or not, no need to show anything in chat first.',
  '     human will answer. Generate `requirements.md` directly with `Status: NEEDS_HUMAN`,',
];
const OLD_INPUT_LINES = [
  '     `requirements.md` with `## Status: PLAN` as usual — unaffected by headless or not, no',
  '     need to show anything in chat first.',
  '     human will answer. Generate `requirements.md` directly with `## Status: NEEDS_HUMAN`,',
];

const added = (now, old) => now.split('\n').filter((l) => !old.split('\n').includes(l));

// CAF-SDD-03c2 removed the "Fallback — Discovery draft without a ticket" flow from `## Input` (it
// pointed at a folder and a command no scaffold writes any more). The three lines this ticket
// changed in `## Input` were all inside it, so what is left to compare against the 02d render is
// that render without the flow: from its heading up to the next one.
const FALLBACK_HEADING = '### Fallback — Discovery draft without a ticket';
const NEXT_HEADING = '### Optional — Layer 1 reference docs';
const dropFallback = (text) => {
  const lines = text.split('\n');
  const from = lines.indexOf(FALLBACK_HEADING);
  const to = lines.indexOf(NEXT_HEADING);
  assert.ok(from >= 0 && to > from, 'the 02d Input has the flow');
  return [...lines.slice(0, from), ...lines.slice(to)].join('\n');
};

// ---------------------------------------------------------------------------------------------
// AC-1 .. AC-6 — the planner's `## Output`
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: planner on ${fixture} — a fact Read/Glob/Grep can answer is read first, no "not read yet" note, the rest is a \`Finding:\``, () => {
    // the rule as this ticket wrote it, in the 02d render
    const specify = stepLines(SDD02D_PLANNER[fixture].sections.Output, '### 1. Specify');
    assertBlock(specify, RULE_READ_FACTS);
    // what is left of it since CAF-SDD-02e: a fact is still read first, in the same place
    const live = stepLines(outputOf(fixture), '### 1. Specify');
    assert.equal(live.indexOf('- A fact about the repo that `Read`, `Glob` or `Grep` can answer is read before any artifact is'), specify.indexOf(RULE_READ_FACTS[0]) + SDD05B_SPECIFY_LINES);
    const text = flat(RULE_READ_FACTS);
    assert.match(text, /`Read`, `Glob` or `Grep` can answer is read before it is written down/);
    assert.match(text, /Never leave a note in an artifact that says something was not read yet/);
    assert.match(text, /cannot settle is written as a `Finding:`/);
    assert.match(text, /makes no claim and asks no question/);
  });

  test(`AC-2: planner on ${fixture} — a section with nothing to say is written \`Tidak ada\`, never a placeholder`, () => {
    const specify = stepLines(outputOf(fixture), '### 1. Specify');
    assertBlock(specify, RULE_EMPTY_SECTION);
    const text = flat(RULE_EMPTY_SECTION);
    assert.match(text, /nothing to say is written `Tidak ada`/);
    for (const placeholder of ['`- -`', 'empty section', '`TBD`']) assert.ok(text.includes(placeholder), placeholder);
  });

  test(`AC-3: planner on ${fixture} — no \`tasks.md\` at all while a BLOCKING question has no \`Answer:\`; the 02d ticket-run stop is replaced by CAF-SDD-03c2b`, () => {
    const clarify = stepLines(outputOf(fixture), '### 2. Clarify');
    assertBlock(clarify, RULE_NO_TASKS);
    const text = flat(RULE_NO_TASKS);
    assert.match(text, /do not write `tasks\.md` at all while a `BLOCKING` question is unanswered/);
    assert.match(text, /it has no `Answer:`/);
    assert.match(text, /no task breakdown, no placeholder, no marker line/);
    // The 02d ticket-run rule (`NEEDS_HUMAN` plus a blocked `tasks.md` note, named as the only
    // exception) was in the 02d render and is not in the live one: CAF-SDD-03c2b replaced it, and
    // test/sdd03c2b-planner-clarify.test.js holds the new text.
    assertBlock(stepLines(SDD02D_PLANNER[fixture].sections.Output, '### 2. Clarify'), RULE_TICKET_RUN);
    assert.match(flat(RULE_TICKET_RUN), /a ticket run is the only case where it is written/);
    assert.ok(!clarify.includes(RULE_TICKET_RUN[0]), 'live: the blocked-note rule is gone');
  });

  test(`AC-4: planner on ${fixture} — the refusal to change an approved spec is \`Status: NEEDS_HUMAN\` on the first line of \`verify-report.md\`, never in \`requirements.md\``, () => {
    const contract = stepLines(outputOf(fixture), '### An approved spec is a contract');
    assertBlock(contract, RULE_APPROVED_SPEC);
    const text = flat(RULE_APPROVED_SPEC);
    assert.match(text, /do not write `requirements\.md`, not even its status line/);
    assert.match(text, /Write the proposed change in `verify-report\.md` under `## Proposed Spec Changes`/);
    assert.match(text, /the first line of `verify-report\.md`, `Status: NEEDS_HUMAN`/);
    assert.match(text, /written in that file, never in `requirements\.md`\.$/);
  });

  test(`AC-5: planner on ${fixture} — the final message starts with a plain \`Status: <value>\` line, values of the artifacts`, () => {
    const done = stepLines(outputOf(fixture), '### Before declaring done');
    assertBlock(done, RULE_FINAL_MESSAGE);
    const text = flat(RULE_FINAL_MESSAGE);
    assert.match(text, /^- The final message starts with one plain line, `Status: <value>`/);
    assert.match(text, /no bold, no backticks, no heading mark, nothing before it/);
    // one set of values, the one the status line of requirements.md is given
    const values = (block) => [...flat(block).matchAll(/`([A-Z_]{5,})`/g)].map((m) => m[1]).filter((v) => v !== 'BLOCKING');
    assert.deepEqual(values(RULE_FINAL_MESSAGE), ['DRAFT', 'NEEDS_CLARIFICATION', 'APPROVED', 'NEEDS_HUMAN']);
    assert.deepEqual(values(RULE_STATUS_LINE), values(RULE_FINAL_MESSAGE));
  });

  test(`AC-6: planner on ${fixture} — an \`automated test\` AC names the test file or the task that creates it`, () => {
    const specify = stepLines(outputOf(fixture), '### 1. Specify');
    assertBlock(specify, RULE_NAMED_TEST);
    assert.match(flat(RULE_NAMED_TEST), /`Verify: automated test` names the test file, or the task in `tasks\.md` that creates that file/);
  });

  test(`AC-1..AC-6: planner on ${fixture} — the new text adds no heading, no section boundary and no TODO`, () => {
    const output = outputOf(fixture);
    assert.ok(!/^## /m.test(output) && !/\bTODO\b/.test(output));
    const headings = (text) => text.split('\n').filter((l) => l.startsWith('### '));
    assert.deepEqual(headings(output), headings(OLD_PLANNER[fixture].sections.Output));
    assert.deepEqual(headings(inputOf(fixture)), headings(OLD_PLANNER[fixture].sections.Input).filter((h) => h !== FALLBACK_HEADING));
  });

  // -------------------------------------------------------------------------------------------
  // AC-7 — one status convention
  // -------------------------------------------------------------------------------------------

  test(`AC-7: planner on ${fixture} — \`## Input\` and \`## Output\` name the status of \`requirements.md\` as a \`Status:\` line, no heading`, () => {
    const input = inputOf(fixture);
    const output = outputOf(fixture);
    for (const section of [input, output]) {
      assert.ok(!section.includes('## Status'), 'no `## Status` heading as a status');
      assert.ok(!/Status: PLAN\b/.test(section), '`PLAN` is not a status');
    }
    assert.ok(!plannerOf(fixture).includes('## Status'));
    // The three Input lines of this ticket were inside the flow CAF-SDD-03c2 removed: they are in
    // the 02d render, and not in the live one.
    for (const line of NEW_INPUT_LINES) {
      assert.ok(SDD02D_PLANNER[fixture].sections.Input.split('\n').includes(line), `02d render: ${line}`);
      assert.ok(!input.split('\n').includes(line), `live: ${line}`);
    }

    assertBlock(stepLines(output, '### 1. Specify'), RULE_STATUS_LINE);
    assert.match(flat(RULE_STATUS_LINE), /one plain line, `Status: <value>`, never a heading/);
    // every status the two sections name is one of the four
    const named = new Set([...output.matchAll(/Status: ([A-Z_]+)/g)].map((m) => m[1]));
    assert.deepEqual([...named].sort(), ['APPROVED', 'DRAFT', 'NEEDS_CLARIFICATION', 'NEEDS_HUMAN']);
  });

  // -------------------------------------------------------------------------------------------
  // AC-8 — nothing else in the planner changed
  // -------------------------------------------------------------------------------------------

  test(`AC-8: planner on ${fixture} — outside \`## Input\` and \`## Output\` the file is the pre-ticket golden byte for byte`, () => {
    const old = OLD_PLANNER[fixture];
    const md = plannerOf(fixture);
    assert.notEqual(md, old.content);
    assert.notEqual(inputOf(fixture), old.sections.Input);
    assert.notEqual(outputOf(fixture), old.sections.Output);

    // put the two old sections back: the whole file is then the golden
    // (and `## Constraints`, which CAF-SDD-03c2b changed)
    const restored = md
      .replace(inputOf(fixture), old.sections.Input)
      .replace(outputOf(fixture), old.sections.Output)
      .replace(constraintsBody(md), () => constraintsBody(old.content));
    assert.equal(restored, old.content);

    const now = trackedSections(md);
    for (const header of ['Allowed Tools', 'Working Pattern (PIV)', 'Retry Logic']) assert.equal(now[header], old.sections[header], header);
    assert.deepEqual(frontmatterTools(md), ['Read', 'Write', 'Glob', 'Grep']);
    assert.deepEqual(frontmatterTools(md), old.tools);
    assert.equal(now['Allowed Tools'], buildToolsSection('planner'));
    assert.deepEqual(parseSections(md).sections.map((s) => s.header), parseSections(old.content).sections.map((s) => s.header));
  });

  test(`AC-8: planner on ${fixture} — inside the two sections only the rules of this ticket and the status wording changed`, () => {
    const old = OLD_PLANNER[fixture];
    // `## Output`: every line that is new belongs to one of the blocks, every line that is gone is
    // listed. Compared on the 02d render: CAF-SDD-02e added lines of its own to the live one.
    const output02d = SDD02D_PLANNER[fixture].sections.Output;
    const newLines = added(output02d, old.sections.Output);
    const blockLines = NEW_OUTPUT_BLOCKS.flat();
    for (const line of newLines) assert.ok(blockLines.includes(line), `unexpected new line in Output: ${line}`);
    assert.deepEqual(added(old.sections.Output, output02d), OLD_OUTPUT_LINES);
    // and of those blocks, the live Output lacks only the one CAF-SDD-02e replaced and the ticket-run
    // rule CAF-SDD-03c2b replaced
    const live = outputOf(fixture).split('\n');
    assert.deepEqual(blockLines.filter((l) => !live.includes(l)).sort(), [...RULE_READ_FACTS, ...RULE_TICKET_RUN].sort());
    assert.equal(outputOf(fixture).split('\n')[0], sinceSdd06(old.sections.Output.split('\n')[0]), 'the artifact contract line');

    // `## Input`: three lines, the ones that named the status as a heading, in the 02d render ...
    const input02d = SDD02D_PLANNER[fixture].sections.Input;
    assert.deepEqual(added(input02d, old.sections.Input), NEW_INPUT_LINES);
    assert.deepEqual(added(old.sections.Input, input02d), OLD_INPUT_LINES);
    assert.equal(input02d.split('\n').length, old.sections.Input.split('\n').length);
    // ... and the live Input is that render without the flow CAF-SDD-03c2 removed.
    assert.equal(inputOf(fixture), dropFallback(input02d));
  });
}

test('AC-8: `caf-spec` is the same file as before this ticket (sha256), and `## Skills` is rendered as it was', () => {
  assert.equal(sha256(specV4ToV3(buildSpecSkill())), SPEC_FINAL_SHA256); // CAF-SDD-10: read as v3
  const pointers = ['caf-scope-discipline', 'caf-no-guess', 'caf-spec'].map(skillPath);
  assert.equal(sha256(buildSkillsSection(pointers)), '9b69da288f3b9dcb25380fa235bcd0ed7d8c45605cd4f4d5f87b7bb79be9aac7');
});

// ---------------------------------------------------------------------------------------------
// AC-9 — curate sync on the planner CAF-SDD-02c left
// ---------------------------------------------------------------------------------------------

/** Temp copy of the fixture: an older planner plus every other agent as rendered now, all baselined. */
function repoWithOldPlanner(fixture, { planner, baselineFrom = planner }) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd02d-sync-');
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
const DRIFT_BOTH = [`${PLANNER_REL}#Input`, `${PLANNER_REL}#Output`];

for (const fixture of FIXTURE_NAMES) {
  test(`AC-9: ${fixture} — sync writes \`## Input\` and \`## Output\` of the 02c planner, nothing else in it, and no other agent file`, async () => {
    const old = OLD_PLANNER[fixture].content;
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

    // the synced file is the fresh render: only the two sections differ from the old one
    // (`## Constraints` is not tracked: CAF-SDD-03c2b changed it and sync leaves the old one)
    assert.equal(read(dir, PLANNER_REL), swapConstraints(plannerOf(fixture), old));
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

    const after = agentTree(dir);
    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(again.updated, []);
    assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
  });

  test(`AC-9: ${fixture} — a planner whose Input and Output the user customized is not overwritten`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old
      .replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.')
      .replace('### Optional — Layer 1 reference docs', '### Optional — Layer 1 reference docs\n\nOur team: the PRD lives in the wiki.');
    assert.notEqual(bodyOf(edited, 'Output'), bodyOf(old, 'Output'));
    assert.notEqual(bodyOf(edited, 'Input'), bodyOf(old, 'Input'));
    const { dir } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      assert.deepEqual(result.drifted, []);
      assert.deepEqual(result.updated, []);
      assert.deepEqual(result.needsAttention, [
        { file: PLANNER_REL, header: 'Input', status: SECTION_STATUS.CONFLICT },
        { file: PLANNER_REL, header: 'Output', status: SECTION_STATUS.CONFLICT },
      ]);
      assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(read(dir, PLANNER_REL), edited);
  });

  test(`AC-9: ${fixture} — a customized Output stays the user's while the untouched Input is synced`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    const { dir, others } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });

    const result = await sync(dir, false);
    assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Output', status: SECTION_STATUS.CONFLICT }]);
    assert.deepEqual(result.drifted, [`${PLANNER_REL}#Input`]);
    const now = read(dir, PLANNER_REL);
    assert.equal(bodyOf(now, 'Output'), bodyOf(edited, 'Output'));
    assert.equal(bodyOf(now, 'Input'), inputOf(fixture));
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, file);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-10 .. AC-12 — the two warnings of `curate audit`
// ---------------------------------------------------------------------------------------------

/** `curate --audit-only` on `dir`: the result, what it printed, and the exit code it left. */
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

/** `scaffold skills` on `dir`, answering every "add `## Skills` to <agent>?" prompt with `answer`. */
async function scaffoldSkills(dir, answer) {
  prompts.inject(Array(40).fill(answer));
  try {
    return await silenced(() => skillsTarget({ dir }));
  } finally {
    prompts._injected.length = 0;
  }
}

const warningsOf = (result, check) => result.warnings.filter((w) => !check || w.check === check);
const layer2 = (result) => result.layers.find((l) => l.name.startsWith('Layer 2')).entries;
const edit = (dir, rel, fn) => fs.writeFileSync(path.join(dir, rel), fn(read(dir, rel)), 'utf8');
const OLD_POINTERS = ['caf-scope-discipline', 'caf-no-guess'].map(skillPath);
const withOldSkills = (content) => {
  const anchor = '\n## Constraints\n';
  assert.equal(content.split(anchor).length, 2);
  return content.replace(anchor, `${buildSkillsSection(OLD_POINTERS)}${anchor}`);
};

for (const fixture of FIXTURE_NAMES) {
  test(`AC-12: ${fixture} — a clean scaffold has no warning and the audit report of before this ticket, with or without skills`, async () => {
    const recorded = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd03c1', `curate-old-repo.${fixture}.json`), 'utf8'));
    const { dir } = await makeOldRepo(fixture);

    const plain = await auditOnly(dir);
    assert.deepEqual(plain.warnings, []);
    // the report recorded before CAF-SDD-03c1 for this very repo: same layers, entry for entry
    assert.equal(plain.requiredGaps.length, recorded.audit.requiredGaps);
    assert.equal(plain.declined.length, recorded.audit.declined);
    assert.deepEqual(JSON.parse(JSON.stringify(plain.layers).split(JSON.stringify(dir).slice(1, -1)).join('<repo>')), recorded.audit.layers);
    assert.deepEqual(plain.sectionCounts, recorded.audit.sectionCounts);
    assert.deepEqual(layer2(plain).filter((e) => e.status === 'warn'), []);
    assert.equal(plain.exitCode, plain.requiredGaps.length > 0 ? 1 : undefined);
    assert.ok(!/warning/i.test(plain.printed), 'nothing about warnings is printed');

    // skills written and every pointer accepted: still nothing to warn about
    const skills = await scaffoldSkills(dir, true);
    assert.ok(skills.pointers.added.length > 0);
    const withSkills = await auditOnly(dir);
    assert.deepEqual(withSkills.warnings, []);
    assert.equal(withSkills.exitCode, plain.exitCode);
    assert.equal(withSkills.requiredGaps.length, plain.requiredGaps.length);
  });

  test(`AC-10: ${fixture} — a frontmatter \`tools:\` that differs from the kind's template is a warning naming the file, the tools now and the template's`, async () => {
    const { dir } = await makeOldRepo(fixture);
    const clean = await auditOnly(dir);
    assert.deepEqual(warningsOf(clean, 'tools'), []);

    edit(dir, PLANNER_REL, (md) => md.replace('tools: [Read, Write, Glob, Grep]', 'tools: [Read, Write]'));
    const before = snapshotTree(dir);
    const result = await auditOnly(dir);
    assert.deepEqual(snapshotTree(dir), before, 'audit writes nothing');

    const warnings = warningsOf(result);
    assert.equal(warnings.length, 1);
    const [w] = warnings;
    assert.equal(w.check, 'tools');
    assert.equal(w.filePath, PLANNER_REL);
    assert.match(w.message, /frontmatter `tools:` is `\[Read, Write\]`/);
    assert.match(w.message, /template for kind `planner` has `\[Read, Write, Glob, Grep\]`/);
    assert.match(w.message, /by hand/);
    // printed, in the layer of the agent definitions, as a warning and not as a gap
    assert.ok(result.printed.includes(`${PLANNER_REL} — ${w.message}`) || result.printed.includes(w.message));
    assert.deepEqual(layer2(result).filter((e) => e.status === 'warn').map((e) => e.filePath), [PLANNER_REL]);
    assert.match(result.printed, /1 warning\(s\)/);

    // Q-3: a warning, never a gap; the exit code is what it was
    assert.equal(result.exitCode, clean.exitCode);
    assert.equal(result.requiredGaps.length, clean.requiredGaps.length);
    assert.equal(result.declined.length, clean.declined.length);
    assert.deepEqual(result.sectionCounts, clean.sectionCounts);
  });

  test(`AC-10: ${fixture} — tools in another order are the same list; an agent file of no known kind is not compared, only reported`, async () => {
    const { dir } = await makeOldRepo(fixture);
    edit(dir, PLANNER_REL, (md) => md.replace('tools: [Read, Write, Glob, Grep]', 'tools: [Grep, Glob, Write, Read]'));
    fs.writeFileSync(path.join(dir, AGENT_DIR, 'security.md'), '---\nname: security\ntools: [Read]\n---\n\n# Agent: Security\n\n## Role\nx\n');
    const result = await auditOnly(dir);
    // CAF-SDD-03g: no `tools` warning for either file; the unknown one gets its own, single warning (no section entry).
    assert.deepEqual(warningsOf(result, 'tools'), []);
    assert.deepEqual(warningsOf(result).map((w) => [w.check, w.filePath]), [['unknown-kind', path.join(AGENT_DIR, 'security.md')]]);
  });

  test(`AC-11: ${fixture} — an active skill of the agent's kind that \`## Skills\` does not point at is a warning naming agent, skill and the manual step`, async () => {
    const { dir } = await makeOldRepo(fixture);
    // skills on disk, every pointer declined; then the planner is given the two pointers it had before 02c
    await scaffoldSkills(dir, false);
    edit(dir, PLANNER_REL, withOldSkills);
    const clean = await auditOnly(await makeOldRepo(fixture).then((r) => r.dir));
    const before = snapshotTree(dir);
    const result = await auditOnly(dir);
    assert.deepEqual(snapshotTree(dir), before, 'audit writes nothing');

    const planner = warningsOf(result, 'skill-pointer').filter((w) => w.filePath === PLANNER_REL);
    assert.equal(planner.length, 1);
    assert.match(planner[0].message, new RegExp(`no pointer to \`${SPEC_REL.replaceAll('.', '\\.')}\``));
    assert.match(planner[0].message, /kind `planner`/);
    assert.match(planner[0].message, /add the pointer line to `## Skills` by hand/);
    assert.ok(result.printed.includes(planner[0].message));

    // an agent with no `## Skills` at all is told the command that adds the section
    const noSection = warningsOf(result, 'skill-pointer').filter((w) => w.filePath !== PLANNER_REL);
    assert.ok(noSection.length > 0);
    for (const w of noSection) assert.match(w.message, /`caf-init scaffold skills`/);

    // a skill that still has its DRAFT banner is never asked for
    assert.ok(read(dir, TRACE_REL).includes('> DRAFT'));
    for (const w of result.warnings) assert.ok(!w.message.includes('caf-traceability'), w.message);
    assert.deepEqual(warningsOf(result, 'tools'), []);

    // Q-3: warnings only
    assert.equal(result.exitCode, clean.exitCode);
    assert.equal(result.requiredGaps.length, clean.requiredGaps.length);
    assert.equal(result.declined.length, clean.declined.length);
  });

  test(`AC-11: ${fixture} — put the DRAFT banner back on \`caf-spec\` and the planner's warning is gone; add the pointer and it is gone too`, async () => {
    const { dir } = await makeOldRepo(fixture);
    await scaffoldSkills(dir, false);
    edit(dir, PLANNER_REL, withOldSkills);
    const spec = read(dir, SPEC_REL);
    const ofPlanner = (result) => warningsOf(result, 'skill-pointer').filter((w) => w.filePath === PLANNER_REL);

    edit(dir, SPEC_REL, (md) => md.replace('\n# caf-spec', '\n> DRAFT: not tested yet.\n\n# caf-spec'));
    assert.deepEqual(ofPlanner(await auditOnly(dir)), []);

    fs.writeFileSync(path.join(dir, SPEC_REL), spec, 'utf8');
    assert.equal(ofPlanner(await auditOnly(dir)).length, 1);
    edit(dir, PLANNER_REL, (md) => md.replace(`- \`${OLD_POINTERS[1]}\``, `- \`${OLD_POINTERS[1]}\`\n- \`${SPEC_REL}\``));
    assert.deepEqual(ofPlanner(await auditOnly(dir)), []);
  });
}
