// CAF-DEVOPS-KIND-01 — `devops` was missing from KNOWN_KINDS, so detectKind('caf-devops.md')
// misclassified it as 'implementation'. If a caf-devops.md (correctly Read+Bash, read-only) were
// ever baselined and the implementation template later changed, `curate sync` would overwrite its
// `## Allowed Tools` with implementation's Read+Write+Edit+Bash — a privilege escalation. No
// caf-devops.md was ever generated in a real project, so this was a latent gap, not an incident.
//
// Investigation (see .ai/tasks/CAF-DEVOPS-KIND-01/requirements.md) found buildToolsSection('devops')
// (TOOLS_BY_KIND/TOOLS_RATIONALE in templates/agent-md.js) is already kind-aware and correct — the
// bug was purely detectKind() routing to the wrong kind. So no DISCOVERY_GUARDED_SECTIONS-style
// guard entry was added for devops: fixing KNOWN_KINDS is the whole fix for Allowed Tools.
// buildInputSection/buildOutputSection have no devops branch and fall through to their generic
// constant TODO fallback (no ARTIFACT_BY_ROLE.devops entry) — honest, and never carries real
// content to lose, so those are left unguarded too.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { auditAgentDefinitions } from '../src/commands/audit.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { buildAgentMd, buildToolsSection, buildInputSection, buildOutputSection } from '../src/templates/agent-md.js';
import { KNOWN_KINDS, detectKind, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-devops-kind-test-'));
  fs.mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true });
  return dir;
}

function bodyOf(content, header) {
  const { lines, sections } = parseSections(content);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
}

function baselineEverySection(manifest, relPath, content) {
  const { lines, sections } = parseSections(content);
  for (const s of sections) {
    setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
}

function devopsMd() {
  return buildAgentMd({
    kind: 'devops',
    name: 'DevOps',
    role: 'Handles deployment and infrastructure configuration after changes are merged.',
    scope: 'TODO: code/artifact area DevOps may read — decide manually.',
    scripts: null,
    packageManager: 'npm',
    slug: 'devops',
  });
}

test('detectKind recognizes devops filenames', () => {
  assert.equal(detectKind('devops.md'), 'devops');
  assert.equal(detectKind('caf-devops.md'), 'devops');
  assert.ok(KNOWN_KINDS.includes('devops'));
});

test('regression: every other KNOWN_KINDS entry + implementation still detect unchanged', () => {
  const others = KNOWN_KINDS.filter((k) => k !== 'devops');
  for (const kind of others) {
    const filename = kind === 'auditor' ? 'caf-auditor.md' : `caf-${kind}.md`;
    assert.equal(detectKind(filename), kind, `kind=${kind}`);
  }
  assert.equal(detectKind('apps-web.md'), 'implementation');
  assert.equal(detectKind('random-unknown-name.md'), 'implementation');
});

test('buildToolsSection(devops) is unchanged by the KNOWN_KINDS fix — already Read+Bash, kind-aware', () => {
  const body = buildToolsSection('devops');
  assert.match(body, /`Read`, `Bash`/);
  assert.doesNotMatch(body, /`Write`/);
  assert.doesNotMatch(body, /`Edit`/);
});

test('regression: buildToolsSection output for every non-devops kind is unchanged', () => {
  const golden = {
    planner: buildToolsSection('planner'),
    frontend: buildToolsSection('frontend'),
    implementation: buildToolsSection('implementation'),
    auditor: buildToolsSection('auditor'),
    pm: buildToolsSection('pm'),
  };
  // Re-invoking must be pure/stable — proves adding 'devops' to KNOWN_KINDS (a detectKind-only
  // table) had zero effect on the independent TOOLS_BY_KIND-driven builder.
  assert.equal(buildToolsSection('planner'), golden.planner);
  assert.equal(buildToolsSection('frontend'), golden.frontend);
  assert.equal(buildToolsSection('implementation'), golden.implementation);
  assert.equal(buildToolsSection('auditor'), golden.auditor);
  assert.equal(buildToolsSection('pm'), golden.pm);
});

test('buildInputSection/buildOutputSection(devops) fall through to the generic TODO fallback', () => {
  assert.equal(buildInputSection('devops'), 'TODO: which artifact is received from the previous agent (see .caf/tasks/{TICKET-ID}/)');
  assert.equal(buildOutputSection('devops'), 'TODO: which artifact is produced for the next agent');
});

test('curate audit: a correctly-generated caf-devops.md (Read+Bash) reads IN_SYNC, not DRIFT', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-devops.md');
  const content = devopsMd();
  fs.writeFileSync(path.join(dir, relPath), content, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, content);
  writeManifest(dir, manifest);

  const { entries, sectionCounts } = auditAgentDefinitions(dir, '.claude/agents');

  assert.equal(sectionCounts.DRIFT, 0);
  assert.equal(sectionCounts.CONFLICT, 0);
  assert.deepEqual(entries, [{ status: 'ok', filePath: relPath, message: 'already in sync', syncCommand: null, severity: 'required' }]);
});

test('regression guard: without the KNOWN_KINDS fix this fixture would have been detected as implementation and drifted to Write+Edit — confirm the pre-fix failure mode is gone', async () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-devops.md');
  const content = devopsMd();
  fs.writeFileSync(path.join(dir, relPath), content, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, content);
  writeManifest(dir, manifest);

  assert.equal(detectKind(relPath), 'devops', 'precondition: must detect as devops, not implementation');

  const result = await agentsSync({ dir, agentDir: '.claude/agents' });
  const after = fs.readFileSync(path.join(dir, relPath), 'utf8');

  assert.equal(bodyOf(after, 'Allowed Tools'), bodyOf(content, 'Allowed Tools'), 'Allowed Tools must stay Read+Bash');
  assert.doesNotMatch(bodyOf(after, 'Allowed Tools'), /`Write`/);
  assert.doesNotMatch(bodyOf(after, 'Allowed Tools'), /`Edit`/);
  assert.deepEqual(result.drifted, []);
});
