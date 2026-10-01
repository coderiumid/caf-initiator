// CAF-INIT-SINGLE-REPO — end-to-end output of the SINGLE_REPO path: a Nuxt single package
// scaffolds completely, nothing is left as an unresolved `{{...}}` placeholder, the implementer
// agent replaces the frontend/backend split, and `--scope` limits it per directory.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

import { agents, buildSingleRepoCandidates, normalizeScopeDirs } from '../src/commands/agents.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { auditAgentDefinitions } from '../src/commands/audit.js';
import { curateBaseline } from '../src/commands/curate-baseline.js';
import { runSetup } from '../src/commands/setup.js';
import { taskCompletion } from '../src/commands/task-completion.js';
import { workflow } from '../src/commands/workflow.js';
import { agentSlug, buildAgentMd, buildInputSection, buildOutputSection, buildToolsSection } from '../src/templates/agent-md.js';
import { buildClaudeMd } from '../src/templates/claude-md.js';
import { buildRunPipelineMd } from '../src/templates/run-pipeline-command.js';
import { KNOWN_KINDS, detectKind, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import {
  RUNTIME_TOKENS,
  assertNoUnresolvedPlaceholders,
  findUnresolvedPlaceholders,
} from '../src/utils/placeholder-check.js';
import { writeIfAbsent } from '../src/util.js';
import { silenced } from './helpers/mono-snapshot.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SINGLE_FIXTURE = path.join(ROOT, 'test', 'fixtures', 'single-nuxt');
const MONO_FIXTURE = path.join(ROOT, 'test', 'fixtures', 'mono-pnpm');
const CLI = path.join(ROOT, 'src', 'index.js');

function copyFixture(fixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-single-repo-'));
  fs.cpSync(fixture, dir, { recursive: true });
  return dir;
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(abs, base) : [path.relative(base, abs)];
  });
}

function bodyOf(content, header) {
  const { lines, sections } = parseSections(content);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
}

const pick = (candidates, kinds) => kinds.map((kind) => candidates.find((c) => c.kind === kind));
const SINGLE_APP = { name: 'website-cms-v2', path: '.', framework: 'Nuxt', packageManager: 'pnpm' };

// Runs the whole non-interactive-able chain against a copy of the Nuxt fixture: Setup, Agents
// (planner + implementer + qa + reviewer, plus /caf-run-pipeline), Task Completion, Workflow.
// prompts.inject() answers, in order: agent multiselect, /caf-run-pipeline, /caf-fix-review,
// /caf-review.
async function scaffoldSingleRepo({ scope, role } = {}) {
  const dir = copyFixture(SINGLE_FIXTURE);
  const before = new Set(listFiles(dir));
  const { dirs } = normalizeScopeDirs(dir, scope);
  const picked = pick(buildSingleRepoCandidates(SINGLE_APP, dirs, role), ['planner', role || 'implementer', 'qa', 'reviewer']);

  await silenced(async () => {
    const setup = await runSetup({ dir, dryRun: false, explicitGlobs: undefined });
    assert.equal(setup.ok, true);
    prompts.inject([picked, true, false, false]);
    await agents({ dir, dryRun: false, scope, role });
    await taskCompletion({ dir, dryRun: false });
    await workflow({ dir, dryRun: false });
  });

  const generated = listFiles(dir).filter((f) => !before.has(f));
  return { dir, generated };
}

test('SINGLE_REPO scaffold on a Nuxt single package is complete and leaves no unresolved placeholder', async () => {
  const { dir, generated } = await scaffoldSingleRepo();

  for (const expected of [
    'CLAUDE.md',
    'AGENTS.md',
    '.caf/tasks/README.md',
    '.caf/knowledge/INDEX.md',
    '.claude/agents/caf-planner.md',
    '.claude/agents/caf-implementer.md',
    '.claude/agents/caf-qa.md',
    '.claude/agents/caf-reviewer.md',
    '.claude/commands/caf-run-pipeline.md',
    '.caf/workflows/task-completion.md',
  ]) {
    assert.ok(generated.includes(expected), `${expected} should be generated — got: ${generated.join(', ')}`);
  }

  // One root CLAUDE.md, no per-app CLAUDE.md, no frontend/backend split, no empty-named agent.
  assert.deepEqual(generated.filter((f) => path.basename(f) === 'CLAUDE.md'), ['CLAUDE.md']);
  assert.ok(!generated.includes('.claude/agents/caf-frontend.md'));
  assert.ok(!generated.includes('.claude/agents/caf-backend.md'));
  assert.ok(!generated.includes('.claude/agents/.md'));
  // golden-examples has no per-app subfolder in SINGLE_REPO.
  assert.deepEqual(fs.readdirSync(path.join(dir, '.caf', 'knowledge', 'golden-examples')), []);

  for (const file of generated) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.deepEqual(findUnresolvedPlaceholders(content), [], `${file} has an unresolved placeholder`);
    // The only `{{` allowed to remain are the documented per-ticket runtime tokens.
    for (const [literal, token] of content.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) {
      assert.ok(RUNTIME_TOKENS.includes(token), `${file}: ${literal} is not a runtime token`);
    }
    assert.doesNotMatch(content, /\{\{(APP_\d|APP_N|apps_dir|packages_dir|REPO_MODE|PKG_MANAGER|TRACKER)\}\}/);
  }

  const claudeMd = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(claudeMd, /^- Repo mode: SINGLE_REPO$/m);
  assert.match(claudeMd, /^- `website-cms-v2` \(repo root\) — Nuxt$/m);
  assert.match(claudeMd, /^- Package manager: pnpm$/m);
});

test('SINGLE_REPO implementer: default scope is the whole repo, verify commands are unscoped root scripts', async () => {
  const { dir } = await scaffoldSingleRepo();
  const implementer = fs.readFileSync(path.join(dir, '.claude', 'agents', 'caf-implementer.md'), 'utf8');

  assert.match(implementer, /^name: caf-implementer$/m);
  assert.match(implementer, /^tools: \[Read, Write, Edit, Bash\]$/m);
  assert.match(bodyOf(implementer, 'Scope'), /Whole repository/);
  assert.doesNotMatch(implementer, /`\.\/\*\*`/);
  // Real scripts from the fixture's package.json, never an invented one.
  const checklist = bodyOf(implementer, 'Verify Checklist');
  assert.match(checklist, /`pnpm run lint`/);
  assert.match(checklist, /`pnpm run typecheck`/);
  assert.match(checklist, /`pnpm run build`/);
  assert.match(checklist, /TODO: no test script detected/);
  assert.doesNotMatch(checklist, /--filter/);

  const pipeline = fs.readFileSync(path.join(dir, '.claude', 'commands', 'caf-run-pipeline.md'), 'utf8');
  assert.match(pipeline, /`caf-implementer` \(`\.claude\/agents\/caf-implementer\.md`\)/);
  assert.match(pipeline, /^- `caf-implementer`: the whole repository/m);
  assert.doesNotMatch(pipeline, /`\.\/`/);

  const handoff = fs.readFileSync(path.join(dir, '.caf', 'workflows', 'agent-handoff.md'), 'utf8');
  assert.match(handoff, /^\| Implementer \| kode \+ `verify-report\.md` \|$/m);

  // Roster: the implementer replaces the frontend/backend split, so their absence is not a gap.
  const piv = fs.readFileSync(path.join(dir, '.caf', 'workflows', 'piv-workflow.md'), 'utf8');
  assert.match(piv, /^- \[x\] Implementer$/m);
  assert.doesNotMatch(piv, /(Frontend|Backend) — NOT present/);
});

test('--scope writes the implementer scope and the commit whitelist per directory', async () => {
  const { dir } = await scaffoldSingleRepo({ scope: ['components,composables/'] });
  const implementer = fs.readFileSync(path.join(dir, '.claude', 'agents', 'caf-implementer.md'), 'utf8');
  const scope = bodyOf(implementer, 'Scope');
  assert.match(scope, /^- `components\/\*\*`$/m);
  assert.match(scope, /^- `composables\/\*\*`$/m);
  assert.doesNotMatch(scope, /Whole repository/);

  const pipeline = fs.readFileSync(path.join(dir, '.claude', 'commands', 'caf-run-pipeline.md'), 'utf8');
  assert.match(pipeline, /^- `caf-implementer`: `components\/`$/m);
  assert.match(pipeline, /^- `caf-implementer`: `composables\/`$/m);
  assert.doesNotMatch(pipeline, /the whole repository/);
});

test('--scope is validated, never guessed: missing dir, escaping path, repo root', () => {
  const dir = copyFixture(SINGLE_FIXTURE);
  assert.deepEqual(normalizeScopeDirs(dir, undefined), { dirs: [], errors: [] });
  assert.deepEqual(normalizeScopeDirs(dir, ['./components/', 'components']).dirs, ['components']);
  assert.equal(normalizeScopeDirs(dir, ['nope']).errors.length, 1);
  assert.equal(normalizeScopeDirs(dir, ['../elsewhere']).errors.length, 1);
  assert.equal(normalizeScopeDirs(dir, ['.']).errors.length, 1);
  assert.equal(normalizeScopeDirs(dir, ['package.json']).errors.length, 1);
});

test('--scope is refused in MONOREPO and for a missing directory — nothing is written', async () => {
  const savedExitCode = process.exitCode;
  try {
    const mono = copyFixture(MONO_FIXTURE);
    fs.mkdirSync(path.join(mono, 'libs'));
    const monoResult = await silenced(() => agents({ dir: mono, dryRun: false, scope: ['libs'] }));
    assert.deepEqual(monoResult, { written: [], skipped: [] });
    assert.ok(!fs.existsSync(path.join(mono, '.claude')));

    const single = copyFixture(SINGLE_FIXTURE);
    const singleResult = await silenced(() => agents({ dir: single, dryRun: false, scope: ['domain'] }));
    assert.deepEqual(singleResult, { written: [], skipped: [] });
    assert.ok(!fs.existsSync(path.join(single, '.claude')));
  } finally {
    process.exitCode = savedExitCode;
  }
});

test('--role frontend generates the single implementation agent as caf-frontend.md (orchestrator-routed name)', async () => {
  const { dir, generated } = await scaffoldSingleRepo({ role: 'frontend', scope: ['components'] });
  assert.ok(generated.includes('.claude/agents/caf-frontend.md'));
  assert.ok(!generated.includes('.claude/agents/caf-implementer.md'));
  assert.ok(!generated.includes('.claude/agents/caf-backend.md'));

  const frontend = fs.readFileSync(path.join(dir, '.claude', 'agents', 'caf-frontend.md'), 'utf8');
  assert.match(frontend, /^name: caf-frontend$/m);
  assert.match(frontend, /\(role: frontend\)/);
  assert.match(bodyOf(frontend, 'Scope'), /^- `components\/\*\*`$/m);
  // Root scripts, unscoped — same as the implementer.
  assert.match(bodyOf(frontend, 'Verify Checklist'), /`pnpm run lint`/);
  assert.doesNotMatch(frontend, /--filter|`\.\/\*\*`/);
  assert.deepEqual(findUnresolvedPlaceholders(frontend), []);

  const pipeline = fs.readFileSync(path.join(dir, '.claude', 'commands', 'caf-run-pipeline.md'), 'utf8');
  assert.match(pipeline, /^- `caf-frontend`: `components\/`$/m);
});

test('--role: default is implementer, whole-repo scope works for frontend/backend, unknown role is rejected', async () => {
  const kindsFor = (role) => buildSingleRepoCandidates(SINGLE_APP, [], role).map((c) => c.kind);
  assert.ok(kindsFor(undefined).includes('implementer'));
  for (const role of ['frontend', 'backend']) {
    const kinds = kindsFor(role);
    assert.ok(kinds.includes(role));
    assert.ok(!kinds.includes('implementer'));
    assert.equal(kinds.filter((k) => ['frontend', 'backend', 'implementer', 'implementation'].includes(k)).length, 1);
  }
  const backend = buildSingleRepoCandidates(SINGLE_APP, [], 'backend').find((c) => c.kind === 'backend');
  assert.match(backend.scope, /Whole repository/);
  assert.equal(agentSlug(backend.kind, backend.app), 'caf-backend');
  assert.throws(() => buildSingleRepoCandidates(SINGLE_APP, [], 'devops'), /unknown --role "devops"/);
});

test('--role is refused in MONOREPO — nothing is written', async () => {
  const savedExitCode = process.exitCode;
  try {
    const mono = copyFixture(MONO_FIXTURE);
    const result = await silenced(() => agents({ dir: mono, dryRun: false, role: 'frontend' }));
    assert.deepEqual(result, { written: [], skipped: [] });
    assert.ok(!fs.existsSync(path.join(mono, '.claude')));
  } finally {
    process.exitCode = savedExitCode;
  }
});

test('SINGLE_REPO candidates: planner, implementer, qa, reviewer are offered; frontend/backend are not', () => {
  const kinds = buildSingleRepoCandidates(SINGLE_APP).map((c) => c.kind);
  for (const kind of ['planner', 'implementer', 'qa', 'reviewer']) assert.ok(kinds.includes(kind), kind);
  assert.ok(!kinds.includes('frontend'));
  assert.ok(!kinds.includes('backend'));
  assert.ok(!kinds.includes('implementation'));
});

test('agent slug is never empty for a root-scoped app', () => {
  assert.equal(agentSlug('implementer', SINGLE_APP), 'caf-implementer');
  assert.equal(agentSlug('implementation', { path: '.', name: 'website-cms-v2' }), 'website-cms-v2');
  assert.equal(agentSlug('implementation', { path: '.', name: '@scope/My App' }), 'scope-my-app');
  assert.equal(agentSlug('implementation', { path: '.' }), 'app');
  // Unchanged for real app paths.
  assert.equal(agentSlug('implementation', { path: 'apps/web', name: '@mono/web' }), 'web');
});

test('implementer is a known kind with its own real section content', () => {
  assert.ok(KNOWN_KINDS.includes('implementer'));
  assert.equal(detectKind('caf-implementer.md'), 'implementer');
  assert.equal(buildToolsSection('implementer'), buildToolsSection('implementation'));
  assert.match(buildToolsSection('implementer'), /`Read`, `Write`, `Edit`, `Bash`/);
  assert.equal(buildInputSection('implementer'), buildInputSection('frontend'));
  assert.equal(buildOutputSection('implementer'), buildOutputSection('frontend'));
  assert.doesNotMatch(buildInputSection('implementer'), /TODO/);
  assert.doesNotMatch(buildOutputSection('implementer'), /TODO/);
});

test('curate on a freshly generated caf-implementer.md: no drift, and sync leaves the file byte-identical', async () => {
  const { dir } = await scaffoldSingleRepo();
  const filePath = path.join(dir, '.claude', 'agents', 'caf-implementer.md');
  const before = fs.readFileSync(filePath, 'utf8');

  await silenced(() => curateBaseline({ dir, yes: true }));
  const { entries } = await silenced(() => auditAgentDefinitions(dir));
  const implementerProblems = entries.filter(
    (e) => e.filePath.endsWith('caf-implementer.md') && e.status !== 'ok'
  );
  assert.deepEqual(implementerProblems, [], 'a fresh caf-implementer.md must not read as drift/gap');

  await silenced(() => agentsSync({ dir, dryRun: false }));
  assert.equal(fs.readFileSync(filePath, 'utf8'), before, 'curate sync must not touch a fresh caf-implementer.md');
});

test('post-render validation: unresolved generate-time placeholders fail with a clear message', () => {
  assert.deepEqual(findUnresolvedPlaceholders('branch ai-agent/{{TICKET-ID}} and {{feature-name}}'), []);
  assert.deepEqual(findUnresolvedPlaceholders('see {{APP_1}}/CLAUDE.md, {{apps_dir}}, {{APP_1}}'), [
    '{{APP_1}}',
    '{{apps_dir}}',
  ]);
  assert.throws(
    () => assertNoUnresolvedPlaceholders('mode: {{REPO_MODE}}', '/repo/CLAUDE.md'),
    /unresolved placeholder\(s\) \{\{REPO_MODE\}\} in \/repo\/CLAUDE\.md/
  );
});

test('writeIfAbsent refuses to write (and to dry-run) content with an unresolved placeholder', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-placeholder-'));
  const target = path.join(dir, 'CLAUDE.md');
  for (const dryRun of [false, true]) {
    assert.throws(() => writeIfAbsent(target, '# {{APP_1}}', { dryRun }), /unresolved placeholder/);
    assert.ok(!fs.existsSync(target));
  }
  // Existing file is still skipped untouched — the never-overwrite guarantee comes first.
  fs.writeFileSync(target, 'mine');
  const original = console.log;
  console.log = () => {};
  try {
    assert.equal(writeIfAbsent(target, '# {{APP_1}}'), 'skipped');
  } finally {
    console.log = original;
  }
  assert.equal(fs.readFileSync(target, 'utf8'), 'mine');
});

test('templates render no unresolved placeholder in either mode', () => {
  const rendered = [
    buildClaudeMd({ mode: 'SINGLE_REPO', isMonorepo: false, monorepoTool: null, packageManager: null, apps: [SINGLE_APP], database: [], tracker: null }),
    buildClaudeMd({ mode: 'MONOREPO', isMonorepo: true, monorepoTool: 'Turborepo', packageManager: 'pnpm', apps: [], database: [], tracker: 'Linear' }),
    buildRunPipelineMd({ implementationRoles: ['caf-implementer'], appPaths: { 'caf-implementer': ['.'] } }),
    ...KNOWN_KINDS.filter((k) => k !== 'pm' && k !== 'ux-designer').map((kind) =>
      buildAgentMd({ name: kind, role: 'r', scope: 's', scripts: null, packageManager: null, kind, appNames: [], slug: `caf-${kind}` })
    ),
  ];
  for (const content of rendered) assert.deepEqual(findUnresolvedPlaceholders(content), []);
});

test('CLAUDE.md: MONOREPO and mode-less rendering carry no Repo mode line (unchanged output)', () => {
  const base = { isMonorepo: false, monorepoTool: null, packageManager: 'npm', apps: [SINGLE_APP], database: [], tracker: 'Linear' };
  assert.doesNotMatch(buildClaudeMd(base), /Repo mode/);
  assert.match(buildClaudeMd(base), /^- `\.` — Nuxt$/m);
  assert.doesNotMatch(buildClaudeMd({ ...base, mode: 'MONOREPO', isMonorepo: true }), /Repo mode/);
});

test('CLI: --mode is documented in --help and overrides auto-detection', () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: '' });

  for (const command of ['scaffold', 'docs', 'curate']) {
    const help = run([command, '--help']).stdout;
    assert.match(help, /--mode <mode>/, `${command} --help should document --mode`);
    assert.match(help, /choices: "single", "mono"/);
  }
  assert.match(run(['scaffold', '--help']).stdout, /--scope <dirs\.\.\.>/);
  assert.match(run(['scaffold', '--help']).stdout, /--role <role>/);
  assert.notEqual(run(['scaffold', 'agents', '--dir', SINGLE_FIXTURE, '--dry-run', '--role', 'devops']).status, 0);

  const auto = run(['scaffold', '--dir', SINGLE_FIXTURE, '--dry-run']).stdout;
  assert.match(auto, /mode: .*SINGLE_REPO/);
  assert.doesNotMatch(auto, /--mode override/);

  const forcedMono = run(['scaffold', '--dir', SINGLE_FIXTURE, '--dry-run', '--mode', 'mono']).stdout;
  assert.match(forcedMono, /mode: .*MONOREPO.*--mode override/);

  const forcedSingle = run(['scaffold', '--dir', MONO_FIXTURE, '--dry-run', '--mode', 'single']).stdout;
  assert.match(forcedSingle, /mode: .*SINGLE_REPO.*--mode override/);
  assert.match(forcedSingle, /apps found: 1/);

  const invalid = run(['scaffold', '--dir', SINGLE_FIXTURE, '--dry-run', '--mode', 'multi']);
  assert.notEqual(invalid.status, 0);
  assert.match(invalid.stderr, /Allowed choices are single, mono/);

  // --dry-run wrote nothing into the fixtures.
  assert.ok(!fs.existsSync(path.join(SINGLE_FIXTURE, 'CLAUDE.md')));
  assert.ok(!fs.existsSync(path.join(MONO_FIXTURE, 'CLAUDE.md')));
});
