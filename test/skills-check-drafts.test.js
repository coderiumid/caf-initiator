// CAF-SKILLS-01 — `curate --check-drafts` on skills and on the `## Skills` pointers in agent
// definitions. Read-only, and FAIL only for what code can prove (a pointer at a missing file).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';

import { checkDrafts } from '../src/commands/check-drafts.js';
import { listDraftFiles } from '../src/commands/complete-drafts.js';
import { buildCompleteDraftsMd } from '../src/templates/complete-drafts-command.js';
import { SYNCABLE_SECTIONS } from '../src/utils/agent-sections.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { skillsTarget } from '../src/commands/skills.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { SKILL_NAMES, skillPath, hasSkillDraftBanner } from '../src/templates/skill-md.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeRepo, snapshotTree } from './helpers/make-repo.js';

const AGENT_DIR = '.claude/agents';
const KINDS = ['planner', 'frontend', 'qa', 'reviewer', 'auditor'];
const CONSTANT = SKILL_NAMES.filter((n) => n !== 'caf-verify');

function agentsOf() {
  return Object.fromEntries(
    KINDS.map((kind) => [
      `${AGENT_DIR}/caf-${kind}.md`,
      buildAgentMd({ name: kind, role: 'r', scope: 's', scripts: null, packageManager: null, kind, appNames: [], slug: `caf-${kind}` }),
    ])
  );
}

// A repo with agents, then `scaffold skills` with every pointer accepted. `scripts` decides
// whether caf-verify is a DRAFT (default: yes — only `lint` exists).
async function repoWithSkills({ scripts = { lint: 'x' }, pointers = true } = {}) {
  const dir = makeRepo({ 'package.json': { name: 'r', scripts }, 'pnpm-lock.yaml': '', ...(pointers ? agentsOf() : {}) }, 'caf-skills-check-');
  prompts.inject([true, true, true, true]);
  await silenced(() => skillsTarget({ dir }));
  prompts._injected.length = 0;
  return dir;
}

async function check(dir) {
  const saved = process.exitCode;
  process.exitCode = undefined;
  try {
    const result = await silenced(() => checkDrafts({ dir }));
    return { ...result, exitCode: process.exitCode };
  } finally {
    process.exitCode = saved;
  }
}

const about = (findings, rel, level) => findings.filter((f) => f.file === rel && (!level || f.level === level));
const edit = (dir, rel, fn) => fs.writeFileSync(path.join(dir, rel), fn(fs.readFileSync(path.join(dir, rel), 'utf8')));

test('listDraftFiles: skills are part of the one draft inventory', async () => {
  const dir = await repoWithSkills();
  const drafts = await listDraftFiles(dir);
  for (const name of SKILL_NAMES) assert.ok(drafts.includes(skillPath(name)), name);
  const skills = drafts.filter((d) => d.startsWith('.claude/skills/'));
  assert.deepEqual(skills, [...skills].sort());
  assert.deepEqual(await listDraftFiles(makeRepo({ 'package.json': {} }, 'caf-skills-check-')), []);
});

test('AC-10: generator output — constant skills give 0 WARN and no TODO count; nothing fails', async () => {
  const dir = await repoWithSkills();
  const result = await check(dir);
  assert.equal(result.fails, 0, JSON.stringify(result.findings.filter((f) => f.level === 'FAIL')));
  assert.equal(result.exitCode, undefined);
  for (const name of CONSTANT) assert.deepEqual(about(result.findings, skillPath(name)), [], name);
  // no warning is about a skill or a pointer
  assert.deepEqual(result.findings.filter((f) => f.level === 'WARN' && /SKILL\.md|## Skills/.test(`${f.file} ${f.message}`)), []);
});

test('a DRAFT skill is reported: its open TODO lines are counted (INFO), by line start only', async () => {
  const dir = await repoWithSkills();
  const rel = skillPath('caf-verify');
  assert.ok(hasSkillDraftBanner(fs.readFileSync(path.join(dir, rel), 'utf8')));
  const { findings } = await check(dir);
  assert.deepEqual(about(findings, rel).map((f) => f.level), ['INFO']);
  // lint exists; typecheck, test, build do not → 3 lines. The prose "A line marked `TODO`" is not counted.
  assert.match(about(findings, rel)[0].message, /^3 TODO\(s\) still open — DRAFT/);
});

test('a finished caf-verify gives no finding at all', async () => {
  const dir = await repoWithSkills({ scripts: { lint: 'x', typecheck: 'x', test: 'x', build: 'x' } });
  const { findings, fails } = await check(dir);
  assert.equal(fails, 0);
  assert.deepEqual(about(findings, skillPath('caf-verify')), []);
});

test('the ## Skills section does not inflate an agent\'s TODO count', async () => {
  const dir = await repoWithSkills();
  const rel = `${AGENT_DIR}/caf-qa.md`;
  const withSkills = about((await check(dir)).findings, rel, 'INFO')[0].message;
  assert.match(fs.readFileSync(path.join(dir, rel), 'utf8'), /^## Skills$/m);
  const plain = makeRepo({ 'package.json': { name: 'r', scripts: { lint: 'x' } }, ...agentsOf() }, 'caf-skills-check-');
  assert.equal(about((await check(plain)).findings, rel, 'INFO')[0].message, withSkills);
});

test('AC-6: a pointer at a file that does not exist is a FAIL, and the check writes nothing', async () => {
  const dir = await repoWithSkills();
  fs.rmSync(path.join(dir, '.claude/skills/caf-no-guess'), { recursive: true });
  const before = snapshotTree(dir);
  const result = await check(dir);
  assert.deepEqual(snapshotTree(dir), before);

  assert.equal(result.exitCode, 1);
  for (const kind of ['planner', 'frontend', 'qa', 'reviewer']) {
    const fails = about(result.findings, `${AGENT_DIR}/caf-${kind}.md`, 'FAIL');
    assert.equal(fails.length, 1, kind);
    assert.match(fails[0].message, /points at `\.claude\/skills\/caf-no-guess\/SKILL\.md`, which does not exist/);
  }
  assert.deepEqual(about(result.findings, `${AGENT_DIR}/caf-auditor.md`, 'FAIL'), []);
  assert.equal(result.fails, 4);
});

test('AC-6: a pointer at a DRAFT skill is a WARN, not a FAIL', async () => {
  const dir = await repoWithSkills();
  const rel = `${AGENT_DIR}/caf-qa.md`;
  // the generator never writes this pointer — a human added it by hand
  edit(dir, rel, (s) => s.replace('- `.claude/skills/caf-no-guess/SKILL.md`', '- `.claude/skills/caf-verify/SKILL.md`\n- `.claude/skills/caf-no-guess/SKILL.md`'));
  const before = snapshotTree(dir);
  const result = await check(dir);
  assert.deepEqual(snapshotTree(dir), before);

  assert.equal(result.fails, 0);
  const warns = about(result.findings, rel, 'WARN').filter((f) => /## Skills/.test(f.message));
  assert.equal(warns.length, 1);
  assert.match(warns[0].message, /caf-verify\/SKILL\.md`, which still has its DRAFT banner — the agent will skip it/);
});

test('a skill with open TODO lines but no DRAFT banner is a WARN (agents would apply it)', async () => {
  const dir = await repoWithSkills();
  const rel = skillPath('caf-verify');
  edit(dir, rel, (s) => s.replace(/^> .*\n/gm, ''));
  const result = await check(dir);
  assert.equal(result.fails, 0);
  assert.deepEqual(about(result.findings, rel).map((f) => f.level).sort(), ['INFO', 'WARN']);
  assert.match(about(result.findings, rel, 'WARN')[0].message, /3 open TODO line\(s\) but no DRAFT banner/);
  assert.match(about(result.findings, rel, 'INFO')[0].message, /^3 TODO\(s\) still open$/);

  // resolving the lines clears both
  edit(dir, rel, (s) => s.replace(/^- \[ \] TODO.*$/gm, '- no script for this check in this repo'));
  assert.deepEqual(about((await check(dir)).findings, rel), []);
});

test('a leftover generate-time placeholder in a skill is a FAIL', async () => {
  const dir = await repoWithSkills();
  edit(dir, skillPath('caf-piv'), (s) => `${s}\nSee {{APP_1}}.\n`);
  const result = await check(dir);
  assert.equal(result.exitCode, 1);
  assert.match(about(result.findings, skillPath('caf-piv'), 'FAIL')[0].message, /unresolved placeholder \{\{APP_1\}\}/);
});

test('skills without any agent definition are still checked', async () => {
  const dir = await repoWithSkills({ pointers: false });
  const result = await check(dir);
  assert.equal(result.fails, 0);
  assert.equal(about(result.findings, skillPath('caf-verify'), 'INFO').length, 1);
});

// ---------------------------------------------------------------------------------------------
// /caf-complete-drafts
// ---------------------------------------------------------------------------------------------

test('/caf-complete-drafts: skills are globbed at run time, only DRAFT ones are touched, pointers are off limits', () => {
  for (const mode of ['SINGLE_REPO', 'MONOREPO']) {
    const md = buildCompleteDraftsMd({ mode, packageManager: 'pnpm', apps: [{ name: 'a', path: mode === 'MONOREPO' ? 'apps/a' : '.' }], drafts: ['CLAUDE.md'] });
    assert.match(md, /Glob `\.claude\/skills\/\*\/SKILL\.md` \*\*now\*\*/);
    assert.match(md, /Work only on a skill that still starts with a `DRAFT` banner/);
    assert.match(md, /never invent a command/);
    assert.match(md, /do not add a skill pointer to\s+any agent definition/);
    assert.match(md, /Leave a `## Skills` section exactly as it is/);
    assert.deepEqual(findUnresolvedPlaceholders(md), []);
    // the off-limits list is still rendered from SYNCABLE_SECTIONS, and Skills is not in it
    const tracked = Object.keys(SYNCABLE_SECTIONS).map((h) => `\`## ${h}\``).join(', ');
    assert.ok(md.includes(`**Do NOT change** ${tracked}`), mode);
    assert.ok(!tracked.includes('Skills'));
    // a skill that existed at generation time is not baked in as the source of truth
    assert.ok(!md.includes('caf-verify/SKILL.md'));
  }
});
