// CAF-SDD-01 — the `caf-spec` skill (requirements.md format for SDD): written by `scaffold
// skills` like every other skill, mapped to the planner, and born a DRAFT so that no agent is
// pointed at it until a human has tested it and removed the banner.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { skillsTarget, usableSkillPaths } from '../src/commands/skills.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import {
  SKILL_NAMES,
  SKILLS_BY_KIND,
  skillsForKind,
  skillPath,
  buildSpecSkill,
  buildSkillFiles,
  hasSkillDraftBanner,
  hasSkillDraftAgentNotice,
  countOpenSkillTodos,
} from '../src/templates/skill-md.js';
import { parseSections } from '../src/utils/agent-sections.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeRepo, copyFixture, snapshotTree } from './helpers/make-repo.js';

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const FIXTURE = { 'single-nuxt': path.join(FIXTURES, 'single-nuxt'), 'mono-pnpm': path.join(FIXTURES, 'mono-pnpm') };
const REL = skillPath('caf-spec');

// The proven 3-line banner, exactly as in .ai/tasks/CAF-SDD-01/caf-spec.source.md.
const BANNER = [
  '> DRAFT: skill ini belum diuji dispatch nyata di umkm-pos.',
  '> Hapus banner ini hanya setelah uji selesai.',
  '> Agents: this skill is NOT ready. Do not apply any rule in this file; ignore it entirely until this banner is removed.',
];

const run = (opts) => silenced(() => skillsTarget(opts));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const pointersIn = (md) => [...md.matchAll(/^- `([^`]+\/SKILL\.md)`$/gm)].map((m) => m[1]);

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

test('caf-spec template: pure, constant, registered in the one skill list', () => {
  assert.equal(REL, '.claude/skills/caf-spec/SKILL.md');
  assert.ok(SKILL_NAMES.includes('caf-spec'));
  assert.equal(buildSpecSkill(), buildSpecSkill());
  const file = buildSkillFiles({ mode: 'SINGLE_REPO', verifyApps: [] }).find((f) => f.name === 'caf-spec');
  assert.equal(file.content, buildSpecSkill());
  assert.equal(file.relPath, REL);
  assert.equal(file.draft, true);
  assert.equal(buildSkillFiles({ mode: 'MONOREPO', verifyApps: [] }).find((f) => f.name === 'caf-spec').content, file.content);
});

test('AC-6: the template is at most 90 lines', () => {
  const md = buildSpecSkill();
  assert.ok(md.endsWith('\n') && !md.endsWith('\n\n'));
  assert.ok(md.trimEnd().split('\n').length <= 90, `${md.trimEnd().split('\n').length} lines`);
});

test('caf-spec template: no placeholder, no open TODO line, example headings stay inside the fence', () => {
  const md = buildSpecSkill();
  assert.deepEqual(findUnresolvedPlaceholders(md), []);
  assert.equal(countOpenSkillTodos(md), 0);

  const lines = md.split('\n');
  const open = lines.indexOf('```markdown');
  const close = lines.indexOf('```', open + 1);
  assert.ok(open > 0 && close > open);
  const fenced = lines.slice(open + 1, close).filter((l) => l.startsWith('## '));
  assert.deepEqual(fenced, [
    '## 1. Hasil Akhir', '## 2. Scope', '## 3. Constraint dan Asumsi',
    '## 4. Keputusan yang Sudah Diambil', '## 5. Pertanyaan Terbuka', '## 6. Acceptance Criteria',
  ]);
  // parseSections is fence-aware: none of the six example headings is a section boundary.
  assert.deepEqual(parseSections(md).sections.map((s) => s.header), [
    'Ukuran', 'Template `.caf/tasks/<ID-atau-slug>/requirements.md`', 'Aturan Acceptance Criteria',
    'Aturan Pertanyaan Terbuka', 'Spec Disetujui = Kontrak', 'Cek Sebelum Selesai',
  ]);
});

for (const [name, fixture] of Object.entries(FIXTURE)) {
  test(`AC-1: scaffold skills writes caf-spec with its frontmatter and the 3-line DRAFT banner — ${name}`, async () => {
    const dir = copyFixture(fixture);
    assert.ok(!fs.existsSync(path.join(dir, REL)));
    const result = await run({ dir });
    assert.ok(result.written.includes(path.join(dir, REL)));

    const md = read(dir, REL);
    assert.equal(md, buildSpecSkill());
    const fm = md.match(/^---\n([\s\S]*?)\n---\n/)[1].split('\n');
    assert.deepEqual(fm.map((l) => l.split(':')[0]), ['name', 'description']);
    assert.equal(fm[0], 'name: caf-spec');
    assert.ok(fm[1].length > 'description: '.length);

    const lines = md.split('\n');
    const at = lines.indexOf(BANNER[0]);
    assert.ok(at > 0 && at < 15);
    assert.deepEqual(lines.slice(at - 1, at + 4), ['', ...BANNER, '']);
    assert.equal(lines.filter((l) => l.startsWith('>')).length, 3);
    assert.ok(hasSkillDraftBanner(md) && hasSkillDraftAgentNotice(md));
    assert.ok(result.drafts.includes('caf-spec'));
  });

  test(`AC-2: an existing caf-spec/SKILL.md is not changed by a re-run — ${name}`, async () => {
    const dir = copyFixture(fixture);
    await run({ dir });
    const generated = snapshotTree(dir);
    const again = await run({ dir });
    assert.deepEqual(snapshotTree(dir), generated);
    assert.ok(again.skipped.includes(path.join(dir, REL)));

    fs.writeFileSync(path.join(dir, REL), 'edited by the team\n');
    const edited = snapshotTree(dir);
    const third = await run({ dir });
    assert.equal(read(dir, REL), 'edited by the team\n');
    assert.deepEqual(snapshotTree(dir), edited);
    assert.ok(third.skipped.includes(path.join(dir, REL)));
    assert.ok(!third.drafts.includes('caf-spec'), 'drafts reflect what is on disk, not the template');
  });

  test(`AC-3: --dry-run writes nothing and reports what the real run does — ${name}`, async () => {
    const dir = copyFixture(fixture);
    const before = snapshotTree(dir);
    const dry = await run({ dir, dryRun: true });
    assert.deepEqual(snapshotTree(dir), before);
    assert.ok(!fs.existsSync(path.join(dir, REL)));
    assert.deepEqual(dry.written, []);

    const real = await run({ dir });
    assert.deepEqual(dry.drafts, real.drafts);
    assert.deepEqual(dry.skipped, real.skipped);
    assert.deepEqual(dry.collisions, real.collisions);
    const added = Object.keys(snapshotTree(dir)).filter((rel) => !(rel in before)).sort();
    assert.deepEqual(added, SKILL_NAMES.map(skillPath).sort());
    assert.deepEqual(real.written, SKILL_NAMES.map((n) => path.join(dir, skillPath(n))));
  });

  test(`AC-5: check-drafts after scaffold skills — no FAIL, no finding about caf-spec — ${name}`, async () => {
    const dir = copyFixture(fixture);
    const before = await check(dir);
    await run({ dir });
    const tree = snapshotTree(dir);
    const after = await check(dir);
    assert.deepEqual(snapshotTree(dir), tree, 'check-drafts is read-only');
    assert.equal(after.fails, before.fails);
    assert.equal(after.fails, 0, JSON.stringify(after.findings.filter((f) => f.level === 'FAIL')));
    assert.deepEqual(after.findings.filter((f) => f.file === REL), []);
  });
}

test('AC-4: the planner maps to caf-spec, and only the planner', () => {
  assert.deepEqual(skillsForKind('planner'), ['caf-scope-discipline', 'caf-no-guess', 'caf-spec']);
  for (const kind of Object.keys(SKILLS_BY_KIND)) {
    assert.equal(skillsForKind(kind).includes('caf-spec'), kind === 'planner', kind);
  }
});

test('AC-4: while the DRAFT banner is there, no planner gets a pointer to caf-spec', async () => {
  const planner = (skills) => buildAgentMd({ name: 'planner', role: 'r', scope: 's', kind: 'planner', slug: 'caf-planner', skills });
  const dir = makeRepo(
    { 'package.json': { name: 'r', scripts: { lint: 'x' } }, 'pnpm-lock.yaml': '', '.claude/agents/caf-planner.md': planner() },
    'caf-skills-spec-'
  );
  prompts.inject([true]);
  const result = await run({ dir });
  prompts._injected.length = 0;

  // an existing planner: the section it is offered lists the two finished skills only
  assert.equal(result.pointers.added.length, 1);
  const existing = read(dir, '.claude/agents/caf-planner.md');
  assert.deepEqual(pointersIn(existing), ['caf-scope-discipline', 'caf-no-guess'].map(skillPath));
  assert.ok(!existing.includes('caf-spec'));

  // a planner generated now: same — and byte-identical to what it was before caf-spec existed
  assert.deepEqual(usableSkillPaths(dir, 'planner'), ['caf-scope-discipline', 'caf-no-guess'].map(skillPath));
  const rendered = planner(usableSkillPaths(dir, 'planner'));
  assert.equal(rendered, planner(['caf-scope-discipline', 'caf-no-guess'].map(skillPath)));
  assert.ok(!rendered.includes('caf-spec'));

  // a planner that already has `## Skills` is never edited, whatever the run finds
  const before = read(dir, '.claude/agents/caf-planner.md');
  const again = await run({ dir });
  assert.equal(read(dir, '.claude/agents/caf-planner.md'), before);
  assert.deepEqual(again.pointers.added, []);
});
