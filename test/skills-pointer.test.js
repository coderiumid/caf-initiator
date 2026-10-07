// CAF-SKILLS-01 — `## Skills` in agent definitions that already exist.
// Part 1: registering `Skills` in TEMPLATE_SECTION_ORDER without making it syncable must not
// change anything `curate` reports, with or without a manifest.
// Part 2: `caf-init scaffold skills` adding the pointer section — the one place caf-init rewrites
// a file that already exists, so every test here is about what it must NOT touch.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import prompts from 'prompts';

import { buildAgentMd, buildSkillsBody } from '../src/templates/agent-md.js';
import { buildPmAgentMd, buildUxDesignerAgentMd } from '../src/templates/discovery-commands.js';
import {
  TEMPLATE_SECTION_ORDER,
  SYNCABLE_SECTIONS,
  KNOWN_KINDS,
  parseSections,
  insertSection,
} from '../src/utils/agent-sections.js';
import { auditAgentDefinitions } from '../src/commands/audit.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { curateBaseline } from '../src/commands/curate-baseline.js';
import { skillsTarget, isPureInsertion } from '../src/commands/skills.js';
import { skillsForKind, skillPath, hasSkillDraftBanner } from '../src/templates/skill-md.js';
import { detectKind } from '../src/utils/agent-sections.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeRepo, snapshotTree } from './helpers/make-repo.js';

const AGENT_DIR = '.claude/agents';
const BODY = buildSkillsBody(['.claude/skills/caf-no-guess/SKILL.md']);

// Every kind as a pre-CAF-SKILLS-01 version would have generated it: buildAgentMd without
// `skills` (byte-identical to the old output — see skills-section.test.js), plus the two
// Discovery agents from their own builders.
function oldVersionAgents() {
  const files = {};
  for (const kind of KNOWN_KINDS) {
    if (kind === 'pm' || kind === 'ux-designer') continue;
    files[`${AGENT_DIR}/caf-${kind}.md`] = buildAgentMd({
      name: kind, role: 'r', scope: 's', scripts: null, packageManager: null, kind,
      appNames: kind === 'qa' || kind === 'reviewer' ? ['apps/web', 'apps/api'] : [],
      slug: `caf-${kind}`,
    });
  }
  files[`${AGENT_DIR}/caf-pm.md`] = buildPmAgentMd({ agentDir: AGENT_DIR, slug: 'caf-pm' });
  files[`${AGENT_DIR}/caf-ux-designer.md`] = buildUxDesignerAgentMd({ agentDir: AGENT_DIR, slug: 'caf-ux-designer' });
  return files;
}

function insertEverywhere(dir) {
  const agentDir = path.join(dir, AGENT_DIR);
  for (const file of fs.readdirSync(agentDir).filter((f) => f.endsWith('.md'))) {
    const abs = path.join(agentDir, file);
    const { lines, sections } = parseSections(fs.readFileSync(abs, 'utf8'));
    fs.writeFileSync(abs, insertSection(lines, sections, 'Skills', BODY));
  }
}

async function curateView(dir) {
  const audit = auditAgentDefinitions(dir, AGENT_DIR);
  const sync = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: true }));
  return { entries: audit.entries, sectionCounts: audit.sectionCounts, sync };
}

test('Skills is registered for placement only — never syncable, Report Format still last', () => {
  assert.ok(TEMPLATE_SECTION_ORDER.includes('Skills'));
  assert.ok(!Object.keys(SYNCABLE_SECTIONS).includes('Skills'));
  assert.equal(TEMPLATE_SECTION_ORDER.indexOf('Skills'), TEMPLATE_SECTION_ORDER.indexOf('Output') + 1);
  assert.equal(TEMPLATE_SECTION_ORDER.at(-1), 'Report Format');
});

test('insertSection: Skills lands right after Output and changes nothing else', () => {
  for (const [rel, raw] of Object.entries(oldVersionAgents())) {
    const { lines, sections } = parseSections(raw);
    const next = insertSection(lines, sections, 'Skills', BODY);
    const headers = parseSections(next).sections.map((s) => s.header);
    assert.equal(headers[headers.indexOf('Skills') - 1], 'Output', rel);
    assert.deepEqual(headers.filter((h) => h !== 'Skills'), sections.map((s) => s.header), rel);

    // insertSection() adds four lines: blank, heading, body, blank.
    const block = `\n## Skills\n${BODY}\n\n`;
    assert.equal(next.split(block).length, 2, rel);
    assert.equal(next.replace(block, ''), raw, `${rel}: removing the block must restore the original bytes`);
  }
});

for (const withManifest of [false, true]) {
  const label = withManifest ? 'with a manifest baseline' : 'without a manifest (repo scaffolded by an older version)';

  test(`AC-4/AC-7: audit and sync dry-run report the same before and after ## Skills is inserted — ${label}`, async () => {
    const dir = makeRepo(oldVersionAgents(), 'caf-skills-q1-');
    if (withManifest) await silenced(() => curateBaseline({ dir, agentDir: AGENT_DIR, yes: true }));

    const before = await curateView(dir);
    const pmBefore = fs.readFileSync(path.join(dir, AGENT_DIR, 'caf-pm.md'), 'utf8');
    insertEverywhere(dir);
    const tree = snapshotTree(dir);
    const after = await curateView(dir);

    assert.deepEqual(after.entries, before.entries);
    assert.deepEqual(after.sectionCounts, before.sectionCounts);
    assert.deepEqual(after.sync, before.sync);
    assert.deepEqual(snapshotTree(dir), tree, 'audit + sync --dry-run must not write');
    assert.ok(!after.entries.some((e) => /## Skills/.test(e.message)), 'Skills must never be reported');
    // pm/ux-designer are never asked to have the section.
    assert.notEqual(fs.readFileSync(path.join(dir, AGENT_DIR, 'caf-pm.md'), 'utf8'), pmBefore);
    assert.ok(!after.entries.some((e) => /caf-(pm|ux-designer)\.md/.test(e.filePath) && /missing/.test(e.message)));
  });
}

// ---------------------------------------------------------------------------------------------
// Part 2 — scaffold skills → pointers
// ---------------------------------------------------------------------------------------------

// Once inject() has been called, prompts never reads stdin: an empty queue answers every prompt
// with its `initial` value. Tests below rely on that to observe the default answer.
prompts.inject([]);

const NO_PROMPT = new Error('a prompt was shown where none is allowed');
const FULL_SCRIPTS = { lint: 'x', typecheck: 'x', test: 'x', build: 'x' };
const agentPath = (dir, file) => path.join(dir, AGENT_DIR, file);
const readAgent = (dir, file) => fs.readFileSync(agentPath(dir, file), 'utf8');
const agentFiles = (dir) => fs.readdirSync(path.join(dir, AGENT_DIR)).filter((f) => f.endsWith('.md')).sort();
const pointersIn = (md) => [...md.matchAll(/^- `([^`]+\/SKILL\.md)`$/gm)].map((m) => m[1]);

// scripts: partial → caf-verify is a DRAFT (the common case); full → it is usable.
function repo({ scripts = { lint: 'x' }, extra = {} } = {}) {
  return makeRepo({ 'package.json': { name: 'r', scripts }, 'pnpm-lock.yaml': '', ...oldVersionAgents(), ...extra }, 'caf-skills-ptr-');
}

// answers: { 'caf-qa.md': false } — everything else is accepted. Fails if a prompt is left over
// or one too many is shown.
async function scaffoldSkills(dir, { answers = {}, opts = {}, expectPrompts } = {}) {
  const asked = expectPrompts ?? agentFiles(dir).filter((f) => skillsForKind(detectKind(f)).length > 0 && !/^## Skills$/m.test(readAgent(dir, f)));
  prompts._injected.length = 0;
  prompts.inject([...asked.map((f) => (f in answers ? answers[f] : true)), NO_PROMPT]);
  try {
    const result = await silenced(() => skillsTarget({ dir, ...opts }));
    assert.deepEqual(prompts._injected, [NO_PROMPT], 'number of prompts shown');
    return result;
  } finally {
    prompts._injected.length = 0;
  }
}

test('isPureInsertion: accepts one inserted block, rejects any other change', () => {
  const core = '## Skills\nbody';
  assert.equal(isPureInsertion('a\n\n## B\nb\n', 'a\n\n\n## Skills\nbody\n\n## B\nb\n', core), true);
  assert.equal(isPureInsertion('a\n', 'a\n\n## Skills\nbody\n', core), true);
  assert.equal(isPureInsertion('a\n\n## B\nb\n', 'a\n\n\n## Skills\nbody\n\n## B\nB\n', core), false);
  assert.equal(isPureInsertion('a\r\n\r\n## B\r\n', 'a\n\n\n## Skills\nbody\n\n## B\n', core), false);
  assert.equal(isPureInsertion('a\n', 'a\n', core), false);
  assert.equal(isPureInsertion('a\n', 'a\n\n## Skills\nbody\nextra\n', core), false);
});

test('pointers: every mapped kind gets its section, only usable skills are listed, nothing else changes (AC-11, AC-12)', async () => {
  const dir = repo();
  const before = snapshotTree(dir);
  const result = await scaffoldSkills(dir);
  const after = snapshotTree(dir);

  assert.deepEqual(result.drafts, ['caf-verify']);
  for (const file of agentFiles(dir)) {
    const rel = `${AGENT_DIR}/${file}`;
    const wanted = skillsForKind(detectKind(file)).filter((n) => n !== 'caf-verify').map(skillPath);
    if (wanted.length === 0) {
      assert.equal(after[rel], before[rel], `${file} has no skills mapped and must be untouched`);
      continue;
    }
    assert.deepEqual(pointersIn(after[rel]), wanted, file);
    assert.ok(result.pointers.added.includes(agentPath(dir, file)), file);
    // AC-12: take the inserted block out and the old bytes are back.
    const core = `## Skills\n${buildSkillsBody(wanted)}`;
    assert.ok(isPureInsertion(before[rel], after[rel], core), file);
    assert.equal(after[rel].replace(`\n${core}\n\n`, ''), before[rel], file);
  }
  // AC-11: nothing points at the DRAFT skill.
  for (const file of agentFiles(dir)) assert.ok(!after[`${AGENT_DIR}/${file}`].includes('caf-verify/SKILL.md'), file);
  for (const file of ['caf-pm.md', 'caf-ux-designer.md', 'caf-auditor.md', 'caf-devops.md']) {
    assert.ok(!/^## Skills$/m.test(after[`${AGENT_DIR}/${file}`]), file);
  }
  // only skills + agents changed
  const changed = Object.keys(after).filter((rel) => after[rel] !== before[rel]);
  assert.ok(changed.every((rel) => rel.startsWith('.claude/skills/') || rel.startsWith(`${AGENT_DIR}/`)), changed.join(', '));
});

test('pointers: a usable caf-verify is listed first for implementation and qa agents', async () => {
  const dir = repo({ scripts: FULL_SCRIPTS });
  const result = await scaffoldSkills(dir);
  assert.deepEqual(result.drafts, []);
  assert.deepEqual(pointersIn(readAgent(dir, 'caf-qa.md')), ['caf-verify', 'caf-no-guess'].map(skillPath));
  assert.deepEqual(pointersIn(readAgent(dir, 'caf-frontend.md')), skillsForKind('frontend').map(skillPath));
  assert.deepEqual(pointersIn(readAgent(dir, 'caf-planner.md')), ['caf-scope-discipline', 'caf-no-guess'].map(skillPath));
  const headers = parseSections(readAgent(dir, 'caf-planner.md')).sections.map((s) => s.header);
  assert.deepEqual(headers.slice(headers.indexOf('Output'), headers.indexOf('Output') + 3), ['Output', 'Skills', 'Constraints']);
});

test('pointers: idempotent — a second run shows no prompt and changes no byte', async () => {
  const dir = repo();
  await scaffoldSkills(dir);
  const after = snapshotTree(dir);
  const second = await scaffoldSkills(dir, { expectPrompts: [] });
  assert.deepEqual(snapshotTree(dir), after);
  assert.deepEqual(second.pointers.added, []);
  assert.equal(second.pointers.untouched.length, 8);
});

test('pointers: --dry-run shows no prompt, writes nothing, and names exactly the files a real run edits', async () => {
  const dir = repo();
  const before = snapshotTree(dir);
  const dry = await scaffoldSkills(dir, { opts: { dryRun: true }, expectPrompts: [] });
  assert.deepEqual(snapshotTree(dir), before);
  assert.deepEqual(dry.pointers.added, []);
  const real = await scaffoldSkills(dir);
  assert.deepEqual(dry.pointers.wouldAdd, real.pointers.added);
  assert.equal(real.pointers.added.length, 8);
});

test('pointers: declining leaves that file byte-identical', async () => {
  const dir = repo();
  const before = readAgent(dir, 'caf-qa.md');
  const result = await scaffoldSkills(dir, { answers: { 'caf-qa.md': false } });
  assert.equal(readAgent(dir, 'caf-qa.md'), before);
  assert.deepEqual(result.pointers.declined, [agentPath(dir, 'caf-qa.md')]);
  assert.match(readAgent(dir, 'caf-planner.md'), /^## Skills$/m);
});

test('AC-11: after the banner is removed, a re-run points agents without a Skills section at the skill — and never edits one that has it', async () => {
  const dir = repo();
  await scaffoldSkills(dir, { answers: { 'caf-qa.md': false } });
  const verify = path.join(dir, skillPath('caf-verify'));
  assert.ok(hasSkillDraftBanner(fs.readFileSync(verify, 'utf8')));

  // the human resolves the TODO lines and removes the banner
  fs.writeFileSync(verify, fs.readFileSync(verify, 'utf8').replace(/^> .*\n/gm, '').replace(/^- \[ \] TODO.*\n/gm, ''));
  assert.ok(!hasSkillDraftBanner(fs.readFileSync(verify, 'utf8')));

  const frontendBefore = readAgent(dir, 'caf-frontend.md');
  const result = await scaffoldSkills(dir);
  assert.deepEqual(result.drafts, []);
  assert.deepEqual(result.pointers.added, [agentPath(dir, 'caf-qa.md')]);
  assert.deepEqual(pointersIn(readAgent(dir, 'caf-qa.md')), ['caf-verify', 'caf-no-guess'].map(skillPath));
  // already had the section → untouched, even though caf-verify is now usable and missing there
  assert.equal(readAgent(dir, 'caf-frontend.md'), frontendBefore);
  assert.ok(!frontendBefore.includes('caf-verify/SKILL.md'));
  assert.ok(result.pointers.untouched.includes(agentPath(dir, 'caf-frontend.md')));
});

test('AC-12: an agent that already has a ## Skills section is never edited, whatever it says', async () => {
  const mine = `${buildAgentMd({ name: 'qa', role: 'r', scope: 's', scripts: null, packageManager: null, kind: 'qa', slug: 'caf-qa' })}\n## Skills\nmy own notes, no pointers\n`;
  const dir = repo({ scripts: FULL_SCRIPTS, extra: { [`${AGENT_DIR}/caf-qa.md`]: mine } });
  const result = await scaffoldSkills(dir);
  assert.equal(readAgent(dir, 'caf-qa.md'), mine);
  assert.ok(result.pointers.untouched.includes(agentPath(dir, 'caf-qa.md')));
  // --force is about SKILL.md files only
  await scaffoldSkills(dir, { opts: { overwrite: true }, expectPrompts: [] });
  assert.equal(readAgent(dir, 'caf-qa.md'), mine);
});

test('pointers: --force never rewrites an agent definition', async () => {
  const dir = repo();
  await scaffoldSkills(dir);
  const agentsAfter = Object.fromEntries(agentFiles(dir).map((f) => [f, readAgent(dir, f)]));
  await scaffoldSkills(dir, { opts: { overwrite: true }, expectPrompts: [] });
  assert.deepEqual(Object.fromEntries(agentFiles(dir).map((f) => [f, readAgent(dir, f)])), agentsAfter);
});

test('H10: an agent of an unrecognized kind is asked with default No', async () => {
  const custom = buildAgentMd({ name: 'x', role: 'r', scope: 's', scripts: null, packageManager: null, kind: 'implementation', slug: 'payments' });
  const dir = makeRepo({ 'package.json': { name: 'r' }, [`${AGENT_DIR}/payments.md`]: custom, [`${AGENT_DIR}/caf-planner.md`]: oldVersionAgents()[`${AGENT_DIR}/caf-planner.md`] }, 'caf-skills-ptr-');

  // empty queue → every prompt takes its `initial`: planner (recognized) yes, payments no
  prompts._injected.length = 0;
  const byDefault = await silenced(() => skillsTarget({ dir }));
  assert.deepEqual(byDefault.pointers.added, [agentPath(dir, 'caf-planner.md')]);
  assert.deepEqual(byDefault.pointers.declined, [agentPath(dir, 'payments.md')]);
  assert.equal(readAgent(dir, 'payments.md'), custom);

  // an explicit yes still works
  const explicit = await scaffoldSkills(dir, { expectPrompts: ['payments.md'] });
  assert.deepEqual(explicit.pointers.added, [agentPath(dir, 'payments.md')]);
  assert.deepEqual(pointersIn(readAgent(dir, 'payments.md')), ['caf-scope-discipline', 'caf-no-guess', 'caf-escalate'].map(skillPath));
});

test('pointers: a skill that was not written (name collision) is never pointed at', async () => {
  const dir = repo({ extra: { '.claude/skills/no-guess/SKILL.md': 'team skill\n' } });
  const saved = process.exitCode;
  try {
    // caf-qa.md is not asked at all: neither of its skills is usable here (see below).
    const asked = agentFiles(dir).filter((f) => skillsForKind(detectKind(f)).length > 0 && f !== 'caf-qa.md');
    await scaffoldSkills(dir, { expectPrompts: asked });
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = saved;
  }
  assert.deepEqual(pointersIn(readAgent(dir, 'caf-planner.md')), [skillPath('caf-scope-discipline')]);
  // qa maps to caf-verify (DRAFT) + caf-no-guess (collided) → nothing usable → not asked, not edited
  assert.ok(!/^## Skills$/m.test(readAgent(dir, 'caf-qa.md')));
});

test('pointers: a CRLF agent file is refused rather than re-encoded', async () => {
  const crlf = oldVersionAgents()[`${AGENT_DIR}/caf-planner.md`].replace(/\n/g, '\r\n');
  const dir = makeRepo({ 'package.json': { name: 'r' }, [`${AGENT_DIR}/caf-planner.md`]: crlf }, 'caf-skills-ptr-');
  const result = await scaffoldSkills(dir, { expectPrompts: [] });
  assert.equal(readAgent(dir, 'caf-planner.md'), crlf);
  assert.deepEqual(result.pointers.refused, [agentPath(dir, 'caf-planner.md')]);
});

test('pointers: no agent definitions yet → skills are written, nothing else happens', async () => {
  const dir = makeRepo({ 'package.json': { name: 'r' } }, 'caf-skills-ptr-');
  const result = await scaffoldSkills(dir, { expectPrompts: [] });
  assert.equal(result.written.length, 5);
  assert.deepEqual(result.pointers, { added: [], wouldAdd: [], declined: [], untouched: [], refused: [] });
});

for (const withManifest of [false, true]) {
  test(`AC-4/AC-7 end to end: curate reports the same before and after a real scaffold skills — ${withManifest ? 'with' : 'without'} manifest`, async () => {
    const dir = repo();
    if (withManifest) await silenced(() => curateBaseline({ dir, agentDir: AGENT_DIR, yes: true }));
    const manifestPath = path.join(dir, '.caf', '.generate-manifest.json');
    const manifestBefore = withManifest ? fs.readFileSync(manifestPath, 'utf8') : null;
    const before = await curateView(dir);

    const result = await scaffoldSkills(dir);
    assert.equal(result.pointers.added.length, 8);

    const after = await curateView(dir);
    assert.deepEqual(after.entries, before.entries);
    assert.deepEqual(after.sectionCounts, before.sectionCounts);
    assert.deepEqual(after.sync, before.sync);
    if (withManifest) assert.equal(fs.readFileSync(manifestPath, 'utf8'), manifestBefore, 'scaffold skills must not touch the manifest');
    else assert.ok(!fs.existsSync(manifestPath));
  });
}
