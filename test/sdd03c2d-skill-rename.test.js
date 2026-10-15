// CAF-SDD-03c2d — the skill `caf-verify` becomes `caf-self-verify`, and `curate audit` warns about
// an agent that still points at the old name.
//
// `test/fixtures/pre-sdd03c2d/` is the render from before this ticket (what `scaffold skills`
// writes, the agents with their `## Skills` pointers, a repo that holds the old skill and its
// `curate` reports) — never regenerate it. Every scaffold below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { skillsTarget } from '../src/commands/skills.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { listDraftFiles } from '../src/commands/complete-drafts.js';
import { auditAgentDefinitions } from '../src/commands/audit.js';
import { SKILL_NAMES, SKILLS_BY_KIND, skillsForKind, skillPath } from '../src/templates/skill-md.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { renderDefaultFileSet, VARIANTS } from './helpers/default-file-set.js';
import { SKILL_FIXTURES, SKILL_KINDS, renderSkillFiles, renderAgentsWithSkills, materialize, readCurateReports } from './helpers/skills-render.js';
import { copyFixture, makeRepo, snapshotTree } from './helpers/make-repo.js';
import { fixtureDir } from './helpers/frozen-kinds.js';
import { silenced } from './helpers/mono-snapshot.js';

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'pre-sdd03c2d');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, `${name}.json`), 'utf8'));
const ANSI = /\u001b\[[0-9;]*m/g;

const OLD = 'caf-verify';
const NEW = 'caf-self-verify';
// What a golden recorded before the ticket becomes under it: the name, and nothing else.
const rename = (text) => text.replaceAll(OLD, NEW);
const renamePath = (rel) => rel.replace(`/${OLD}/`, `/${NEW}/`);

const FULL = { name: 'full', scripts: { lint: 'x', typecheck: 'x', test: 'x', build: 'x' } };
const AGENT_DIR = '.claude/agents';
const OLD_PATH = skillPath(OLD);
const NEW_PATH = skillPath(NEW);

async function capture(fn) {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' ').replace(ANSI, ''));
  const saved = process.exitCode;
  process.exitCode = undefined;
  try {
    const result = await fn();
    return { result, out: lines.join('\n'), exitCode: process.exitCode };
  } finally {
    console.log = original;
    process.exitCode = saved;
  }
}

const agentMd = (kind, skills) =>
  buildAgentMd({ name: kind, role: 'r', scope: 's', scripts: null, packageManager: null, kind, appNames: [], slug: `caf-${kind}`, skills });

// A repo with the four scripts (so the verify skill is not a DRAFT), skills written, then the agents.
async function repoWithSkills(agentsByFile = {}, extra = {}) {
  const dir = makeRepo({ 'package.json': FULL, 'pnpm-lock.yaml': '', ...extra }, 'caf-rename-');
  await silenced(() => skillsTarget({ dir }));
  for (const [rel, content] of Object.entries(agentsByFile)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content);
  }
  return dir;
}

const OLD_FRONTEND_SKILLS = [OLD_PATH, ...skillsForKind('frontend').map(skillPath).filter((p) => p !== NEW_PATH)];

// ---- AC-1 ---------------------------------------------------------------------------------

test('AC-1: the names and the kind table carry caf-self-verify and no caf-verify, in the same order', () => {
  assert.ok(SKILL_NAMES.includes(NEW));
  assert.ok(!SKILL_NAMES.includes(OLD));
  assert.deepEqual(SKILL_NAMES, ['caf-self-verify', 'caf-scope-discipline', 'caf-no-guess', 'caf-escalate', 'caf-piv', 'caf-spec', 'caf-traceability']);
  for (const [kind, names] of Object.entries(SKILLS_BY_KIND)) assert.ok(!names.includes(OLD), kind);
  assert.deepEqual(skillsForKind('qa'), [NEW, 'caf-no-guess']);
  assert.deepEqual(skillsForKind('validator'), [NEW, 'caf-no-guess', 'caf-traceability']);
  assert.deepEqual(skillsForKind('frontend'), [NEW, 'caf-scope-discipline', 'caf-no-guess', 'caf-escalate', 'caf-traceability']);
  assert.deepEqual(skillsForKind('implementer'), [NEW, 'caf-scope-discipline', 'caf-no-guess', 'caf-escalate']);
});

for (const fixture of SKILL_FIXTURES) {
  test(`AC-1: scaffold skills writes the pre-ticket files with the name changed and nothing else — ${fixture}`, async () => {
    const before = golden(`skills.${fixture}`).files;
    const now = await renderSkillFiles(fixture);
    assert.ok(OLD_PATH in before, 'the golden holds the old skill');
    assert.ok(NEW_PATH in now);
    assert.ok(!Object.keys(now).some((rel) => rel.includes(`/${OLD}/`)), 'no caf-verify folder');
    assert.deepEqual(Object.keys(now).sort(), Object.keys(before).map(renamePath).sort());
    for (const [rel, content] of Object.entries(before)) assert.equal(now[renamePath(rel)], rename(content), rel);
    // the skills that never mention the old name are byte-identical to the golden
    for (const [rel, content] of Object.entries(before)) {
      if (!content.includes(OLD) && !rel.includes(OLD)) assert.equal(now[rel], content, rel);
    }
    assert.match(now[NEW_PATH], /^---\nname: caf-self-verify\n/);
  });
}

// ---- AC-2 ---------------------------------------------------------------------------------

for (const fixture of SKILL_FIXTURES) {
  test(`AC-2: agents point at caf-self-verify where they pointed at caf-verify — ${fixture}`, async () => {
    const before = golden(`agents.${fixture}`);
    const now = await renderAgentsWithSkills(fixture);
    assert.deepEqual(Object.keys(now).sort(), Object.keys(before).sort());
    const expected = fixture === 'mono-pnpm' ? ['backend', 'frontend', 'qa', 'validator'] : [...SKILL_KINDS];
    assert.deepEqual(Object.keys(now).sort(), expected.sort());
    for (const kind of Object.keys(before)) {
      assert.ok(before[kind].content.includes(OLD_PATH), `${kind}: the golden points at the old skill`);
      assert.equal(now[kind].file, before[kind].file);
      assert.equal(now[kind].content, rename(before[kind].content), kind);
      assert.ok(now[kind].content.includes(NEW_PATH) && !now[kind].content.includes(OLD), kind);
    }
  });
}

// ---- AC-3 ---------------------------------------------------------------------------------

const OLD_SKILL = '# my own caf-verify\n\nkept by hand\n';

for (const [label, opts] of [['a real run', {}], ['--dry-run', { dryRun: true }], ['--force', { overwrite: true }]]) {
  test(`AC-3: ${label} next to a caf-verify folder leaves it alone, writes caf-self-verify and prints one note`, async () => {
    const dir = makeRepo({ 'package.json': FULL, 'pnpm-lock.yaml': '', [OLD_PATH]: OLD_SKILL }, 'caf-rename-old-');
    const { result, out, exitCode } = await capture(() => skillsTarget({ dir, ...opts }));

    assert.equal(fs.readFileSync(path.join(dir, OLD_PATH), 'utf8'), OLD_SKILL);
    assert.deepEqual(fs.readdirSync(path.join(dir, '.claude/skills', OLD)), ['SKILL.md']);
    assert.equal(fs.existsSync(path.join(dir, NEW_PATH)), !opts.dryRun);
    if (!opts.dryRun) assert.ok(result.written.some((p) => p.endsWith(`${NEW}/SKILL.md`)));
    assert.equal(exitCode, undefined, 'no name collision');
    assert.deepEqual(result.collisions, []);

    const notes = out.split('\n').filter((line) => line.includes('.claude/skills/caf-verify') && /delete/.test(line));
    assert.equal(notes.length, 1, out);
    assert.match(notes[0], /caf-self-verify/);
    assert.match(notes[0], /by hand/);
  });
}

test('AC-3: with no caf-verify folder there is no note and no collision', async () => {
  const dir = makeRepo({ 'package.json': FULL, 'pnpm-lock.yaml': '' }, 'caf-rename-new-');
  const { out, exitCode } = await capture(() => skillsTarget({ dir }));
  assert.equal(exitCode, undefined);
  assert.ok(!out.includes(OLD), out);
});

// ---- AC-4 ---------------------------------------------------------------------------------

test('AC-4: an agent with the old pointer is not edited, and its "not listed there" line says the skill was renamed', async () => {
  const file = `${AGENT_DIR}/caf-frontend.md`;
  const agent = agentMd('frontend', OLD_FRONTEND_SKILLS);
  assert.ok(agent.includes(OLD_PATH));
  const dir = await repoWithSkills({ [file]: agent });
  const before = snapshotTree(dir);
  const { out } = await capture(() => skillsTarget({ dir }));
  assert.deepEqual(snapshotTree(dir), before);

  const line = out.split('\n').find((l) => l.includes('not listed there'));
  assert.ok(line, out);
  assert.ok(line.includes(NEW_PATH) && line.includes(OLD_PATH), line);
  assert.match(line, /renamed/);
});

test('AC-4: an agent without the old pointer gets the line it got before the ticket', async () => {
  const file = `${AGENT_DIR}/caf-frontend.md`;
  const listed = skillsForKind('frontend').map(skillPath).filter((p) => p !== NEW_PATH);
  const dir = await repoWithSkills({ [file]: agentMd('frontend', listed) });
  const before = snapshotTree(dir);
  const { out } = await capture(() => skillsTarget({ dir }));
  assert.deepEqual(snapshotTree(dir), before);
  const line = out.split('\n').find((l) => l.includes('not listed there'));
  assert.equal(line.trim(), `not listed there: ${NEW_PATH} — add the pointer yourself if you want it`);
});

// ---- AC-5 ---------------------------------------------------------------------------------

const warningsOf = (dir, check) => auditAgentDefinitions(dir).warnings.filter((w) => w.check === check);
const frontendFile = `${AGENT_DIR}/caf-frontend.md`;

test('AC-5: one skill-renamed warning per agent that points at the old name while the new skill is active', async () => {
  const dir = await repoWithSkills({
    [frontendFile]: agentMd('frontend', OLD_FRONTEND_SKILLS),
    [`${AGENT_DIR}/caf-qa.md`]: agentMd('qa', [OLD_PATH, skillPath('caf-no-guess')]),
  });
  const before = snapshotTree(dir);
  const renamed = warningsOf(dir, 'skill-renamed');
  assert.equal(renamed.length, 2);
  assert.deepEqual(renamed.map((w) => w.status), ['warn', 'warn']);
  for (const w of renamed) {
    assert.ok(w.message.includes(OLD_PATH) && w.message.includes(NEW_PATH), w.message);
    assert.match(w.message, /curate sync/);
    assert.match(w.message, /scaffold skills/);
  }
  assert.deepEqual(warningsOf(dir, 'skill-pointer').filter((w) => w.message.includes(NEW_PATH)), []);

  // read-only, whatever `curate sync` is run afterwards
  const saved = process.exitCode;
  process.exitCode = undefined;
  await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: false }));
  assert.equal(process.exitCode, undefined);
  process.exitCode = saved;
  for (const rel of [frontendFile, `${AGENT_DIR}/caf-qa.md`]) assert.equal(snapshotTree(dir)[rel], before[rel], rel);
});

test('AC-5: no skill-renamed warning when caf-self-verify is missing, still a DRAFT, or already pointed at', async () => {
  const agents = { [frontendFile]: agentMd('frontend', OLD_FRONTEND_SKILLS) };

  const missing = await repoWithSkills(agents);
  fs.rmSync(path.join(missing, '.claude/skills', NEW), { recursive: true });
  assert.deepEqual(warningsOf(missing, 'skill-renamed'), []);

  const draft = await repoWithSkills(agents);
  const file = path.join(draft, NEW_PATH);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace(/^(---\n[\s\S]*?\n---\n)/, '$1\n> DRAFT generated by caf-init.\n'));
  assert.deepEqual(warningsOf(draft, 'skill-renamed'), []);
  assert.deepEqual(warningsOf(draft, 'skill-pointer').filter((w) => w.message.includes(NEW_PATH)), []);

  const pointed = await repoWithSkills({ [frontendFile]: agentMd('frontend', skillsForKind('frontend').map(skillPath)) });
  assert.deepEqual(warningsOf(pointed, 'skill-renamed'), []);
  assert.deepEqual(warningsOf(pointed, 'skill-pointer'), []);

  // the old pointer and the new one both present: nothing to say
  const both = await repoWithSkills({ [frontendFile]: agentMd('frontend', [OLD_PATH, ...skillsForKind('frontend').map(skillPath)]) });
  assert.deepEqual(warningsOf(both, 'skill-renamed'), []);
});

test('AC-5: an agent with no pointer at all keeps the skill-pointer warning, now naming the new path', async () => {
  const dir = await repoWithSkills({ [frontendFile]: agentMd('frontend', []) });
  assert.deepEqual(warningsOf(dir, 'skill-renamed'), []);
  const pointer = warningsOf(dir, 'skill-pointer');
  assert.equal(pointer.length, 1);
  assert.ok(pointer[0].message.includes(NEW_PATH));
  assert.ok(!pointer[0].message.includes(OLD_PATH));
});

test('AC-5: the implementation fallback is not checked', async () => {
  const dir = await repoWithSkills({ [`${AGENT_DIR}/custom.md`]: agentMd('implementation', [OLD_PATH]) });
  assert.deepEqual(warningsOf(dir, 'skill-renamed'), []);
});

// ---- AC-6 / AC-7 --------------------------------------------------------------------------

for (const fixture of SKILL_FIXTURES) {
  test(`AC-6/AC-7: a repo scaffolded before the ticket (caf-verify folder, old pointers) reads the same — ${fixture}`, async () => {
    const { files, reports } = golden(`old-repo.${fixture}`);
    assert.ok(Object.keys(files).some((rel) => rel.includes(`/${OLD}/`)));
    const dir = materialize(fixture, files);
    const before = snapshotTree(dir);
    assert.deepEqual(await readCurateReports(dir), reports);
    assert.deepEqual(snapshotTree(dir), before, 'read-only');
    // the old folder stays part of the draft inventory
    assert.ok((await listDraftFiles(dir)).includes(OLD_PATH));
  });
}

test('AC-6: the recorded curate-old-repo fixtures name neither skill', () => {
  const dirPath = path.join(path.dirname(GOLDEN), 'pre-sdd03c1');
  for (const file of fs.readdirSync(dirPath).filter((f) => f.startsWith('curate-old-repo.'))) {
    const text = fs.readFileSync(path.join(dirPath, file), 'utf8');
    assert.ok(!/caf-verify|caf-self-verify|\.claude\/skills/.test(text), file);
  }
});

// ---- AC-8 ---------------------------------------------------------------------------------

test('AC-8: nothing a scaffold writes or prints offers caf-verify as a skill', async () => {
  for (const variant of VARIANTS) {
    const set = await renderDefaultFileSet(variant);
    for (const rel of set.files) assert.ok(!fs.readFileSync(path.join(set.dir, rel), 'utf8').includes(OLD), `${rel} (${variant.fixture})`);
  }
  for (const fixture of SKILL_FIXTURES) {
    const dir = copyFixture(fixtureDir(fixture), 'caf-rename-ac8-');
    const { out } = await capture(() => skillsTarget({ dir }));
    assert.ok(!out.includes(OLD), out);
    for (const [rel, content] of Object.entries(snapshotTree(dir))) assert.ok(!content.includes(OLD), rel);
  }
});
