// CAF-SDD-03g — an agent file whose name is not a known kind and not a per-app agent CAF wrote is
// skipped and reported, never compared, baselined, synced or pointed at with the `implementation`
// template.
//
// `test/fixtures/pre-sdd03g/` is the render from before this ticket (scaffold contents of four
// variants, and the audit / sync --dry-run / check-drafts report of a monorepo with a per-app
// agent `admin.md` and a custom `caf-foo.md`) — never regenerate it. Every command below runs on
// a temp copy.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agentsSync } from '../src/commands/agents-sync.js';
import { auditAgentDefinitions } from '../src/commands/audit.js';
import { checkDrafts } from '../src/commands/check-drafts.js';
import { curate } from '../src/commands/curate.js';
import { curateBaseline } from '../src/commands/curate-baseline.js';
import { skillsTarget } from '../src/commands/skills.js';
import { buildAgentMd } from '../src/templates/agent-md.js';
import { KNOWN_KINDS, detectKind, implementationSlugs } from '../src/utils/agent-sections.js';
import { readManifest } from '../src/utils/generate-manifest.js';
import { detectRepoContext } from '../src/utils/repo-context.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeRepo, snapshotTree } from './helpers/make-repo.js';
import { AGENT_DIR } from './helpers/frozen-kinds.js';
import { sinceSdd05aFiles } from './helpers/since-05a.js';
import { sinceSdd05bFiles } from './helpers/since-05b.js';
import { CONTENT_VARIANTS, renderScaffoldContents } from './helpers/scaffold-contents.js';
import { APP_AGENT, CUSTOM_AGENT, STALE_OUTPUT, makeDrift, makeKindsRepo, relativeTo, reportKindsRepo } from './helpers/sdd03g-repo.js';
import { sinceSdd06Files } from './helpers/since-06.js';
import { sinceSdd07Files } from './helpers/since-07.js'; // CAF-SDD-07
import { sinceSdd11Files } from './helpers/since-11.js';
import { sinceSdd12Files } from './helpers/since-12.js';

// Once inject() has been called, prompts never reads stdin: an empty queue answers every prompt with its `initial`.
prompts.inject([]);

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const GOLDEN = path.join(ROOT, 'test', 'fixtures', 'pre-sdd03g');
const golden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, name), 'utf8'));
const CUSTOM_REL = `${AGENT_DIR}/${CUSTOM_AGENT}`;
const APP_REL = `${AGENT_DIR}/${APP_AGENT}`;
const isCustom = (value) => String(value).includes(CUSTOM_AGENT);

// Runs fn and returns { result, out } with everything it printed (colors stripped).
async function captured(fn) {
  const original = console.log;
  const lines = [];
  console.log = (...args) => lines.push(args.join(' ').replace(/\u001b\[[0-9;]*m/g, ''));
  try {
    const result = await fn();
    return { result, out: lines.join('\n') };
  } finally {
    console.log = original;
  }
}

async function withExitCode(fn) {
  const saved = process.exitCode;
  process.exitCode = undefined;
  try {
    const result = await fn();
    return { result, exit: process.exitCode ?? 0 };
  } finally {
    process.exitCode = saved;
  }
}

const monoWithAdmin = async (opts) => {
  const repo = await makeKindsRepo(opts);
  makeDrift(repo.dir, APP_AGENT);
  return repo;
};

// ---------------------------------------------------------------------------------------------
// AC-1 — recognizing a kind
// ---------------------------------------------------------------------------------------------

test('AC-1: known kinds are recognized as before, with and without caf-, and without any app', () => {
  for (const kind of KNOWN_KINDS) {
    assert.equal(detectKind(`caf-${kind}.md`), kind);
    assert.equal(detectKind(`${kind}.md`), kind);
    assert.equal(detectKind(path.join(AGENT_DIR, `caf-${kind}.md`), ['admin']), kind);
  }
});

test('AC-1: caf-foo.md and my-agent.md are unknown, a per-app slug is implementation', () => {
  assert.equal(detectKind('caf-foo.md'), null);
  assert.equal(detectKind('my-agent.md'), null);
  assert.equal(detectKind('caf-foo.md', ['admin']), null);
  assert.equal(detectKind('admin.md', ['admin']), 'implementation');
  assert.equal(detectKind(path.join(AGENT_DIR, 'admin.md'), ['web', 'admin']), 'implementation');
  assert.equal(detectKind('admin.md'), null, 'without the app list nothing is implementation');
  assert.equal(detectKind('administrator.md', ['admin']), null);
  // A known kind wins over an app that has the same slug.
  assert.equal(detectKind('devops.md', ['devops']), 'devops');
});

test('AC-1: the slugs come from the detected apps, in a monorepo and in a SINGLE_REPO', async () => {
  const { dir } = await makeKindsRepo({ baseline: false });
  const mono = await silenced(() => detectRepoContext({ dir }));
  assert.ok(implementationSlugs(mono.apps).includes('admin'), 'apps/admin -> admin');
  assert.equal(detectKind(APP_AGENT, implementationSlugs(mono.apps)), 'implementation');
  assert.equal(detectKind(CUSTOM_AGENT, implementationSlugs(mono.apps)), null);

  const single = makeRepo({ 'package.json': { name: '@scope/My App' } }, 'caf-sdd03g-single-');
  const ctx = await silenced(() => detectRepoContext({ dir: single }));
  assert.deepEqual(implementationSlugs(ctx.apps), ['scope-my-app']);
  assert.equal(detectKind('scope-my-app.md', implementationSlugs(ctx.apps)), 'implementation');
  assert.deepEqual(implementationSlugs([{ path: '.' }]), ['app'], 'a root app with no name is never an empty slug');
});

// ---------------------------------------------------------------------------------------------
// AC-2, AC-3 — curate sync
// ---------------------------------------------------------------------------------------------

for (const dryRun of [false, true]) {
  test(`AC-2: curate sync${dryRun ? ' --dry-run' : ''} leaves an unknown-kind file byte-identical and reports it`, async () => {
    const { dir } = await monoWithAdmin();
    const before = snapshotTree(dir);
    const { result, out } = await captured(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));

    assert.equal(fs.readFileSync(path.join(dir, CUSTOM_REL), 'utf8'), before[CUSTOM_REL], 'file must stay byte-identical');
    assert.deepEqual(result.unknownKind, [CUSTOM_REL]);
    assert.ok(!result.drifted.some(isCustom), 'no section of an unknown-kind agent may be synced');
    assert.ok(!result.updated.some(isCustom));
    assert.ok(!result.needsAttention.some((n) => isCustom(n.file)));
    assert.ok(out.includes(CUSTOM_AGENT) && /unknown kind/.test(out), 'the run names the file and the reason');
    const after = snapshotTree(dir);
    for (const rel of Object.keys(before)) if (isCustom(rel)) assert.equal(after[rel], before[rel], rel);
  });
}

test('AC-2: the manifest holds nothing for the unknown file after sync', async () => {
  const { dir } = await makeKindsRepo({ baseline: false });
  await silenced(() => curateBaseline({ dir, yes: true }));
  assert.equal(readManifest(dir).files[CUSTOM_REL], undefined, 'precondition: baseline did not record it');
  await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
  assert.equal(readManifest(dir).files[CUSTOM_REL], undefined);
});

test('AC-3: a per-app agent with a DRIFT section is synced as before', async () => {
  const { dir } = await monoWithAdmin();
  const { result } = await captured(() => agentsSync({ dir, agentDir: AGENT_DIR }));
  assert.deepEqual(result.drifted, [`${APP_REL}#Output`]);
  assert.deepEqual(result.updated, [path.join(dir, APP_REL)]);
  const content = fs.readFileSync(path.join(dir, APP_REL), 'utf8');
  assert.ok(!content.includes(STALE_OUTPUT), 'the stale Output was replaced by the template');
  assert.deepEqual(result.unknownKind, [CUSTOM_REL]);
});

test('AC-3: the recorded dry-run of the repo is the same for every file but the unknown one', async () => {
  const { dir } = await monoWithAdmin();
  const report = await reportKindsRepo(dir);
  const recorded = golden('curate.with-custom.json');
  assert.equal(report.unchanged, true);
  assert.deepEqual(report.syncDryRun.drifted, recorded.syncDryRun.drifted.filter((r) => !isCustom(r)));
  assert.deepEqual(report.syncDryRun.updated, []);
  assert.deepEqual(report.syncDryRun.needsAttention, recorded.syncDryRun.needsAttention.filter((n) => !isCustom(n.file)));
});

// ---------------------------------------------------------------------------------------------
// AC-4 — curate baseline
// ---------------------------------------------------------------------------------------------

test('AC-4: curate baseline records nothing for an unknown file and says so; the others as before', async () => {
  const withCustom = await makeKindsRepo({ baseline: false });
  const without = await makeKindsRepo({ baseline: false, custom: false });

  for (const opts of [{ dryRun: true }, { yes: true }]) {
    const repo = opts.dryRun ? await makeKindsRepo({ baseline: false }) : withCustom;
    const before = snapshotTree(repo.dir);
    const { result, out } = await captured(() => curateBaseline({ dir: repo.dir, agentDir: AGENT_DIR, ...opts }));
    assert.deepEqual(result.unknownKind, [CUSTOM_REL]);
    assert.ok(!result.baselined.some((c) => isCustom(c.relPath)));
    assert.ok(out.includes(CUSTOM_AGENT) && /unknown kind/.test(out));
    if (opts.dryRun) {
      assert.deepEqual(snapshotTree(repo.dir), before, 'dry-run writes nothing');
    } else {
      assert.equal(readManifest(repo.dir).files[CUSTOM_REL], undefined, 'no manifest entry for the unknown file');
      assert.equal(fs.readFileSync(path.join(repo.dir, CUSTOM_REL), 'utf8'), before[CUSTOM_REL]);
    }
  }

  await silenced(() => curateBaseline({ dir: without.dir, agentDir: AGENT_DIR, yes: true }));
  const hashes = (dir) =>
    Object.fromEntries(Object.entries(readManifest(dir).files).map(([file, e]) => [file, Object.fromEntries(Object.entries(e.sections).map(([h, v]) => [h, v.hash]))]));
  assert.deepEqual(hashes(withCustom.dir), hashes(without.dir), 'known kinds and the per-app agent are baselined as before');
  assert.ok(readManifest(withCustom.dir).files[APP_REL], 'the per-app agent has its baseline');
});

test('AC-4: a repo with nothing but unknown files has nothing to baseline', async () => {
  const content = fs.readFileSync(path.join(ROOT, 'test/fixtures/mono-pnpm/package.json'), 'utf8');
  const dir = makeRepo({ 'package.json': content, [CUSTOM_REL]: '---\nname: foo\n---\n\n## Allowed Tools\nx\n' }, 'caf-sdd03g-only-unknown-');
  const { result } = await captured(() => curateBaseline({ dir, agentDir: AGENT_DIR, yes: true }));
  assert.deepEqual(result.baselined, []);
  assert.deepEqual(result.unknownKind, [CUSTOM_REL]);
  assert.equal(readManifest(dir).files[CUSTOM_REL], undefined);
});

// ---------------------------------------------------------------------------------------------
// AC-5, AC-6 — curate audit
// ---------------------------------------------------------------------------------------------

test('AC-5: curate audit gives one unknown-kind warning, no section entry, no gap, the same exit code', async () => {
  const { dir } = await monoWithAdmin();
  const { result } = await withExitCode(() => silenced(() => auditAgentDefinitions(dir)));
  const forCustom = result.warnings.filter((w) => isCustom(w.filePath));
  assert.equal(forCustom.length, 1);
  assert.equal(forCustom[0].check, 'unknown-kind');
  assert.equal(forCustom[0].status, 'warn');
  assert.match(forCustom[0].message, /not compared/);
  assert.match(forCustom[0].message, /synced/);
  assert.match(forCustom[0].message, /baseline/);
  assert.ok(!result.entries.some((e) => isCustom(e.filePath)), 'no section entry, no gap');

  const report = await reportKindsRepo(dir);
  const withoutFile = await monoWithAdmin({ custom: false });
  const known = await reportKindsRepo(withoutFile.dir);
  assert.equal(report.audit.exit, known.audit.exit);
  assert.equal(report.audit.requiredGaps, known.audit.requiredGaps);
  assert.equal(report.audit.optionalGaps, known.audit.optionalGaps);
  assert.deepEqual(report.audit.sectionCounts, known.audit.sectionCounts);
});

test('AC-5: the report of every other file is the recorded one', async () => {
  const { dir } = await monoWithAdmin();
  const report = await reportKindsRepo(dir);
  const recorded = golden('curate.with-custom.json');
  const layer2 = (a) => a.layers.find((l) => l.name.startsWith('Layer 2')).entries.filter((e) => !isCustom(e.filePath));
  assert.deepEqual(layer2(report.audit), layer2(recorded.audit));
  const other = (a) => a.layers.filter((l) => !l.name.startsWith('Layer 2'));
  assert.deepEqual(other(report.audit), other(recorded.audit));
});

test('AC-6: with no unknown file the report of the repo is the recorded one', async () => {
  const { dir } = await monoWithAdmin({ custom: false });
  const report = await reportKindsRepo(dir);
  const recorded = golden('curate.known-only.json');
  assert.deepEqual(report.audit, recorded.audit);
  // The result of a repo with no unknown file has the shape it always had (no `unknownKind`).
  assert.deepEqual(report.syncDryRun, recorded.syncDryRun);
  assert.deepEqual(report.checkDrafts, recorded.checkDrafts);
});

// ---------------------------------------------------------------------------------------------
// AC-7 — curate --check-drafts
// ---------------------------------------------------------------------------------------------

test('AC-7: check-drafts: no FAIL for an unknown file, one WARN, the rest as recorded', async () => {
  const { dir } = await monoWithAdmin();
  const before = snapshotTree(dir);
  const { result } = await withExitCode(() => silenced(() => checkDrafts({ dir })));
  const mine = result.findings.filter((f) => isCustom(f.file) && f.message.includes('unknown kind'));
  assert.equal(mine.length, 1);
  assert.equal(mine[0].level, 'WARN');
  assert.match(mine[0].message, /not checked/);
  assert.ok(!result.findings.some((f) => isCustom(f.file) && f.level === 'FAIL'));
  assert.deepEqual(snapshotTree(dir), before, 'check-drafts stays read-only');

  const recorded = golden('curate.with-custom.json').checkDrafts;
  const clean = (findings) => relativeTo(dir, findings).filter((f) => !isCustom(f.file));
  assert.deepEqual(clean(result.findings), recorded.findings.filter((f) => !isCustom(f.file)));
  assert.equal(result.fails, recorded.fails);
});

test('AC-7: a section that changed in an unknown file is not a FAIL either', async () => {
  const { dir } = await monoWithAdmin();
  const abs = path.join(dir, CUSTOM_REL);
  fs.writeFileSync(abs, fs.readFileSync(abs, 'utf8').replace('## Allowed Tools', '## Allowed Tools\nEdited by the team.\n'));
  const { result, exit } = await withExitCode(() => silenced(() => checkDrafts({ dir })));
  assert.equal(result.fails, 0);
  assert.equal(exit, 0);
  assert.ok(!result.findings.some((f) => isCustom(f.file) && f.level === 'FAIL'));
});

// ---------------------------------------------------------------------------------------------
// AC-8 — scaffold skills
// ---------------------------------------------------------------------------------------------

function skillsRepo() {
  const appAgent = buildAgentMd({ name: 'x', role: 'r', scope: 's', scripts: null, packageManager: null, kind: 'implementation', slug: 'admin' });
  const customAgent = buildAgentMd({ name: 'x', role: 'r', scope: 's', scripts: null, packageManager: null, kind: 'implementation', slug: 'foo' });
  return {
    appAgent,
    customAgent,
    dir: makeRepo(
      {
        'package.json': { name: 'root', private: true, workspaces: ['apps/*'] },
        'apps/admin/package.json': { name: '@mono/admin', scripts: { lint: 'x' } },
        'apps/web/package.json': { name: '@mono/web', scripts: { lint: 'x' } },
        [APP_REL]: appAgent,
        [CUSTOM_REL]: customAgent,
      },
      'caf-sdd03g-skills-'
    ),
  };
}

test('AC-8: scaffold skills does not offer ## Skills to an unknown file, prints one line, still offers a per-app agent', async () => {
  const { dir, appAgent, customAgent } = skillsRepo();
  prompts._injected.length = 0;
  prompts.inject([true, new Error('a prompt was shown for the unknown file')]);
  try {
    const { result, out } = await captured(() => skillsTarget({ dir }));
    assert.deepEqual(result.pointers.added, [path.join(dir, APP_REL)], 'the per-app agent is offered and accepted as before');
    assert.deepEqual(result.pointers.unknownKind, [path.join(dir, CUSTOM_REL)]);
    assert.ok(!result.pointers.declined.length);
    assert.equal(fs.readFileSync(path.join(dir, CUSTOM_REL), 'utf8'), customAgent, 'the unknown file is not changed');
    assert.notEqual(fs.readFileSync(path.join(dir, APP_REL), 'utf8'), appAgent);
    const lines = out.split('\n').filter((l) => l.includes(CUSTOM_AGENT));
    assert.equal(lines.length, 1, 'exactly one line names the unknown file');
    assert.match(lines[0], /unknown kind/);
    assert.match(lines[0], /by hand/);
  } finally {
    prompts._injected.length = 0;
  }
});

test('AC-8: --dry-run offers nothing for the unknown file either', async () => {
  const { dir } = skillsRepo();
  const before = snapshotTree(dir);
  prompts._injected.length = 0;
  prompts.inject([]);
  const { result } = await captured(() => skillsTarget({ dir, dryRun: true }));
  assert.deepEqual(result.pointers.wouldAdd, [path.join(dir, APP_REL)]);
  assert.deepEqual(result.pointers.unknownKind, [path.join(dir, CUSTOM_REL)]);
  assert.equal(snapshotTree(dir)[CUSTOM_REL], before[CUSTOM_REL]);
});

// ---------------------------------------------------------------------------------------------
// AC-9 — --mode
// ---------------------------------------------------------------------------------------------

test('AC-9: --mode single makes apps/admin unknown, --mode mono keeps it (sync, curate --sync-only)', async () => {
  for (const [repoMode, recognized] of [['single', false], ['mono', true]]) {
    const direct = await monoWithAdmin();
    const sync = await captured(() => agentsSync({ dir: direct.dir, agentDir: AGENT_DIR, repoMode }));
    assert.equal(sync.result.unknownKind.includes(APP_REL), !recognized, `agentsSync --mode ${repoMode}`);
    assert.equal(sync.result.drifted.includes(`${APP_REL}#Output`), recognized);

    const viaCurate = await monoWithAdmin();
    const { result } = await captured(() => curate({ dir: viaCurate.dir, agentDir: AGENT_DIR, mode: 'sync-only', repoMode }));
    assert.equal(result.unknownKind.includes(APP_REL), !recognized, `curate --sync-only --mode ${repoMode}`);
    assert.equal(fs.readFileSync(path.join(viaCurate.dir, APP_REL), 'utf8').includes(STALE_OUTPUT), !recognized);
  }
});

test('AC-9: --mode reaches curate (audit) and curate baseline', async () => {
  for (const [repoMode, recognized] of [['single', false], ['mono', true]]) {
    const { dir } = await makeKindsRepo({ baseline: false });
    const { result } = await captured(() => curateBaseline({ dir, agentDir: AGENT_DIR, yes: true, repoMode }));
    assert.equal(result.unknownKind.includes(APP_REL), !recognized, `baseline --mode ${repoMode}`);
    assert.equal(Boolean(readManifest(dir).files[APP_REL]), recognized);

    const audit = await withExitCode(() => captured(() => curate({ dir, agentDir: AGENT_DIR, mode: 'audit-only', repoMode })));
    const warned = audit.result.result.layers
      .find((l) => l.name.startsWith('Layer 2'))
      .entries.some((e) => e.check === 'unknown-kind' && e.filePath === APP_REL);
    assert.equal(warned, !recognized, `curate --audit-only --mode ${repoMode}`);
  }
});

// ---------------------------------------------------------------------------------------------
// AC-10, AC-12
// ---------------------------------------------------------------------------------------------

test('AC-10: the default scaffold of every variant is the recorded one', async () => {
  for (const variant of CONTENT_VARIANTS) {
    const now = await renderScaffoldContents(variant);
    const recorded = golden(`scaffold.${variant.id}.json`);
    // CAF-SDD-05a changed three texts of the scaffold (helpers/since-05a.js); the golden is not touched.
    recorded.files = sinceSdd12Files(sinceSdd11Files(sinceSdd07Files(sinceSdd06Files(sinceSdd05bFiles(sinceSdd05aFiles(recorded.files)))))); // CAF-SDD-11: helpers/since-11.js // CAF-SDD-05b: planner Specify, helpers/since-05b.js; CAF-SDD-06: helpers/since-06.js
    assert.deepEqual(now.offered, recorded.offered, variant.id);
    assert.deepEqual(now.agents, recorded.agents, variant.id);
    assert.deepEqual(now.commands, recorded.commands, variant.id);
    assert.deepEqual(now.files, recorded.files, variant.id);
  }
});

test('AC-12: no test is marked todo', () => {
  const dir = path.join(ROOT, 'test');
  const marked = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.test.js') && f !== 'sdd03g-unknown-kind.test.js')
    .filter((f) => /\btodo\s*:/.test(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\s*(\/\/.*)$/gm, '')));
  assert.deepEqual(marked, []);
});
