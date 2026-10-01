// CAF-COMPLETE-DRAFTS-01 — AI-assisted draft completion without giving up CAF's rules.
// caf-init never calls a model: it generates /caf-complete-drafts (run by the user in their AI
// runner) and verifies afterwards, deterministically, with `curate --check-drafts`.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';

import { agents, buildCandidates, buildSingleRepoCandidates } from '../src/commands/agents.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { completeDrafts, listDraftFiles } from '../src/commands/complete-drafts.js';
import { runSetup } from '../src/commands/setup.js';
import { CHAIN_ORDER, TARGETS } from '../src/commands/scaffold.js';
import { taskCompletion } from '../src/commands/task-completion.js';
import { buildCompleteDraftsMd } from '../src/templates/complete-drafts-command.js';
import { buildRulesMd } from '../src/templates/golden-example-rules-md.js';
import { SYNCABLE_SECTIONS } from '../src/utils/agent-sections.js';
import { findUnresolvedPlaceholders } from '../src/utils/placeholder-check.js';
import { silenced } from './helpers/mono-snapshot.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SINGLE_FIXTURE = path.join(ROOT, 'test', 'fixtures', 'single-nuxt');
const MONO_FIXTURE = path.join(ROOT, 'test', 'fixtures', 'mono-pnpm');
const CLI = path.join(ROOT, 'src', 'index.js');
const SINGLE_APP = { name: 'website-cms-v2', path: '.', framework: 'Nuxt', packageManager: 'pnpm' };
const COMMAND_FILE = path.join('.claude', 'commands', 'caf-complete-drafts.md');

function copyFixture(fixture) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-complete-drafts-'));
  fs.cpSync(fixture, dir, { recursive: true });
  return dir;
}

function snapshotTree(dir, base = dir) {
  const out = {};
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, snapshotTree(abs, base));
    else out[path.relative(base, abs)] = fs.readFileSync(abs, 'utf8');
  }
  return out;
}

function edit(dir, rel, fn) {
  const abs = path.join(dir, rel);
  const before = fs.readFileSync(abs, 'utf8');
  const after = fn(before);
  assert.notEqual(after, before, `edit to ${rel} did not change anything`);
  fs.writeFileSync(abs, after);
}

// Setup + agents (planner, frontend, qa, reviewer) + task-completion on a copy of the Nuxt
// fixture; optionally the complete-drafts step with the baseline prompt answered `baseline`.
async function scaffold({ withCommand = true, baseline = true } = {}) {
  const dir = copyFixture(SINGLE_FIXTURE);
  await silenced(async () => {
    await runSetup({ dir, dryRun: false });
    const candidates = buildSingleRepoCandidates(SINGLE_APP, [], 'frontend');
    const picked = ['planner', 'frontend', 'qa', 'reviewer'].map((k) => candidates.find((c) => c.kind === k));
    prompts.inject([picked, false, false, false]);
    await agents({ dir, dryRun: false, role: 'frontend' });
    await taskCompletion({ dir, dryRun: false });
    if (withCommand) {
      prompts.inject([baseline]);
      await completeDrafts({ dir, dryRun: false });
    }
  });
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

const failsFor = (result, file) => result.findings.filter((f) => f.level === 'FAIL' && f.file === file);

test('template: lists exactly the tracked sections curate tracks, in both modes, with no leftover placeholder', () => {
  const single = buildCompleteDraftsMd({ mode: 'SINGLE_REPO', packageManager: 'pnpm', apps: [SINGLE_APP], drafts: ['CLAUDE.md'] });
  const mono = buildCompleteDraftsMd({
    mode: 'MONOREPO',
    packageManager: 'pnpm',
    apps: [{ name: '@mono/web', path: 'apps/web', framework: 'Nuxt' }],
    drafts: [],
  });
  for (const content of [single, mono, buildCompleteDraftsMd()]) {
    assert.deepEqual(findUnresolvedPlaceholders(content), []);
    for (const header of Object.keys(SYNCABLE_SECTIONS)) {
      assert.ok(content.includes(`\`## ${header}\``), `tracked section ${header} must be named as off-limits`);
    }
    assert.match(content, /\*\*STOP here and wait for the user's answers\.\*\*/);
    assert.match(content, /caf-init curate --check-drafts/);
    assert.match(content, /Never invent/);
  }
  assert.match(single, /single-package repo/);
  assert.match(single, /`website-cms-v2`/);
  assert.match(mono, /monorepo/);
  assert.match(mono, /`apps\/web` \(package `@mono\/web`, Nuxt\)/);
  assert.match(mono, /MUST be scoped to the workspace/);
});

test('template: allowed-tools never grants commit/push, and grants `<pm> run` only when a package manager is known', () => {
  const toolsOf = (content) => content.match(/^allowed-tools: (.*)$/m)[1];
  const withPm = toolsOf(buildCompleteDraftsMd({ packageManager: 'pnpm' }));
  const withoutPm = toolsOf(buildCompleteDraftsMd({ packageManager: null }));
  for (const tools of [withPm, withoutPm]) {
    assert.doesNotMatch(tools, /git (add|commit|push)/);
    assert.doesNotMatch(tools, /(^|, )Bash(,|$)/, 'no unrestricted Bash');
    assert.match(tools, /Bash\(caf-init curate:\*\)/);
  }
  assert.match(withPm, /Bash\(pnpm run:\*\)/);
  assert.doesNotMatch(withoutPm, / run:\*\)/);
});

test('complete-drafts is the last step of the scaffold chain and a standalone target', () => {
  assert.equal(CHAIN_ORDER.at(-1), 'complete-drafts');
  assert.ok(TARGETS['complete-drafts']);
});

test('generator: writes the command from the real draft inventory and records the baseline without touching any file', async () => {
  const dir = await scaffold({ withCommand: false });
  const before = snapshotTree(dir);

  await silenced(async () => {
    prompts.inject([true]);
    await completeDrafts({ dir, dryRun: false });
  });

  const after = snapshotTree(dir);
  const added = Object.keys(after).filter((f) => !(f in before)).sort();
  assert.deepEqual(added, ['.caf/.generate-manifest.json', COMMAND_FILE].sort());
  for (const [file, content] of Object.entries(before)) assert.equal(after[file], content, `${file} must not change`);

  const command = after[COMMAND_FILE];
  for (const draft of ['CLAUDE.md', 'AGENTS.md', '.claude/agents/caf-frontend.md', '.claude/agents/caf-planner.md']) {
    assert.ok(command.includes(`- \`${draft}\``), `${draft} should be in the inventory`);
  }
  const manifest = JSON.parse(after['.caf/.generate-manifest.json']);
  assert.ok(manifest.files['.claude/agents/caf-frontend.md'].sections['Retry Logic'].hash.startsWith('sha256:'));
});

test('generator: never overwrites an existing command, and --dry-run writes nothing', async () => {
  const dir = await scaffold({ withCommand: false });
  const before = snapshotTree(dir);
  await silenced(() => completeDrafts({ dir, dryRun: true }));
  assert.deepEqual(snapshotTree(dir), before, 'dry-run must not write the command or the manifest');

  fs.mkdirSync(path.join(dir, '.claude', 'commands'), { recursive: true });
  fs.writeFileSync(path.join(dir, COMMAND_FILE), 'mine');
  const result = await silenced(async () => {
    prompts.inject([false]);
    return completeDrafts({ dir, dryRun: false });
  });
  assert.equal(result.written.length, 0);
  assert.equal(fs.readFileSync(path.join(dir, COMMAND_FILE), 'utf8'), 'mine');
  assert.ok(!fs.existsSync(path.join(dir, '.caf', '.generate-manifest.json')), 'declined baseline must not be written');
});

test('listDraftFiles: only files that exist, including RULES.md and docs', async () => {
  const dir = await scaffold({ withCommand: false });
  assert.ok(!(await listDraftFiles(dir)).includes('docs/product/prd.md'));
  fs.mkdirSync(path.join(dir, 'docs', 'product'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'product', 'prd.md'), '# PRD\n');
  fs.writeFileSync(path.join(dir, '.caf', 'knowledge', 'golden-examples', 'RULES.md'), buildRulesMd({ entries: [] }));
  const drafts = await listDraftFiles(dir);
  assert.ok(drafts.includes('docs/product/prd.md'));
  assert.ok(drafts.includes('.caf/knowledge/golden-examples/RULES.md'));
});

test('check-drafts: a freshly scaffolded, baselined repo passes and the check is read-only', async () => {
  const dir = await scaffold();
  const before = snapshotTree(dir);
  const result = await check(dir);
  assert.equal(result.fails, 0, JSON.stringify(result.findings.filter((f) => f.level === 'FAIL')));
  assert.equal(result.warns, 0, JSON.stringify(result.findings.filter((f) => f.level === 'WARN')));
  assert.equal(result.exitCode, undefined);
  assert.deepEqual(snapshotTree(dir), before, 'check-drafts must never write');
});

test('check-drafts: editing a tracked agent section fails; editing Role/Scope/Verify Checklist does not', async () => {
  const dir = await scaffold();
  const agent = '.claude/agents/caf-frontend.md';

  edit(dir, agent, (s) => s.replace(/## Role\n[^\n]*\n/, '## Role\nBuilds the CMS admin UI in Nuxt.\n'));
  edit(dir, agent, (s) => s.replace(/## Scope\n[^\n]*\n/, '## Scope\n`components/**`, `composables/**`\n'));
  assert.equal((await check(dir)).fails, 0, 'Role and Scope are meant to be edited');

  edit(dir, agent, (s) => s.replace('## Retry Logic\n', '## Retry Logic\nJust say DONE when finished.\n'));
  const result = await check(dir);
  assert.equal(result.exitCode, 1);
  const fails = failsFor(result, agent);
  assert.equal(fails.length, 1);
  assert.match(fails[0].message, /tracked section `## Retry Logic` changed/);
});

test('check-drafts: a removed tracked section fails', async () => {
  const dir = await scaffold();
  const agent = '.claude/agents/caf-planner.md';
  edit(dir, agent, (s) => s.replace(/## Working Pattern \(PIV\)\n[\s\S]*?(?=\n## )/, ''));
  const fails = failsFor(await check(dir), agent);
  assert.ok(fails.some((f) => /`## Working Pattern \(PIV\)` was removed/.test(f.message)), JSON.stringify(fails));
});

test('check-drafts: without a baseline a tracked-section edit cannot be detected — reported as WARN, not a false pass or FAIL', async () => {
  const dir = await scaffold({ baseline: false });
  edit(dir, '.claude/agents/caf-frontend.md', (s) => s.replace('## Retry Logic\n', '## Retry Logic\nJust say DONE.\n'));
  const result = await check(dir);
  assert.equal(result.fails, 0);
  const warns = result.findings.filter((f) => f.level === 'WARN' && f.file === '.claude/agents/caf-frontend.md');
  assert.equal(warns.length, 1);
  assert.match(warns[0].message, /no baseline for .*`## Retry Logic`/);
});

test('check-drafts: an invented script fails; a real script and TODO/template forms do not', async () => {
  const dir = await scaffold();
  edit(dir, 'CLAUDE.md', (s) =>
    s
      .replace('- lint: `pnpm run TODO`', '- lint: `pnpm run lint`')
      .replace('- typecheck: `pnpm run TODO`', '- typecheck: `pnpm run type-check`')
  );
  const result = await check(dir);
  const fails = failsFor(result, 'CLAUDE.md');
  assert.equal(fails.length, 1, JSON.stringify(fails));
  assert.match(fails[0].message, /script `type-check` does not exist in the root package\.json/);

  edit(dir, '.claude/agents/caf-frontend.md', (s) => s.replace('`pnpm run lint`', '`pnpm run lint:fix`'));
  assert.equal(failsFor(await check(dir), '.claude/agents/caf-frontend.md').length, 1);
});

test('check-drafts: leftover placeholder fails; runtime tokens do not', async () => {
  const dir = await scaffold();
  edit(dir, 'AGENTS.md', (s) => `${s}\nSee {{APP_1}}/CLAUDE.md for {{TICKET-ID}}.\n`);
  const fails = failsFor(await check(dir), 'AGENTS.md');
  assert.equal(fails.length, 1);
  assert.match(fails[0].message, /unresolved placeholder \{\{APP_1\}\}/);
});

test('check-drafts: golden-example path must exist (FAIL); a missing path cited in prose is only a WARN', async () => {
  const dir = await scaffold();
  const rules = '.caf/knowledge/golden-examples/RULES.md';
  fs.writeFileSync(
    path.join(dir, rules),
    buildRulesMd({
      entries: [
        { relPath: 'components/BaseButton.vue', patternName: 'Component' },
        { relPath: 'components/Ghost.vue', patternName: 'Component' },
      ],
    })
  );
  edit(dir, 'CLAUDE.md', (s) => `${s}\nSee \`composables/useApi.ts\` and \`composables/useGhost.ts\`.\n`);

  const result = await check(dir);
  const fails = failsFor(result, rules);
  assert.equal(fails.length, 1);
  assert.match(fails[0].message, /`components\/Ghost\.vue` does not exist/);
  const warns = result.findings.filter((f) => f.level === 'WARN' && f.file === 'CLAUDE.md');
  assert.equal(warns.length, 1);
  assert.match(warns[0].message, /`composables\/useGhost\.ts` is cited but does not exist/);
});

test('check-drafts: a removed DRAFT banner is a WARN for a human, never a FAIL', async () => {
  const dir = await scaffold();
  edit(dir, 'CLAUDE.md', (s) => s.replace(/^> .*\n> .*\n/m, ''));
  const result = await check(dir);
  assert.equal(result.fails, 0);
  assert.ok(result.findings.some((f) => f.level === 'WARN' && f.file === 'CLAUDE.md' && /DRAFT banner is gone/.test(f.message)));
});

test('check-drafts: monorepo — scoped commands are checked against the right workspace package', async () => {
  const dir = copyFixture(MONO_FIXTURE);
  const web = { name: '@mono/web', path: 'apps/web', framework: 'Nuxt', packageManager: null };
  const api = { name: '@mono/api', path: 'apps/api', framework: 'NestJS', packageManager: null };
  await silenced(async () => {
    await runSetup({ dir, dryRun: false });
    const picked = buildCandidates({ frontend: [web], backend: [api] }, []).filter((c) =>
      ['planner', 'frontend', 'backend', 'qa', 'reviewer'].includes(c.kind)
    );
    prompts.inject([[web], [api], picked, false, false, false]);
    await agents({ dir, dryRun: false });
    prompts.inject([true]);
    await completeDrafts({ dir, dryRun: false });
  });

  const clean = await check(dir);
  assert.equal(clean.fails, 0, JSON.stringify(clean.findings.filter((f) => f.level === 'FAIL')));
  assert.match(fs.readFileSync(path.join(dir, COMMAND_FILE), 'utf8'), /`apps\/api` \(package `@mono\/api`, NestJS\)/);

  // apps/web has no typecheck script; apps/api does. @mono/ghost doesn't exist.
  edit(dir, 'CLAUDE.md', (s) =>
    s.replace(
      '- typecheck: `pnpm run TODO`',
      '- typecheck: `pnpm --filter @mono/api run typecheck`, `pnpm --filter @mono/web run typecheck`, `pnpm --filter @mono/ghost run lint`'
    )
  );
  const messages = failsFor(await check(dir), 'CLAUDE.md').map((f) => f.message);
  assert.equal(messages.length, 2, JSON.stringify(messages));
  assert.ok(messages.some((m) => /script `typecheck` does not exist in apps\/web\/package\.json/.test(m)));
  assert.ok(messages.some((m) => /no workspace package named `@mono\/ghost`/.test(m)));
});

test('CLI: complete-drafts target and --check-drafts are wired, documented, and exit non-zero on FAIL', async () => {
  const run = (args) => spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', input: '' });

  assert.match(run(['scaffold', '--help']).stdout, /complete-drafts/);
  assert.match(run(['curate', '--help']).stdout, /--check-drafts/);

  const dir = await scaffold();
  const ok = run(['curate', '--check-drafts', '--dir', dir]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /0 fail, 0 warn/);

  edit(dir, 'CLAUDE.md', (s) => s.replace('- test: `pnpm run TODO`', '- test: `pnpm run test`'));
  const bad = run(['curate', '--check-drafts', '--dir', dir]);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /script `test` does not exist in the root package\.json/);

  const combined = run(['curate', '--check-drafts', '--audit-only', '--dir', dir]);
  assert.equal(combined.status, 1);
  assert.match(combined.stderr, /cannot be combined/);

  const target = copyFixture(SINGLE_FIXTURE);
  const generated = run(['scaffold', 'complete-drafts', '--dir', target]);
  assert.equal(generated.status, 0, generated.stdout + generated.stderr);
  assert.ok(fs.existsSync(path.join(target, COMMAND_FILE)));
});
