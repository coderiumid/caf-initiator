// CAF-SDD-12 — the language bullet of the Planner (CAF-SDD-11) says where the language comes from:
// the ticket author's own sentences, not quoted UI text, code or files read; the final message
// follows it. Same bullet, `### 1. Specify` of the tracked `## Output`. `test/fixtures/pre-sdd12/` is
// the render from before this ticket (the planner of both fixtures, the `## Output` of every kind)
// — never regenerate it; `test/fixtures/pre-sdd11/` is the one from before the bullet existed. Every
// `curate` below runs on a temp copy of a fixture.

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
import { snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { sinceSdd11 } from './helpers/since-11.js';
import { sinceSdd12 } from './helpers/since-12.js';
import { AGENT_DIR, FIXTURE_NAMES, renderAgents, trackedSections } from './helpers/frozen-kinds.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = (name) => path.join(ROOT, 'test', 'fixtures', name);
const golden = (dir, name) => JSON.parse(fs.readFileSync(path.join(fixtureDir(dir), name), 'utf8'));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');

// The SDD-11 line that is split by this ticket, and what replaces it. Written out here (not imported
// from the helper or from `src/`) so a change to any copy fails a test. The rest of the bullet is
// the SDD-11 text, untouched.
const OLD_LINES = ['  questions too. The words the templates and other agents read stay exactly as the templates'];
const NEW_LINES = [
  '  questions too. The language is the one the ticket author wrote in, judged from the title and',
  '  sentences of the ticket, not from UI text quoted in it, code, or files you read: an English',
  '  ticket that quotes an Indonesian label is still written in English, with the label quoted as',
  '  it is. Your final message to the user follows the same language.',
  '  The words the templates and other agents read stay exactly as the templates',
];
const BULLET_FIRST = '- Write the prose of `requirements.md`, `tasks.md`, `design.md` and `breakdown.md` in the';
const BULLET_LAST = '  quoted from the ticket are written as they are.';
const NEXT_BULLET = '- A section with nothing to say is written `Tidak ada`. Never a placeholder: not `- -`, not an';

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const OLD_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden('pre-sdd12', `planner.${f}.json`)]));
const OLD_OUTPUTS = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden('pre-sdd12', `output-by-kind.${f}.json`).outputs]));
const PRE11_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden('pre-sdd11', `planner.${f}.json`)]));
const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};
const bulletOf = (md) => {
  const lines = trackedSections(md).Output.split('\n');
  const at = lines.indexOf(BULLET_FIRST);
  const end = lines.indexOf(NEXT_BULLET);
  return { lines, at, end, bullet: lines.slice(at, end) };
};

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: planner on ${fixture} — the language bullet holds the new sentences, in Specify, in one bullet`, () => {
    const { lines, at, end, bullet } = bulletOf(rendered[fixture].planner.content);
    const specify = lines.indexOf('### 1. Specify');
    const plan = lines.findIndex((l, i) => i > specify && l.startsWith('### '));
    assert.ok(specify >= 0 && at > specify && end > at && end < plan, 'inside ### 1. Specify');
    // the first sentence of the SDD-11 bullet is where it was, then the new sentences, then the rest
    assert.equal(bullet[1], '  language of the ticket description (of the request, when it comes from chat), and the open');
    assert.deepEqual(bullet.slice(2, 2 + NEW_LINES.length), NEW_LINES);
    assert.deepEqual(bullet.slice(2 + NEW_LINES.length), [
      '  show them, in every language: section headings, `Status:` and its values, `AC-n:`,',
      '  `Verify:` and its three forms, `Finding:`, `Assumption A-n:`, `Q-n`, `BLOCKING`,',
      '  `NON-BLOCKING`, `Answer:` and `Tidak ada`. File paths, symbol names, commands and text',
      BULLET_LAST,
    ]);
    assert.equal(lines[at - 1], '  no open `BLOCKING` question is `Status: DRAFT`.');
    assert.ok(rendered[fixture].planner.content.includes(`${NEW_LINES.join('\n')}\n`));
  });

  test(`AC-2: planner on ${fixture} — the only difference from the golden is the changed lines of that bullet`, () => {
    const md = rendered[fixture].planner.content;
    const old = OLD_PLANNER[fixture].content;
    assert.notEqual(md, old);
    assert.equal(md.replace(`${NEW_LINES.join('\n')}\n`, `${OLD_LINES.join('\n')}\n`), old);
    const oldLines = old.split('\n');
    const nowLines = md.split('\n');
    assert.deepEqual(nowLines.filter((l) => !oldLines.includes(l)), NEW_LINES);
    assert.deepEqual(oldLines.filter((l) => !nowLines.includes(l)), OLD_LINES);
    assert.equal(md.match(/^tools: \[.*\]$/m)[0], old.match(/^tools: \[.*\]$/m)[0]);
    assert.equal(nowLines.slice(0, 8).join('\n'), oldLines.slice(0, 8).join('\n'));
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
        assert.equal(now.replace(`${NEW_LINES.join('\n')}\n`, `${OLD_LINES.join('\n')}\n`), old);
      } else {
        assert.equal(now, old, kind);
        assert.ok(!(now ?? '').includes(NEW_LINES[0]), kind);
      }
    }
  });
}

test('AC-4: the bullet is still one bullet and holds no TODO, no heading, no new status value, no list of languages or words to avoid', () => {
  const text = NEW_LINES.join('\n');
  assert.ok(!/\bTODO\b/.test(text));
  assert.ok(!NEW_LINES.some((l) => /^#{2,} /.test(l) || l.startsWith('### ') || l.startsWith('- ')));
  assert.deepEqual(text.match(/\b[A-Z]+(?:_[A-Z]+)+\b/g) ?? [], [], 'no status value is named');
  assert.ok(!/\b(never use|do not use|avoid|forbidden|not allowed)\b/i.test(text), 'states an intent, not words to avoid');
  for (const fixture of FIXTURE_NAMES) {
    const { bullet } = bulletOf(rendered[fixture].planner.content);
    const whole = bullet.join('\n');
    assert.equal(bullet.filter((l) => l.startsWith('- ')).length, 1, 'one bullet');
    assert.ok(!/\bTODO\b/.test(whole));
    assert.ok(!bullet.some((l) => l.startsWith('#') || l.startsWith('## ')));
    assert.deepEqual(whole.match(/\b[A-Z]+(?:_[A-Z]+)+\b/g) ?? [], [], 'no status value in the bullet');
    // one language is named, as the example of a quoted label; no list of languages
    assert.deepEqual([...whole.matchAll(/\b(English|Indonesian|Indonesia|Spanish|French|German|Dutch)\b/g)].map((m) => m[1]), ['English', 'Indonesian', 'English']);
    // no new heading, same step headings
    const heads = (md) => trackedSections(md).Output.split('\n').filter((l) => /^###? /.test(l));
    assert.deepEqual(heads(rendered[fixture].planner.content), heads(OLD_PLANNER[fixture].content));
    assert.ok(!/^## /m.test(trackedSections(rendered[fixture].planner.content).Output));
  }
});

// ---------------------------------------------------------------------------------------------
// AC-5 — curate sync from a planner generated with the SDD-11 text, or before SDD-11
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
  for (const [label, source] of [
    ['generated with the SDD-11 text', () => OLD_PLANNER[fixture].content],
    ['generated before SDD-11', () => PRE11_PLANNER[fixture].content],
  ]) {
    test(`AC-5: ${fixture} — a planner ${label} and not edited: Output is DRIFT and is carried, nothing else changes`, async () => {
      const old = source();
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
      // byte comparison of everything but Output
      for (const { header } of parseSections(old).sections) {
        if (header === 'Output') continue;
        assert.equal(bodyOf(now, header), bodyOf(old, header), header);
      }
      assert.equal(now.split('\n').slice(0, 8).join('\n'), old.split('\n').slice(0, 8).join('\n'));
      if (label === 'generated with the SDD-11 text') {
        assert.equal(now.replace(`${NEW_LINES.join('\n')}\n`, `${OLD_LINES.join('\n')}\n`), old, 'only the sentences are new');
      } else {
        assert.equal(now, sinceSdd12(sinceSdd11(old)), 'only the SDD-11 bullet and the SDD-12 sentences are new');
      }
      const after = agentTree(dir);
      for (const [rel, content] of Object.entries(before)) if (rel !== 'caf-planner.md') assert.equal(after[rel], content, rel);
      assert.deepEqual((await sync(dir, false)).drifted, []);
    });
  }

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
  // test/sdd05a-caf-design.test.js and test/sdd05b-caf-breakdown.test.js. Here: none of them carries
  // the new sentences, and caf-spec still holds its one language line.
  for (const md of [buildSpecSkill(), buildDesignSkill(), buildBreakdownSkill()]) {
    assert.ok(!md.includes(NEW_LINES[0]) && !md.includes('the ticket author wrote in'));
  }
  assert.ok(buildSpecSkill().includes('Write the spec content in the language the ticket is written in.'));
});
