// CAF-SDD-03a2 — `curate sync` must not rewrite a tracked section nobody changed.
//
// Two false DRIFTs existed (found in CAF-SDD-03a T1):
//   - pm / ux-designer `Working Pattern (PIV)`: the file carries the Discovery wording, the
//     comparator rendered the generic one.
//   - qa / reviewer `Input` in a monorepo: the file embeds the assigned app paths, the comparator
//     rendered the sentence without them — a sync dropped the app list.
// Every sync below runs on a temp copy of a fixture.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { agentsSync } from '../src/commands/agents-sync.js';
import { auditAgentDefinitions } from '../src/commands/audit.js';
import { buildInputSection } from '../src/templates/agent-md.js';
import { KNOWN_KINDS, parseInputAppNames, parseSections, sectionBody, templateForExistingSection } from '../src/utils/agent-sections.js';
import { readManifest, getBaselineHash, setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { copyFixture } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { AGENT_DIR, fixtureDir, renderAgents, trackedSections } from './helpers/frozen-kinds.js';

// Recorded once by `curate baseline` at a679ede, before this ticket touched src/ — the manifest
// a repo baselined with the pre-fix code really has on disk. Never regenerated.
const LEGACY_MANIFEST = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'legacy-manifest',
  'mono-pnpm.generate-manifest.json'
);

const APP_LIST = '(apps/web, apps/api)';

// The reviewer file that manifest was recorded from. Its `## Output` is the one-line text the
// reviewer had until CAF-SDD-03b2 put the spec checks there; every other section is unchanged.
const LEGACY_REVIEWER = JSON.parse(
  fs.readFileSync(path.join(path.dirname(LEGACY_MANIFEST), '..', 'pre-sdd03b2', 'reviewer.mono-pnpm.json'), 'utf8')
);

const rendered = {
  'mono-pnpm': await renderAgents('mono-pnpm'),
  'single-nuxt': await renderAgents('single-nuxt'),
};

function manifestFile(dir) {
  return path.join(dir, '.caf', '.generate-manifest.json');
}

/** Temp copy of the fixture holding the given agent files; `baseline: true` records every section. */
function makeRepo(fixture, agents, { baseline = true } = {}) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-false-drift-');
  fs.mkdirSync(path.join(dir, AGENT_DIR), { recursive: true });
  const manifest = { version: 1, files: {} };
  for (const { file, content } of agents) {
    const relPath = path.join(AGENT_DIR, file);
    fs.writeFileSync(path.join(dir, relPath), content, 'utf8');
    const { lines, sections } = parseSections(content);
    for (const s of sections) setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
  if (baseline) writeManifest(dir, manifest);
  return dir;
}

function read(dir, file) {
  return fs.readFileSync(path.join(dir, AGENT_DIR, file), 'utf8');
}

/** Section statuses that are not IN_SYNC, as `curate audit` counts them. */
function nonInSyncCounts(dir) {
  const { sectionCounts } = auditAgentDefinitions(dir, AGENT_DIR);
  return Object.fromEntries(Object.entries(sectionCounts).filter(([status, n]) => status !== 'IN_SYNC' && n > 0));
}

/** Replaces text inside one section only; fails if the text isn't there. */
function editSection(content, header, from, to) {
  const body = trackedSections(content)[header];
  assert.ok(body.includes(from), `precondition: "## ${header}" contains ${JSON.stringify(from)}`);
  return content.replace(`## ${header}\n${body}`, `## ${header}\n${body.replace(from, to)}`);
}

/** dry-run then write: nothing drifts, nothing needs attention, no file or manifest byte changes. */
async function assertSyncIsNoOp(dir, agents, label) {
  const manifestBefore = fs.readFileSync(manifestFile(dir), 'utf8');
  for (const dryRun of [true, false]) {
    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
    const mode = dryRun ? 'dry-run' : 'write';
    assert.deepEqual(result.drifted, [], `${label} (${mode}): drifted`);
    assert.deepEqual(result.needsAttention, [], `${label} (${mode}): needsAttention`);
    assert.deepEqual(result.updated, [], `${label} (${mode}): updated`);
    for (const { file, content } of agents) {
      assert.equal(read(dir, file), content, `${label} (${mode}): ${file} must stay byte-identical`);
    }
    assert.equal(fs.readFileSync(manifestFile(dir), 'utf8'), manifestBefore, `${label} (${mode}): manifest must not change`);
  }
}

for (const fixture of ['mono-pnpm', 'single-nuxt']) {
  for (const kind of ['pm', 'ux-designer']) {
    test(`AC-1: ${kind} on ${fixture} — "## Working Pattern (PIV)" is IN_SYNC and the file survives curate sync`, async () => {
      const agent = rendered[fixture][kind];
      const dir = makeRepo(fixture, [agent]);
      assert.deepEqual(nonInSyncCounts(dir), {}, 'every tracked section is IN_SYNC');
      await assertSyncIsNoOp(dir, [agent], `${agent.file} (${fixture})`);
      assert.match(trackedSections(read(dir, agent.file))['Working Pattern (PIV)'], /IMPLEMENT — write the document/);
    });
  }
}

for (const kind of ['qa', 'reviewer']) {
  test(`AC-2: ${kind} on mono-pnpm — "## Input" is IN_SYNC, keeps its app list, and the file survives curate sync`, async () => {
    const agent = rendered['mono-pnpm'][kind];
    assert.ok(trackedSections(agent.content).Input.includes(APP_LIST), 'precondition: the rendered Input names the apps');
    const dir = makeRepo('mono-pnpm', [agent]);
    assert.deepEqual(nonInSyncCounts(dir), {}, 'every tracked section is IN_SYNC');
    await assertSyncIsNoOp(dir, [agent], `${agent.file} (mono-pnpm)`);
    assert.ok(trackedSections(read(dir, agent.file)).Input.includes(APP_LIST));
  });

  // The template can't be changed from a test, so the change is simulated from the other side:
  // the file (and its baseline) hold an older wording that differs outside the app list.
  test(`AC-3: ${kind} on mono-pnpm — a template change outside the app list is synced and the app list survives`, async () => {
    const agent = rendered['mono-pnpm'][kind];
    const rel = path.join(AGENT_DIR, agent.file);
    const oldContent = editSection(agent.content, 'Input', '(required).', '(must exist).');
    assert.ok(trackedSections(oldContent).Input.includes(APP_LIST), 'precondition: the old wording names the apps');
    const dir = makeRepo('mono-pnpm', [{ file: agent.file, content: oldContent }]);
    assert.deepEqual(nonInSyncCounts(dir), { DRIFT: 1 });

    const dry = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: true }));
    assert.deepEqual(dry.drifted, [`${rel}#Input`]);
    assert.equal(read(dir, agent.file), oldContent, 'dry-run must not write');

    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
    assert.deepEqual(result.drifted, [`${rel}#Input`]);
    assert.deepEqual(result.needsAttention, []);
    const after = read(dir, agent.file);
    assert.ok(trackedSections(after).Input.includes(APP_LIST), 'the app list must survive the sync');
    assert.equal(after, agent.content, 'the synced file equals a fresh render, app list included');
    assert.equal(getBaselineHash(readManifest(dir), rel, 'Input'), hashSection(trackedSections(agent.content).Input));

    assert.deepEqual(nonInSyncCounts(dir), {});
    const second = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
    assert.deepEqual(second.drifted, [], 're-run is a no-op');
    assert.equal(read(dir, agent.file), after);
  });
}

test('AC-4: a manifest written by the pre-fix code — curate sync keeps the app list of qa and reviewer Input', async () => {
  // CAF-SDD-03b2: the legacy manifest baselines the reviewer as it was then, so that file is the
  // one put in the repo. Its `Output` is a real DRIFT now, which makes the sync below write.
  const qa = rendered['mono-pnpm'].qa;
  const reviewer = { file: LEGACY_REVIEWER.file, content: LEGACY_REVIEWER.content };
  const agents = [qa, reviewer];
  const dir = makeRepo('mono-pnpm', agents, { baseline: false });
  fs.mkdirSync(path.dirname(manifestFile(dir)), { recursive: true });
  fs.copyFileSync(LEGACY_MANIFEST, manifestFile(dir));

  // Precondition: the legacy manifest really is the baseline of these files, in the old shape.
  const legacy = JSON.parse(fs.readFileSync(LEGACY_MANIFEST, 'utf8'));
  for (const { file, content } of agents) {
    const entry = legacy.files[path.join(AGENT_DIR, file)];
    assert.deepEqual(Object.keys(entry), ['sections'], 'legacy file entry has no field besides `sections`');
    assert.equal(entry.sections.Input.hash, `sha256:${hashSection(trackedSections(content).Input)}`);
  }

  // `Input` of both files is IN_SYNC; the DRIFTs are the reviewer's `Output` (CAF-SDD-03b2) and
  // its `Working Pattern (PIV)` (CAF-SDD-03e).
  assert.deepEqual(nonInSyncCounts(dir), { DRIFT: 2 });
  const drifted = [`${path.join(AGENT_DIR, reviewer.file)}#Output`, `${path.join(AGENT_DIR, reviewer.file)}#Working Pattern (PIV)`];

  const dry = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: true }));
  assert.deepEqual(dry.drifted, drifted);
  assert.deepEqual(dry.needsAttention, []);
  for (const { file, content } of agents) assert.equal(read(dir, file), content, `dry-run: ${file} must stay byte-identical`);

  const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
  assert.deepEqual(result.drifted, drifted);
  assert.deepEqual(result.needsAttention, []);
  assert.deepEqual(result.unverifiable, []);
  assert.equal(read(dir, qa.file), qa.content, 'qa must stay byte-identical');
  assert.equal(read(dir, reviewer.file), rendered['mono-pnpm'].reviewer.content, 'the synced reviewer equals a fresh render, app list included');
  for (const { file } of agents) assert.ok(trackedSections(read(dir, file)).Input.includes(APP_LIST));
  assert.deepEqual(nonInSyncCounts(dir), {});
});

for (const kind of ['qa', 'reviewer']) {
  // Context lost: the sentence that carries the app list isn't in a shape the app list can be
  // read from. The section can't be rendered faithfully, so it must not be DRIFT — whatever the
  // template says, the file is reported and left alone.
  test(`AC-4: ${kind} on mono-pnpm — an Input whose app list can't be read is reported, never written`, async () => {
    const agent = rendered['mono-pnpm'][kind];
    const rel = path.join(AGENT_DIR, agent.file);
    const odd = editSection(agent.content, 'Input', `from the implementation agent ${APP_LIST}`, 'from the implementing agents [apps/web, apps/api]');
    const dir = makeRepo('mono-pnpm', [{ file: agent.file, content: odd }]);
    const manifestBefore = fs.readFileSync(manifestFile(dir), 'utf8');

    assert.equal(nonInSyncCounts(dir).DRIFT, undefined, 'must not read as DRIFT');
    for (const dryRun of [true, false]) {
      const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun }));
      assert.deepEqual(result.drifted, []);
      assert.deepEqual(result.updated, []);
      assert.deepEqual(result.unverifiable, [`${rel}#Input`], 'reported as not comparable');
      assert.equal(read(dir, agent.file), odd, 'file must stay byte-identical');
      assert.equal(fs.readFileSync(manifestFile(dir), 'utf8'), manifestBefore, 'manifest must not change');
    }
  });
}

test('qa on single-nuxt — an Input without an app list still syncs a real template change', async () => {
  const agent = rendered['single-nuxt'].qa;
  const rel = path.join(AGENT_DIR, agent.file);
  assert.ok(trackedSections(agent.content).Input.includes('from the implementation agent in '), 'precondition: no app list');
  const oldContent = editSection(agent.content, 'Input', '(required).', '(must exist).');
  const dir = makeRepo('single-nuxt', [{ file: agent.file, content: oldContent }]);

  const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
  assert.deepEqual(result.drifted, [`${rel}#Input`]);
  assert.equal(read(dir, agent.file), agent.content);
});

test('a hand-edited Input is still never overwritten (CUSTOMIZATION), app list or not', async () => {
  const agent = rendered['mono-pnpm'].qa;
  const dir = makeRepo('mono-pnpm', [agent]);
  const edited = editSection(agent.content, 'Input', '(required).', '(required). Also read the PR description.');
  fs.writeFileSync(path.join(dir, AGENT_DIR, agent.file), edited, 'utf8');

  const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));
  assert.deepEqual(result.drifted, []);
  assert.deepEqual(result.needsAttention.map((n) => `${n.status}:${n.header}`), ['CUSTOMIZATION:Input']);
  assert.equal(read(dir, agent.file), edited);
});

test('parseInputAppNames reads back exactly what buildInputSection wrote', () => {
  for (const kind of ['qa', 'reviewer']) {
    for (const appNames of [[], ['apps/web'], ['apps/web', 'apps/api'], ['apps/admin', 'apps/api', 'packages/ui'], ['.']]) {
      assert.deepEqual(parseInputAppNames(buildInputSection(kind, appNames)), appNames, `${kind} ${JSON.stringify(appNames)}`);
    }
  }
});

test('parseInputAppNames returns null rather than guessing', () => {
  const qa = (who) => `\`verify-report.md\` from the ${who} in \`.caf/tasks/{TICKET-ID}/\` (required).`;
  assert.equal(parseInputAppNames(''), null);
  assert.equal(parseInputAppNames('TODO: which artifact is read'), null);
  assert.equal(parseInputAppNames(qa('implementing agents [apps/web]')), null, 'reworded sentence');
  assert.equal(parseInputAppNames(qa('implementation agent ()')), null, 'empty list');
  assert.equal(parseInputAppNames(qa('implementation agent (apps/web, )')), null, 'empty name');
  assert.equal(parseInputAppNames(qa('implementation agent (apps/(web), apps/api)')), null, 'nested parentheses');
  assert.equal(parseInputAppNames(qa('implementation agent (apps/web) (apps/api)')), null, 'two lists');
});

test('whatever parseInputAppNames accepts renders back to the same sentence', () => {
  // The property the write path rests on: a parsed list is never a lossy reading of the file.
  // A hand-typed list without the space after the comma is read as one name and written back as-is.
  const qa = (list) => `\`verify-report.md\` from the implementation agent${list} in \`.caf/tasks/{TICKET-ID}/\` (required).`;
  for (const list of ['', ' (apps/web)', ' (apps/web, apps/api)', ' (apps/web,apps/api)', ' (my app, other-app)']) {
    const body = qa(list);
    assert.equal(buildInputSection('qa', parseInputAppNames(body)), body, JSON.stringify(list));
  }
});

test('templateForExistingSection only differs from the kind-only builder for qa/reviewer Input', () => {
  const body = buildInputSection('qa', ['apps/web', 'apps/api']);
  assert.equal(templateForExistingSection('Input', 'qa', body), body);
  assert.equal(templateForExistingSection('Input', 'reviewer', buildInputSection('reviewer', ['apps/web'])), buildInputSection('reviewer', ['apps/web']));
  assert.equal(templateForExistingSection('Input', 'qa', 'something else entirely'), null);
  // Any other kind ignores the body, even one that happens to carry the sentence.
  for (const kind of KNOWN_KINDS.filter((k) => k !== 'qa' && k !== 'reviewer')) {
    assert.equal(templateForExistingSection('Input', kind, body), buildInputSection(kind), kind);
  }
});
