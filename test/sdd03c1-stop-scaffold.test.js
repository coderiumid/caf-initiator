// CAF-SDD-03c1 — a new repo is no longer scaffolded with five agents and eight commands the SDD
// design dropped (`implementer` is dropped too, but stays scaffolded until CAF-SDD-03c3). Stop writing only: the kinds stay in KNOWN_KINDS, their builders and
// templates are untouched, and a repo that already holds those files is audited and synced by
// `curate` exactly as before.
//
// test/fixtures/pre-sdd03c1/ was recorded from main before this ticket touched `src/` and is
// never regenerated: the default file set per fixture, mode and --role (paths only), and what
// `curate` reports for a baselined repo that holds every kind and all 13 commands.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import {
  agents,
  buildCandidates,
  buildSingleRepoCandidates,
  HIDDEN_CANDIDATE_KINDS,
  HIDDEN_COMMAND_FILES,
  SINGLE_REPO_ROLES,
} from '../src/commands/agents.js';
import { runScaffoldTarget } from '../src/commands/scaffold.js';
import { detectStack } from '../src/steps/02-detect-stack.js';
import { KNOWN_KINDS, detectKind } from '../src/utils/agent-sections.js';
import { SECTION_STATUS } from '../src/utils/section-diff.js';
import { AGENT_DIR, COMMAND_DIR, VARIANTS, variantName, renderDefaultFileSet } from './helpers/default-file-set.js';
import { FIXTURE_NAMES, FROZEN, GOLDEN_DIR, fixtureDir } from './helpers/frozen-kinds.js';
import { copyFixture, snapshotTree } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { makeOldRepo, curateOldRepo } from './helpers/old-repo.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(HERE, 'fixtures', 'pre-sdd03c1');
const readGolden = (name) => JSON.parse(fs.readFileSync(path.join(GOLDEN, `${name}.json`), 'utf8'));

// Written out literally on purpose: these are the lists the ticket names, not something to
// derive from the code under test.
const DROPPED_KINDS = ['documentation', 'devops', 'pm', 'ux-designer', 'auditor'];
// agentSlug() does not prefix devops, so `devops.md` is the name a scaffold wrote.
const DROPPED_AGENT_FILES = ['caf-documentation.md', 'devops.md', 'caf-pm.md', 'caf-ux-designer.md', 'caf-auditor.md'];
// The six kinds the design dropped: the five above and `implementer`, which a repo scaffolded
// earlier holds too and which stays in KNOWN_KINDS like the rest.
const RETIRED_KINDS = [...DROPPED_KINDS, 'implementer'];
const RETIRED_AGENT_FILES = [...DROPPED_AGENT_FILES, 'caf-implementer.md'];
const DROPPED_COMMAND_FILES = [
  'caf-discovery-start.md',
  'caf-discovery-to-ticket.md',
  'caf-audit-scan.md',
  'caf-audit-to-ticket.md',
  'caf-design-ticket.md',
  'caf-feature-catalog-sync.md',
  'caf-qa-check.md',
  'caf-review-ticket.md',
];
const KEPT_COMMAND_FILES = ['caf-complete-drafts.md', 'caf-fix-review.md', 'caf-plan-ticket.md', 'caf-plan.md', 'caf-review.md', 'caf-run-pipeline.md'];
const DROPPED_PATHS = [
  ...DROPPED_AGENT_FILES.map((f) => `${AGENT_DIR}/${f}`),
  ...DROPPED_COMMAND_FILES.map((f) => `${COMMAND_DIR}/${f}`),
];

const sorted = (list) => [...list].sort();
const without = (list, dropped) => list.filter((item) => !dropped.includes(item));

// CAF-SDD-03c2 changed the default scaffold again, on top of the 03c1 change these tests hold: the
// validator is offered and written in place of qa, and /caf-plan is written. The goldens in
// test/fixtures/pre-sdd03c1/ stay as recorded; each expected value is the golden minus the dropped
// ones, put through this. (test/sdd03c2-validator-default.test.js holds the 03c2 change itself.)
const swapQa = (item) => item.replace('caf-qa.md', 'caf-validator.md');
const since03c2 = {
  offered: (list) => list.map((kind) => (kind === 'qa' ? 'validator' : kind)),
  agents: (list) => sorted(list.map(swapQa)),
  commands: (list) => sorted([...list, 'caf-plan.md']),
  files: (list) => sorted([...list.map(swapQa), `${COMMAND_DIR}/caf-plan.md`]),
};

// CAF-SDD-03c3 changed it once more: in SINGLE_REPO the default implementation agent `implementer` is
// replaced by caf-frontend + caf-backend (`--role` unchanged). The goldens stay as recorded; the
// expectation is the 03c2 one put through this. (test/sdd03c3-single-repo-roster.test.js holds the
// 03c3 change itself.)
const since03c3 = {
  offered: (list) => list.flatMap((kind) => (kind === 'implementer' ? ['frontend', 'backend'] : [kind])),
  agents: (list) => sorted(list.flatMap((f) => (f === 'caf-implementer.md' ? ['caf-frontend.md', 'caf-backend.md'] : [f]))),
  files: (list) => sorted(list.flatMap((f) => (f === `${AGENT_DIR}/caf-implementer.md` ? [`${AGENT_DIR}/caf-frontend.md`, `${AGENT_DIR}/caf-backend.md`] : [f]))),
};

const now = {};
for (const variant of VARIANTS) now[variantName(variant)] = await renderDefaultFileSet(variant);

// ---------------------------------------------------------------------------------------------
// AC-1 — agents
// ---------------------------------------------------------------------------------------------

for (const variant of VARIANTS) {
  const name = variantName(variant);
  const before = readGolden(name);

  test(`AC-1: ${name} — the five dropped kinds are not offered, and every other kind still is, in the same order`, () => {
    assert.deepEqual(now[name].offered, since03c3.offered(since03c2.offered(without(before.offered, DROPPED_KINDS))));
    for (const kind of DROPPED_KINDS) assert.ok(!now[name].offered.includes(kind), `${kind} must not be offered`);
    for (const kind of ['planner', 'architect', 'validator', 'reviewer']) assert.ok(now[name].offered.includes(kind), `${kind} is still offered`);
    assert.ok(!now[name].offered.includes('qa'), 'qa is replaced by validator (CAF-SDD-03c2)');
    assert.ok(!now[name].offered.includes('implementer'), 'implementer is superseded (CAF-SDD-03c3)');
  });

  test(`AC-1: ${name} — the agent files written are the ones recorded before, minus the five dropped kinds`, () => {
    assert.ok(before.agents.includes('caf-documentation.md'), 'precondition: the golden is the pre-change set');
    assert.deepEqual(now[name].agents, since03c3.agents(since03c2.agents(without(before.agents, DROPPED_AGENT_FILES))));
    assert.deepEqual(now[name].agents.filter((f) => DROPPED_AGENT_FILES.includes(f)), []);
    assert.ok(now[name].agents.includes('caf-architect.md'), 'architect is still written');
    assert.ok(now[name].agents.includes('caf-validator.md'), 'validator is written in place of qa (CAF-SDD-03c2)');
    assert.ok(!now[name].agents.includes('caf-qa.md'));
    assert.ok(!now[name].agents.includes('caf-implementer.md'), 'implementer is not written (CAF-SDD-03c3)');
  });
}

test('AC-1: the goldens cover both fixtures, both modes and every --role', () => {
  assert.deepEqual(sorted(VARIANTS.map((v) => v.fixture).filter((f, i, all) => all.indexOf(f) === i)), sorted(FIXTURE_NAMES));
  assert.deepEqual(sorted(fs.readdirSync(GOLDEN).filter((f) => !f.startsWith('curate-'))), sorted(VARIANTS.map((v) => `${variantName(v)}.json`)));
  // SINGLE_REPO: no --role (both agents, since CAF-SDD-03c3; `implementer` before), `frontend`, `backend`.
  const roles = VARIANTS.filter((v) => v.fixture === 'single-nuxt' && !v.mode).map((v) => v.role || 'implementer');
  assert.deepEqual(sorted(roles), sorted(SINGLE_REPO_ROLES));
  assert.ok(VARIANTS.some((v) => v.mode === 'single') && VARIANTS.some((v) => v.mode === 'mono'), 'both --mode overrides');
});

test('AC-1: every mode that had an implementation agent still has it — SINGLE_REPO without --role has caf-frontend.md and caf-backend.md (CAF-SDD-03c3)', () => {
  const implementation = (name) => now[name].agents.filter((f) => ['caf-implementer.md', 'caf-frontend.md', 'caf-backend.md'].includes(f));
  assert.deepEqual(implementation('single-nuxt.auto'), ['caf-backend.md', 'caf-frontend.md']);
  assert.deepEqual(implementation('mono-pnpm.single'), ['caf-backend.md', 'caf-frontend.md']);
  assert.deepEqual(implementation('single-nuxt.auto.frontend'), ['caf-frontend.md']);
  assert.deepEqual(implementation('single-nuxt.auto.backend'), ['caf-backend.md']);
  assert.deepEqual(implementation('mono-pnpm.auto'), ['caf-backend.md', 'caf-frontend.md']);
});

// There is no non-interactive way to name an agent: the picker is the one place a kind is
// chosen. A new flag on `scaffold` has to be added to this list, and to the hidden-kind filter.
test('AC-1: scaffold has no flag that selects an agent kind past the picker', () => {
  const help = execFileSync(process.execPath, [path.join(HERE, '..', 'src', 'index.js'), 'scaffold', '--help'], { encoding: 'utf8' });
  const flags = [...new Set(help.match(/^\s+--[a-z-]+/gm).map((f) => f.trim()))];
  assert.deepEqual(sorted(flags), sorted(['--dir', '--dry-run', '--app', '--agent-dir', '--command-dir', '--force', '--mode', '--scope', '--role']));
});

// ---------------------------------------------------------------------------------------------
// AC-2 — commands
// ---------------------------------------------------------------------------------------------

for (const variant of VARIANTS) {
  const name = variantName(variant);
  const before = readGolden(name);

  test(`AC-2: ${name} — the commands written are the ones recorded before, minus the eight dropped ones`, () => {
    assert.ok(before.commands.includes('caf-qa-check.md'), 'precondition: the golden is the pre-change set');
    assert.deepEqual(now[name].commands, since03c2.commands(without(before.commands, DROPPED_COMMAND_FILES)));
    assert.deepEqual(now[name].commands.filter((f) => DROPPED_COMMAND_FILES.includes(f)), []);
    assert.deepEqual(now[name].commands.filter((f) => !KEPT_COMMAND_FILES.includes(f)), []);
    assert.ok(now[name].commands.includes('caf-plan.md'), '/caf-plan is written (CAF-SDD-03c2)');
    assert.ok(now[name].commands.includes('caf-plan-ticket.md'), '/caf-plan-ticket is still written');
  });

  test(`AC-2: ${name} — every other file of the default scaffold is still written`, () => {
    assert.deepEqual(now[name].files, since03c3.files(since03c2.files(without(before.files, DROPPED_PATHS))));
  });
}

test('AC-2: the hidden commands are exactly the eight dropped ones, and none of them is a kept one', () => {
  assert.deepEqual(sorted(HIDDEN_COMMAND_FILES), sorted(DROPPED_COMMAND_FILES));
  assert.equal(HIDDEN_COMMAND_FILES.length, 8);
  for (const file of KEPT_COMMAND_FILES) assert.ok(!HIDDEN_COMMAND_FILES.includes(file), file);
});

// The picker is what hides a kind. The commands are stopped where they are written, so they stay
// unwritten even for a selection the picker no longer offers.
for (const fixture of FIXTURE_NAMES) {
  test(`AC-2: ${fixture} — a selection that still holds the auditor and PM writes none of their commands`, async () => {
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03c1-commands-');
    const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
    const web = stack.apps.find((a) => a.path === 'apps/web');
    const api = stack.apps.find((a) => a.path === 'apps/api');
    const all = stack.isMonorepo
      ? buildCandidates({ frontend: [web], backend: [api] }, [])
      : buildSingleRepoCandidates(stack.apps[0], [], 'frontend');
    const picked = all.filter((c) => ['planner', 'architect', 'frontend', 'backend', 'qa', 'reviewer', 'auditor', 'pm', 'ux-designer'].includes(c.kind));
    // (MONOREPO: the two app pickers.) agent multiselect, /caf-run-pipeline, /caf-fix-review, /caf-review, tracker.
    prompts.inject([...(stack.isMonorepo ? [[web], [api]] : []), picked, true, true, true, 'Linear']);
    try {
      await silenced(() => agents({ dir, dryRun: false, role: stack.isMonorepo ? undefined : 'frontend' }));
    } finally {
      prompts._injected.length = 0;
    }
    const written = fs.readdirSync(path.join(dir, COMMAND_DIR));
    assert.ok(written.includes('caf-plan-ticket.md'), 'precondition: the run did write commands');
    assert.deepEqual(written.filter((f) => DROPPED_COMMAND_FILES.includes(f)), []);
  });

  test(`AC-2: ${fixture} — \`scaffold feature-catalog-sync\` writes nothing`, async () => {
    const dir = copyFixture(fixtureDir(fixture), 'caf-sdd03c1-catalog-');
    const before = snapshotTree(dir);
    prompts.inject(['todo']);
    let result;
    try {
      result = await silenced(() => runScaffoldTarget('feature-catalog-sync', { dir, dryRun: false }));
    } finally {
      prompts._injected.length = 0;
    }
    assert.deepEqual(result, { written: [], skipped: [] });
    assert.deepEqual(snapshotTree(dir), before);
  });
}

// The builders of the eight dropped commands were removed at CAF-SDD-03c3 (nothing reached them),
// and with them the test that held their text to the pre-03b3 golden.

// ---------------------------------------------------------------------------------------------
// AC-3 — discovery and audit folders
// ---------------------------------------------------------------------------------------------

for (const variant of VARIANTS) {
  const name = variantName(variant);
  const before = readGolden(name);

  test(`AC-3: ${name} — nothing is written under .caf/discovery or .caf/audits (and nothing was before)`, () => {
    const inside = (rel) => /^\.caf\/(discovery|audits)(\/|$)/.test(rel);
    assert.deepEqual(now[name].files.filter(inside), []);
    assert.deepEqual(now[name].cafDirs.filter((d) => /^(discovery|audits)(\/|$)/.test(d)), []);
    assert.deepEqual(before.files.filter(inside), [], 'Q-2: the default scaffold never wrote there');
    assert.deepEqual(now[name].cafDirs, before.cafDirs, 'the directories under .caf/ are the ones recorded before');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-4 — a repo that already holds the dropped files
// ---------------------------------------------------------------------------------------------

for (const fixture of FIXTURE_NAMES) {
  test(`AC-4: ${fixture} — curate audit and curate sync (dry-run, then write) treat an old repo exactly as before`, async () => {
    const golden = readGolden(`curate-old-repo.${fixture}`);
    const repo = await makeOldRepo(fixture);

    // Precondition: the repo holds every retired kind this fixture can have, and all 13 commands.
    const expectedRetired = RETIRED_AGENT_FILES.filter((f) => f !== 'caf-implementer.md' || fixture === 'single-nuxt');
    assert.deepEqual(sorted(repo.agents.filter((f) => RETIRED_AGENT_FILES.includes(f))), sorted(expectedRetired));
    assert.deepEqual(repo.commands.filter((f) => DROPPED_COMMAND_FILES.includes(f)).length, 8);
    assert.deepEqual(repo.agents, golden.agents);
    assert.deepEqual(repo.commands, golden.commands);

    const { report, before, after } = await curateOldRepo(repo.dir);

    // Every tracked section IN_SYNC, in the audit and in both sync runs.
    const counts = report.audit.sectionCounts;
    assert.ok(counts[SECTION_STATUS.IN_SYNC] > 0);
    for (const status of [SECTION_STATUS.DRIFT, SECTION_STATUS.CUSTOMIZATION, SECTION_STATUS.CONFLICT, SECTION_STATUS.UNTRACKED]) {
      assert.equal(counts[status], 0, `${status} sections in an old repo`);
    }
    const nothing = { updated: [], skipped: [], drifted: [], needsAttention: [], unverifiable: [] };
    assert.deepEqual(report.syncDryRun, nothing);
    assert.deepEqual(report.syncWrite, nothing);
    const agentEntries = report.audit.layers.find((l) => l.name.startsWith('Layer 2')).entries;
    assert.deepEqual(sorted(agentEntries.map((e) => path.basename(e.filePath))), repo.agents);
    for (const e of agentEntries) assert.equal(e.status, 'ok', `${e.filePath}: ${e.message}`);

    // No new warning: the whole report is the one recorded before this ticket.
    assert.deepEqual(report.audit, golden.audit);

    // Nothing deleted, nothing changed.
    for (const [rel, content] of Object.entries(before)) {
      assert.ok(rel in after, `${rel} was deleted`);
      assert.equal(after[rel], content, `${rel} changed`);
    }
    assert.deepEqual(sorted(Object.keys(after).filter((rel) => !(rel in before))), golden.added, 'no file added beyond what curate sync already wrote');
  });
}

// ---------------------------------------------------------------------------------------------
// AC-5 — the kinds are hidden, not removed
// ---------------------------------------------------------------------------------------------

test('AC-5: every dropped kind is still in KNOWN_KINDS and still detected from its file name', () => {
  for (const kind of RETIRED_KINDS) {
    assert.ok(KNOWN_KINDS.includes(kind), `${kind} left KNOWN_KINDS`);
    assert.equal(detectKind(`caf-${kind}.md`), kind);
    assert.equal(detectKind(path.join(AGENT_DIR, `caf-${kind}.md`)), kind);
  }
  assert.equal(detectKind('devops.md'), 'devops');
  assert.equal(KNOWN_KINDS.length, 13);
});

test('AC-5: HIDDEN_CANDIDATE_KINDS holds exactly the five dropped kinds (no implementer), all of them known kinds', () => {
  assert.deepEqual(sorted(HIDDEN_CANDIDATE_KINDS), sorted(DROPPED_KINDS));
  for (const kind of HIDDEN_CANDIDATE_KINDS) assert.ok(KNOWN_KINDS.includes(kind), kind);
  assert.equal(HIDDEN_CANDIDATE_KINDS.length, 5);
  for (const kind of ['planner', 'architect', 'frontend', 'backend', 'implementer', 'qa', 'reviewer']) assert.ok(!HIDDEN_CANDIDATE_KINDS.includes(kind), `${kind} is not one of the five dropped kinds`);
  // CAF-SDD-03c2: the validator is a candidate and offered; qa is not offered but is not dropped either.
  assert.ok(!HIDDEN_CANDIDATE_KINDS.includes('validator'));
});

test('AC-5: the candidate definitions of the dropped kinds are still there — only the offer is gone', async () => {
  const mono = buildCandidates({}, []).map((c) => c.kind);
  for (const kind of DROPPED_KINDS) assert.ok(mono.includes(kind), kind);
  const single = (await silenced(() => detectStack({ dir: fixtureDir('single-nuxt'), explicitGlobs: undefined }))).apps[0];
  const singleKinds = buildSingleRepoCandidates(single, [], 'implementer').map((c) => c.kind);
  for (const kind of RETIRED_KINDS) assert.ok(singleKinds.includes(kind), kind);
  assert.ok(mono.includes('validator') && singleKinds.includes('validator'), 'CAF-SDD-03c2: the validator is a candidate');
  assert.ok(mono.includes('qa') && singleKinds.includes('qa'), 'qa is replaced in the offer, not removed');
});

test('AC-5: the 15 frozen-kinds goldens are all there (test/frozen-kinds.test.js compares their content)', () => {
  assert.equal(FROZEN.length, 15);
  assert.deepEqual(sorted(fs.readdirSync(GOLDEN_DIR)), sorted(FROZEN.map(({ kind, fixture }) => `${kind}.${fixture}.json`)));
});
