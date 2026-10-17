// CAF-SDD-05a — the skill `caf-design` (born a DRAFT, planner only) and the Planner writing
// `design.md`: the `### 3. Plan` step of its `## Output`, the Architect stage of `/caf-run` and the
// `design.md` line of `.caf/tasks/README.md`. `test/fixtures/pre-sdd05a/` is the render from
// before this ticket (planner, `/caf-run`, the tasks README) — never regenerate it. Every `curate`
// below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { HIDDEN_CANDIDATE_KINDS, SUPERSEDED_CANDIDATE_KINDS, buildCandidates, isOfferedCandidate } from '../src/commands/agents.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { curate } from '../src/commands/curate.js';
import { skillsTarget, usableSkillPaths } from '../src/commands/skills.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { buildRunMd } from '../src/templates/run-command.js';
import {
  SKILLS_BY_KIND,
  SKILL_NAMES,
  buildDesignSkill,
  buildSkillFiles,
  buildTraceabilitySkill,
  countOpenSkillTodos,
  hasSkillDraftAgentNotice,
  hasSkillDraftBanner,
  skillPath,
  skillsForKind,
} from '../src/templates/skill-md.js';
import { buildTasksReadme } from '../src/templates/tasks-readme.js';
import { KNOWN_KINDS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { readManifest, setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection, SECTION_STATUS } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { PLAN_NEW, PLAN_OLD } from './helpers/since-05a.js';
import { sinceSdd05b } from './helpers/since-05b.js';
import { AGENT_DIR, FIXTURE_NAMES, GOLDEN_DIR, fixtureDir, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { sinceSdd06 } from './helpers/since-06.js';
import { sinceSdd11 } from './helpers/since-11.js';
import { sinceSdd12 } from './helpers/since-12.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd05a');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, name), 'utf8'));
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

const DESIGN_REL = skillPath('caf-design');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');
// sha256 of caf-design.skill.md of the ticket (the skill without its banner), verbatim.
const DESIGN_SOURCE_SHA256 = '578655df7302e38f7faabdf21fb69dc7183150554f10e3745059d78ee37bd1d2';
const BANNER = [
  '> DRAFT: this skill has not been tested with real agent dispatches yet.',
  '> Remove this banner only after that test is done.',
  '> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.',
];
const PLAN_LINES = [
  '- Decide the approach at the level of work, not code: which agents and apps are involved, in',
  '  what order, and what depends on what.',
  '- A change that touches more than one app or service, adds or changes a schema or a migration,',
  '  or changes a contract between layers needs a technical design: write `design.md` in the task',
  '  folder before `tasks.md`, following the `caf-design` skill when `## Skills` lists it.',
  '  Otherwise write none. Do not design inside `requirements.md` or `tasks.md`.',
];

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const OLD_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`planner.${f}.json`)]));

const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};
const planBlock = (md) => {
  const out = bodyOf(md, 'Output').split('\n');
  const at = out.indexOf('### 3. Plan');
  const end = out.indexOf('### 4. Tasks');
  assert.ok(at >= 0 && end > at, 'the Plan step is there');
  return out.slice(at + 1, end);
};
const headings = (md) => bodyOf(md, 'Output').split('\n').filter((l) => /^###? /.test(l));
const withoutBanner = (md) => md.replace(`${BANNER.join('\n')}\n\n`, '');

async function runSkills(dir) {
  prompts.inject(Array(40).fill(false));
  try {
    return await silenced(() => skillsTarget({ dir }));
  } finally {
    prompts._injected.length = 0;
  }
}

async function auditOnly(dir) {
  const saved = process.exitCode;
  const original = console.log;
  process.exitCode = undefined;
  console.log = () => {};
  try {
    const result = await curate({ dir, mode: 'audit-only' });
    return { ...result, exitCode: process.exitCode };
  } finally {
    console.log = original;
    process.exitCode = saved;
  }
}

// ---------------------------------------------------------------------------------------------
// AC-1 .. AC-5 — the skill
// ---------------------------------------------------------------------------------------------

test('AC-1: caf-design is the last of SKILL_NAMES, born a DRAFT with the 3-line banner and no open to-do line', () => {
  // CAF-SDD-05b appended caf-breakdown after it.
  assert.equal(SKILL_NAMES[SKILL_NAMES.length - 2], 'caf-design');
  assert.equal(SKILL_NAMES.filter((n) => n === 'caf-design').length, 1);
  const file = buildSkillFiles({ mode: 'SINGLE_REPO', verifyApps: [] }).find((f) => f.name === 'caf-design');
  assert.equal(file.relPath, DESIGN_REL);
  assert.equal(file.draft, true);
  assert.equal(file.content, buildDesignSkill());
  const fm = file.content.match(/^---\n([\s\S]*?)\n---\n/)[1].split('\n');
  assert.deepEqual(fm.map((l) => l.split(':')[0]), ['name', 'description']);
  assert.equal(fm[0], 'name: caf-design');
  assert.ok(fm[1].slice('description: '.length).length > 0);
  assert.ok(hasSkillDraftBanner(file.content));
  assert.ok(hasSkillDraftAgentNotice(file.content));
  assert.equal(countOpenSkillTodos(file.content), 0);
  const lines = file.content.split('\n');
  const at = lines.indexOf(BANNER[0]);
  assert.deepEqual(lines.slice(at - 1, at + 4), ['', ...BANNER, '']);
  // the same banner as caf-traceability
  assert.deepEqual(buildTraceabilitySkill().split('\n').filter((l) => l.startsWith('>')), BANNER);
});

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1: scaffold skills writes .claude/skills/caf-design/SKILL.md — ${fixture}`, async () => {
    const dir = copyFixture(fixtureDir(fixture));
    const result = await runSkills(dir);
    assert.ok(result.written.includes(path.join(dir, DESIGN_REL)));
    assert.ok(result.drafts.includes('caf-design'));
    assert.equal(read(dir, DESIGN_REL), buildDesignSkill());
  });
}

test('AC-2: the skill without its banner is the ticket source, verbatim (sha256)', () => {
  const md = buildDesignSkill();
  assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
  const body = withoutBanner(md);
  assert.notEqual(body, md);
  assert.equal(sha256(body), DESIGN_SOURCE_SHA256);
  assert.equal(buildDesignSkill(), md);
});

test('AC-3: caf-design is mapped to planner and to no other kind; the planner keeps the order of its older skills', () => {
  const mapped = [...Object.keys(SKILLS_BY_KIND), ...KNOWN_KINDS, 'implementation'].filter((kind) => skillsForKind(kind).includes('caf-design'));
  assert.deepEqual([...new Set(mapped)], ['planner']);
  assert.deepEqual(skillsForKind('planner'), ['caf-scope-discipline', 'caf-no-guess', 'caf-spec', 'caf-traceability', 'caf-design', 'caf-breakdown']);
  assert.ok(SKILLS_BY_KIND.planner.includes('caf-traceability'));
});

test('AC-4: while caf-design has its banner no planner points at it; without the banner it does', async () => {
  const dir = copyFixture(fixtureDir('mono-pnpm'));
  await runSkills(dir);
  const planner = (skills) => buildAgentMd({ name: 'planner', role: 'r', scope: 's', kind: 'planner', slug: 'caf-planner', skills });

  const withBanner = usableSkillPaths(dir, 'planner');
  assert.ok(!withBanner.includes(DESIGN_REL));
  assert.ok(!planner(withBanner).includes(DESIGN_REL));

  fs.writeFileSync(path.join(dir, DESIGN_REL), withoutBanner(read(dir, DESIGN_REL)), 'utf8');
  const without = usableSkillPaths(dir, 'planner');
  assert.ok(without.includes(DESIGN_REL));
  assert.equal(without[without.length - 1], DESIGN_REL);
  assert.ok(bodyOf(planner(without), 'Skills').includes(`- \`${DESIGN_REL}\``));
});

test('AC-5: the skill names no status or verdict word, does not tell the reader to wait, and no other kind has it', () => {
  const text = buildDesignSkill();
  assert.doesNotMatch(text, /\b(SUCCESS|NEEDS_HUMAN|PASS|FAIL|UNVERIFIED|APPROVE|DEFER)\b|CHANGES REQUESTED/);
  assert.doesNotMatch(text, /\bwait\b|confirm|go-ahead|approval/i);
  assert.doesNotMatch(text, /\bTODO\b/);
  for (const [kind, names] of Object.entries(SKILLS_BY_KIND)) assert.equal(names.includes('caf-design'), kind === 'planner', kind);
});

// ---------------------------------------------------------------------------------------------
// AC-6 .. AC-8 — the planner
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-6: planner on ${fixture} — the Plan step holds the six lines in place of the three, with no new heading and no Architect`, () => {
    const md = rendered[fixture].planner.content;
    assert.deepEqual(planBlock(md), ['- Only when no `BLOCKING` question is open.', ...PLAN_LINES, '']);
    assert.equal(PLAN_NEW, PLAN_LINES.join('\n'));
    assert.deepEqual(headings(md), headings(OLD_PLANNER[fixture].content));
    assert.ok(!/Architect/i.test(md), 'no Architect pointer in the planner');
    assert.ok(OLD_PLANNER[fixture].content.includes(PLAN_OLD), 'precondition: the golden has the three old lines');
  });

  test(`AC-7: planner on ${fixture} — outside the six lines the file is the pre-ticket golden, byte for byte`, () => {
    const md = rendered[fixture].planner.content;
    const old = OLD_PLANNER[fixture];
    assert.equal(md.split(PLAN_NEW).length, 2);
    // CAF-SDD-05b added two bullets to Specify; the golden is read through helpers/since-05b.js.
    assert.equal(md.replace(PLAN_NEW, PLAN_OLD), sinceSdd12(sinceSdd11(sinceSdd06(sinceSdd05b(old.content))))); // CAF-SDD-11: helpers/since-11.js
    // frontmatter, Input, Constraints and Allowed Tools, on their own too
    assert.equal(md.match(/^tools: \[.*\]$/m)[0], old.content.match(/^tools: \[.*\]$/m)[0]);
    assert.equal(md.split('\n').slice(0, 8).join('\n'), old.content.split('\n').slice(0, 8).join('\n'));
    const now = trackedSections(md);
    const before = trackedSections(old.content);
    for (const header of Object.keys(before)) if (header !== 'Output') assert.equal(now[header], before[header], header);
    assert.equal(bodyOf(md, 'Constraints'), bodyOf(old.content, 'Constraints'));
    assert.deepEqual(parseSections(md).sections.map((s) => s.header), parseSections(old.content).sections.map((s) => s.header));
  });

  test(`AC-8: planner on ${fixture} — no TODO in the six lines, and check-drafts counts what it counted`, async () => {
    assert.ok(!/TODO/.test(PLAN_LINES.join('\n')));
    const md = rendered[fixture].planner.content;
    const old = OLD_PLANNER[fixture].content;
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
// AC-9 — architect unchanged
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-9: architect on ${fixture} — every section and the tools are the frozen-kinds golden`, () => {
    const frozen = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, `architect.${fixture}.json`), 'utf8'));
    const { content, file } = rendered[fixture].architect;
    assert.equal(file, frozen.file);
    assert.deepEqual(trackedSections(content), frozen.sections);
    assert.equal(content.match(/^tools: \[(.*)\]$/m)[1].split(', ').join(','), frozen.tools.join(','));
  });
}

test('AC-9: architect is still offered: it is in neither list of dropped kinds', () => {
  assert.ok(!SUPERSEDED_CANDIDATE_KINDS.includes('architect'));
  assert.ok(!HIDDEN_CANDIDATE_KINDS.includes('architect'));
  const stack = { apps: [{ name: 'web', path: 'apps/web' }] };
  const candidates = buildCandidates({ frontend: stack.apps, backend: stack.apps }, []);
  assert.ok(candidates.filter(isOfferedCandidate).some((c) => c.kind === 'architect'));
});

// ---------------------------------------------------------------------------------------------
// AC-10 — curate sync from a planner generated before this ticket
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
  test(`AC-10: ${fixture} — sync of the pre-ticket planner reports Output as DRIFT and rewrites it, nothing else in the file`, async () => {
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
    assert.equal(now.replace(PLAN_NEW, PLAN_OLD), sinceSdd12(sinceSdd11(sinceSdd06(sinceSdd05b(old)))), 'only the Plan step differs (and the 05b bullets, helpers/since-05b.js)');
    assert.equal(now.replace(bodyOf(now, 'Output'), bodyOf(old, 'Output')), old, 'only inside ## Output');
    const after = agentTree(dir);
    for (const [rel, content] of Object.entries(before)) if (rel !== 'caf-planner.md') assert.equal(after[rel], content, rel);

    assert.deepEqual((await sync(dir, false)).drifted, []);
  });

  test(`AC-10: ${fixture} — a planner whose Output was edited by hand is a CONFLICT and the file is unchanged byte for byte`, async () => {
    const old = OLD_PLANNER[fixture].content;
    const edited = old.replace('### 3. Plan', '### 3. Plan\n- Our team: post the plan to the ticket before writing tasks.');
    assert.notEqual(edited, old);
    const dir = await repoWithOldPlanner(fixture, { planner: edited, baselineFrom: old });
    const before = agentTree(dir);

    for (const dryRun of [true, false]) {
      const result = await sync(dir, dryRun);
      assert.deepEqual(result.drifted, []);
      assert.deepEqual(result.updated, []);
      assert.deepEqual(result.needsAttention, [{ file: PLANNER_REL, header: 'Output', status: SECTION_STATUS.CONFLICT }]);
      assert.deepEqual(agentTree(dir), before);
    }
    assert.equal(read(dir, PLANNER_REL), edited);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-11 — curate audit
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-11: ${fixture} — a skill-pointer warning names caf-design once its banner is gone, and not while it is there`, async () => {
    const { dir } = await makeOldRepo(fixture);
    await runSkills(dir);
    const ofPlanner = (result) => result.warnings.filter((w) => w.check === 'skill-pointer' && w.filePath === PLANNER_REL && w.message.includes(DESIGN_REL));
    const clean = await auditOnly(dir);

    assert.ok(read(dir, DESIGN_REL).includes('> DRAFT'));
    assert.deepEqual(ofPlanner(clean), []);

    fs.writeFileSync(path.join(dir, DESIGN_REL), withoutBanner(read(dir, DESIGN_REL)), 'utf8');
    const before = snapshotTree(dir);
    const result = await auditOnly(dir);
    assert.deepEqual(snapshotTree(dir), before, 'audit writes nothing');
    const warnings = ofPlanner(result);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, new RegExp(`\`${DESIGN_REL.replaceAll('.', '\\.')}\``));
    assert.equal(result.exitCode, clean.exitCode);
    assert.equal(result.requiredGaps.length, clean.requiredGaps.length);
    assert.equal(result.declined.length, clean.declined.length);
    assert.deepEqual(result.sectionCounts, clean.sectionCounts);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-12 .. AC-14 — /caf-run
// ---------------------------------------------------------------------------------------------

const PIPELINE = golden('run-pipeline.json');
const SKIP_SENTENCE = [
  'If `design.md` already exists in the ticket folder (`.caf/tasks/{TICKET-ID}/design.md`, written by',
  'Planner), **skip** this stage and note the reason in the final summary.',
].join('\n');
const NO_ARCHITECT_NEW = [
  '`design.md` yourself in the main thread. `design.md` is written by the Planner. If the ticket',
  'meets those criteria and `.caf/tasks/{TICKET-ID}/design.md` does not exist, STOP and report that',
  'to the user so the Planner can be run again.',
].join('\n');

test('AC-12: /caf-run with an Architect skips the stage when design.md exists, and keeps the spawn criteria', () => {
  for (const [id, { input, content }] of Object.entries(PIPELINE)) {
    if (!input.hasArchitect) continue;
    const md = buildRunMd(input);
    assert.equal(md.split(SKIP_SENTENCE).length, 2, id);
    assert.ok(md.indexOf(SKIP_SENTENCE) < md.indexOf('Spawn Architect ('), `${id}: before the spawn criteria`);
    // the previous criteria and closing text are all still there
    for (const kept of [
      'Spawn Architect (`.claude/agents/caf-architect.md`) ONLY if either is true:',
      "- `tasks.md` from Planner explicitly states it needs an architecture/design decision, OR",
      '- the task touches more than one app/service, OR involves a new schema/migration.',
      "If the ticket is simple and single-app, **skip** — go on to stage 3.",
      'Output: `.caf/tasks/{TICKET-ID}/design.md`. If skipped, note in the final summary that this',
    ]) {
      assert.ok(content.includes(kept), `precondition: ${id} golden`);
      assert.ok(md.includes(kept), `${id}: ${kept}`);
    }
  }
});

test('AC-13: /caf-run without an Architect says design.md is the Planner’s and stops only when the ticket meets the criteria and none exists', () => {
  for (const [id, { input, content }] of Object.entries(PIPELINE)) {
    if (input.hasArchitect) continue;
    const md = buildRunMd(input);
    assert.ok(content.includes('go through Architect first'), `precondition: ${id} golden`);
    assert.ok(!md.includes('Architect first'), id);
    assert.ok(!/should\s+go through Architect/.test(md), id);
    assert.equal(md.split(NO_ARCHITECT_NEW).length, 2, id);
    assert.ok(!md.includes(SKIP_SENTENCE), `${id}: nothing to skip without an Architect`);
  }
});

test('AC-14: outside the two Architect-stage paragraphs /caf-run is the pre-ticket golden, byte for byte', () => {
  for (const [id, { input, content }] of Object.entries(PIPELINE)) {
    const md = buildRunMd(input);
    const expected = input.hasArchitect
      ? content.replace('Spawn Architect (`', `${SKIP_SENTENCE}\n\nSpawn Architect (\``)
      : content.replace(
          [
            '`design.md` yourself in the main thread. STOP and report to the user that this ticket should',
            'go through Architect first — they can run `caf-init scaffold agents` to add that role, or',
            'decide to proceed without a formal design.',
          ].join('\n'),
          NO_ARCHITECT_NEW
        );
    assert.notEqual(expected, content, id);
    assert.equal(md, expected, id);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-15 — .caf/tasks/README.md
// ---------------------------------------------------------------------------------------------

test('AC-15: the tasks README names the Planner as the writer of design.md, only when the design criteria are met; the rest is the golden', () => {
  const DESIGN_LINE = '  design.md          ← Planner Agent (skill caf-design): technical approach, only when the change meets the design criteria';
  for (const [id, { input, content }] of Object.entries(golden('tasks-readme.json'))) {
    const md = buildTasksReadme(input);
    assert.ok(md.split('\n').includes(DESIGN_LINE), id);
    assert.ok(!/Architect/.test(md), id);
    assert.equal(md.split('\n').filter((l) => l.includes('design.md')).length, 1, id);
    const old = content.split('\n');
    const at = old.findIndex((l) => l.includes('design.md'));
    assert.match(old[at], /Architect Agent/, `precondition: ${id} golden`);
    old[at] = DESIGN_LINE;
    // CAF-SDD-05b added the breakdown.md line; the golden is read through helpers/since-05b.js.
    assert.equal(md, sinceSdd05b(old.join('\n')), id);
  }
});
