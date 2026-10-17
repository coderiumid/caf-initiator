// CAF-SDD-11 — the language rule of the Planner: one whole rule in `### 1. Specify` of its
// `## Output`, right after the `Status:` bullet. `test/fixtures/pre-sdd11/` is the render from
// before this ticket (the planner of both fixtures, the `## Output` of every kind) — never
// regenerate it. Every `curate` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { buildSpecSkill, buildDesignSkill, buildBreakdownSkill } from '../src/templates/skill-md.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { readManifest, setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { sinceSdd12 } from './helpers/since-12.js';
import { snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { AGENT_DIR, FIXTURE_NAMES, renderAgents, trackedSections } from './helpers/frozen-kinds.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd11');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, name), 'utf8'));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');

// The rule, written out here (not imported from the helper or from `src/`) so a change to any copy
// fails a test.
const LANGUAGE_RULE = [
  '- Write the prose of `requirements.md`, `tasks.md`, `design.md` and `breakdown.md` in the',
  '  language of the ticket description (of the request, when it comes from chat), and the open',
  '  questions too. The words the templates and other agents read stay exactly as the templates',
  '  show them, in every language: section headings, `Status:` and its values, `AC-n:`,',
  '  `Verify:` and its three forms, `Finding:`, `Assumption A-n:`, `Q-n`, `BLOCKING`,',
  '  `NON-BLOCKING`, `Answer:` and `Tidak ada`. File paths, symbol names, commands and text',
  '  quoted from the ticket are written as they are.',
];
// CAF-SDD-12 added sentences to this bullet (helpers/since-12.js). The rule above is the SDD-11 text,
// held as it was; the rendered planner carries it through `sinceSdd12`. Nothing is loosened: the
// planner is still compared line for line, with the SDD-12 sentences in the expected text.
const LANGUAGE_RULE_NOW = sinceSdd12(`${LANGUAGE_RULE.join('\n')}\n`).trimEnd().split('\n');
const ANCHOR_BEFORE = '  no open `BLOCKING` question is `Status: DRAFT`.';
const ANCHOR_AFTER = '- A section with nothing to say is written `Tidak ada`. Never a placeholder: not `- -`, not an';

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const OLD_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`planner.${f}.json`)]));
const OLD_OUTPUTS = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`output-by-kind.${f}.json`).outputs]));
const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: planner on ${fixture} — the language rule is in Specify, right after the Status bullet`, () => {
    const lines = trackedSections(rendered[fixture].planner.content).Output.split('\n');
    const specify = lines.indexOf('### 1. Specify');
    const plan = lines.findIndex((l, i) => i > specify && l.startsWith('### '));
    const at = lines.findIndex((l, i) => i > specify && l === LANGUAGE_RULE_NOW[0]);
    assert.ok(specify >= 0 && at > specify && at < plan, 'inside ### 1. Specify');
    assert.deepEqual(lines.slice(at, at + LANGUAGE_RULE_NOW.length), LANGUAGE_RULE_NOW);
    assert.equal(lines[at - 1], ANCHOR_BEFORE);
    assert.equal(lines[at + LANGUAGE_RULE_NOW.length], ANCHOR_AFTER);
  });

  test(`AC-2: planner on ${fixture} — the only difference from the golden is the added lines`, () => {
    const md = rendered[fixture].planner.content;
    const old = OLD_PLANNER[fixture].content;
    assert.notEqual(md, old);
    assert.equal(md.replace(`${LANGUAGE_RULE_NOW.join('\n')}\n`, ''), old);
    const oldLines = old.split('\n');
    assert.deepEqual(md.split('\n').filter((l) => !oldLines.includes(l)), LANGUAGE_RULE_NOW);
    assert.deepEqual(oldLines.filter((l) => !md.split('\n').includes(l)), []);
    assert.equal(md.match(/^tools: \[.*\]$/m)[0], old.match(/^tools: \[.*\]$/m)[0]);
    assert.equal(md.split('\n').slice(0, 8).join('\n'), old.split('\n').slice(0, 8).join('\n'));
    for (const { header } of parseSections(old).sections) {
      if (header === 'Output') continue;
      assert.equal(bodyOf(md, header), bodyOf(old, header), header);
    }
    assert.deepEqual(parseSections(md).sections.map((s) => s.header), parseSections(old).sections.map((s) => s.header));
  });

  test(`AC-3: ${fixture} — the Output of every other kind is the golden, byte for byte`, () => {
    const outputs = OLD_OUTPUTS[fixture];
    assert.ok(Object.keys(outputs).length >= 10);
    for (const [kind, old] of Object.entries(outputs)) {
      const now = rendered[fixture][kind] ? trackedSections(rendered[fixture][kind].content).Output ?? null : null;
      if (kind === 'planner') {
        assert.equal(now.replace(`${LANGUAGE_RULE_NOW.join('\n')}\n`, ''), old);
      } else {
        assert.equal(now, old, kind);
        assert.ok(!(now ?? '').includes(LANGUAGE_RULE_NOW[0]), kind);
      }
    }
  });
}

test('AC-4: the added lines hold no TODO, no heading, no new status value and no list of words to avoid', () => {
  const text = LANGUAGE_RULE.join('\n');
  assert.ok(!/\bTODO\b/.test(text));
  assert.ok(!LANGUAGE_RULE.some((l) => /^#{2,} /.test(l) || l.startsWith('### ')));
  const statuses = text.match(/\b[A-Z]+(?:_[A-Z]+)+\b/g) ?? [];
  assert.deepEqual(statuses, [], 'no status value is named');
  assert.ok(!/\b(never use|do not use|avoid|forbidden|not allowed)\b/i.test(text), 'states an intent, not words to avoid');
  assert.equal(LANGUAGE_RULE.filter((l) => l.startsWith('- ')).length, 1, 'one rule');
  // the rendered planner still has no new heading and the same step headings
  for (const fixture of FIXTURE_NAMES) {
    const heads = (md) => trackedSections(md).Output.split('\n').filter((l) => /^###? /.test(l));
    assert.deepEqual(heads(rendered[fixture].planner.content), heads(OLD_PLANNER[fixture].content));
  }
});

// ---------------------------------------------------------------------------------------------
// AC-5 — curate sync from a planner generated before this ticket
// ---------------------------------------------------------------------------------------------

async function repoWithOldPlanner(fixture, { planner, baselineFrom = planner }) {
  const { dir } = await makeOldRepo(fixture);
  fs.writeFileSync(path.join(dir, PLANNER_REL), planner, 'utf8');
  const manifest = readManifest(dir);
  const { lines, sections } = parseSections(baselineFrom);
  for (const s of sections) setSectionBaseline(manifest, PLANNER_REL, s.header, hashSection(sectionBody(lines, s)));
  writeManifest(dir, manifest);
  return dir;
}
const sync = (dir, dryRun) => silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
const agentTree = (dir) => Object.fromEntries(Object.entries(snapshotTree(path.join(dir, AGENT_DIR))).filter(([rel]) => rel.endsWith('.md')));

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: ${fixture} — sync of the pre-ticket planner reports Output as DRIFT and carries it, nothing else changes`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const dir = await repoWithOldPlanner(fixture, { planner: old });
    const before = agentTree(dir);

    const dry = await sync(dir, true);
    assert.deepEqual(dry.drifted, [`${PLANNER_REL}#Output`]);
    assert.deepEqual(agentTree(dir), before, 'dry-run writes nothing');

    const real = await sync(dir, false);
    assert.deepEqual(real.drifted, [`${PLANNER_REL}#Output`]);
    assert.deepEqual(real.needsAttention, []);
    assert.deepEqual(real.updated, [path.join(dir, PLANNER_REL)]);

    const now = read(dir, PLANNER_REL);
    assert.equal(now, rendered[fixture].planner.content);
    assert.equal(now.replace(`${LANGUAGE_RULE_NOW.join('\n')}\n`, ''), old, 'only the rule is new');
    const after = agentTree(dir);
    for (const [rel, content] of Object.entries(before)) if (rel !== 'caf-planner.md') assert.equal(after[rel], content, rel);
    assert.deepEqual((await sync(dir, false)).drifted, []);
  });

  test(`AC-5: ${fixture} — a planner whose Output was edited by hand is a CONFLICT and the file is unchanged byte for byte`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    assert.notEqual(edited, old);
    const dir = await repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);
    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      assert.deepEqual(result.drifted, [], `dryRun=${dryRun}`);
      assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Output', status: 'CONFLICT' }], `dryRun=${dryRun}`);
      assert.deepEqual(agentTree(dir), before, `dryRun=${dryRun}: byte for byte`);
    }
    assert.equal(read(dir, PLANNER_REL), edited);
  });
}

test('AC-6: the three planner skills are not changed by this ticket', () => {
  // caf-spec v4 is held by sha256 in test/sdd10-spec-v4.test.js; caf-design and caf-breakdown in
  // test/sdd05a-caf-design.test.js and test/sdd05b-caf-breakdown.test.js. Here: none of them
  // carries the new rule, and caf-spec still holds its one language line.
  for (const md of [buildSpecSkill(), buildDesignSkill(), buildBreakdownSkill()]) {
    assert.ok(!md.includes(LANGUAGE_RULE[0]) && !md.includes('Write the prose of'));
  }
  assert.ok(buildSpecSkill().includes('Write the spec content in the language the ticket is written in.'));
});
