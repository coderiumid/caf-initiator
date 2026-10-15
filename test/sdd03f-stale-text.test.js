// CAF-SDD-03f — text that reaches the user says what the code does.
// - `piv-workflow.md`: the Reviewer token of the Parser Contract is the `Verdict:` value the
//   reviewer template writes; the roles that are not scaffolded are stated flatly; the 3x of the
//   verify retry inside one agent and the orchestrator's retry gate (default 1) are two things.
// - `/caf-run-pipeline`: the frontmatter description names Documentation only when it is rendered.
// - `curate audit`: no optional gap for `caf-feature-catalog-sync.md`.
// - The comments that counted four evidence kinds.
// - Planner `## Output`: one narrow exception to "no path in the `When ... then` sentence".
// `test/fixtures/pre-sdd03f/` is the render from before this ticket (planner, piv-workflow.md,
// /caf-run-pipeline) — never regenerate it. Every `curate` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { curate } from '../src/commands/curate.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { generateDrafts } from '../src/steps/04-generate-drafts.js';
import { buildPivWorkflowMd } from '../src/templates/piv-workflow-md.js';
import { buildRunPipelineMd } from '../src/templates/run-pipeline-command.js';
import { buildSpecSkill } from '../src/templates/skill-md.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { swapConstraints } from './helpers/swap-constraints.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { withLiveInput } from './helpers/swap-input.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd03f');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, name), 'utf8'));
const OLD_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`planner.${f}.json`)]));
const TICKET_RUN_OLD = [
  '- Ticket run (the headless marker, see Input and Constraints): nobody answers in chat, so stop',
  '  the way this agent already stops there: `requirements.md` with `Status: NEEDS_HUMAN` in',
  '  place of `NEEDS_CLARIFICATION`, plus the blocked `tasks.md` note described in Input. That',
  '  note is not a task breakdown, and a ticket run is the only case where it is written.',
];
const TICKET_RUN_NEW = [
  '- Ticket run (the headless marker, see Constraints): nobody answers in chat and the run does',
  '  not wait for an answer. A `BLOCKING` question with no `Answer:` ends it the same way: the',
  '  `requirements.md` with `Status: NEEDS_CLARIFICATION` and that question in it, no `tasks.md`',
  '  of any kind, then stop.',
];
const OLD_PIV = golden('piv-workflow.json');
const OLD_PIPELINE = golden('run-pipeline.json');

const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');
const SPEC_FINAL_SHA256 = 'b8ba383c32579aaa413045b427421484006f36e0873e9ff19935f859536a98d0';
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
// CAF-SDD-03c2 changed the planner's `## Input` after this golden was recorded; this ticket is about
// `## Output`, so the golden is compared with the live Input put in (test/helpers/swap-input.js).
for (const f of FIXTURE_NAMES) OLD_PLANNER[f] = withLiveInput(OLD_PLANNER[f], rendered[f].planner.content);

const renderPiv = (name) => buildPivWorkflowMd({ agentDir: '.claude/agents', qaRetries: null, reviewerRetries: null, ...OLD_PIV[name].input });
// CAF-SDD-03c2 added the spec status section to /caf-run-pipeline (held in
// test/sdd03c2-validator-default.test.js); this ticket's relation to its golden is about the rest.
const SPEC_STATUS_03C2 = /## Spec Status Check[\s\S]*?(?=## 3\. Implementation)/;
const renderPipeline = (name) => buildRunPipelineMd(OLD_PIPELINE[name].input).replace(SPEC_STATUS_03C2, '');

/** `## <header>` of a Markdown file, up to the next `## ` heading. */
function mdSection(md, header) {
  const lines = md.split('\n');
  const start = lines.indexOf(`## ${header}`);
  assert.ok(start >= 0, `"${header}" is in the file`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

// ---------------------------------------------------------------------------------------------
// The text this ticket writes, literally
// ---------------------------------------------------------------------------------------------

const OLD_PATTERN_LINE = '              if it fails → fix and retry (max 3x)';
const NEW_PATTERN_LINE = '              if it fails → fix and retry inside this agent (up to 3x)';
const OLD_IMPL_LINE = '- Implementation (Frontend/Backend): max 3x (CAF.md default), then stop → NEEDS_HUMAN';
const NEW_IMPL_LINE =
  '- Implementation (Frontend/Backend): verify retry inside one agent, up to 3x (CAF.md default), then stop → NEEDS_HUMAN';
const GATE_NOTE = [
  'The 3x above is the verify retry inside one agent. The QA and Reviewer gates are the',
  "orchestrator's retry gates, a separate count (default 1, set by `agents.qa.maxRetries` and",
  '`agents.reviewer.maxRetries`).',
].join('\n');
const OLD_PARSER = [
  'The `Status:` field emitted by each agent (e.g. `PASS`/`NEEDS_HUMAN` for QA,',
  '`READY_FOR_HUMAN_REVIEW`/`NEEDS_CHANGES` for Reviewer) MUST be the exact literal token',
  'the orchestrator parses — no extra wording/qualifiers.',
].join('\n');
const NEW_PARSER = [
  'The `Status:` field emitted by each agent (e.g. `PASS`/`NEEDS_HUMAN` for QA) and the',
  '`Verdict:` line of Reviewer (`APPROVE`, `CHANGES REQUESTED` or `DEFER`) MUST be the exact',
  'literal token the orchestrator parses — no extra wording/qualifiers.',
].join('\n');
const NOT_SCAFFOLDED = ['Documentation', 'PM', 'UX Designer', 'Auditor'];
const oldAbsentLine = (label) =>
  `- [ ] ${label} — NOT present, this project does not generate this agent role (TODO: confirm this is actually correct)`;
const newAbsentLine = (label) => `- [ ] ${label} — not scaffolded, caf-init no longer generates this agent role`;

const OLD_DESCRIPTION = 'Planner → Architect → implementation → Documentation → QA → Reviewer';
const NEW_DESCRIPTION_NO_DOC = 'Planner → Architect → implementation → QA → Reviewer';

const EXCEPTION_RULE = [
  '- Exception, on a refactor or config ticket only: the `When ... then` sentence of an AC may name',
  '  the file path or the symbol name that is the subject of the ticket. It may name no other path',
  '  or symbol, and the outcome, the scope and the decisions keep the rule above.',
];

/** What `piv-workflow.md` was before this ticket, with only this ticket's edits applied. */
function expectedPiv(name) {
  let md = OLD_PIV[name].content;
  const swap = (from, to) => {
    assert.equal(md.split(from).length, 2, `once in the golden: ${from.split('\n')[0]}`);
    md = md.replace(from, to);
  };
  swap(OLD_PATTERN_LINE, NEW_PATTERN_LINE);
  swap(OLD_IMPL_LINE, NEW_IMPL_LINE);
  swap('\n\n## Warning: Parser Contract', `\n\n${GATE_NOTE}\n\n## Warning: Parser Contract`);
  swap(OLD_PARSER, NEW_PARSER);
  for (const label of NOT_SCAFFOLDED) if (md.includes(oldAbsentLine(label))) swap(oldAbsentLine(label), newAbsentLine(label));
  return md;
}

// ---------------------------------------------------------------------------------------------
// AC-1 — the Reviewer token of the Parser Contract is the Verdict the reviewer template writes
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: ${fixture} — the Parser Contract names the \`Verdict:\` values of the rendered reviewer, word for word`, () => {
    const reviewer = rendered[fixture].reviewer.content;
    const line = reviewer.split('\n').find((l) => l.startsWith('Verdict: '));
    assert.ok(line, 'the reviewer template writes a Verdict line');
    const values = line.slice('Verdict: '.length).split(' | ');
    assert.deepEqual(values, ['APPROVE', 'CHANGES REQUESTED', 'DEFER']);

    for (const name of Object.keys(OLD_PIV)) {
      const contract = mdSection(renderPiv(name), 'Warning: Parser Contract');
      for (const value of values) assert.ok(contract.includes(`\`${value}\``), `${name}: ${value}`);
      assert.ok(contract.includes('`Verdict:`'), name);
      assert.ok(!/READY_FOR_HUMAN_REVIEW|NEEDS_CHANGES/.test(renderPiv(name)), `${name}: the old Reviewer tokens are gone`);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-2 — roles that are not scaffolded are stated flatly, with no request for confirmation
// ---------------------------------------------------------------------------------------------

test('AC-2: a role that is not scaffolded is one flat line, and no line of the roster asks for confirmation', () => {
  for (const name of ['mono-pnpm', 'single-nuxt', 'mono-with-retries']) {
    const md = renderPiv(name);
    const roster = mdSection(md, 'Active Agents in This Project');
    for (const label of NOT_SCAFFOLDED) {
      assert.ok(roster.split('\n').includes(newAbsentLine(label)), `${name}: ${label}`);
    }
    assert.ok(!/NOT present/.test(roster), name);
    assert.ok(!/confirm/i.test(roster), name);
    assert.ok(!/TODO/.test(roster), name);
  }
});

test('AC-2: a role that is present is still a checked line', () => {
  const roster = mdSection(renderPiv('all-present'), 'Active Agents in This Project');
  for (const label of ['Planner', 'Architect', 'Frontend', 'Backend', 'QA', 'Reviewer', ...NOT_SCAFFOLDED]) {
    assert.ok(roster.split('\n').includes(`- [x] ${label}`), label);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-3 — two retries, two lines
// ---------------------------------------------------------------------------------------------

test('AC-3: the verify retry inside one agent (up to 3x) and the orchestrator gate (default 1) are stated apart', () => {
  for (const name of Object.keys(OLD_PIV)) {
    const retry = mdSection(renderPiv(name), 'Retry Logic per Gate');
    const lines = retry.split('\n');
    assert.ok(lines.includes(NEW_IMPL_LINE), name);
    assert.ok(retry.includes(GATE_NOTE), name);
    assert.match(retry.replace(/\s+/g, ' '), /verify retry inside one agent, up to 3x/);
    assert.match(retry.replace(/\s+/g, ' '), /orchestrator's retry gates, a separate count \(default 1,/);
    // the 3x is not offered as the gate count (a count read from the config is the user's own)
    if (!OLD_PIV[name].input.reviewerRetries) assert.ok(!/(QA|Reviewer) gate: max 3x/.test(retry), name);
    // and the workflow pattern says where the 3x is spent
    assert.ok(renderPiv(name).includes(NEW_PATTERN_LINE), name);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-4 — /caf-run-pipeline description
// ---------------------------------------------------------------------------------------------

test('AC-4: the description names Documentation only when the pipeline renders that stage', () => {
  for (const name of Object.keys(OLD_PIPELINE)) {
    const description = renderPipeline(name).split('\n').find((l) => l.startsWith('description: '));
    if (name.endsWith('.with-documentation')) {
      assert.ok(description.includes(OLD_DESCRIPTION), name);
    } else {
      assert.ok(description.includes(NEW_DESCRIPTION_NO_DOC), name);
      assert.ok(!/Documentation/.test(description), name);
    }
  }
});

// ---------------------------------------------------------------------------------------------
// AC-5, AC-6 — curate audit and caf-feature-catalog-sync.md
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
const allEntries = (result) => result.layers.flatMap((l) => l.entries);
const mentionsCatalogSync = (result) => /feature-catalog-sync/.test(JSON.stringify(allEntries(result))) || /feature-catalog-sync/.test(result.printed);

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: ${fixture} — \`curate --audit-only\` on a freshly scaffolded repo has no caf-feature-catalog-sync entry`, async () => {
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03f-audit-');
    const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
    await silenced(() => generateDrafts({ dir, dryRun: false, stack, tracker: { tracker: 'Linear' } }));
    assert.ok(!fs.existsSync(path.join(dir, '.claude', 'commands', 'caf-feature-catalog-sync.md')));

    const result = await auditOnly(dir);
    assert.ok(!mentionsCatalogSync(result), 'no entry, in the data or in the printed report');
    assert.ok(!result.optionalGaps.some((g) => /feature-catalog-sync/.test(g.filePath)));
    assert.ok(!(result.printed + JSON.stringify(result.layers)).includes('scaffold feature-catalog-sync'));
  });

  test(`AC-6: ${fixture} — a repo that has caf-feature-catalog-sync.md is audited as before, the other optional documents still reported`, async () => {
    const { dir, commands } = await makeOldRepo(fixture);
    assert.ok(commands.includes('caf-feature-catalog-sync.md'));
    const withFile = await auditOnly(dir);
    assert.ok(!mentionsCatalogSync(withFile));

    // the file is not read by the audit: removing it changes nothing in the report
    fs.rmSync(path.join(dir, '.claude', 'commands', 'caf-feature-catalog-sync.md'));
    const without = await auditOnly(dir);
    assert.deepEqual(without.layers, withFile.layers);
    assert.equal(without.optionalGaps.length, withFile.optionalGaps.length);
    assert.equal(without.exitCode, withFile.exitCode);
    // the optional reference documents are still listed
    assert.ok(withFile.optionalGaps.some((g) => g.filePath === 'docs/testing-strategy.md'));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-7 — the evidence kinds are not counted as four
// ---------------------------------------------------------------------------------------------

test('AC-7: no comment in src or test counts the evidence kinds as four', () => {
  const phrase = ['all', 'four'].join(' ');
  const out = execFileSync('git', ['grep', '-n', '-i', phrase, '--', 'src', 'test'], { cwd: ROOT, encoding: 'utf8' });
  const hits = out.split('\n').filter(Boolean).filter((l) => !l.startsWith('test/fixtures/'));
  // The phrase that is left is about something else; each one is named here with its context.
  const OTHER_CONTEXT = [
    ['src/templates/ticket-preview-commands.js', 'identical across ' + phrase + ' commands'],
    ['src/commands/agents.js', 'Companion commands of the auditor and the PM. Since CAF-SDD-03c1 ' + phrase],
    ['test/skills-scaffold.test.js', 'a repo with ' + phrase + ' scripts'],
  ];
  for (const hit of hits) {
    const known = OTHER_CONTEXT.find(([file]) => hit.startsWith(`${file}:`));
    assert.ok(known, `unexplained: ${hit}`);
    assert.ok(!/evidence|\bkind\b/i.test(hit), hit);
  }
  // and the two comments now say five
  const agentMd = fs.readFileSync(path.join(ROOT, 'src', 'templates', 'agent-md.js'), 'utf8').replace(/\/\/\s*/g, ' ').replace(/\s+/g, ' ');
  assert.equal(agentMd.split('A sixth kind goes in all five or in none.').length, 3, 'two comments say all five');
});

// ---------------------------------------------------------------------------------------------
// AC-8 — the planner's exception
// ---------------------------------------------------------------------------------------------

const outputOf = (fixture) => trackedSections(rendered[fixture].planner.content).Output;
const added = (now, old) => now.split('\n').filter((l) => !old.split('\n').includes(l));

for (const fixture of FIXTURE_NAMES) {
  test(`AC-8: planner on ${fixture} — the exception for a refactor or config ticket is in \`## Output\`, right after the rule it narrows`, () => {
    const lines = outputOf(fixture).split('\n');
    const at = lines.indexOf(EXCEPTION_RULE[0]);
    assert.equal(lines.filter((l) => l === EXCEPTION_RULE[0]).length, 1);
    assert.deepEqual(lines.slice(at, at + EXCEPTION_RULE.length), EXCEPTION_RULE);
    assert.equal(lines[at - 1], '  `When ... then` sentence of an AC.');
    const text = EXCEPTION_RULE.join(' ').replace(/\s+/g, ' ');
    assert.match(text, /on a refactor or config ticket only/);
    assert.match(text, /the `When \.\.\. then` sentence of an AC may name the file path or the symbol name that is the subject of the ticket/);
    assert.match(text, /It may name no other path or symbol/);
    assert.match(text, /the outcome, the scope and the decisions keep the rule above/);
    assert.ok(!/TODO/.test(text));
  });

  test(`AC-8: planner on ${fixture} — the rule for the outcome, the scope, the decisions and the sentence is still there, and the exception is the only new text`, () => {
    const now = outputOf(fixture);
    const flat = now.replace(/\s+/g, ' ');
    assert.match(flat, /It is never written in the outcome, the scope, the decisions or the `When \.\.\. then` sentence of an AC\./);
    const old = OLD_PLANNER[fixture].sections.Output;
    // CAF-SDD-03c2b, after this ticket, replaced the four lines of the ticket-run rule of Clarify
    // (test/sdd03c2b-planner-clarify.test.js holds the new text)
    assert.deepEqual(added(now, old), [...EXCEPTION_RULE, ...TICKET_RUN_NEW]);
    assert.deepEqual(added(old, now), TICKET_RUN_OLD);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-9 — the rest of the planner is the golden, byte for byte
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-9: planner on ${fixture} — outside \`## Output\` the file is the pre-ticket golden, and \`caf-spec\` keeps its hash`, () => {
    const old = OLD_PLANNER[fixture];
    const now = rendered[fixture].planner.content;
    assert.notEqual(outputOf(fixture), old.sections.Output);
    // (`## Constraints` too: CAF-SDD-03c2b changed it)
    assert.equal(swapConstraints(now.replace(outputOf(fixture), old.sections.Output), old.content), old.content);
    // the sections the AC names are not just "somewhere else": each is equal on its own too
    const nowSections = trackedSections(now);
    for (const header of Object.keys(old.sections)) {
      if (header === 'Output') continue;
      assert.equal(nowSections[header], old.sections[header], header);
    }
    assert.equal(sha256(buildSpecSkill()), SPEC_FINAL_SHA256);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-10 — curate sync from the pre-ticket planner
// ---------------------------------------------------------------------------------------------

/** Temp copy of the fixture: a planner plus every other agent as rendered now, all baselined. */
function repoWithPlanner(fixture, { planner, baselineFrom = planner }) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03f-sync-');
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
  test(`AC-10: ${fixture} — sync of the pre-ticket planner writes \`## Output\` with the new text and nothing else`, async () => {
    const { dir, others } = repoWithPlanner(fixture, { planner: OLD_PLANNER[fixture].content });
    const before = agentTree(dir);

    const dry = await sync(dir, true);
    assert.deepEqual(dry.drifted, [`${PLANNER_REL}#Output`]);
    assert.deepEqual(dry.updated, []);
    assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

    const real = await sync(dir, false);
    assert.deepEqual(real.drifted, [`${PLANNER_REL}#Output`]);
    assert.deepEqual(real.needsAttention, []);
    assert.deepEqual(real.updated, [path.join(dir, PLANNER_REL)]);

    const now = read(dir, PLANNER_REL);
    // (`## Constraints` is not tracked: CAF-SDD-03c2b changed it and sync leaves the old one)
    assert.equal(now, swapConstraints(rendered[fixture].planner.content, OLD_PLANNER[fixture].content));
    assert.ok(now.includes(EXCEPTION_RULE.join('\n')));
    assert.equal(now.replace(outputOf(fixture), OLD_PLANNER[fixture].sections.Output), OLD_PLANNER[fixture].content);
    for (const { file, content } of others) assert.equal(read(dir, path.join(AGENT_DIR, file)), content, `${file} must stay byte-identical`);

    const after = agentTree(dir);
    const again = await sync(dir, false);
    assert.deepEqual(again.drifted, []);
    assert.deepEqual(agentTree(dir), after, 'second run is a no-op');
  });

  test(`AC-10: ${fixture} — a planner whose Output the user customized is not overwritten`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    assert.notEqual(edited, old);
    const { dir, others } = repoWithPlanner(fixture, { planner: edited, baselineFrom: old });
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
}

// ---------------------------------------------------------------------------------------------
// AC-11 — piv-workflow.md and /caf-run-pipeline: only the named text changed
// ---------------------------------------------------------------------------------------------

test('AC-11: piv-workflow.md is the pre-ticket golden with only the edits of AC-1 to AC-3 applied, for every roster', () => {
  for (const name of Object.keys(OLD_PIV)) {
    assert.equal(renderPiv(name), expectedPiv(name), name);
    assert.notEqual(renderPiv(name), OLD_PIV[name].content, name);
  }
});

test('AC-11: the lines of piv-workflow.md that mention a gate with no known retry count keep their text', () => {
  // the unconfirmed-count lines are not part of AC-1 to AC-3 and are byte-identical
  const md = renderPiv('mono-pnpm');
  assert.ok(md.includes('- QA gate: TODO: retry count for QA not yet confirmed, check orchestrator'));
  assert.ok(md.includes('- Reviewer gate: TODO: retry count for Reviewer not yet confirmed, check orchestrator'));
  assert.ok(renderPiv('mono-with-retries').includes('- QA gate: max 2x (source: caf.config.yml agents.qa.maxRetries)'));
});

test('AC-11: /caf-run-pipeline with Documentation is the golden byte for byte; without it only the description changed', () => {
  for (const name of Object.keys(OLD_PIPELINE)) {
    const old = OLD_PIPELINE[name].content;
    if (name.endsWith('.with-documentation')) {
      assert.equal(renderPipeline(name), old, name);
    } else {
      assert.equal(old.split(OLD_DESCRIPTION).length, 2, name);
      assert.equal(renderPipeline(name), old.replace(OLD_DESCRIPTION, NEW_DESCRIPTION_NO_DOC), name);
    }
  }
});
