// CAF-SDD-10 — `caf-spec` v4: the skill is aligned with the planner's `## Output` on four points
// (empty-section marker, numbered assumptions, the `NEEDS_HUMAN` status value, the refactor/config
// exception) and loses its stale `flow.md` line. The text is the ticket source verbatim (sha256);
// `test/fixtures/pre-sdd10/caf-spec.v3.SKILL.md` is the v3 render recorded from the HEAD before the
// change — never regenerate it.

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { skillsTarget } from '../src/commands/skills.js';
import { buildSpecSkill, skillPath, SKILL_NAMES } from '../src/templates/skill-md.js';
import { copyFixture, makeRepo, snapshotTree } from './helpers/make-repo.js';
import { FIXTURE_NAMES, fixtureDir, renderAgents } from './helpers/frozen-kinds.js';
import { silenced } from './helpers/mono-snapshot.js';
import { SPEC_V3, SPEC_V3_TO_V4, sinceSdd10 } from './helpers/since-10.js';
import { sinceSdd06 } from './helpers/since-06.js';
import { SKILL_FIXTURES, renderSkillFiles } from './helpers/skills-render.js';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const FIXTURES = path.join(ROOT, 'test', 'fixtures');
const SPEC_REL = skillPath('caf-spec');

// sha256 of .ai/tasks/CAF-SDD-10/caf-spec.skill.v4.md (no trailing newline: a generated skill is
// its source plus the one newline every generated skill ends with).
const SPEC_V4_SHA256 = '0701f633d18fc04157abae04637c7ce3af43b57c2455d3eb8362f763cd8de6ad';
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');

test('AC-1: caf-spec is the v4 ticket source verbatim (sha256), 76 lines, one trailing newline', () => {
  const md = buildSpecSkill();
  assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
  assert.equal(sha256(md.slice(0, -1)), SPEC_V4_SHA256);
  assert.equal(md.split('\n').length - 1, 76);
});

test('AC-2: v4 differs from the recorded v3 in exactly six places', () => {
  assert.equal(SPEC_V3.split('\n').length - 1, 77, 'the fixture is the 77-line v3');
  assert.equal(SPEC_V3_TO_V4.length, 6);
  assert.equal(sinceSdd10(SPEC_V3), buildSpecSkill());
  // each replacement is in v3 once, and none of the v3 texts is left in v4
  for (const [from] of SPEC_V3_TO_V4) {
    assert.equal(SPEC_V3.split(from).length, 2, from);
    assert.ok(!buildSpecSkill().includes(from), from);
  }
});

test('AC-3: no `-` empty-section marker, `Tidak ada` twice, no `flow.md`', () => {
  const md = buildSpecSkill();
  assert.ok(!md.includes('write `-`') && !md.includes('(or `-`)'));
  assert.equal(md.match(/Tidak ada/g).length, 2);
  assert.ok(!md.includes('flow.md'));
  assert.ok(!/\bTODO\b/.test(md));
  assert.ok(md.split('\n').length - 1 <= 90);
});

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: planner on ${fixture} is the planner of before this ticket`, async () => {
    const golden = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd06', `planner.${fixture}.json`), 'utf8'));
    const rendered = await renderAgents(fixture);
    assert.equal(rendered.planner.content, sinceSdd06(golden.content));
  });
}

for (const fixture of SKILL_FIXTURES) {
  test(`AC-5: scaffold skills writes the same files as before except caf-spec — ${fixture}`, async () => {
    const before = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'pre-sdd03c2d', `skills.${fixture}.json`), 'utf8')).files;
    const now = await renderSkillFiles(fixture);
    assert.equal(now[SPEC_REL], buildSpecSkill());
    let held = 0;
    for (const [rel, content] of Object.entries(before)) {
      if (rel === SPEC_REL || rel.includes('caf-verify') || content.includes('caf-verify')) continue; // renamed caf-self-verify in 03c2d
      assert.equal(now[rel], content, rel);
      held += 1;
    }
    assert.ok(held >= 3, 'scope-discipline, no-guess, escalate, traceability are compared');
    assert.deepEqual(
      Object.keys(now).sort(),
      SKILL_NAMES.map(skillPath).sort(),
      'the same nine skills'
    );
  });
}

test('AC-6: a repo that already has the v3 caf-spec keeps it byte for byte', async () => {
  const dir = makeRepo({ 'package.json': { name: 'has-v3' } }, 'caf-sdd10-v3-');
  fs.mkdirSync(path.dirname(path.join(dir, SPEC_REL)), { recursive: true });
  fs.writeFileSync(path.join(dir, SPEC_REL), SPEC_V3);
  const result = await silenced(() => skillsTarget({ dir }));
  assert.equal(fs.readFileSync(path.join(dir, SPEC_REL), 'utf8'), SPEC_V3);
  assert.ok(result.skipped.includes(path.join(dir, SPEC_REL)));
  assert.ok(!result.written.includes(path.join(dir, SPEC_REL)));
  // the dry run leaves it alone too
  const dry = await silenced(() => skillsTarget({ dir, dryRun: true }));
  assert.equal(fs.readFileSync(path.join(dir, SPEC_REL), 'utf8'), SPEC_V3);
  assert.ok(dry.skipped.includes(path.join(dir, SPEC_REL)));
});
