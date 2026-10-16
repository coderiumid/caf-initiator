// CAF-SDD-07 — four text changes in the `## Output` of existing kinds: the Coverage lines of the
// implementation agents (`### 1. Read`), the reviewer's blocking-finding bullet, the validator's
// step 2 (checklist scope) and its pipe bullet in step 3. `test/fixtures/pre-sdd07/` is the render
// from before this ticket (frontend, backend, implementer, reviewer, validator) — never
// regenerate it. Every `curate` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { buildValidatorAgent } from '../src/commands/agents.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { buildOutputSection } from '../src/templates/agent-md.js';
import { KNOWN_KINDS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { copyFixture } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { renderImplementationAgents } from './helpers/implementation-agents.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, renderAgents } from './helpers/frozen-kinds.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd07');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, `${name}.json`), 'utf8'));

// Written out here, not imported from `src/` or the helper, so a change to any copy fails a test.
const TASKS_BULLET = '- `tasks.md`: the tasks of this agent and the AC ids each one serves.';
const COVERAGE = [
  '- A `tasks.md` may end with `## Coverage`, which maps each AC id to the tasks that serve it. It',
  '  is a map, not a task: do not implement it. Use it to find the tasks behind an AC you report.',
];
const REVIEWER_OLD = [
  '- A blocking finding rules out an approving verdict; give it as the reason under',
  '  `### Verdict Rationale`. The verdict values are the ones of the Report Format section.',
];
const REVIEWER_NEW = [
  '- A blocking finding means the verdict is not the approving one. A finding only a human can',
  '  settle (a spec changed after approval, a proposed spec change that blocks the work) takes the',
  '  value that Retry Logic gives for a review that is blocked. Any other blocking finding takes',
  '  the remaining value that is not approving. Give the reason under `### Verdict Rationale`.',
  '  The values themselves are the ones of the Report Format section.',
];
const STEP2_OLD = [
  '- Run every command of the Verify Checklist of this file, for the app(s) the change touches,',
  '  and record the exit code of each one.',
];
const STEP2_NEW = [
  '- Run the commands of the Verify Checklist of this file for the app(s) that the tasks of',
  '  `tasks.md` name, by path or by name. When they name none, use the app(s) the change touches.',
  '  Record the exit code of each command you run.',
  '- A checklist line of an app you did not run is not a gap of the gate.',
];
const CLAIMS = '- What `verify-report.md` claims is never a reason for `PASS` on its own: only what you ran is.';
const PIPE = [
  '- In the table of `validate-report.md`, a `|` that belongs to a command or to observed output is',
  '  written inside backticks. A bare `|` splits the cell and the row is misread.',
];
const GAP_LINE = '- A checklist line with no command (no script detected) is a gap of the gate. Report it as a';

const IDS = ['frontend.mono-pnpm', 'backend.mono-pnpm', 'implementer.single-nuxt', 'frontend.single-nuxt', 'backend.single-nuxt'];
const IMPLEMENTATION_KINDS = ['frontend', 'backend', 'implementer'];
const CHANGED_KINDS = [...IMPLEMENTATION_KINDS, 'reviewer', 'validator'];

const impl = await renderImplementationAgents();
const NOW = {};
const stackOf = (dir) => silenced(() => detectStack({ dir, explicitGlobs: undefined }));
for (const id of IDS) NOW[id] = { file: impl[id].file, content: impl[id].content };
for (const fixture of FIXTURE_NAMES) {
  NOW[`reviewer.${fixture}`] = (await renderAgents(fixture)).reviewer;
  const dir = fixtureDir(fixture);
  NOW[`validator.${fixture}`] = buildValidatorAgent(dir, await stackOf(dir));
}
const ALL_IDS = Object.keys(NOW);
const OLD = Object.fromEntries(ALL_IDS.map((id) => [id, golden(id)]));
const kindOf = (id) => id.split('.')[0];

const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};
const headings = (text) => text.split('\n').filter((l) => /^###? /.test(l));
const block = (lines) => lines.join('\n');
const count = (text, needle) => text.split(needle).length - 1;

// ---------------------------------------------------------------------------------------------
// AC-1 — Coverage lines for the three implementation kinds
// ---------------------------------------------------------------------------------------------

for (const id of IDS) {
  test(`AC-1: ${id} — the two Coverage lines follow the tasks.md bullet in "### 1. Read"`, () => {
    const output = bodyOf(NOW[id].content, 'Output');
    const read = output.slice(output.indexOf('### 1. Read'), output.indexOf('### 2. '));
    assert.equal(count(output, block(COVERAGE)), 1);
    assert.ok(read.includes(`${TASKS_BULLET}\n${block(COVERAGE)}\n\n`), 'directly after the tasks.md bullet, last of step 1');
  });
}

test('AC-1: the `implementation` kind and every kind this ticket does not name keep their Output', () => {
  const OLD_OUTPUT_BY_KIND = JSON.parse(fs.readFileSync(path.join(ROOT, 'test', 'fixtures', 'pre-sdd03d', 'output-by-kind.json'), 'utf8'));
  // planner changed in earlier tickets (held by its own tests); the five kinds of this ticket are
  // held above and below.
  const held = Object.keys(OLD_OUTPUT_BY_KIND).filter((k) => ![...CHANGED_KINDS, 'planner'].includes(k));
  assert.ok(held.includes('implementation') && held.includes('qa') && held.includes('architect'));
  for (const kind of held) assert.equal(buildOutputSection(kind), OLD_OUTPUT_BY_KIND[kind], `${kind}: Output must be unchanged`);
  assert.ok(!buildOutputSection('implementation').includes('Coverage'));
  assert.ok(KNOWN_KINDS.includes('implementer'));
});

// ---------------------------------------------------------------------------------------------
// AC-2 — reviewer
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-2: reviewer on ${fixture} — five lines in place of the two old ones, and no verdict value`, () => {
    const output = bodyOf(NOW[`reviewer.${fixture}`].content, 'Output');
    const part = output.slice(output.indexOf('### Where the findings go'), output.indexOf('### What the Reviewer never does'));
    assert.ok(part.includes(`${block(REVIEWER_NEW)}\n`));
    assert.ok(!output.includes(REVIEWER_OLD[0]));
    assert.ok(!output.includes(REVIEWER_OLD[1]));
    assert.doesNotMatch(output, /\bAPPROVE\b|CHANGES REQUESTED|\bDEFER\b/);
    // The values stay in their single source.
    assert.match(bodyOf(NOW[`reviewer.${fixture}`].content, 'Report Format'), /APPROVE \| CHANGES REQUESTED \| DEFER/);
    assert.match(bodyOf(NOW[`reviewer.${fixture}`].content, 'Retry Logic'), /DEFER verdict/);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-3, AC-4 — validator
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-3: validator on ${fixture} — step 2 has the four new lines, and the Verify Checklist is the golden`, () => {
    const now = NOW[`validator.${fixture}`].content;
    const output = bodyOf(now, 'Output');
    const step2 = output.slice(output.indexOf('### 2. '), output.indexOf('### 3. '));
    assert.ok(step2.includes(`${block(STEP2_NEW)}\n${GAP_LINE}`), 'the gap bullet follows, unchanged');
    assert.ok(!output.includes(STEP2_OLD[0]));
    assert.equal(bodyOf(now, 'Verify Checklist'), bodyOf(OLD[`validator.${fixture}`].content, 'Verify Checklist'));
  });

  test(`AC-4: validator on ${fixture} — the two pipe lines follow the "claims" line in step 3`, () => {
    const output = bodyOf(NOW[`validator.${fixture}`].content, 'Output');
    const step3 = output.slice(output.indexOf('### 3. '), output.indexOf('### Commands you may run'));
    assert.ok(step3.includes(`${CLAIMS}\n${block(PIPE)}\n`));
    assert.equal(count(output, PIPE[0]), 1);
    assert.doesNotMatch(block(PIPE), /\\\|/, 'one way only: backticks, no escape');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-5 — no heading, no TODO, same check-drafts count
// ---------------------------------------------------------------------------------------------

const CHANGED_LINES = [...COVERAGE, ...REVIEWER_NEW, ...STEP2_NEW, ...PIPE];

test('AC-5: the changed lines hold no TODO word', () => {
  for (const line of CHANGED_LINES) assert.doesNotMatch(line, /\bTODO\b/i, line);
});

for (const id of ALL_IDS) {
  test(`AC-5: ${id} — same headings, and check-drafts finds the same as in the golden`, async () => {
    assert.deepEqual(headings(NOW[id].content), headings(OLD[id].content));
    const fixture = OLD[id].fixture;
    const findingsOf = async (content) => {
      const dir = copyFixture(fixtureDir(fixture));
      fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
      fs.writeFileSync(path.join(dir, AGENT_DIR, NOW[id].file), content, 'utf8');
      const saved = process.exitCode;
      try {
        const result = await silenced(() => checkDrafts({ dir }));
        return result.findings.filter((f) => f.file === path.join(AGENT_DIR, NOW[id].file));
      } finally {
        process.exitCode = saved;
      }
    };
    assert.deepEqual(await findingsOf(NOW[id].content), await findingsOf(OLD[id].content));
    assert.equal(count(NOW[id].content, 'TODO'), count(OLD[id].content, 'TODO'));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6 — nothing else changed
// ---------------------------------------------------------------------------------------------

/** The new text taken out again, the old text put back. */
function undo(id, content) {
  const kind = kindOf(id);
  let out = content;
  if (IMPLEMENTATION_KINDS.includes(kind)) out = out.replace(`${block(COVERAGE)}\n`, '');
  if (kind === 'reviewer') out = out.replace(block(REVIEWER_NEW), block(REVIEWER_OLD));
  if (kind === 'validator') out = out.replace(block(STEP2_NEW), block(STEP2_OLD)).replace(`${block(PIPE)}\n`, '');
  return out;
}

for (const id of ALL_IDS) {
  test(`AC-6: ${id} — outside the changed lines the file is the golden, byte for byte`, () => {
    assert.equal(NOW[id].file, OLD[id].file);
    assert.notEqual(NOW[id].content, OLD[id].content);
    assert.equal(undo(id, NOW[id].content), OLD[id].content);
  });
}

test('AC-6: the five kinds of the ticket are the only ones whose Output moved', () => {
  assert.deepEqual([...new Set(ALL_IDS.map(kindOf))].sort(), [...CHANGED_KINDS].sort());
});

// ---------------------------------------------------------------------------------------------
// AC-7 — curate sync
// ---------------------------------------------------------------------------------------------

const SYNC_CASES = [
  { fixture: 'mono-pnpm', ids: ['frontend.mono-pnpm', 'backend.mono-pnpm', 'reviewer.mono-pnpm', 'validator.mono-pnpm'] },
  { fixture: 'single-nuxt', ids: ['frontend.single-nuxt', 'backend.single-nuxt', 'reviewer.single-nuxt', 'validator.single-nuxt'] },
];

function baselineRepo(fixture, files) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-sdd07-sync-');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  const manifest = { version: 1, files: {} };
  for (const { file, content } of files) {
    const rel = path.join(AGENT_DIR, file);
    fs.writeFileSync(path.join(dir, rel), content, 'utf8');
    const { lines, sections } = parseSections(content);
    for (const s of sections) setSectionBaseline(manifest, rel, s.header, hashSection(sectionBody(lines, s)));
  }
  writeManifest(dir, manifest);
  return dir;
}
const readAgent = (dir, file) => fs.readFileSync(path.join(dir, AGENT_DIR, file), 'utf8');

for (const { fixture, ids } of SYNC_CASES) {
  test(`AC-7: ${fixture} — curate sync rewrites ## Output of each agent from the golden, and nothing else`, async () => {
    const dir = baselineRepo(fixture, ids.map((id) => ({ file: OLD[id].file, content: OLD[id].content })));
    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
    assert.deepEqual([...result.drifted].sort(), ids.map((id) => `${path.join(AGENT_DIR, OLD[id].file)}#Output`).sort());
    assert.deepEqual(result.needsAttention, []);
    for (const id of ids) {
      const after = readAgent(dir, OLD[id].file);
      assert.equal(after, NOW[id].content, id);
      // The file differs from the golden only inside ## Output.
      assert.equal(after.replace(bodyOf(after, 'Output'), bodyOf(OLD[id].content, 'Output')), OLD[id].content, id);
    }
  });

  test(`AC-7: ${fixture} — an agent whose ## Output was edited by hand is a CONFLICT and stays byte for byte`, async () => {
    const edited = Object.fromEntries(ids.map((id) => [id, OLD[id].content.replace(/^Produces .*$/m, (m) => `${m} My own note.`)]));
    for (const id of ids) assert.notEqual(edited[id], OLD[id].content, 'precondition');
    const dir = baselineRepo(fixture, ids.map((id) => ({ file: OLD[id].file, content: OLD[id].content })));
    for (const id of ids) fs.writeFileSync(path.join(dir, AGENT_DIR, OLD[id].file), edited[id], 'utf8');
    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
    assert.deepEqual(result.drifted, []);
    assert.deepEqual(
      result.needsAttention.map((n) => `${n.file}#${n.header}#${n.status}`).sort(),
      ids.map((id) => `${path.join(AGENT_DIR, OLD[id].file)}#Output#CONFLICT`).sort()
    );
    for (const id of ids) assert.equal(readAgent(dir, OLD[id].file), edited[id], id);
  });
}
