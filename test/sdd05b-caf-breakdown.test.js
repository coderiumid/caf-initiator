// CAF-SDD-05b — the skill `caf-breakdown` (born a DRAFT, planner only) and the Planner splitting a
// request into `breakdown.md`: two bullets in `### 1. Specify` of its `## Output`, step 5 and
// `## Constraints` of `/caf-plan`, and the `breakdown.md` line of `.caf/tasks/README.md`.
// `test/fixtures/pre-sdd05b/` is the render from before this ticket (planner, `/caf-plan`, the
// tasks README) — never regenerate it. Every `curate` below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { curate } from '../src/commands/curate.js';
import { skillsTarget, usableSkillPaths } from '../src/commands/skills.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { buildPlanMd } from '../src/templates/plan-command.js';
import {
  SKILLS_BY_KIND,
  SKILL_NAMES,
  buildBreakdownSkill,
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
import { hashSection } from '../src/utils/section-diff.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo } from './helpers/old-repo.js';
import { BREAKDOWN_LINES, PLAN_CONSTRAINT_NEW, PLAN_CONSTRAINT_OLD, PLAN_STEP5_ANCHOR, PLAN_STEP5_NEW, README_LINE, sinceSdd05b } from './helpers/since-05b.js';
import { AGENT_DIR, FIXTURE_NAMES, GOLDEN_DIR, fixtureDir, renderAgents, trackedSections } from './helpers/frozen-kinds.js';
import { sinceSdd06 } from './helpers/since-06.js';
import { sinceSdd11 } from './helpers/since-11.js';
import { sinceSdd12 } from './helpers/since-12.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd05b');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, name), 'utf8'));
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

const BREAKDOWN_REL = skillPath('caf-breakdown');
const DESIGN_REL = skillPath('caf-design');
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');
// sha256 of caf-breakdown.skill.md of the ticket (the skill without its banner), verbatim.
const BREAKDOWN_SOURCE_SHA256 = '52a01b914c6295f8e376febc6675a1c9f50bf097abb28c0b81d0624eded8afe9';
const BANNER = [
  '> DRAFT: this skill has not been tested with real agent dispatches yet.',
  '> Remove this banner only after that test is done.',
  '> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.',
];
// The two bullets of T3, written out again here (not imported from the helper) so a change to
// either copy fails a test.
const SPLIT_LINES = [
  '- Before specifying, check whether the request is one deliverable or several. A request with',
  '  more than one outcome that could ship and be used on its own is split: write `breakdown.md`',
  '  in the task folder, following the `caf-breakdown` skill when `## Skills` lists it. One outcome',
  '  reached in many steps is not split; its steps go to `tasks.md`.',
  '- When you split, write `requirements.md` for the request as a whole as an outline, with',
  '  `Status: NEEDS_CLARIFICATION` and one `BLOCKING` question: split as in `breakdown.md`, or',
  '  continue as one spec. Write no `tasks.md`. Once that question has an `Answer:`, do not split',
  '  again. Never create tickets: that is a human step.',
];

const rendered = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));
const OLD_PLANNER = Object.fromEntries(FIXTURE_NAMES.map((f) => [f, golden(`planner.${f}.json`)]));

const bodyOf = (text, header) => {
  const { lines, sections } = parseSections(text);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
};
const headings = (md) => bodyOf(md, 'Output').split('\n').filter((l) => /^###? /.test(l));
const withoutBanner = (md) => md.replace(`${BANNER.join('\n')}\n\n`, '');
// CAF-CHORE-INIT-01: the template no longer writes the banner; this puts it back to model a repo
// scaffolded before.
const withBanner = (md) => md.replace('\n---\n\n# ', `\n---\n\n${BANNER.join('\n')}\n\n# `);
const flat = (text) => text.replace(/\s+/g, ' ');

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

test('AC-1: caf-breakdown is the last of SKILL_NAMES, no longer born a DRAFT (CAF-CHORE-INIT-01)', () => {
  assert.equal(SKILL_NAMES[SKILL_NAMES.length - 1], 'caf-breakdown');
  assert.equal(SKILL_NAMES.filter((n) => n === 'caf-breakdown').length, 1);
  const file = buildSkillFiles({ mode: 'SINGLE_REPO', verifyApps: [] }).find((f) => f.name === 'caf-breakdown');
  assert.equal(file.relPath, BREAKDOWN_REL);
  assert.equal(file.draft, false);
  assert.equal(file.content, buildBreakdownSkill());
  const fm = file.content.match(/^---\n([\s\S]*?)\n---\n/)[1].split('\n');
  assert.deepEqual(fm.map((l) => l.split(':')[0]), ['name', 'description']);
  assert.equal(fm[0], 'name: caf-breakdown');
  assert.ok(fm[1].slice('description: '.length).length > 0);
  assert.ok(!hasSkillDraftBanner(file.content));
  assert.ok(!hasSkillDraftAgentNotice(file.content));
  assert.equal(countOpenSkillTodos(file.content), 0);
  // front-matter, one blank line, then the heading
  assert.match(file.content, /^---\nname: caf-breakdown\ndescription: [^\n]+\n---\n\n# caf-breakdown/);
  assert.deepEqual(buildTraceabilitySkill().split('\n').filter((l) => l.startsWith('>')), BANNER);
});

test('AC-2: the skill is caf-breakdown.skill.md of the ticket, verbatim, with no banner', () => {
  const md = buildBreakdownSkill();
  assert.equal(sha256(md), BREAKDOWN_SOURCE_SHA256);
  assert.equal(withoutBanner(withBanner(md)), md, 'the banner of an older repo comes off to the same text');
});

test('AC-3: caf-breakdown is mapped to planner and to no other kind, after caf-design; the older entries keep their order', () => {
  const mapped = [...Object.keys(SKILLS_BY_KIND), ...KNOWN_KINDS, 'implementation'].filter((kind) => skillsForKind(kind).includes('caf-breakdown'));
  assert.deepEqual([...new Set(mapped)], ['planner']);
  assert.deepEqual(skillsForKind('planner'), ['caf-scope-discipline', 'caf-no-guess', 'caf-spec', 'caf-traceability', 'caf-design', 'caf-breakdown']);
  const planner = skillsForKind('planner');
  assert.ok(planner.indexOf('caf-breakdown') === planner.indexOf('caf-design') + 1);
});

test('AC-4: a fresh scaffold points the planner at caf-breakdown; a repo that still has the banner does not, until it is removed', async () => {
  const dir = copyFixture(fixtureDir('mono-pnpm'));
  await runSkills(dir);
  const planner = (skills) => buildAgentMd({ name: 'planner', role: 'r', scope: 's', kind: 'planner', slug: 'caf-planner', skills });

  const fresh = usableSkillPaths(dir, 'planner');
  assert.ok(fresh.includes(BREAKDOWN_REL));
  assert.equal(fresh[fresh.length - 1], BREAKDOWN_REL);
  assert.ok(bodyOf(planner(fresh), 'Skills').includes(`- \`${BREAKDOWN_REL}\``));

  fs.writeFileSync(path.join(dir, BREAKDOWN_REL), withBanner(read(dir, BREAKDOWN_REL)), 'utf8');
  const bannered = usableSkillPaths(dir, 'planner');
  assert.ok(!bannered.includes(BREAKDOWN_REL));
  assert.ok(!planner(bannered).includes(BREAKDOWN_REL));
});

test('AC-5: the skill names no status or verdict word, does not tell the reader to wait, and says tickets are not the planner\'s work', () => {
  const body = withoutBanner(buildBreakdownSkill());
  assert.doesNotMatch(body, /\b(SUCCESS|NEEDS_CLARIFICATION|NEEDS_HUMAN|APPROVED|DRAFT|PASS|FAIL|UNVERIFIED|APPROVE|DEFER)\b|CHANGES REQUESTED/);
  assert.doesNotMatch(body, /\bwait\b|confirm|go-ahead|approval/i);
  assert.doesNotMatch(body, /\bTODO\b/);
  assert.match(body, /Do not create tickets, and do not write to a tracker\. A human creates them, or the user is asked in chat, one ticket at a time\./);
  assert.match(body, /breakdown\.md has no `Status:` line and defines no report\./);
  for (const [kind, names] of Object.entries(SKILLS_BY_KIND)) assert.equal(names.includes('caf-breakdown'), kind === 'planner', kind);
});

// ---------------------------------------------------------------------------------------------
// AC-6 .. AC-8 — the planner
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-6: planner on ${fixture} — Specify holds the two bullets in place, with no new heading and no TODO`, async () => {
    const md = rendered[fixture].planner.content;
    assert.deepEqual(BREAKDOWN_LINES, SPLIT_LINES, 'the helper copy is the ticket text');
    const specify = bodyOf(md, 'Output').split('\n');
    const start = specify.indexOf('### 1. Specify');
    const end = specify.indexOf('### 2. Clarify');
    const block = specify.slice(start + 1, end);
    const at = block.indexOf(SPLIT_LINES[0]);
    assert.ok(at > 0, 'inside Specify');
    assert.deepEqual(block.slice(at, at + SPLIT_LINES.length), SPLIT_LINES);
    // right after the opening bullet about reading the task folder
    assert.equal(block[at - 1], '  never write over one you have not read in this run.');
    assert.equal(md.split(SPLIT_LINES.join('\n')).length, 2, 'once');
    assert.deepEqual(headings(md), headings(OLD_PLANNER[fixture].content));
    assert.ok(!/TODO/.test(SPLIT_LINES.join('\n')));

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

  test(`AC-7: planner on ${fixture} — outside the two bullets the file is the pre-ticket golden, byte for byte`, () => {
    const md = rendered[fixture].planner.content;
    const old = OLD_PLANNER[fixture];
    // CAF-SDD-06 changed the contract sentence and added a Specify line (helpers/since-06.js).
    assert.equal(md.replace(`${SPLIT_LINES.join('\n')}\n`, ''), sinceSdd12(sinceSdd11(sinceSdd06(old.content)))); // CAF-SDD-11: helpers/since-11.js
    assert.equal(md, sinceSdd12(sinceSdd11(sinceSdd06(sinceSdd05b(old.content)))));
    assert.equal(md.match(/^tools: \[.*\]$/m)[0], old.content.match(/^tools: \[.*\]$/m)[0]);
    assert.equal(md.split('\n').slice(0, 8).join('\n'), old.content.split('\n').slice(0, 8).join('\n'));
    const now = trackedSections(md);
    const before = trackedSections(old.content);
    for (const header of Object.keys(before)) if (header !== 'Output') assert.equal(now[header], before[header], header);
    assert.equal(bodyOf(md, 'Constraints'), bodyOf(old.content, 'Constraints'));
    // the six Plan lines of 05a are still there
    assert.ok(md.includes('  folder before `tasks.md`, following the `caf-design` skill when `## Skills` lists it.'));
    assert.deepEqual(parseSections(md).sections.map((s) => s.header), parseSections(old.content).sections.map((s) => s.header));
  });
}

test('AC-8: no other kind changed: frozen-kinds hold, and nothing but the planner mentions caf-breakdown', () => {
  for (const fixture of FIXTURE_NAMES) {
    for (const [kind, { content }] of Object.entries(rendered[fixture])) {
      if (kind === 'planner') continue;
      assert.ok(!content.includes('caf-breakdown') && !content.includes(SPLIT_LINES[0]), `${kind} on ${fixture}`);
    }
    const frozen = JSON.parse(fs.readFileSync(path.join(GOLDEN_DIR, `architect.${fixture}.json`), 'utf8'));
    assert.deepEqual(trackedSections(rendered[fixture].architect.content), frozen.sections);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-9 — curate sync from a planner generated at the 05a state
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
  test(`AC-9: ${fixture} — sync of the pre-ticket planner reports Output as DRIFT and rewrites it, nothing else in the file`, async () => {
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
    assert.equal(now.replace(`${SPLIT_LINES.join('\n')}\n`, ''), sinceSdd12(sinceSdd11(sinceSdd06(old))), 'only the two bullets differ (and the 06 and 11 text)');
    assert.equal(now.replace(bodyOf(now, 'Output'), bodyOf(old, 'Output')), old, 'only inside ## Output');
    const after = agentTree(dir);
    for (const [rel, content] of Object.entries(before)) if (rel !== 'caf-planner.md') assert.equal(after[rel], content, rel);

    assert.deepEqual((await sync(dir, false)).drifted, []);
  });

  test(`AC-9: ${fixture} — a planner whose Output was edited by hand is a CONFLICT and the file is unchanged byte for byte`, async () => {
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
// AC-10 — curate audit
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-10: ${fixture} — a skill-pointer warning names caf-breakdown on a fresh scaffold, and not while an older banner is there`, async () => {
    const { dir } = await makeOldRepo(fixture);
    await runSkills(dir);
    const ofPlanner = (result) => result.warnings.filter((w) => w.check === 'skill-pointer' && w.filePath === PLANNER_REL && w.message.includes(BREAKDOWN_REL));
    fs.writeFileSync(path.join(dir, BREAKDOWN_REL), withBanner(read(dir, BREAKDOWN_REL)), 'utf8');
    const clean = await auditOnly(dir);

    assert.ok(read(dir, BREAKDOWN_REL).includes('> DRAFT'));
    assert.deepEqual(ofPlanner(clean), []);

    fs.writeFileSync(path.join(dir, BREAKDOWN_REL), withoutBanner(read(dir, BREAKDOWN_REL)), 'utf8');
    const before = snapshotTree(dir);
    const result = await auditOnly(dir);
    assert.deepEqual(snapshotTree(dir), before, 'audit writes nothing');
    const warnings = ofPlanner(result);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, new RegExp(`\`${BREAKDOWN_REL.replaceAll('.', '\\.')}\``));
    assert.equal(result.exitCode, clean.exitCode);
    assert.equal(result.requiredGaps.length, clean.requiredGaps.length);
    assert.equal(result.declined.length, clean.declined.length);
    assert.deepEqual(result.sectionCounts, clean.sectionCounts);
    assert.ok(!read(dir, DESIGN_REL).includes('> DRAFT'), 'caf-design is not written with a banner any more');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-11 .. AC-14 — /caf-plan
// ---------------------------------------------------------------------------------------------

const planNow = buildPlanMd({ agentDir: '.claude/agents' });
const planGolden = golden('plan-command.json').content;
const step5 = planNow.slice(planNow.indexOf('## 5. Stop'), planNow.indexOf('Do not start implementation'));
const constraints = planNow.slice(planNow.indexOf('## Constraints'));

test('AC-11: /caf-plan step 5 shows breakdown.md and offers to create the tickets one at a time, only with a tracker tool', () => {
  const text = flat(step5);
  assert.match(text, /`breakdown\.md` exists in the folder\*\* and the status is `NEEDS_CLARIFICATION`/);
  assert.match(text, /show the user its items \(id, title, outcome, dependencies\) next to the planner's question/);
  assert.match(text, /Only when a tracker tool is connected in this session/);
  assert.match(text, /offer to create the tickets one at a time/);
  assert.match(text, /one question of its own, with three answers: \*\*yes\*\* \(create it\), \*\*edit\*\* .* or \*\*skip\*\*/);
});

test('AC-12: /caf-plan creates a ticket only after an explicit yes for it, and does nothing without a tracker tool', () => {
  const text = flat(step5);
  assert.match(text, /A ticket is created only after an explicit \*\*yes\*\* for that ticket: never several in one step, and never on silence/);
  assert.match(text, /\*\*edit\*\* \(the user changes the title or the description, then ask again for that item\)/);
  assert.match(text, /\*\*skip\*\* \(create nothing for it\)/);
  assert.match(text, /Report the ID and title of each ticket created in chat/);
  assert.match(text, /does not write them back into `breakdown\.md`/);
  assert.match(text, /With no tracker tool connected, name the file and create nothing/);
  assert.doesNotMatch(planNow, /create all|every ticket at once|for all items/i);
});

test('AC-13: /caf-plan Constraints allow creating a ticket from breakdown.md after an explicit yes, and keep the other prohibitions', () => {
  const text = flat(constraints);
  assert.ok(!text.includes('NEVER posts to the tracker or to a PR'));
  assert.match(text, /It writes to the tracker only to create a ticket from `breakdown\.md`, and only after an explicit yes for that ticket \(step 5\)/);
  assert.match(text, /NEVER changes the status of an existing ticket in the tracker/);
  assert.match(text, /NEVER posts to a PR/);
  assert.match(text, /NEVER runs `git`/);
  assert.match(text, /NEVER writes or edits application code/);
  assert.equal(constraints.replace(PLAN_CONSTRAINT_NEW, PLAN_CONSTRAINT_OLD), planGolden.slice(planGolden.indexOf('## Constraints')));
});

test('AC-14: /caf-plan outside step 5 and Constraints is the golden, and it holds no text of the planner rules', () => {
  assert.equal(planNow.replace(PLAN_CONSTRAINT_NEW, PLAN_CONSTRAINT_OLD).replace(PLAN_STEP5_NEW, PLAN_STEP5_ANCHOR), planGolden);
  for (const line of SPLIT_LINES) assert.ok(!planNow.includes(line.trim()), line);
  assert.doesNotMatch(planNow, /BLOCKING|caf-breakdown/);
  assert.equal(golden('plan-command.json').input.agentDir, '.claude/agents');
});

// ---------------------------------------------------------------------------------------------
// AC-15 — .caf/tasks/README.md
// ---------------------------------------------------------------------------------------------

test('AC-15: the tasks README names breakdown.md as written by the Planner only for a request with several independent outcomes; the rest is the golden', () => {
  const LINE = '  breakdown.md       ← Planner Agent (skill caf-breakdown): proposed tickets, only for a request with several independent outcomes';
  assert.equal(README_LINE, LINE);
  for (const [id, { input, content }] of Object.entries(golden('tasks-readme.json'))) {
    const md = buildTasksReadme(input);
    assert.equal(md.split('\n').filter((l) => l.includes('breakdown.md')).length, 1, id);
    assert.ok(md.split('\n').includes(LINE), id);
    assert.equal(md.replace(`${LINE}\n`, ''), content, id);
  }
});
