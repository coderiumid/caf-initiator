// CAF-SKILLS-01 — the skill templates (src/templates/skill-md.js): pure, deterministic, and
// honest about what detection did not find.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SKILLS_DIR,
  SKILL_NAMES,
  SKILLS_BY_KIND,
  skillsForKind,
  skillPath,
  hasSkillDraftBanner,
  countOpenSkillTodos,
  buildSkillFiles,
  buildVerifySkill,
} from '../src/templates/skill-md.js';
import { KNOWN_KINDS } from '../src/utils/agent-sections.js';
import { matchVerifyScripts } from '../src/utils/package-scripts.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const SINGLE = path.join(FIXTURES, 'single-nuxt');
const MONO = path.join(FIXTURES, 'mono-pnpm');

const ALL_SCRIPTS = { lint: 'lint', typecheck: 'typecheck', test: 'test', build: 'build' };
const NO_SCRIPTS = { lint: null, typecheck: null, test: null, build: null };

const SHAPES = {
  single: { mode: 'SINGLE_REPO', verifyApps: [{ scripts: matchVerifyScripts(SINGLE, '.'), packageManager: 'pnpm', packageName: null, appPath: '.' }] },
  mono: {
    mode: 'MONOREPO',
    verifyApps: [
      { scripts: matchVerifyScripts(MONO, 'apps/web'), packageManager: 'pnpm', packageName: '@mono/web', appPath: 'apps/web' },
      { scripts: matchVerifyScripts(MONO, 'apps/api'), packageManager: 'pnpm', packageName: '@mono/api', appPath: 'apps/api' },
    ],
  },
  empty: { mode: 'SINGLE_REPO', verifyApps: [{ scripts: NO_SCRIPTS, packageManager: null, packageName: null, appPath: '.' }] },
  complete: { mode: 'SINGLE_REPO', verifyApps: [{ scripts: ALL_SCRIPTS, packageManager: 'pnpm', packageName: null, appPath: '.' }] },
};

const CONSTANT = SKILL_NAMES.filter((n) => n !== 'caf-verify');
const byName = (files, name) => files.find((f) => f.name === name);

test('skill set: five caf- prefixed skills under .claude/skills, in a fixed order', () => {
  assert.deepEqual(SKILL_NAMES, ['caf-verify', 'caf-scope-discipline', 'caf-no-guess', 'caf-escalate', 'caf-piv']);
  assert.ok(SKILL_NAMES.every((n) => n.startsWith('caf-')));
  assert.equal(SKILLS_DIR, '.claude/skills');
  const files = buildSkillFiles(SHAPES.single);
  assert.deepEqual(files.map((f) => f.name), SKILL_NAMES);
  for (const f of files) {
    assert.equal(f.relPath, skillPath(f.name));
    assert.equal(f.relPath, `.claude/skills/${f.name}/SKILL.md`);
    // Claude Code needs `name` (= folder) and `description` in the frontmatter, nothing else.
    const fm = f.content.match(/^---\n([\s\S]*?)\n---\n/)[1].split('\n');
    assert.deepEqual(fm.map((l) => l.split(':')[0]), ['name', 'description'], f.name);
    assert.equal(fm[0], `name: ${f.name}`);
    assert.ok(!fm[1].slice('description: '.length).includes(': '), `${f.name}: ": " would break the YAML scalar`);
  }
});

test('mapping (D7): exact table, caf-piv mapped to no kind, restricted kinds get nothing', () => {
  const impl = ['caf-verify', 'caf-scope-discipline', 'caf-no-guess', 'caf-escalate'];
  const writer = ['caf-scope-discipline', 'caf-no-guess'];
  assert.deepEqual(
    Object.fromEntries([...KNOWN_KINDS, 'implementation'].map((k) => [k, skillsForKind(k)])),
    {
      planner: writer, architect: writer, frontend: impl, backend: impl, implementer: impl,
      qa: ['caf-verify', 'caf-no-guess'], reviewer: writer, documentation: writer,
      auditor: [], pm: [], 'ux-designer': [], devops: [], implementation: impl,
    }
  );
  for (const [kind, names] of Object.entries(SKILLS_BY_KIND)) {
    assert.ok(!names.includes('caf-piv'), `${kind} must not point at caf-piv`);
    assert.ok(names.every((n) => SKILL_NAMES.includes(n)), kind);
    // pointer order follows SKILL_NAMES
    assert.deepEqual(names, SKILL_NAMES.filter((n) => names.includes(n)), kind);
  }
  assert.deepEqual(skillsForKind('some-custom-agent'), []);
  skillsForKind('qa').push('x');
  assert.deepEqual(skillsForKind('qa'), ['caf-verify', 'caf-no-guess'], 'callers get a copy');
});

test('deterministic: same input → same bytes; app order does not matter', () => {
  for (const shape of Object.values(SHAPES)) {
    assert.deepEqual(buildSkillFiles(shape), buildSkillFiles(shape));
  }
  const reversed = { ...SHAPES.mono, verifyApps: [...SHAPES.mono.verifyApps].reverse() };
  assert.equal(buildVerifySkill(reversed), buildVerifySkill(SHAPES.mono));
});

test('AC-8: no generate-time placeholder in any skill, for every repo shape', () => {
  for (const [label, shape] of Object.entries(SHAPES)) {
    for (const f of buildSkillFiles(shape)) {
      assert.deepEqual(findUnresolvedPlaceholders(f.content), [], `${label} ${f.name}`);
    }
  }
});

test('caf-verify: MONOREPO commands are scoped per workspace, grouped per app path', () => {
  const md = buildVerifySkill(SHAPES.mono);
  assert.match(md, /#### apps\/api\n[\s\S]*`pnpm --filter @mono\/api run typecheck`/);
  assert.match(md, /#### apps\/web\n[\s\S]*`pnpm --filter @mono\/web run lint`/);
  assert.ok(md.indexOf('#### apps/api') < md.indexOf('#### apps/web'));
  assert.ok(!/`pnpm run /.test(md), 'no unscoped root command in a monorepo');
  assert.match(md, /repo mode `MONOREPO`/);
});

test('caf-verify: SINGLE_REPO commands are the unscoped root scripts', () => {
  const md = buildVerifySkill(SHAPES.single);
  assert.match(md, /- \[ \] `pnpm run lint`/);
  assert.match(md, /- \[ \] `pnpm run typecheck`/);
  assert.ok(!/--filter/.test(md));
});

test('caf-verify: a slot without a script is a TODO line and makes the skill a DRAFT; a full set does not', () => {
  // single-nuxt has no test script; mono apps/web has no typecheck.
  for (const label of ['single', 'mono', 'empty']) {
    const verify = byName(buildSkillFiles(SHAPES[label]), 'caf-verify');
    assert.equal(verify.draft, true, label);
    assert.ok(hasSkillDraftBanner(verify.content), label);
    assert.ok(countOpenSkillTodos(verify.content) > 0, label);
  }
  assert.equal(countOpenSkillTodos(buildVerifySkill(SHAPES.empty)), 4);
  assert.match(buildVerifySkill(SHAPES.single), /- \[ \] TODO: no test script detected/);

  const complete = byName(buildSkillFiles(SHAPES.complete), 'caf-verify');
  assert.equal(complete.draft, false);
  assert.ok(!hasSkillDraftBanner(complete.content));
  assert.equal(countOpenSkillTodos(complete.content), 0);
});

test('constant skills are born complete: no banner, no line starting with TODO, same in every repo', () => {
  const single = buildSkillFiles(SHAPES.single);
  for (const name of CONSTANT) {
    const f = byName(single, name);
    assert.equal(f.draft, false, name);
    assert.ok(!hasSkillDraftBanner(f.content), name);
    assert.equal(countOpenSkillTodos(f.content), 0, name);
    assert.ok(!/DRAFT/.test(f.content.split('\n').slice(0, 15).join('\n')), `${name}: no DRAFT near the top`);
    assert.equal(byName(buildSkillFiles(SHAPES.mono), name).content, f.content, name);
    // A literal `<pm> run <script>` example would be read as a real command claim.
    assert.ok(!/`(?:pnpm|npm|yarn|bun) run /.test(f.content), name);
  }
});

test('skills an agent may point at never tell it to wait for a chat reply (headless runs have none)', () => {
  const files = buildSkillFiles(SHAPES.single);
  const mapped = [...new Set(Object.values(SKILLS_BY_KIND).flat())];
  for (const name of mapped) {
    assert.ok(!/\bwait for\b|go-ahead|\bconfirmation\b|\bapproval\b/i.test(byName(files, name).content), name);
    assert.match(byName(files, name).content, /agent definition/);
  }
  assert.match(byName(files, 'caf-piv').content, /wait for the user's go-ahead/);
  assert.match(byName(files, 'caf-piv').content, /do not\s+apply this in an agent or headless run/);
});

test('hasSkillDraftBanner / countOpenSkillTodos: banner is a blockquote near the top, TODO counts only at line start', () => {
  assert.equal(hasSkillDraftBanner('# T\n\n> DRAFT generated\n'), true);
  assert.equal(hasSkillDraftBanner('# T\n\nThis is a DRAFT in prose\n'), false);
  assert.equal(hasSkillDraftBanner(`${'x\n'.repeat(20)}> DRAFT late\n`), false);
  assert.equal(countOpenSkillTodos('TODO: a\n- TODO b\n- [ ] TODO: c\n  * [x] TODO d\n1. TODO e\n'), 5);
  assert.equal(countOpenSkillTodos('write `TODO: x` here\nA line marked `TODO` above\nTODOS are fine\n'), 0);
});
