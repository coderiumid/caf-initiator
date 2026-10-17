// CAF-SDD-02e — the planner reads what it claims, and neither puts a reading off nor guesses.
// Only its `## Output` changed, by whole lines inside steps that already exist:
// - Specify: a fact is read before any artifact is written and never handed on to the implementer;
//   a behavior comes from a file opened with `Read` in this run; the related ADRs are read; no
//   sentence says something is still to be read, compared, checked or found out; an unsourced
//   claim is `Assumption A-n:`; a `Finding:` is an observation; the planner's rules win over the
//   open-item line of `caf-no-guess`; an AC with several behaviors is split; where a file path or
//   a symbol name may be written.
// - Tasks: a `tasks.md` that holds tasks ends with `## Coverage`.
// - Before declaring done: the same list, number or term is written the same way everywhere.
// The four lines CAF-SDD-02d wrote about a "not read yet" note are replaced by these rules.
// Every `curate sync` below runs on a temp directory.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { buildSkillsSection, buildToolsSection } from '../src/templates/agent-md.js';
import { buildNoGuessSkill, buildSpecSkill, skillPath } from '../src/templates/skill-md.js';
import { specV4ToV3 } from './helpers/since-10.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { withLiveInput } from './helpers/swap-input.js';
import { sinceSdd05a } from './helpers/since-05a.js';
import { BREAKDOWN_LINES, sinceSdd05b } from './helpers/since-05b.js';
import { swapConstraints } from './helpers/swap-constraints.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { OUTLINE_LINES, sinceSdd06 } from './helpers/since-06.js';
import { sinceSdd11 } from './helpers/since-11.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');
const SPEC_FINAL_SHA256 = 'b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0';
// `caf-no-guess` as it was before this ticket: Q-1 (a) leaves the skill alone.
const NO_GUESS_SHA256 = '4c0f2c1fab4b181d6880ecd0973f313546057d74aa9b8c198257fd5b0e614dc1';

// Recorded before this ticket touched src/ (T2): the planner as CAF-SDD-02d left it. Never regenerated.
const RAW_PLANNER = Object.fromEntries(
  FIXTURE_NAMES.map((f) => [f, JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd02e', `planner.${f}.json`), 'utf8'))])
);

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
// CAF-SDD-03c2 changed the planner's `## Input` after this golden was recorded; this ticket is
// about `## Output`, so the golden is compared with the live Input put in (test/helpers/swap-input.js).
const OLD_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, withLiveInput(RAW_PLANNER[f], rendered[f].planner.content)]));
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
// The text this ticket adds, verbatim, each one a block of whole lines
// ---------------------------------------------------------------------------------------------

// `### 1. Specify`
const RULE_READ_FIRST = [
  '- A fact about the repo that `Read`, `Glob` or `Grep` can answer is read before any artifact is',
  '  written, in this run, and is never handed on: no task in `tasks.md` asks the implementer to',
  '  find out a fact the spec needs. A task may tell the implementer to read the file it is about',
  '  to change.',
];
const RULE_SOURCE = [
  '- Every `Finding:` and every AC that says how a file or a module behaves comes from a file',
  '  opened with `Read` in this run. A summary in `CLAUDE.md`, an ADR, or a file name returned by',
  '  `Glob` shows where to look: it is not the source of a behavior.',
];
const RULE_ADR = [
  '- When `.caf/knowledge/decisions/` holds ADRs, read the ones whose name relates to the subject',
  '  of the ticket and name each one read in a `Finding:`. When a `Glob` result is mostly',
  '  `node_modules` or hidden tool directories, narrow the pattern and run it again.',
];
const RULE_NO_DEFER = [
  '- An artifact never says that something is still to be read, compared, checked or found out,',
  '  in whatever words. What reading can answer is read now; what a human must decide is an open',
  '  question.',
];
const RULE_ASSUMPTION = [
  '- A claim that comes neither from a file read in this run nor from the ticket is written',
  '  `Assumption A-n:` (`A-1`, `A-2`, ...) with what it rests on, never as a `Finding:` and never',
  '  as a fact in an AC. A word of doubt ("maybe", "it seems") is written on an assumption line',
  '  and nowhere else.',
];
const RULE_FINDING = [
  '- A `Finding:` holds only what was observed in the files that were read. A conclusion drawn',
  '  from them, or a prediction of what the code does when it runs, is an assumption.',
];
const RULE_NO_GUESS_SKILL = [
  '- The `caf-no-guess` skill (its item 4) tells an agent to write an open item as a line that',
  '  starts with the to-do word. In the artifacts of this agent the rules above win: no such line',
  '  is written.',
];
const RULE_ONE_BEHAVIOR = ['- An AC that holds more than one behavior is split into one AC per behavior.'];
const RULE_PLACEMENT = [
  '- A file path or a symbol name may be written in a `Finding:`, on an assumption line and on a',
  '  `Verify:` line. It is never written in the outcome, the scope, the decisions or the',
  '  `When ... then` sentence of an AC.',
];
// `### 4. Tasks`
const RULE_COVERAGE = [
  '- A `tasks.md` that holds tasks ends with a part headed `## Coverage`: one line per AC, the AC',
  '  id and the tasks that serve it. Every AC id of `requirements.md` is there.',
];
// `### Before declaring done`
const RULE_CONSISTENT = [
  '- The same list, number or term is written the same way in every artifact. Before ending the',
  '  run, read again the files written in this run and make them agree.',
];

const SPECIFY_BLOCKS = [
  RULE_READ_FIRST,
  RULE_SOURCE,
  RULE_ADR,
  RULE_NO_DEFER,
  RULE_ASSUMPTION,
  RULE_FINDING,
  RULE_NO_GUESS_SKILL,
  RULE_ONE_BEHAVIOR,
  RULE_PLACEMENT,
];
const NEW_OUTPUT_BLOCKS = [...SPECIFY_BLOCKS, RULE_COVERAGE, RULE_CONSISTENT];

// The CAF-SDD-02d rule these replace (A2): its first sentence is kept in RULE_READ_FIRST, the
// "not read yet" note is covered by intent in RULE_NO_DEFER, and what reading cannot settle is no
// longer a `Finding:` that says what is not known — it is an assumption or a question.
const OLD_OUTPUT_LINES = [
  '- A fact about the repo that `Read`, `Glob` or `Grep` can answer is read before it is written',
  '  down. Never leave a note in an artifact that says something was not read yet. What reading',
  '  cannot settle is written as a `Finding:` that says what was looked at and what is not known:',
  '  it makes no claim and asks no question.',
];

// Added by CAF-SDD-03f, after this ticket: the planner's exception for a refactor or config ticket.
const SDD03F_EXCEPTION = [
  '- Exception, on a refactor or config ticket only: the `When ... then` sentence of an AC may name',
  '  the file path or the symbol name that is the subject of the ticket. It may name no other path',
  '  or symbol, and the outcome, the scope and the decisions keep the rule above.',
];

// CAF-SDD-03c2b, after this ticket: the ticket-run rule of Clarify. `OLD` is what the 02d/02e
// render says, `NEW` what the live one says (test/sdd03c2b-planner-clarify.test.js holds the new text).
const SDD03C2B_TICKET_RUN_OLD = [
  '- Ticket run (the headless marker, see Input and Constraints): nobody answers in chat, so stop',
  '  the way this agent already stops there: `requirements.md` with `Status: NEEDS_HUMAN` in',
  '  place of `NEEDS_CLARIFICATION`, plus the blocked `tasks.md` note described in Input. That',
  '  note is not a task breakdown, and a ticket run is the only case where it is written.',
];
const SDD03C2B_TICKET_RUN_NEW = [
  '- Ticket run (the headless marker, see Constraints): nobody answers in chat and the run does',
  '  not wait for an answer. A `BLOCKING` question with no `Answer:` ends it the same way: the',
  '  `requirements.md` with `Status: NEEDS_CLARIFICATION` and that question in it, no `tasks.md`',
  '  of any kind, then stop.',
];

const added = (now, old) => now.split('\n').filter((l) => !old.split('\n').includes(l));

// ---------------------------------------------------------------------------------------------
// AC-1 .. AC-10 — the planner's `## Output`
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  const specify = () => stepLines(outputOf(fixture), '### 1. Specify');

  test(`AC-1: planner on ${fixture} — a Finding or an AC about a behavior comes from a file read in this run; CLAUDE.md, an ADR and a Glob name are pointers`, () => {
    assertBlock(specify(), RULE_SOURCE);
    const text = flat(RULE_SOURCE);
    assert.match(text, /Every `Finding:` and every AC that says how a file or a module behaves comes from a file opened with `Read` in this run/);
    assert.match(text, /A summary in `CLAUDE\.md`, an ADR, or a file name returned by `Glob` shows where to look/);
    assert.match(text, /it is not the source of a behavior\.$/);
  });

  test(`AC-2: planner on ${fixture} — a fact Read/Glob/Grep can answer is read before any artifact is written and never handed on to the implementer`, () => {
    assertBlock(specify(), RULE_READ_FIRST);
    const text = flat(RULE_READ_FIRST);
    assert.match(text, /`Read`, `Glob` or `Grep` can answer is read before any artifact is written/);
    assert.match(text, /never handed on: no task in `tasks\.md` asks the implementer to find out a fact the spec needs/);
    assert.match(text, /A task may tell the implementer to read the file it is about to change\.$/);
  });

  test(`AC-3: planner on ${fixture} — no sentence that puts a reading off, stated by intent; readable is read, a human decision is a question`, () => {
    assertBlock(specify(), RULE_NO_DEFER);
    const text = flat(RULE_NO_DEFER);
    assert.match(text, /An artifact never says that something is still to be read, compared, checked or found out/);
    assert.match(text, /in whatever words/);
    assert.match(text, /What reading can answer is read now; what a human must decide is an open question\.$/);
    // by intent: the rule quotes no phrase to avoid
    assert.ok(!/["“”]/.test(text), 'no list of forbidden phrases');
    // the 02d wording it replaces is gone
    const output = outputOf(fixture);
    for (const line of OLD_OUTPUT_LINES) assert.ok(!output.split('\n').includes(line), line);
    assert.ok(!/what is not known/.test(output));
  });

  test(`AC-4: planner on ${fixture} — an unsourced claim is \`Assumption A-n:\` with its basis; a word of doubt only on an assumption line`, () => {
    assertBlock(specify(), RULE_ASSUMPTION);
    const text = flat(RULE_ASSUMPTION);
    assert.match(text, /comes neither from a file read in this run nor from the ticket is written `Assumption A-n:`/);
    assert.match(text, /with what it rests on, never as a `Finding:` and never as a fact in an AC/);
    assert.match(text, /A word of doubt \("maybe", "it seems"\) is written on an assumption line and nowhere else\.$/);
  });

  test(`AC-5: planner on ${fixture} — a \`Finding:\` holds only what was observed; a conclusion or a prediction is an assumption`, () => {
    assertBlock(specify(), RULE_FINDING);
    const text = flat(RULE_FINDING);
    assert.match(text, /A `Finding:` holds only what was observed in the files that were read/);
    assert.match(text, /A conclusion drawn from them, or a prediction of what the code does when it runs, is an assumption\.$/);
    assert.ok(specify().indexOf(RULE_FINDING[0]) > specify().indexOf(RULE_ASSUMPTION[0]));
  });

  test(`AC-6: planner on ${fixture} — the same list, number or term everywhere, and the files written are read again before the run ends`, () => {
    const done = stepLines(outputOf(fixture), '### Before declaring done');
    assertBlock(done, RULE_CONSISTENT);
    const text = flat(RULE_CONSISTENT);
    assert.match(text, /The same list, number or term is written the same way in every artifact/);
    assert.match(text, /Before ending the run, read again the files written in this run and make them agree\.$/);
    // before the final message rule, which stays the last one
    assert.ok(done.indexOf(RULE_CONSISTENT[0]) < done.findIndex((l) => l.startsWith('- The final message starts')));
  });

  test(`AC-7: planner on ${fixture} — where a path or a symbol name may be written (Q-3), and one AC is one observable behavior`, () => {
    assertBlock(specify(), RULE_PLACEMENT);
    const text = flat(RULE_PLACEMENT);
    assert.match(text, /A file path or a symbol name may be written in a `Finding:`, on an assumption line and on a `Verify:` line/);
    assert.match(text, /never written in the outcome, the scope, the decisions or the `When \.\.\. then` sentence of an AC\.$/);
    // right after the rule it refines
    const at = specify().indexOf(RULE_PLACEMENT[0]);
    assert.equal(specify()[at - 2], '- No implementation detail in the spec (files, functions, libraries): that belongs to');

    assertBlock(specify(), RULE_ONE_BEHAVIOR);
    assert.match(flat(specify()), /One observable behavior per AC\./);
    assert.match(RULE_ONE_BEHAVIOR[0], /more than one behavior is split into one AC per behavior/);
  });

  test(`AC-8: planner on ${fixture} — a \`tasks.md\` that holds tasks ends with \`## Coverage\`, every AC in it (Q-2)`, () => {
    const tasks = stepLines(outputOf(fixture), '### 4. Tasks');
    assertBlock(tasks, RULE_COVERAGE);
    const text = flat(RULE_COVERAGE);
    assert.match(text, /A `tasks\.md` that holds tasks ends with a part headed `## Coverage`/);
    assert.match(text, /one line per AC, the AC id and the tasks that serve it/);
    assert.match(text, /Every AC id of `requirements\.md` is there\.$/);
    // named inline: a line that starts with `## ` would split the tracked section
    assert.ok(!outputOf(fixture).split('\n').some((l) => l.startsWith('## ')));
  });

  test(`AC-9: planner on ${fixture} — the ADRs related to the ticket are read and named in a Finding; a Glob result of mostly node_modules is narrowed`, () => {
    assertBlock(specify(), RULE_ADR);
    const text = flat(RULE_ADR);
    assert.match(text, /When `\.caf\/knowledge\/decisions\/` holds ADRs, read the ones whose name relates to the subject of the ticket/);
    assert.match(text, /name each one read in a `Finding:`/);
    assert.match(text, /a `Glob` result is mostly `node_modules` or hidden tool directories, narrow the pattern and run it again\.$/);
  });

  test(`AC-10: planner on ${fixture} — the planner's rules win over the open-item line of \`caf-no-guess\` (Q-1 a)`, () => {
    assertBlock(specify(), RULE_NO_GUESS_SKILL);
    const text = flat(RULE_NO_GUESS_SKILL);
    assert.match(text, /The `caf-no-guess` skill \(its item 4\) tells an agent to write an open item as a line that starts with the to-do word/);
    assert.match(text, /In the artifacts of this agent the rules above win: no such line is written\.$/);
    // "the rules above": it comes after the rules it refers to
    for (const rule of [RULE_READ_FIRST, RULE_NO_DEFER, RULE_ASSUMPTION, RULE_FINDING]) {
      assert.ok(specify().indexOf(RULE_NO_GUESS_SKILL[0]) > specify().indexOf(rule[0]));
    }
    // the item it names is the one the skill has
    assert.match(buildNoGuessSkill(), /^4\. What you cannot verify becomes an explicit open item/m);
  });

  test(`AC-1..AC-10: planner on ${fixture} — the new text adds no heading, no section boundary and no TODO`, () => {
    const output = outputOf(fixture);
    assert.ok(!/^## /m.test(output) && !/\bTODO\b/.test(output));
    const headings = (text) => text.split('\n').filter((l) => l.startsWith('### '));
    assert.deepEqual(headings(output), headings(OLD_PLANNER[fixture].sections.Output));
    // the whole agent file has the TODO count it had: check-drafts counts the word per agent
    const count = (text) => (text.match(/\bTODO\b/g) || []).length;
    assert.equal(count(plannerOf(fixture)), count(OLD_PLANNER[fixture].content));
  });

  // -------------------------------------------------------------------------------------------
  // AC-11 — nothing else in the planner changed
  // -------------------------------------------------------------------------------------------

  test(`AC-11: planner on ${fixture} — outside \`## Output\` the file is the pre-ticket golden byte for byte`, () => {
    const old = OLD_PLANNER[fixture];
    const md = plannerOf(fixture);
    assert.notEqual(md, old.content);
    assert.notEqual(outputOf(fixture), old.sections.Output);

    // put the old section back: the whole file is then the golden
    // (and `## Constraints`, which CAF-SDD-03c2b changed)
    assert.equal(md.replace(outputOf(fixture), old.sections.Output).replace(bodyOf(md, 'Constraints'), () => bodyOf(old.content, 'Constraints')), old.content);

    const now = trackedSections(md);
    for (const header of ['Allowed Tools', 'Input', 'Working Pattern (PIV)', 'Retry Logic']) assert.equal(now[header], old.sections[header], header);
    assert.equal(inputOf(fixture), old.sections.Input);
    assert.deepEqual(frontmatterTools(md), ['Read', 'Write', 'Glob', 'Grep']);
    assert.deepEqual(frontmatterTools(md), old.tools);
    assert.equal(now['Allowed Tools'], buildToolsSection('planner'));
    assert.deepEqual(parseSections(md).sections.map((s) => s.header), parseSections(old.content).sections.map((s) => s.header));
  });

  test(`AC-11: planner on ${fixture} — inside \`## Output\` only the rules of this ticket are new, and only the 02d "not read yet" rule is gone`, () => {
    const old = { ...OLD_PLANNER[fixture], sections: { ...OLD_PLANNER[fixture].sections } };
    // CAF-SDD-05a replaced three lines of the Plan step (test/sdd05a-caf-design.test.js holds the new
    // text); the golden's Output is read through it, so this comparison still holds the 02e text.
    old.sections.Output = sinceSdd11(sinceSdd06(sinceSdd05b(sinceSdd05a(old.sections.Output)))); // CAF-SDD-06: the contract sentence; CAF-SDD-11: helpers/since-11.js
    // CAF-SDD-05b, after this ticket, added two bullets to Specify (helpers/since-05b.js); the golden is read through them.
    // CAF-SDD-03f added one rule after this ticket (test/sdd03f-stale-text.test.js holds its text);
    // it is taken out here so this comparison still holds the 02e text line for line.
    // CAF-SDD-03c2b replaced the four lines of the ticket-run rule; same treatment.
    // CAF-SDD-06 added the outline line (helpers/since-06.js) after this ticket; same treatment.
    const later = (l) => !SDD03F_EXCEPTION.includes(l) && !SDD03C2B_TICKET_RUN_NEW.includes(l) && !OUTLINE_LINES.includes(l);
    const newLines = added(outputOf(fixture), old.sections.Output).filter(later);
    assert.deepEqual(newLines, NEW_OUTPUT_BLOCKS.flat());
    assert.deepEqual(added(old.sections.Output, outputOf(fixture)).sort(), [...OLD_OUTPUT_LINES, ...SDD03C2B_TICKET_RUN_OLD].sort());
    assert.equal(outputOf(fixture).split('\n')[0], sinceSdd06(old.sections.Output.split('\n')[0]), 'the artifact contract line');
    // every other line is where it was, in the same order
    const kept = (text, gone) => text.split('\n').filter((l) => !gone.includes(l));
    assert.deepEqual(
      kept(outputOf(fixture), [...NEW_OUTPUT_BLOCKS.flat(), ...SDD03F_EXCEPTION, ...SDD03C2B_TICKET_RUN_NEW, ...OUTLINE_LINES]),
      kept(old.sections.Output, [...OLD_OUTPUT_LINES, ...SDD03C2B_TICKET_RUN_OLD])
    );
  });
}

test('AC-11: `caf-spec` and `caf-no-guess` are the files of before this ticket (sha256), and `## Skills` is rendered as it was', () => {
  assert.equal(sha256(specV4ToV3(buildSpecSkill())), SPEC_FINAL_SHA256); // CAF-SDD-10: read as v3
  assert.equal(sha256(buildNoGuessSkill()), NO_GUESS_SHA256);
  const pointers = ['caf-scope-discipline', 'caf-no-guess', 'caf-spec'].map(skillPath);
  assert.equal(sha256(buildSkillsSection(pointers)), '9b69da288f3b9dcb25380fa235bcd0ed7d8c45605cd4f4d5f87b7bb79be9aac7');
});

// ---------------------------------------------------------------------------------------------
// AC-12 — curate sync on the planner CAF-SDD-02d left
// ---------------------------------------------------------------------------------------------

/** Temp copy of the fixture: an older planner plus every other agent as rendered now, all baselined. */
function repoWithOldPlanner(fixture, { planner, baselineFrom = planner }) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd02e-sync-');
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
const DRIFT_OUTPUT = [`${PLANNER_REL}#Output`];

for (const fixture of FIXTURE_NAMES) {
  test(`AC-12: ${fixture} — sync writes \`## Output\` of the 02d planner, nothing else in it, and no other agent file`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const { dir, others } = repoWithOldPlanner(fixture, { planner: old });
    const before = agentTree(dir);

    const dry = await sync(dir, true);
    assert.deepEqual(dry.drifted, DRIFT_OUTPUT);
    assert.deepEqual(dry.updated, []);
    assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

    const real = await sync(dir, false);
    assert.deepEqual(real.drifted, DRIFT_OUTPUT);
    assert.deepEqual(real.needsAttention, []);
    assert.deepEqual(real.unverifiable, []);
    assert.deepEqual(real.updated, [path.join(dir, PLANNER_REL)]);

    // the synced file is the fresh render: only `## Output` differs from the old one
    const now = read(dir, PLANNER_REL);
    // (`## Constraints` is not tracked: CAF-SDD-03c2b changed it and sync leaves the old one)
    assert.equal(now, swapConstraints(plannerOf(fixture), old));
    assert.equal(now.replace(bodyOf(now, 'Output'), bodyOf(old, 'Output')), old);
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

    const after = agentTree(dir);
    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(again.updated, []);
    assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
  });

  test(`AC-12: ${fixture} — a planner whose Output the user customized is not overwritten`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    assert.notEqual(bodyOf(edited, 'Output'), bodyOf(old, 'Output'));
    const { dir, others } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      assert.deepEqual(result.drifted, []);
      assert.deepEqual(result.updated, []);
      assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Output', status: SECTION_STATUS.CONFLICT }]);
      assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(read(dir, PLANNER_REL), edited);
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, file);
  });

  test(`AC-12: ${fixture} — a customized Input is left alone and reads as a customization, while Output is synced`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('### Optional — Layer 1 reference docs', '### Optional — Layer 1 reference docs\n\nOur team: the PRD lives in the wiki.');
    assert.notEqual(bodyOf(edited, 'Input'), bodyOf(old, 'Input'));
    const { dir } = repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });

    const result = await sync(dir, false);
    assert.deepEqual(result.drifted, DRIFT_OUTPUT);
    // `## Input` did not change in this ticket, so an edited one is no conflict
    assert.deepEqual(result.needsAttention.filter((n) => n.status === SECTION_STATUS.CONFLICT), []);
    const now = read(dir, PLANNER_REL);
    assert.equal(bodyOf(now, 'Input'), bodyOf(edited, 'Input'));
    assert.equal(bodyOf(now, 'Output'), outputOf(fixture));
  });
}
