// CAF-CHORE-INIT-01 — `caf-design` and `caf-breakdown` are written without the DRAFT banner (their
// dispatch test passed), `caf-traceability` keeps it; `architect` is no longer offered by the
// agent picker. Every run below is on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { listDraftFiles } from '../src/commands/complete-drafts.js';
import { skillsTarget, usableSkillPaths } from '../src/commands/skills.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { buildSkillFiles, hasSkillDraftAgentNotice, hasSkillDraftBanner, skillPath } from '../src/templates/skill-md.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, renderAgents } from './helpers/frozen-kinds.js';

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const ACTIVE = ['caf-design', 'caf-breakdown'];
const PLANNER_REL = path.join(AGENT_DIR, 'caf-planner.md');

async function runSkills(dir) {
  prompts.inject(Array(40).fill(false));
  try {
    return await silenced(() => skillsTarget({ dir }));
  } finally {
    prompts._injected.length = 0;
  }
}

const skillsBody = (md) => {
  const { lines, sections } = parseSections(md);
  const s = sections.find((x) => x.header === 'Skills');
  return s ? sectionBody(lines, s) : null;
};

for (const fixture of FIXTURE_NAMES) {
  test(`AC-1/AC-2/AC-3: ${fixture} — caf-design and caf-breakdown are written with no banner and one blank line after the front-matter; caf-traceability keeps its banner`, async () => {
    const dir = copyFixture(fixtureDir(fixture));
    const result = await runSkills(dir);
    for (const name of ACTIVE) {
      const md = read(dir, skillPath(name));
      assert.ok(!hasSkillDraftBanner(md), name);
      assert.ok(!hasSkillDraftAgentNotice(md), name);
      assert.doesNotMatch(md, /^> DRAFT|NOT ready/m, name);
      assert.match(md, new RegExp(`^---\\nname: ${name}\\ndescription: [^\\n]+\\n---\\n\\n# ${name}`), name);
      assert.ok(!md.includes('---\n\n\n'), `${name}: no two blank lines after the front-matter`);
      assert.ok(!result.drafts.includes(name), name);
    }
    const trace = read(dir, skillPath('caf-traceability'));
    assert.ok(hasSkillDraftBanner(trace) && hasSkillDraftAgentNotice(trace));
    assert.ok(result.drafts.includes('caf-traceability'));
    const files = buildSkillFiles({ mode: 'SINGLE_REPO', verifyApps: [] });
    assert.deepEqual(files.filter((f) => f.draft && ACTIVE.includes(f.name)), []);
  });
}

test('AC-4: a fresh single-nuxt scaffold lists caf-design and caf-breakdown in the planner `## Skills`, and check-drafts does not count them as drafts', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'));
  await runSkills(dir);
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  // the planner as `scaffold agents` writes it now: the pointers come from usableSkillPaths()
  const md = buildAgentMd({ name: 'planner', role: 'r', scope: 's', kind: 'planner', slug: 'caf-planner', skills: usableSkillPaths(dir, 'planner') });
  const body = skillsBody(md);
  for (const name of ACTIVE) {
    assert.ok(body.includes(`- \`${skillPath(name)}\``), name);
  }
  assert.ok(!body.includes(skillPath('caf-traceability')));

  fs.writeFileSync(path.join(dir, PLANNER_REL), md);
  const drafts = await listDraftFiles(dir, AGENT_DIR);
  assert.ok(drafts.includes(skillPath('caf-design')), 'still an inventory of skill files');
  const saved = process.exitCode;
  try {
    const report = await silenced(() => checkDrafts({ dir }));
    // no finding about either skill: not an untested draft, not an open to-do
    assert.deepEqual(report.findings.filter((f) => ACTIVE.some((n) => f.file === skillPath(n))), []);
  } finally {
    process.exitCode = saved;
  }
});

test('AC-5: curate sync leaves an existing skill file byte for byte, whatever it holds', async () => {
  const dir = copyFixture(fixtureDir('single-nuxt'));
  await runSkills(dir);
  // an older repo: caf-design with the banner, caf-breakdown hand-edited
  const old = '> DRAFT: this skill has not been tested with real agent dispatches yet.\n';
  fs.writeFileSync(path.join(dir, skillPath('caf-design')), read(dir, skillPath('caf-design')).replace('\n# caf-design', `\n${old}\n# caf-design`));
  fs.appendFileSync(path.join(dir, skillPath('caf-breakdown')), '\nlocal note\n');
  const { planner } = await renderAgents('single-nuxt');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  fs.writeFileSync(path.join(dir, PLANNER_REL), planner.content);
  const before = snapshotTree(dir);
  const skillsBefore = Object.fromEntries(['caf-design', 'caf-breakdown', 'caf-traceability'].map((n) => [n, read(dir, skillPath(n))]));

  await silenced(() => agentsSync({ dir, dryRun: false }));
  for (const [n, text] of Object.entries(skillsBefore)) assert.equal(read(dir, skillPath(n)), text, n);
  const after = snapshotTree(dir);
  for (const key of Object.keys(before)) if (key.includes('.claude/skills/')) assert.deepEqual(after[key], before[key], key);
});
