// CAF-SKILLS-01 — `caf-init scaffold skills`: writing the skill files. (Adding pointers to
// existing agents is covered in skills-pointer.test.js.)

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { skillsTarget } from '../src/commands/skills.js';
import { CHAIN_ORDER, TARGETS } from '../src/commands/scaffold.js';
import { detectSkillDirCollision } from '../src/utils/collision-check.js';
import { SKILL_NAMES, skillPath, hasSkillDraftBanner, countOpenSkillTodos } from '../src/templates/skill-md.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeRepo, copyFixture, snapshotTree } from './helpers/make-repo.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const FIXTURE = { 'single-nuxt': path.join(FIXTURES, 'single-nuxt'), 'mono-pnpm': path.join(FIXTURES, 'mono-pnpm') };

const run = (opts) => silenced(() => skillsTarget(opts));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

// collision paths set process.exitCode = 1 on purpose; restore it so the test run itself passes.
async function withExitCode(fn) {
  const before = process.exitCode;
  process.exitCode = undefined;
  try {
    await fn();
    return process.exitCode;
  } finally {
    process.exitCode = before;
  }
}

test('scaffold skills is a target but not part of the bare chain', () => {
  assert.ok(TARGETS.skills);
  assert.ok(!CHAIN_ORDER.includes('skills'));
});

for (const [name, fixture] of Object.entries(FIXTURE)) {
  test(`AC-2: --dry-run writes nothing — ${name}`, async () => {
    const dir = copyFixture(fixture);
    const before = snapshotTree(dir);
    const result = await run({ dir, dryRun: true });
    assert.deepEqual(snapshotTree(dir), before);
    assert.deepEqual(result.written, []);
  });

  test(`AC-3: a real run writes every skill, a second run changes no byte — ${name}`, async () => {
    const dir = copyFixture(fixture);
    const before = snapshotTree(dir);
    const first = await run({ dir });
    const afterFirst = snapshotTree(dir);

    const added = Object.keys(afterFirst).filter((rel) => !(rel in before)).sort();
    assert.deepEqual(added, SKILL_NAMES.map(skillPath).sort());
    assert.equal(first.written.length, SKILL_NAMES.length);
    for (const rel of Object.keys(before)) assert.equal(afterFirst[rel], before[rel], `${rel} must be untouched`);

    const second = await run({ dir });
    assert.deepEqual(snapshotTree(dir), afterFirst);
    assert.deepEqual(second.written, []);
    assert.equal(second.skipped.length, SKILL_NAMES.length);
  });

  test(`dry-run parity: the dry run reports the same drafts the real run produces — ${name}`, async () => {
    const dir = copyFixture(fixture);
    const dry = await run({ dir, dryRun: true });
    const real = await run({ dir });
    assert.deepEqual(dry.drafts, real.drafts);
    assert.deepEqual(real.drafts, ['caf-verify']);
    for (const skill of SKILL_NAMES) assert.deepEqual(findUnresolvedPlaceholders(read(dir, skillPath(skill))), [], skill);
  });
}

test('MONOREPO fixture: caf-verify scopes every command to its workspace', async () => {
  const dir = copyFixture(FIXTURE['mono-pnpm']);
  await run({ dir });
  const md = read(dir, skillPath('caf-verify'));
  assert.match(md, /`pnpm --filter @mono\/api run typecheck`/);
  assert.match(md, /`pnpm --filter @mono\/web run lint`/);
  assert.match(md, /#### apps\/web\n(?:.*\n)*?- \[ \] TODO: no typecheck script detected/);
});

test('AC-5: a repo without package.json does not crash; caf-verify is a DRAFT full of TODO lines', async () => {
  const dir = makeRepo({ 'README.md': '# nothing here\n' }, 'caf-skills-empty-');
  const result = await run({ dir });
  assert.equal(result.written.length, SKILL_NAMES.length);
  const md = read(dir, skillPath('caf-verify'));
  assert.ok(hasSkillDraftBanner(md));
  assert.equal(countOpenSkillTodos(md), 4);
  assert.ok(!/`(?:pnpm|npm|yarn|bun) run /.test(md), 'no command may be invented');
});

test('a repo with all four scripts gets a caf-verify that is not a DRAFT', async () => {
  const dir = makeRepo(
    { 'package.json': { name: 'full', scripts: { lint: 'x', typecheck: 'x', test: 'x', build: 'x' } }, 'pnpm-lock.yaml': '' },
    'caf-skills-full-'
  );
  const result = await run({ dir });
  assert.deepEqual(result.drafts, []);
  assert.ok(!hasSkillDraftBanner(read(dir, skillPath('caf-verify'))));
  assert.match(read(dir, skillPath('caf-verify')), /- \[ \] `pnpm run test`/);
});

test('never overwrites an existing SKILL.md — unless --force is passed', async () => {
  const dir = copyFixture(FIXTURE['single-nuxt']);
  await run({ dir });
  const rel = skillPath('caf-no-guess');
  const generated = read(dir, rel);
  fs.writeFileSync(path.join(dir, rel), 'my own edits\n');

  await run({ dir });
  assert.equal(read(dir, rel), 'my own edits\n');

  const dryForce = snapshotTree(dir);
  await run({ dir, overwrite: true, dryRun: true });
  assert.deepEqual(snapshotTree(dir), dryForce, '--force --dry-run still writes nothing');

  await run({ dir, overwrite: true });
  assert.equal(read(dir, rel), generated);
});

test('FR-9: folder-level collision — caf-x/ vs x/, both directions', () => {
  const dir = makeRepo({ '.claude/skills/verify/SKILL.md': 'x', '.claude/skills/caf-mine/SKILL.md': 'x' }, 'caf-skills-coll-');
  const skills = path.join(dir, '.claude/skills');
  assert.equal(detectSkillDirCollision(skills, 'caf-verify'), path.join(skills, 'verify'));
  assert.equal(detectSkillDirCollision(skills, 'mine'), path.join(skills, 'caf-mine'));
  assert.equal(detectSkillDirCollision(skills, 'caf-no-guess'), null);
  assert.equal(detectSkillDirCollision(skills, 'caf-'), null);
});

test('FR-9: a colliding skill is not written, the others are, and the exit code is 1', async () => {
  const dir = makeRepo({ 'package.json': { name: 'c' }, '.claude/skills/no-guess/SKILL.md': 'team skill\n' }, 'caf-skills-coll-');
  let result;
  const exitCode = await withExitCode(async () => {
    result = await run({ dir });
  });
  assert.equal(exitCode, 1);
  assert.ok(!fs.existsSync(path.join(dir, skillPath('caf-no-guess'))));
  assert.equal(read(dir, '.claude/skills/no-guess/SKILL.md'), 'team skill\n');
  assert.equal(result.written.length, SKILL_NAMES.length - 1);
  assert.equal(result.collisions.length, 1);

  // --force does not get past a collision either
  const forced = await withExitCode(() => run({ dir, overwrite: true }));
  assert.equal(forced, 1);
  assert.ok(!fs.existsSync(path.join(dir, skillPath('caf-no-guess'))));
});
