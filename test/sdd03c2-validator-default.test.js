// CAF-SDD-03c2 — the validator and /caf-plan are in the default scaffold; the commands and the
// reviewer know the SDD reports; the text that pointed at what is no longer scaffolded is gone.
//
// `test/fixtures/pre-sdd03c2/` is the render from before this ticket (default file set, five
// commands, INDEX.md, planner, reviewer, /caf-run-pipeline) — never regenerate it. Every `curate`
// and every scaffold below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import * as AGENTS from '../src/commands/agents.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { curate } from '../src/commands/curate.js';
import { skillsTarget } from '../src/commands/skills.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { buildPlanMd } from '../src/templates/plan-command.js';
import { buildRunPipelineMd } from '../src/templates/run-pipeline-command.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { renderDefaultFileSet } from './helpers/default-file-set.js';
import { renderCommands } from './helpers/commands-render.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, renderAgents } from './helpers/frozen-kinds.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd03c2');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, name), 'utf8'));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

const PIPELINE = golden('run-pipeline.json');
const ANSI = /\u001b\[[0-9;]*m/g;

/** `{ lines }` printed by `fn` (colour codes removed), console.log restored afterwards. */
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

/** `## <header>` of a Markdown file, up to the next `## ` heading, fence-aware. */
function mdSections(md) {
  const out = [{ header: null, lines: [] }];
  let inFence = false;
  for (const line of md.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && /^## /.test(line)) out.push({ header: line.slice(3), lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out.map(({ header, lines }) => ({ header, body: lines.join('\n') }));
}
const sectionOf = (md, pattern) => mdSections(md).find((s) => s.header && pattern.test(s.header));

// ---------------------------------------------------------------------------------------------
// AC-1, AC-2 — the default scaffold
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1/AC-2: ${fixture} — the default scaffold has caf-validator in place of caf-qa and gains caf-plan, nothing else`, async () => {
    const old = golden(`file-set.${fixture}.json`);
    const now = await renderDefaultFileSet({ fixture });

    assert.deepEqual(now.offered, old.offered.map((k) => (k === 'qa' ? 'validator' : k)));
    assert.deepEqual(now.agents, old.agents.map((f) => (f === 'caf-qa.md' ? 'caf-validator.md' : f)).sort());
    assert.deepEqual(now.commands, [...old.commands, 'caf-plan.md'].sort());
    assert.deepEqual(
      now.files,
      old.files
        .map((f) => (f === '.claude/agents/caf-qa.md' ? '.claude/agents/caf-validator.md' : f))
        .concat('.claude/commands/caf-plan.md')
        .sort()
    );
    assert.deepEqual(now.cafDirs, old.cafDirs);
  });
}

test('AC-1: the roster named by the ticket, per stack', async () => {
  const mono = (await renderDefaultFileSet({ fixture: 'mono-pnpm' })).agents;
  assert.deepEqual(mono, ['caf-architect.md', 'caf-backend.md', 'caf-frontend.md', 'caf-planner.md', 'caf-reviewer.md', 'caf-validator.md']);
  const single = (await renderDefaultFileSet({ fixture: 'single-nuxt' })).agents;
  assert.deepEqual(single, ['caf-architect.md', 'caf-implementer.md', 'caf-planner.md', 'caf-reviewer.md', 'caf-validator.md']);
});

// ---------------------------------------------------------------------------------------------
// AC-3 — a repo that already has caf-qa.md
// ---------------------------------------------------------------------------------------------

const QA_NOTE = /caf-orchestrator will use caf-validator/;

async function scaffoldValidatorOnly(dir) {
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const validator = AGENTS.buildSingleRepoCandidates(stack.apps[0], [], 'implementer').find((c) => c.kind === 'validator');
  assert.ok(validator, 'validator is a candidate');
  prompts.inject([[validator]]);
  try {
    return await printed(() => AGENTS.agents({ dir, dryRun: false }));
  } finally {
    prompts._injected.length = 0;
  }
}

for (const [label, qaContent] of [
  ['a generated caf-qa.md', null],
  ['a customized caf-qa.md', '---\nname: caf-qa\n---\n\n# my own QA agent\n\nDo not touch.\n'],
]) {
  test(`AC-3: ${label} is left byte-for-byte, caf-validator.md is written, one note is printed`, async () => {
    const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c2-qa-');
    const qa = path.join(dir, AGENT_DIR, 'caf-qa.md');
    fs.mkdirSync(path.dirname(qa), { recursive: true });
    const content = qaContent ?? (await renderAgents('single-nuxt')).qa.content;
    fs.writeFileSync(qa, content);

    const lines = await scaffoldValidatorOnly(dir);

    assert.equal(fs.readFileSync(qa, 'utf8'), content, 'caf-qa.md is identical');
    assert.ok(fs.existsSync(path.join(dir, AGENT_DIR, 'caf-validator.md')));
    assert.equal(lines.filter((l) => QA_NOTE.test(l)).length, 1, 'exactly one note');
    assert.ok(lines.some((l) => /caf-qa\.md/.test(l) && /not (changed|touched)|unchanged|left as it is/i.test(l)), 'the note says caf-qa.md was not touched');
  });
}

test('AC-3: no caf-qa.md in the repo → the note is not printed', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'), 'caf-sdd03c2-noqa-');
  const lines = await scaffoldValidatorOnly(dir);
  assert.ok(fs.existsSync(path.join(dir, AGENT_DIR, 'caf-validator.md')));
  assert.equal(lines.filter((l) => QA_NOTE.test(l)).length, 0);
});

// ---------------------------------------------------------------------------------------------
// AC-4 — what is hidden
// ---------------------------------------------------------------------------------------------

test('AC-4: validator and /caf-plan are not hidden; the five hidden kinds still are', () => {
  const { HIDDEN_CANDIDATE_KINDS, HIDDEN_COMMAND_FILES, isHiddenCommand, isOfferedCandidate } = AGENTS;
  assert.deepEqual([...HIDDEN_CANDIDATE_KINDS].sort(), ['auditor', 'devops', 'documentation', 'pm', 'ux-designer']);
  assert.ok(!HIDDEN_CANDIDATE_KINDS.includes('validator'));
  assert.ok(!HIDDEN_COMMAND_FILES.includes('caf-plan.md'));
  assert.equal(isHiddenCommand('caf-plan.md'), false);

  assert.equal(typeof isOfferedCandidate, 'function');
  assert.equal(isOfferedCandidate({ kind: 'validator' }), true);
  for (const kind of HIDDEN_CANDIDATE_KINDS) assert.equal(isOfferedCandidate({ kind }), false, kind);
  // qa is replaced, not removed: the kind and its candidate stay, it is just no longer offered
  assert.equal(isOfferedCandidate({ kind: 'qa' }), false);
  assert.ok(AGENTS.buildCandidates({}, []).some((c) => c.kind === 'qa'));
  for (const kind of ['planner', 'architect', 'frontend', 'backend', 'implementer', 'reviewer']) {
    assert.equal(isOfferedCandidate({ kind }), true, kind);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-5 — the other commands
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: ${fixture} — /caf-plan-ticket and /caf-complete-drafts are byte-identical`, async () => {
    const old = golden(`commands.${fixture}.json`).files;
    const { files } = await renderCommands(fixture);
    for (const name of ['caf-plan-ticket.md', 'caf-complete-drafts.md']) assert.equal(files[name], old[name], name);
  });

  test(`AC-5: ${fixture} — /caf-review and /caf-fix-review differ only at the /caf-review-ticket reference`, async () => {
    const old = golden(`commands.${fixture}.json`).files;
    const { files } = await renderCommands(fixture);
    for (const name of ['caf-review.md', 'caf-fix-review.md']) {
      const before = old[name].split('\n');
      const after = files[name].split('\n');
      let head = 0;
      while (head < before.length && head < after.length && before[head] === after[head]) head++;
      let tail = 0;
      while (tail < before.length - head && tail < after.length - head && before.at(-1 - tail) === after.at(-1 - tail)) tail++;
      const removed = before.slice(head, before.length - tail).join('\n');
      const added = after.slice(head, after.length - tail).join('\n');
      assert.match(removed, /\/caf-review-ticket/, `${name}: the changed lines held the reference`);
      assert.ok(!/caf-review-ticket/.test(added), `${name}: the new lines do not`);
      assert.ok(before.length - tail - head <= 3 && after.length - tail - head <= 3, `${name}: a change of at most three lines`);
      assert.ok(!/caf-review-ticket/.test(files[name]), `${name}: no reference left`);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6, AC-7 — /caf-run-pipeline
// ---------------------------------------------------------------------------------------------

const SPEC_SECTION = /Spec Status/;

/** The render without the section that holds the AC-7 text. */
function withoutSpecSection(md) {
  const sections = mdSections(md);
  const idx = sections.findIndex((s) => s.header && SPEC_SECTION.test(s.header));
  assert.ok(idx >= 0, 'the render has a spec status section');
  return sections
    .filter((_, i) => i !== idx)
    .map((s) => (s.header == null ? s.body : `## ${s.header}\n${s.body}`))
    .join('\n');
}

for (const [name, { input, content }] of Object.entries(PIPELINE)) {
  test(`AC-6: ${name} — roster with validator: the gate is caf-validator and validate-report.md, nothing of caf-qa`, () => {
    const md = buildRunPipelineMd({ ...input, gate: 'validator' });
    assert.match(md, /caf-validator/);
    assert.match(md, /validate-report\.md/);
    assert.ok(!/caf-qa/.test(md), 'no caf-qa');
    assert.ok(!/qa-report\.md/.test(md), 'no qa-report.md');
    assert.ok(!/qaRetryCount/.test(md) || /validat/i.test(md));
    const gate = sectionOf(md, /Gate|Validator/i);
    assert.ok(gate, 'the gate stage is a section');
  });

  test(`AC-6: ${name} — roster with qa: the golden plus the spec status section only`, () => {
    for (const md of [buildRunPipelineMd(input), buildRunPipelineMd({ ...input, gate: 'qa' })]) {
      assert.equal(withoutSpecSection(md), content);
      assert.match(md, /caf-qa/);
      assert.match(md, /qa-report\.md/);
    }
  });
}

test('AC-6: a scaffold with the default roster writes /caf-run-pipeline with the validator gate', async () => {
  for (const fixture of FIXTURE_NAMES) {
    const { files } = await renderCommands(fixture);
    const md = files['caf-run-pipeline.md'];
    assert.match(md, /caf-validator/, fixture);
    assert.ok(!/caf-qa|qa-report/.test(md), fixture);
  }
});

test('AC-7: /caf-run-pipeline states the spec status rules, for both gates', () => {
  for (const gate of ['qa', 'validator']) {
    const md = buildRunPipelineMd({ ...PIPELINE['mono-pnpm.with-documentation'].input, gate });
    const section = sectionOf(md, SPEC_SECTION).body;
    // read the spec first, before the implementation agent
    assert.match(section, /requirements\.md/);
    assert.match(section, /before[^.]*implementation agent/i);
    // the stop
    assert.match(section, /Status: NEEDS_CLARIFICATION/);
    assert.match(section, /BLOCKING/);
    assert.match(section, /Answer:/);
    assert.match(section, /Status: NEEDS_HUMAN/);
    assert.match(section, /STOP/);
    // the statuses that go on
    assert.match(section, /DRAFT/);
    assert.match(section, /APPROVED/);
    assert.match(section, /(DRAFT[^.]*APPROVED|APPROVED[^.]*DRAFT)[^.]*(continue|proceed|go on)/is);
    // never writes the spec
    assert.match(section, /NEVER[^.]*(writes|edits)[^.]*`requirements\.md`[^.]*`tasks\.md`/i);
    // the proposals: three sources, shown to a human, not applied
    assert.match(section, /Proposed Spec Changes/);
    assert.match(section, /verify-report\.md/);
    assert.match(section, /review-notes\.md/);
    assert.match(section, /gate report/i);
    assert.match(section, /(not|never)[^.]*appl(y|ied)/i);
    assert.ok(!/TODO/.test(section), 'no TODO word');
    // the section comes before the implementation stage
    assert.ok(md.indexOf(section) < md.indexOf('## 3. Implementation'));
  }
});

// ---------------------------------------------------------------------------------------------
// AC-8 — /caf-plan
// ---------------------------------------------------------------------------------------------

test('AC-8: /caf-plan stops for NEEDS_CLARIFICATION and NEEDS_HUMAN, and reports APPROVED as ready', () => {
  const md = buildPlanMd();
  const stop = sectionOf(md, /Stop/).body;
  assert.match(stop, /Status: NEEDS_CLARIFICATION/);
  assert.match(stop, /Status: NEEDS_HUMAN/);
  assert.match(stop, /questions/);
  assert.match(stop, /reason/);
  assert.match(stop, /STOP/);
  assert.match(stop, /(do not|don't|never)[^.]*(run|spawn|start)[^.]*(another|other) agent/i);
  assert.match(stop, /Status: APPROVED/);
  assert.match(stop, /ready to be implemented/);
  assert.ok(!/TODO/.test(stop.replace(/parts marked TODO project-specific/g, '')), 'no new TODO word');
});

// ---------------------------------------------------------------------------------------------
// AC-9, AC-11 — reviewer and planner `## Input`, the stale references
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-9: ${fixture} — reviewer Input names validate-report.md and qa-report.md; the rest is the golden`, async () => {
    const old = golden(`reviewer.${fixture}.json`);
    const now = (await renderAgents(fixture)).reviewer;
    const before = mdSections(old.content);
    const after = mdSections(now.content);
    assert.deepEqual(after.map((s) => s.header), before.map((s) => s.header));
    for (let i = 0; i < before.length; i++) {
      if (before[i].header === 'Input') continue;
      assert.equal(after[i].body, before[i].body, `section ${before[i].header}`);
    }
    const input = after.find((s) => s.header === 'Input').body;
    assert.match(input, /validate-report\.md/);
    assert.match(input, /qa-report\.md/);
    assert.match(input, /caf-qa/);
    assert.match(input, /from the implementation agent/, 'the sentence parseInputAppNames reads');
    assert.ok(input.indexOf('validate-report.md') < input.indexOf('qa-report.md'), 'validate-report.md first');
  });

  test(`AC-11: ${fixture} — planner Input has no .caf/discovery/ and no /caf-discovery-start; the rest is the golden`, async () => {
    const old = golden(`planner.${fixture}.json`);
    const now = (await renderAgents(fixture)).planner;
    const before = mdSections(old.content);
    const after = mdSections(now.content);
    assert.deepEqual(after.map((s) => s.header), before.map((s) => s.header));
    for (let i = 0; i < before.length; i++) {
      if (before[i].header === 'Input') continue;
      assert.equal(after[i].body, before[i].body, `section ${before[i].header}`);
    }
    const input = after.find((s) => s.header === 'Input').body;
    assert.ok(!/\.caf\/discovery/.test(input));
    assert.ok(!/caf-discovery-start/.test(input));
    assert.match(input, /Ticket description from the tracker \(required\)/);
    assert.match(input, /docs\/product\/prd\.md/);
    assert.match(input, /App-tag requirement/);
  });

  test(`AC-11: ${fixture} — INDEX.md does not name the PM Agent, the review commands not /caf-review-ticket`, async () => {
    const set = await renderDefaultFileSet({ fixture });
    const index = read(set.dir, '.caf/knowledge/INDEX.md');
    assert.ok(!/PM Agent/.test(index));
    assert.ok(index.includes('Reference Documents'), 'the rest of the file is there');
    for (const name of ['caf-review.md', 'caf-fix-review.md']) {
      assert.ok(!/caf-review-ticket/.test(read(set.dir, `.claude/commands/${name}`)), name);
    }
    const old = golden(`index.${fixture}.json`).content;
    const lines = old.split('\n').filter((l) => !/PM Agent/.test(l));
    for (const line of lines.filter((l) => l.trim() && !/^per-feature drafts|^necessarily final|^\*\*Difference|^the opposite/.test(l))) {
      assert.ok(index.includes(line), `still present: ${line}`);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-10 — curate sync carries only `## Input`
// ---------------------------------------------------------------------------------------------

function baselined(fixture, files) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03c2-sync-');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  const manifest = { version: 1, files: {} };
  for (const [file, content] of Object.entries(files)) {
    const rel = path.join(AGENT_DIR, file);
    fs.writeFileSync(path.join(dir, rel), content);
    const { lines, sections } = parseSections(content);
    for (const s of sections) setSectionBaseline(manifest, rel, s.header, hashSection(sectionBody(lines, s)));
  }
  writeManifest(dir, manifest);
  return dir;
}

for (const fixture of FIXTURE_NAMES) {
  test(`AC-10: ${fixture} — pre-ticket planner and reviewer: curate sync writes only their Input`, async () => {
    const files = {
      'caf-planner.md': golden(`planner.${fixture}.json`).content,
      'caf-reviewer.md': golden(`reviewer.${fixture}.json`).content,
    };
    const dir = baselined(fixture, files);
    const before = snapshotTree(dir);
    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: false }));
    const after = snapshotTree(dir);

    const changed = Object.keys(after).filter((k) => after[k] !== before[k]).sort();
    const manifest = path.join('.caf', '.generate-manifest.json');
    assert.deepEqual(changed.filter((k) => k !== manifest), [path.join(AGENT_DIR, 'caf-planner.md'), path.join(AGENT_DIR, 'caf-reviewer.md')]);
    assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort(), 'no file added or removed');
    assert.equal(result.updated.length, 2);

    const now = await renderAgents(fixture);
    for (const [file, kind] of [['caf-planner.md', 'planner'], ['caf-reviewer.md', 'reviewer']]) {
      const rel = path.join(AGENT_DIR, file);
      const was = mdSections(before[rel]);
      const is = mdSections(after[rel]);
      for (let i = 0; i < was.length; i++) {
        if (was[i].header === 'Input') assert.notEqual(is[i].body, was[i].body, `${file}: Input changed`);
        else assert.equal(is[i].body, was[i].body, `${file}: ${was[i].header} untouched`);
      }
      assert.equal(after[rel], now[kind].content, `${file}: the file is now what a new scaffold writes`);
    }
  });

  test(`AC-10: ${fixture} — a customized Input is not overwritten`, async () => {
    const planner = golden(`planner.${fixture}.json`).content.replace('Ticket description from the tracker (required).', 'Ticket description from OUR tracker (required).');
    const reviewer = golden(`reviewer.${fixture}.json`).content.replace('(required).', '(required) — and ask Sam.');
    assert.notEqual(planner, golden(`planner.${fixture}.json`).content);
    assert.notEqual(reviewer, golden(`reviewer.${fixture}.json`).content);
    const dir = baselined(fixture, { 'caf-planner.md': golden(`planner.${fixture}.json`).content, 'caf-reviewer.md': golden(`reviewer.${fixture}.json`).content });
    // edit after the baseline: current != baseline
    fs.writeFileSync(path.join(dir, AGENT_DIR, 'caf-planner.md'), planner);
    fs.writeFileSync(path.join(dir, AGENT_DIR, 'caf-reviewer.md'), reviewer);

    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: false }));
    assert.equal(read(dir, path.join(AGENT_DIR, 'caf-planner.md')), planner);
    assert.equal(read(dir, path.join(AGENT_DIR, 'caf-reviewer.md')), reviewer);
    assert.deepEqual(result.updated, []);
    assert.ok(result.needsAttention.length >= 2, 'both are reported as needing attention');
    assert.ok(SECTION_STATUS.CONFLICT);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-12 — a complete scaffold audits clean
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

for (const fixture of FIXTURE_NAMES) {
  test(`AC-12: ${fixture} — agents, commands, skills, workflow, then curate --audit-only: nothing for validator, planner, reviewer or /caf-plan`, async () => {
    const { dir } = await renderDefaultFileSet({ fixture });
    prompts.inject(Array(12).fill(true));
    try {
      await silenced(() => skillsTarget({ dir, dryRun: false }));
    } finally {
      prompts._injected.length = 0;
    }
    assert.ok(fs.existsSync(path.join(dir, AGENT_DIR, 'caf-validator.md')));
    assert.ok(fs.existsSync(path.join(dir, '.claude', 'commands', 'caf-plan.md')));

    const result = await auditOnly(dir);
    const entries = result.layers.flatMap((l) => l.entries);
    const about = entries.filter((e) => /caf-validator|caf-planner|caf-reviewer|caf-plan\b/.test(`${e.filePath} ${e.message}`));
    const notOk = about.filter((e) => e.status !== 'ok');
    assert.deepEqual(notOk, [], 'no warning, gap or declined entry for them');
    assert.ok(about.some((e) => /caf-validator/.test(e.filePath)), 'the validator is audited');
    assert.deepEqual(result.warnings.filter((w) => /caf-validator|caf-planner|caf-reviewer/.test(w.filePath)), []);
  });
}
