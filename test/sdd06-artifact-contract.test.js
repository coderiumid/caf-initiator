// CAF-SDD-06 — the planner's artifact contract names `design.md` and `breakdown.md` (one value,
// ARTIFACT_BY_ROLE.planner, rendered in the planner's `## Output` sentence and in the Planner row
// of `agent-handoff.md`), and `### 1. Specify` has one line for an outline `requirements.md`.
// `test/fixtures/pre-sdd06/` is the render from before this ticket (the planner of both fixtures
// and the default `agent-handoff.md`) — never regenerate it. Every `curate` below runs on a temp
// copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { ARTIFACT_BY_ROLE } from '../src/templates/artifact-by-role.js';
import { KNOWN_KINDS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { readManifest, setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { renderDefaultFileSet } from './helpers/default-file-set.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, renderAgents } from './helpers/frozen-kinds.js';
import { sinceSdd11 } from './helpers/since-11.js';
import { sinceSdd12 } from './helpers/since-12.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd06');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, name), 'utf8'));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');
const HANDOFF_REL = '.caf/workflows/agent-handoff.md';

// Written out here, not imported from `src/` or the helper, so a change to any copy fails a test.
const ARTIFACTS = '`requirements.md`, `tasks.md` (and `design.md` or `breakdown.md` when the request needs one)';
const CONTRACT = `Produces ${ARTIFACTS} in \`.caf/tasks/{TICKET-ID}/\` for the next agent to read.`;
const OLD_CONTRACT = 'Produces `requirements.md`, `tasks.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.';
const ROW = `| Planner | ${ARTIFACTS} |`;
const OLD_ROW = '| Planner | `requirements.md`, `tasks.md` |';
const ANCHOR = '- An AC that holds more than one behavior is split into one AC per behavior.';
const OUTLINE_LINE = [
  '- A `requirements.md` written as an outline for a split request has no acceptance criteria:',
  '  write `Tidak ada` under that section.',
];
const NUMBERING_LINE = '- Number every acceptance criterion `AC-1:`, `AC-2:`, ... and end each one with `Verify:` in';

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const OLD_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`planner.${f}.json`)]));
const OLD_HANDOFF = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`agent-handoff.${f}.json`)]));
const handoff = {};
for (const f of FIXTURE_NAMES) {
  const set = await renderDefaultFileSet({ fixture: f });
  handoff[f] = read(set.dir, HANDOFF_REL);
}

const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};
const headings = (text) => text.split('\n').filter((l) => /^###? /.test(l));
const sectionHeaders = (text) => parseSections(text).sections.map((s) => s.header);
const specifyOf = (md) => {
  const out = bodyOf(md, 'Output');
  const start = out.indexOf('### 1. Specify');
  return out.slice(start, out.indexOf('\n### ', start + 1));
};
const SPLIT_ONE_AC = [ANCHOR];

// ---------------------------------------------------------------------------------------------
// AC-1 — the contract sentence
// ---------------------------------------------------------------------------------------------

test('AC-1: ARTIFACT_BY_ROLE.planner is the new value and no other role changed', () => {
  assert.equal(ARTIFACT_BY_ROLE.planner, ARTIFACTS);
  assert.deepEqual(
    { ...ARTIFACT_BY_ROLE, planner: undefined },
    {
      planner: undefined,
      architect: '`design.md`',
      frontend: 'code + `verify-report.md`',
      backend: 'code + `verify-report.md`',
      implementer: 'code + `verify-report.md`',
      qa: '`qa-report.md`',
      validator: '`validate-report.md`',
      reviewer: '`review-notes.md`',
      documentation: 'update `docs/` (parallel, non-blocking)',
      auditor: '`audit-report.md`',
    }
  );
});

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: planner on ${fixture} — the first sentence of \`## Output\` is the new contract sentence`, () => {
    const md = rendered[fixture].planner.content;
    assert.equal(bodyOf(md, 'Output').split('\n')[0], CONTRACT);
    assert.equal(md.split(CONTRACT).length, 2, 'once in the file');
    assert.ok(!md.includes(OLD_CONTRACT));
    assert.equal(bodyOf(OLD_PLANNER[fixture].content, 'Output').split('\n')[0], OLD_CONTRACT, 'precondition: the golden has the old sentence');
  });

  test(`AC-1: every other kind on ${fixture} has the contract sentence of its own ARTIFACT_BY_ROLE value`, () => {
    for (const [kind, { content }] of Object.entries(rendered[fixture])) {
      if (kind === 'planner' || !ARTIFACT_BY_ROLE[kind]) continue;
      const first = (bodyOf(content, 'Output') || '').split('\n')[0];
      if (kind === 'auditor') continue; // its sentence names `.caf/audits/<DATE>/`, not the tasks folder
      if (!first.startsWith('Produces ')) continue; // pm/ux-designer render their own Output
      assert.equal(first, `Produces ${ARTIFACT_BY_ROLE[kind]} in \`.caf/tasks/{TICKET-ID}/\` for the next agent to read.`, kind);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-2 — the roster row of agent-handoff.md
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-2: agent-handoff.md on ${fixture} — only the Planner row differs from the golden, and it shows the AC-1 artifacts`, () => {
    const now = handoff[fixture];
    const old = OLD_HANDOFF[fixture].content;
    assert.ok(old.includes(OLD_ROW), 'precondition: the golden has the old row');
    assert.ok(now.includes(ROW));
    assert.equal(now.split('\n').filter((l) => l.startsWith('| Planner |')).length, 1);
    assert.equal(now.replace(ROW, OLD_ROW), old, 'with the row put back the file is the golden, byte for byte');
    const changed = now.split('\n').filter((l, i) => l !== old.split('\n')[i]);
    assert.deepEqual(changed, [ROW]);
  });

  test(`AC-2: agent-handoff.md on ${fixture} — the word SUCCESS is not new outside the Status line`, () => {
    const outside = (text) => text.split('\n').filter((l) => !/^\s*Status:/.test(l)).join('\n');
    const count = (text) => (outside(text).match(/\bSUCCESS\b/g) || []).length;
    assert.equal(count(handoff[fixture]), count(OLD_HANDOFF[fixture].content));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-3 — the Specify line
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-3: planner on ${fixture} — the outline line is in \`### 1. Specify\`, directly after the split-AC line, once`, () => {
    const md = rendered[fixture].planner.content;
    const specify = specifyOf(md).split('\n');
    const at = specify.indexOf(ANCHOR);
    assert.ok(at > 0);
    assert.equal(specify.filter((l) => l === ANCHOR).length, 1);
    assert.deepEqual(specify.slice(at + 1, at + 1 + OUTLINE_LINE.length), OUTLINE_LINE);
    assert.equal(md.split(OUTLINE_LINE[0]).length, 2, 'once in the file');
    // a separate line: the numbering line is the golden's, untouched
    assert.ok(specify.includes(NUMBERING_LINE));
    assert.ok(OLD_PLANNER[fixture].content.includes(NUMBERING_LINE));
    assert.ok(!OLD_PLANNER[fixture].content.includes(OUTLINE_LINE[0]));
    assert.ok(OLD_PLANNER[fixture].content.includes(SPLIT_ONE_AC[0]), 'precondition: the anchor is in the golden');
  });

  test(`AC-3: planner on ${fixture} — no new heading, no TODO word, check-drafts counts the same open TODO lines`, async () => {
    const md = rendered[fixture].planner.content;
    const old = OLD_PLANNER[fixture].content;
    assert.deepEqual(headings(bodyOf(md, 'Output')), headings(bodyOf(old, 'Output')));
    assert.deepEqual(sectionHeaders(md), sectionHeaders(old));
    assert.ok(!/\bTODO\b/.test(OUTLINE_LINE.join('\n')));
    assert.equal((md.match(/TODO/g) || []).length, (old.match(/TODO/g) || []).length);
    const findingsOf = async (content) => {
      const dir = copyFixture(fixtureDir(fixture));
      fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
      fs.writeFileSync(path.join(dir, PLANNER_REL), content, 'utf8');
      const saved = process.exitCode;
      try {
        const result = await silenced(() => checkDrafts({ dir }));
        return result.findings.filter((f) => f.file === PLANNER_REL);
      } finally {
        process.exitCode = saved;
      }
    };
    assert.deepEqual(await findingsOf(md), await findingsOf(old));
  });
}

// ---------------------------------------------------------------------------------------------
// AC-4 — nothing else in the planner changed
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-4: planner on ${fixture} — outside the AC-1 sentence and the AC-3 line the file is the golden, byte for byte`, () => {
    const md = rendered[fixture].planner.content;
    const old = sinceSdd12(sinceSdd11(OLD_PLANNER[fixture].content)); // CAF-SDD-11: helpers/since-11.js
    assert.notEqual(md, old);
    assert.equal(md.replace(CONTRACT, OLD_CONTRACT).replace(`${OUTLINE_LINE.join('\n')}\n`, ''), old);
    const mdLines = md.split('\n');
    const oldLines = old.split('\n');
    const added = mdLines.filter((l) => !oldLines.includes(l));
    assert.deepEqual(added, [CONTRACT, ...OUTLINE_LINE]);
    assert.deepEqual(oldLines.filter((l) => !mdLines.includes(l)), [OLD_CONTRACT]);
    assert.equal(md.match(/^tools: \[.*\]$/m)[0], old.match(/^tools: \[.*\]$/m)[0]);
    for (const header of sectionHeaders(old)) {
      if (header === 'Output') continue;
      assert.equal(bodyOf(md, header), bodyOf(old, header), header);
    }
  });
}

// ---------------------------------------------------------------------------------------------
// AC-5 — no other kind changed
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: ${fixture} — every kind other than planner renders without the new text`, () => {
    for (const [kind, { content }] of Object.entries(rendered[fixture])) {
      if (kind === 'planner') continue;
      assert.ok(!content.includes('(and `design.md` or `breakdown.md` when the request needs one)'), kind);
      assert.ok(!content.includes(OUTLINE_LINE[0]), kind);
    }
    for (const kind of KNOWN_KINDS) if (kind !== 'planner') assert.notEqual(ARTIFACT_BY_ROLE[kind], ARTIFACTS, kind);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6 — curate sync on a planner generated before this ticket
// ---------------------------------------------------------------------------------------------

/** `makeOldRepo` with the pre-ticket planner written and baselined (`baselineFrom` is what the manifest records). */
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
  test(`AC-6: ${fixture} — sync of the pre-ticket planner reports Output as DRIFT and rewrites it, nothing else in the file`, async () => {
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
    assert.ok(now.includes(CONTRACT) && now.includes(OUTLINE_LINE[0]));
    assert.equal(now.replace(bodyOf(now, 'Output'), bodyOf(old, 'Output')), old, 'only inside ## Output');
    const after = agentTree(dir);
    for (const [rel, content] of Object.entries(before)) if (rel !== 'caf-planner.md') assert.equal(after[rel], content, rel);

    assert.deepEqual((await sync(dir, false)).drifted, []);
  });

  test(`AC-6: ${fixture} — a planner whose Output was edited by hand is a CONFLICT and the file is unchanged byte for byte`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    assert.notEqual(edited, old);
    const dir = await repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      assert.deepEqual(result.drifted, [], `dryRun=${dryRun}`);
      assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Output', status: 'CONFLICT' }], `dryRun=${dryRun}: reported`);
      assert.deepEqual(agentTree(dir), before, `dryRun=${dryRun}: byte for byte`);
    }
    assert.equal(read(dir, PLANNER_REL), edited);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-7 — snapshot and goldens
// ---------------------------------------------------------------------------------------------

test('AC-7: no test is marked todo or skipped in this file', () => {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
  assert.ok(!/\btest\.(todo|skip)\(/.test(src));
});
