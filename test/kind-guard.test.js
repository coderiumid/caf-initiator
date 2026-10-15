// CAF-SDD-03a — safety net for the existing agent kinds, ahead of the kind/agent changes in
// SDD-03a2/03b/03c. Everything expected here is written out literally: a table derived from the
// code under test would follow any change to it and guard nothing.
//
// A kind that drops out of KNOWN_KINDS is silently detected as `implementation`
// (Read+Write+Edit+Bash), and `curate sync` then rewrites that agent's tracked sections from the
// implementation template — the CAF-DEVOPS-KIND-01 failure mode, for every kind at once.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { agentsSync } from '../src/commands/agents-sync.js';
import { HIDDEN_CANDIDATE_KINDS } from '../src/commands/agents.js';
import { KNOWN_KINDS, detectKind, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { makeRepo } from './helpers/make-repo.js';
import { silenced } from './helpers/mono-snapshot.js';
import { renderAgents, frontmatterTools, AGENT_DIR } from './helpers/frozen-kinds.js';

const EXPECTED_KINDS = [
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
  'validator',
];

// AC-4. Where each kind is rendered from: `implementer` only exists in SINGLE_REPO, and
// frontend/backend only get apps assigned in MONOREPO.
const EXPECTED_TOOLS = [
  { kind: 'qa', fixture: 'mono-pnpm', tools: ['Read', 'Write', 'Bash'] },
  { kind: 'qa', fixture: 'single-nuxt', tools: ['Read', 'Write', 'Bash'] },
  { kind: 'documentation', fixture: 'mono-pnpm', tools: ['Read', 'Write', 'Edit'] },
  { kind: 'documentation', fixture: 'single-nuxt', tools: ['Read', 'Write', 'Edit'] },
  { kind: 'architect', fixture: 'mono-pnpm', tools: ['Read', 'Write'] },
  { kind: 'architect', fixture: 'single-nuxt', tools: ['Read', 'Write'] },
  { kind: 'devops', fixture: 'mono-pnpm', tools: ['Read', 'Bash'] },
  { kind: 'devops', fixture: 'single-nuxt', tools: ['Read', 'Bash'] },
  { kind: 'auditor', fixture: 'mono-pnpm', tools: ['Read', 'Bash'] },
  { kind: 'auditor', fixture: 'single-nuxt', tools: ['Read', 'Bash'] },
  { kind: 'pm', fixture: 'mono-pnpm', tools: ['Read', 'Write'] },
  { kind: 'pm', fixture: 'single-nuxt', tools: ['Read', 'Write'] },
  { kind: 'ux-designer', fixture: 'mono-pnpm', tools: ['Read', 'Write'] },
  { kind: 'ux-designer', fixture: 'single-nuxt', tools: ['Read', 'Write'] },
  { kind: 'implementer', fixture: 'single-nuxt', tools: ['Read', 'Write', 'Edit', 'Bash'] },
  { kind: 'frontend', fixture: 'mono-pnpm', tools: ['Read', 'Write', 'Edit', 'Bash'] },
  { kind: 'backend', fixture: 'mono-pnpm', tools: ['Read', 'Write', 'Edit', 'Bash'] },
];

const rendered = {
  'mono-pnpm': await renderAgents('mono-pnpm'),
  'single-nuxt': await renderAgents('single-nuxt'),
};

test('AC-1: detectKind returns the kind itself for caf-<kind>.md of every known kind', () => {
  for (const kind of EXPECTED_KINDS) {
    assert.equal(detectKind(`caf-${kind}.md`), kind, `caf-${kind}.md must detect as "${kind}", not fall back to implementation`);
    assert.equal(detectKind(path.join(AGENT_DIR, `caf-${kind}.md`)), kind, `a path to caf-${kind}.md must detect the same way`);
  }
  for (const kind of KNOWN_KINDS) {
    assert.equal(detectKind(`caf-${kind}.md`), kind, `KNOWN_KINDS entry "${kind}" must detect as itself`);
  }
  // agentSlug() does not prefix devops, so the unprefixed filename is the one actually written.
  assert.equal(detectKind('devops.md'), 'devops');
});

test('AC-5: all 13 kinds are still in KNOWN_KINDS', () => {
  const missing = EXPECTED_KINDS.filter((kind) => !KNOWN_KINDS.includes(kind));
  assert.deepEqual(
    missing,
    [],
    `KNOWN_KINDS kehilangan: ${missing.join(', ')}. Menghapus kind butuh rilis penghapusan penuh — ` +
      'a kind missing here is detected as `implementation`, so `curate sync` rewrites that ' +
      "agent's Allowed Tools to Read+Write+Edit+Bash in every repo that already has the file."
  );
  assert.equal(EXPECTED_KINDS.length, 13);
});

test('AC-6: every HIDDEN_CANDIDATE_KINDS entry is a known kind', () => {
  for (const kind of HIDDEN_CANDIDATE_KINDS) {
    assert.ok(
      KNOWN_KINDS.includes(kind),
      `hidden candidate "${kind}" is not in KNOWN_KINDS — its file would be detected as implementation`
    );
  }
});

test('AC-4: frontmatter tools of every rendered kind match the literal table', () => {
  for (const { kind, fixture, tools } of EXPECTED_TOOLS) {
    const agent = rendered[fixture][kind];
    assert.ok(agent, `${kind} is not rendered for ${fixture}`);
    assert.deepEqual(
      frontmatterTools(agent.content),
      tools,
      `${agent.file} (${fixture}): frontmatter tools changed — this is the list the harness enforces`
    );
  }
});

// AC-7 / Q-1 (CAF-SDD-03g). An unrecognized filename is not `implementation`: a restricted custom
// agent that has a manifest baseline is skipped and reported by `curate sync`, never rewritten
// with implementation's Allowed Tools. Only `<slug>.md` of a detected app is `implementation`
// (see test/sdd03g-unknown-kind.test.js).
test(
  'AC-7: an unknown kind (caf-foo.md) is not treated as implementation and is left alone by curate sync',
  async () => {
    // A read-only agent under a name no kind claims.
    const content = rendered['mono-pnpm'].devops.content;
    const relPath = path.join(AGENT_DIR, 'caf-foo.md');
    const dir = makeRepo({ [relPath]: content }, 'caf-kind-guard-');
    const manifest = { version: 1, files: {} };
    const { lines, sections } = parseSections(content);
    for (const s of sections) setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
    writeManifest(dir, manifest);

    const result = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR }));

    assert.deepEqual(result.drifted, [], 'no section of an unknown-kind agent may be synced');
    assert.equal(fs.readFileSync(path.join(dir, relPath), 'utf8'), content, 'file must stay byte-identical');
    assert.notEqual(detectKind('caf-foo.md'), 'implementation');
  }
);
