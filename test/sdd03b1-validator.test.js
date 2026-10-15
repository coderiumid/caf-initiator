// CAF-SDD-03b1 — the `validator` kind and the `validate-report.md` format.
//
// The kind is complete (detection, tools, tracked sections, skill mapping). It was hidden until
// CAF-SDD-03c2 (not a `buildCandidates()` entry); since then it is a candidate, offered by the
// picker in place of `qa`, and `agents()` renders it through `buildValidatorAgent()`.
// Every expected value below is written out literally. Every `scaffold` and `curate sync` runs on
// a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import {
  agents,
  buildCandidates,
  buildSingleRepoCandidates,
  buildValidatorAgent,
  HIDDEN_CANDIDATE_KINDS,
  isOfferedCandidate,
  SINGLE_REPO_ROLES,
} from '../src/commands/agents.js';
import { auditAgentDefinitions } from '../src/commands/audit.js';
import { skillsTarget, usableSkillPaths } from '../src/commands/skills.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { buildInputSection } from '../src/templates/agent-md.js';
import { skillsForKind, skillPath, hasSkillDraftBanner } from '../src/templates/skill-md.js';
import { KNOWN_KINDS, detectKind, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { copyFixture } from './helpers/make-repo.js';
import { silenced, renderMonoSnapshot } from './helpers/mono-snapshot.js';
import { AGENT_DIR, FIXTURE_NAMES, fixtureDir, frontmatterTools, renderAgents, trackedSections } from './helpers/frozen-kinds.js';

const FILE = 'caf-validator.md';
const REL = path.join(AGENT_DIR, FILE);
const TRACE_REL = skillPath('caf-traceability');

const PREVIOUS_KINDS = [
  'planner',
  'architect',
  'frontend',
  'backend',
  'implementer',
  'qa',
  'reviewer',
  'documentation',
  'auditor',
  'pm',
  'ux-designer',
  'devops',
];

// AC-2. The list the harness enforces: no Edit.
const EXPECTED_TOOLS = [
  { fixture: 'mono-pnpm', tools: ['Read', 'Write', 'Bash'] },
  { fixture: 'single-nuxt', tools: ['Read', 'Write', 'Bash'] },
];

const EXPECTED_HEADERS = [
  'Role',
  'Scope',
  'Allowed Tools',
  'Input',
  'Output',
  'Working Pattern (PIV)',
  'Verify Checklist',
  'Retry Logic',
  'Report Format',
];

// Copy of the line-anchored, case-sensitive parse caf-orchestrator's readQaReport() performs, as
// locked in test/qa-report-format.test.js for `qa-report.md`.
const QA_STATUS_LINE = /^.*Status:\s*(.+)$/m;
function parseQaStatus(raw) {
  const statusLine = QA_STATUS_LINE.exec(raw)?.[1] ?? '';
  return /^PASS\b/.test(statusLine.replace(/[*`]/g, '').trim()) ? 'PASS' : 'FAIL';
}

async function stackOf(dir) {
  return silenced(() => detectStack({ dir, explicitGlobs: undefined }));
}

async function renderValidator(fixture, opts) {
  const dir = fixtureDir(fixture);
  return buildValidatorAgent(dir, await stackOf(dir), opts);
}

const validator = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderValidator(f)])));
const others = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (f) => [f, await renderAgents(f)])));

const sectionOf = (fixture, header) => {
  const { lines, sections } = parseSections(validator[fixture].content);
  const s = sections.find((x) => x.header === header);
  assert.ok(s, `${fixture}: "## ${header}" is rendered`);
  return sectionBody(lines, s);
};
const flat = (text) => text.replace(/\s+/g, ' ');
const checklistLines = (md) => {
  const { lines, sections } = parseSections(md);
  const s = sections.find((x) => x.header === 'Verify Checklist');
  return sectionBody(lines, s).split('\n').filter((l) => l.startsWith('- [ ] '));
};

// ---------------------------------------------------------------------------------------------
// AC-1 — detection
// ---------------------------------------------------------------------------------------------

test('AC-1: caf-validator.md is detected as validator, and the 12 earlier kinds are all still known', () => {
  assert.equal(detectKind(FILE), 'validator');
  assert.equal(detectKind(REL), 'validator');
  assert.notEqual(detectKind(FILE), 'implementation');
  assert.ok(KNOWN_KINDS.includes('validator'));
  assert.deepEqual(PREVIOUS_KINDS.filter((k) => !KNOWN_KINDS.includes(k)), []);
  assert.equal(PREVIOUS_KINDS.length, 12);
  for (const kind of PREVIOUS_KINDS) assert.equal(detectKind(`caf-${kind}.md`), kind);
});

// ---------------------------------------------------------------------------------------------
// AC-2 — tools
// ---------------------------------------------------------------------------------------------

test('AC-2: frontmatter tools of the validator match the literal table: Read, Write, Bash, no Edit', () => {
  for (const { fixture, tools } of EXPECTED_TOOLS) {
    const { file, content } = validator[fixture];
    assert.equal(file, FILE);
    assert.match(content, /^---\nname: caf-validator\n/);
    assert.deepEqual(frontmatterTools(content), tools, fixture);
    assert.ok(!frontmatterTools(content).includes('Edit'), fixture);
    assert.match(sectionOf(fixture, 'Allowed Tools'), /^The frontmatter `tools` above is the list that applies: `Read`, `Write`, `Bash`\.$/m);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-3 — hidden
// ---------------------------------------------------------------------------------------------

// CAF-SDD-03c2 reversed these: the validator is a scaffold candidate in every mode and is offered.
test('AC-3: validator is a scaffold candidate in every mode, and offered by the picker', async () => {
  const mono = await stackOf(fixtureDir('mono-pnpm'));
  const web = mono.apps.find((a) => a.path === 'apps/web');
  const api = mono.apps.find((a) => a.path === 'apps/api');
  const single = (await stackOf(fixtureDir('single-nuxt'))).apps[0];

  const lists = [
    buildCandidates({}, []),
    buildCandidates({ frontend: [web], backend: [api] }, []),
    buildCandidates({ frontend: [web] }, [api]),
    ...SINGLE_REPO_ROLES.map((role) => buildSingleRepoCandidates(single, [], role)),
  ];
  for (const candidates of lists) {
    assert.ok(candidates.some((c) => c.kind === 'validator'));
    assert.ok(candidates.filter(isOfferedCandidate).some((c) => c.kind === 'validator'));
  }
  for (const kind of HIDDEN_CANDIDATE_KINDS) assert.ok(KNOWN_KINDS.includes(kind), kind);
});

test('AC-3: the MONOREPO render has caf-validator.md in place of caf-qa.md', async () => {
  const files = Object.keys((await renderMonoSnapshot()).files);
  assert.ok(files.includes('.claude/agents/caf-validator.md'));
  assert.ok(!files.includes('.claude/agents/caf-qa.md'));
});

// Every candidate the picker offers except the three that ask for a tracker (auditor, pm,
// ux-designer): their prompt is not part of what is tested here.
const NO_TRACKER_PROMPT = (c) => isOfferedCandidate(c) && !['auditor', 'pm', 'ux-designer'].includes(c.kind);

async function scaffoldAgents(fixture, { role } = {}) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-validator-scaffold-');
  const stack = await stackOf(dir);
  let answers;
  if (stack.isMonorepo) {
    const web = stack.apps.find((a) => a.path === 'apps/web');
    const api = stack.apps.find((a) => a.path === 'apps/api');
    // frontend apps, backend apps, agent multiselect, /caf-run, /caf-fix-review, /caf-review
    answers = [[web], [api], buildCandidates({ frontend: [web], backend: [api] }, []).filter(NO_TRACKER_PROMPT), false, false, false];
  } else {
    answers = [buildSingleRepoCandidates(stack.apps[0], [], role).filter(NO_TRACKER_PROMPT), false, false, false];
  }
  prompts.inject(answers);
  const result = await silenced(() => agents({ dir, dryRun: false, role }));
  prompts._injected.length = 0;
  return { dir, result };
}

for (const [fixture, role] of [['mono-pnpm'], ['single-nuxt'], ['single-nuxt', 'frontend'], ['single-nuxt', 'backend']]) {
  test(`AC-3: scaffold agents on ${fixture}${role ? ` (--role ${role})` : ''} writes caf-validator.md, the one buildValidatorAgent() renders, and no caf-qa.md`, async () => {
    const { dir, result } = await scaffoldAgents(fixture, { role });
    const written = fs.readdirSync(path.join(dir, AGENT_DIR));
    assert.ok(written.includes('caf-planner.md'), 'precondition: the run did write agents');
    assert.ok(written.includes('caf-validator.md'));
    assert.ok(!written.includes('caf-qa.md'));
    assert.ok(result.written.some((f) => path.basename(f) === 'caf-validator.md'));
    const expected = buildValidatorAgent(dir, await stackOf(dir), { skills: [] }).content;
    assert.equal(fs.readFileSync(path.join(dir, AGENT_DIR, 'caf-validator.md'), 'utf8'), expected);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-4 — what the agent is told to do
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-4: validator on ${fixture} — sections, and what it reads`, () => {
    const { content } = validator[fixture];
    assert.deepEqual(parseSections(content).sections.map((s) => s.header), EXPECTED_HEADERS);
    assert.match(content, /^# Agent: Validator$/m);

    const input = sectionOf(fixture, 'Input');
    for (const artifact of ['`requirements.md`', '`tasks.md`', '`verify-report.md`']) assert.ok(input.includes(artifact), artifact);
    assert.ok(input.includes('`.caf/tasks/{TICKET-ID}/`'));
    assert.match(sectionOf(fixture, 'Output'), /^Produces `validate-report\.md` in `\.caf\/tasks\/\{TICKET-ID\}\/` for the next agent to read\.$/m);
  });

  test(`AC-4: validator on ${fixture} — runs the repo gate, judges every AC with three statuses and five evidence kinds`, () => {
    const output = flat(sectionOf(fixture, 'Output'));
    assert.match(output, /### 2\. Run the repo verification gate/);
    assert.match(output, /Run every command of the Verify Checklist of this file/);
    assert.match(output, /### 3\. Judge every AC/);
    assert.match(output, /One row per AC of `requirements\.md`, none skipped/);
    for (const status of ['`PASS`', '`FAIL`', '`UNVERIFIED`']) assert.ok(output.includes(status), status);
    assert.match(output, /`automated-test`, `command`, `build-only`, `manual` or `none`/);
  });

  test(`AC-4: validator on ${fixture} — the commands it may run, and what it never edits`, () => {
    const output = flat(sectionOf(fixture, 'Output'));
    assert.match(output, /### Commands you may run/);
    assert.match(output, /The commands of the Verify Checklist of this file\./);
    assert.match(output, /Read-only git inspection: `git diff`, `git log`, `git status`, `git show`\./);
    assert.match(output, /Nothing else\./);
    assert.match(output, /### What the Validator never does/);
    assert.match(output, /Edit code, tests, the spec \(`requirements\.md`, `tasks\.md`\) or `verify-report\.md`\./);
    assert.match(output, /The only file it writes is `validate-report\.md`\./);

    const tools = flat(sectionOf(fixture, 'Allowed Tools'));
    assert.match(tools, /Write only for `validate-report\.md`/);
    assert.match(tools, /`git diff`, `git log`, `git status`, `git show`/);
    assert.match(tools, /Does NOT change code, tests, the spec or `verify-report\.md`/);

    // It reports; retrying and fixing are not its job.
    const retry = flat(sectionOf(fixture, 'Retry Logic'));
    assert.match(retry, /does not retry and does not fix/);
    assert.match(retry, /`validate-report\.md`/);
    assert.doesNotMatch(retry, /retry up to/);
    assert.doesNotMatch(retry, /write `verify-report\.md`/);
    assert.doesNotMatch(validator[fixture].content, /qa-report\.md/);
    assert.doesNotMatch(validator[fixture].content, /\bSUCCESS\b/);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-5 — validate-report.md format
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-5: validator on ${fixture} — validate-report.md skeleton: Status, Unverified, per-AC table, gate gaps`, () => {
    const format = sectionOf(fixture, 'Report Format');
    assert.match(format, /^Save the report to `\.caf\/tasks\/<TICKET-ID>\/validate-report\.md`\.$/m);

    const lines = format.split('\n');
    const open = lines.indexOf('```');
    const close = lines.indexOf('```', open + 1);
    assert.ok(open > 0 && close > open, 'the skeleton is fenced');
    const skeleton = lines.slice(open + 1, close);

    assert.equal(skeleton[0], '## Validate Report — {TICKET-ID}');
    assert.ok(skeleton.includes('Agent: caf-validator'));
    assert.ok(skeleton.includes('Status: PASS | FAIL | NEEDS_HUMAN'));
    assert.ok(skeleton.some((l) => /^Unverified: \{count\} — \{.*AC ids.*\}$/.test(l)), 'count and list of UNVERIFIED ACs on one line');
    assert.ok(skeleton.includes('### Acceptance Criteria'));
    assert.ok(skeleton.includes('| AC | Status | Evidence kind | Evidence |'));
    assert.ok(skeleton.includes('### Verification Gate Gaps'));
    // The Status line comes before anything else that could carry the word.
    assert.equal(skeleton.findIndex((l) => l.includes('Status:')), skeleton.indexOf('Status: PASS | FAIL | NEEDS_HUMAN'));

    const rules = flat(lines.slice(close + 1).join('\n'));
    assert.match(rules, /`Status: PASS` only when no AC is `FAIL` and every command of the verification gate passed/);
    assert.match(rules, /`UNVERIFIED` rows do not make the status `FAIL`/);
    assert.match(rules, /`Unverified: 0 — none`/);
  });

  test(`AC-5: validator on ${fixture} — a filled-in report reads the way qa-report.md is read today`, () => {
    const format = sectionOf(fixture, 'Report Format');
    assert.match(format, /^Status: PASS \| FAIL \| NEEDS_HUMAN$/m);
    const fill = (value) => format.replace('Status: PASS | FAIL | NEEDS_HUMAN', `Status: ${value}`);
    assert.equal(parseQaStatus(fill('PASS')), 'PASS');
    assert.equal(parseQaStatus(fill('FAIL')), 'FAIL');
    // Anything that is not PASS is fail-safe for today's reader; SDD-04 decides the rest.
    assert.equal(parseQaStatus(fill('NEEDS_HUMAN')), 'FAIL');
    // A PASS cell in the per-AC table is never the report status.
    assert.equal(parseQaStatus(fill('FAIL').replace('PASS, FAIL or UNVERIFIED', 'PASS')), 'FAIL');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-6 — judging rules
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-6: validator on ${fixture} — PASS needs evidence it ran itself; manual and build-only are UNVERIFIED`, () => {
    const output = flat(sectionOf(fixture, 'Output'));
    assert.match(output, /`PASS`: only for `automated-test` or `command` evidence that you ran yourself and whose result matches the AC/);
    assert.match(output, /`UNVERIFIED`: everything else/);
    assert.match(output, /`manual` and `build-only` evidence/);
    assert.match(output, /evidence that names no test/);
    assert.match(output, /a command outside the ones you may run: do not run it/);
  });

  test(`AC-6: validator on ${fixture} — a test that imports no production code is not evidence`, () => {
    const output = flat(sectionOf(fixture, 'Output'));
    assert.match(output, /a test that does not import the production code it claims to cover: it is not counted as evidence/);
  });

  test(`AC-6: validator on ${fixture} — an AC with no evidence line is UNVERIFIED "no evidence reported", not FAIL`, () => {
    const output = flat(sectionOf(fixture, 'Output'));
    assert.match(output, /an AC with no line in `verify-report\.md`: `UNVERIFIED`, evidence kind `none`, reason `no evidence reported`\. It is not a `FAIL`\./);
  });

  test(`AC-6: validator on ${fixture} — run and contradicted is FAIL with the observed output`, () => {
    const output = flat(sectionOf(fixture, 'Output'));
    assert.match(output, /`FAIL`: you ran it and the result contradicts the AC\. Write the output you observed\./);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-7 — skills
// ---------------------------------------------------------------------------------------------

test('AC-7: validator maps to the skills of qa plus caf-traceability', () => {
  assert.deepEqual(skillsForKind('qa'), ['caf-self-verify', 'caf-no-guess']);
  assert.deepEqual(skillsForKind('validator'), ['caf-self-verify', 'caf-no-guess', 'caf-traceability']);
});

for (const fixture of FIXTURE_NAMES) {
  test(`AC-7: validator on ${fixture} — no pointer at caf-traceability while it is a DRAFT; the others follow the usual rule`, async () => {
    const plain = validator[fixture].content;
    assert.ok(!/^## Skills$/m.test(plain), 'no skills in the repo, no section');

    const dir = copyFixture(fixtureDir(fixture), 'caf-validator-skills-');
    await silenced(() => skillsTarget({ dir }));
    assert.ok(hasSkillDraftBanner(fs.readFileSync(path.join(dir, TRACE_REL), 'utf8')), 'precondition: caf-traceability is a DRAFT');

    const usable = usableSkillPaths(dir, 'validator');
    assert.ok(!usable.includes(TRACE_REL));
    assert.deepEqual(usable, usableSkillPaths(dir, 'qa'), 'same pointers as qa while caf-traceability is a DRAFT');
    assert.ok(usable.includes(skillPath('caf-no-guess')));

    const { content } = buildValidatorAgent(dir, await stackOf(dir), { skills: usable });
    const pointers = [...content.matchAll(/^- `([^`]+\/SKILL\.md)`$/gm)].map((m) => m[1]);
    assert.deepEqual(pointers, usable);
    assert.ok(!content.includes(TRACE_REL));
    const headers = parseSections(content).sections.map((s) => s.header);
    assert.equal(headers[headers.indexOf('Skills') - 1], 'Output');
    assert.equal(headers[headers.indexOf('Skills') + 1], 'Working Pattern (PIV)');
    // Nothing else moves.
    assert.equal(content.replace(/\n## Skills\n[\s\S]*?\n(?=\n## Working Pattern)/, ''), buildValidatorAgent(dir, await stackOf(dir)).content);
  });
}

// ---------------------------------------------------------------------------------------------
// AC-8 — curate sync leaves a generated validator alone
// ---------------------------------------------------------------------------------------------

function makeBaselinedRepo(fixture, { file, content }) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-validator-sync-');
  const relPath = path.join(AGENT_DIR, file);
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  fs.writeFileSync(path.join(dir, relPath), content, 'utf8');
  const manifest = { version: 1, files: {} };
  const { lines, sections } = parseSections(content);
  for (const s of sections) setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  writeManifest(dir, manifest);
  return dir;
}

for (const fixture of FIXTURE_NAMES) {
  test(`AC-8: validator on ${fixture} — after baseline every tracked section is IN_SYNC and curate sync changes no byte`, async () => {
    const agent = validator[fixture];
    assert.deepEqual(Object.keys(trackedSections(agent.content)), ['Allowed Tools', 'Input', 'Output', 'Working Pattern (PIV)', 'Retry Logic', 'Report Format']);

    const dir = makeBaselinedRepo(fixture, agent);
    const manifestPath = path.join(dir, '.caf', '.generate-manifest.json');
    const manifestBefore = fs.readFileSync(manifestPath, 'utf8');

    const { sectionCounts } = auditAgentDefinitions(dir, AGENT_DIR);
    assert.deepEqual(
      Object.fromEntries(Object.entries(sectionCounts).filter(([, n]) => n > 0)),
      { IN_SYNC: 6 }
    );

    for (const dryRun of [true, false]) {
      const mode = dryRun ? 'dry-run' : 'write';
      const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
      assert.deepEqual(result.drifted, [], mode);
      assert.deepEqual(result.needsAttention, [], mode);
      assert.deepEqual(result.unverifiable, [], mode);
      assert.deepEqual(result.updated, [], mode);
      assert.equal(fs.readFileSync(path.join(dir, REL), 'utf8'), agent.content, `${mode}: byte-identical`);
      assert.equal(fs.readFileSync(manifestPath, 'utf8'), manifestBefore, `${mode}: manifest`);
    }
  });
}

test('AC-8: the Input of the validator is kind-only: no app list, the same text in both fixtures', () => {
  const input = buildInputSection('validator');
  assert.equal(buildInputSection('validator', ['apps/web', 'apps/api']), input);
  for (const fixture of FIXTURE_NAMES) assert.equal(sectionOf(fixture, 'Input'), input, fixture);
  assert.ok(!input.includes('apps/'));
  for (const header of ['Allowed Tools', 'Output', 'Working Pattern (PIV)', 'Retry Logic', 'Report Format']) {
    assert.equal(sectionOf('mono-pnpm', header), sectionOf('single-nuxt', header), header);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-11 — a real Verify Checklist
// ---------------------------------------------------------------------------------------------

test('AC-11: validator on mono-pnpm — its Verify Checklist is the frontend and backend checklists, per app', () => {
  const expected = [...checklistLines(others['mono-pnpm'].frontend.content), ...checklistLines(others['mono-pnpm'].backend.content)];
  const actual = checklistLines(validator['mono-pnpm'].content);
  assert.deepEqual([...actual].sort(), [...expected].sort());
  assert.ok(actual.includes('- [ ] `pnpm --filter @mono/api run typecheck`'));
  assert.ok(actual.includes('- [ ] `pnpm --filter @mono/web run test`'));
  // The gap of apps/web is a gap line, not an invented command.
  assert.ok(actual.includes('- [ ] TODO: no typecheck script detected in package.json — verify manually or add the script'));
  const checklist = sectionOf('mono-pnpm', 'Verify Checklist');
  assert.match(checklist, /^#### apps\/web$/m);
  assert.match(checklist, /^#### apps\/api$/m);
});

test('AC-11: validator on single-nuxt — its Verify Checklist is the implementer checklist, byte for byte', () => {
  const implementer = others['single-nuxt'].implementer.content;
  const body = (md) => {
    const { lines, sections } = parseSections(md);
    return sectionBody(lines, sections.find((s) => s.header === 'Verify Checklist'));
  };
  assert.equal(sectionOf('single-nuxt', 'Verify Checklist'), body(implementer));
  const actual = checklistLines(validator['single-nuxt'].content);
  assert.ok(actual.includes('- [ ] `pnpm run lint`'));
  assert.ok(actual.includes('- [ ] `pnpm run typecheck`'));
  assert.ok(actual.includes('- [ ] TODO: no test script detected in package.json — verify manually or add the script'));
});

test('AC-11: the validator checklist is not the two-line placeholder qa has', () => {
  for (const fixture of FIXTURE_NAMES) {
    assert.match(sectionOf(fixture, 'Verify Checklist'), /^- \[ \] `pnpm /m, fixture);
    assert.doesNotMatch(sectionOf(fixture, 'Verify Checklist'), /not a single app/, fixture);
    assert.match(others[fixture].qa.content, /not a single app/, `${fixture}: qa is unchanged`);
  }
});

test('deterministic: the order detection returns the apps in does not change the rendered validator', async () => {
  const dir = fixtureDir('mono-pnpm');
  const stack = await stackOf(dir);
  const reversed = { ...stack, apps: [...stack.apps].reverse() };
  assert.equal(buildValidatorAgent(dir, reversed).content, buildValidatorAgent(dir, stack).content);
  const checklist = sectionOf('mono-pnpm', 'Verify Checklist');
  assert.ok(checklist.indexOf('#### apps/api') < checklist.indexOf('#### apps/web'));
});
