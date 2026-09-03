import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { auditAgentDefinitions } from '../src/commands/audit.js';
import { buildAgentMd, buildRetryLogicSection } from '../src/templates/agent-md.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';
import { hashSection } from '../src/utils/section-diff.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-audit-sections-test-'));
  fs.mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true });
  return dir;
}

function frontendMd() {
  return buildAgentMd({
    kind: 'frontend',
    name: 'Frontend',
    role: 'Implements UI.',
    scope: 'apps/web/**',
    scripts: { lint: 'lint', typecheck: 'typecheck', test: 'test', build: 'build' },
    packageManager: 'pnpm',
    slug: 'caf-frontend',
  });
}

function baselineEverySection(manifest, relPath, content) {
  const { lines, sections } = parseSections(content);
  for (const s of sections) {
    setSectionBaseline(manifest, relPath, s.header, hashSection(sectionBody(lines, s)));
  }
}

test('regression: fully in-sync project reports no drift/conflict/customization false positives', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-frontend.md');
  const content = frontendMd();
  fs.writeFileSync(path.join(dir, relPath), content, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, content);
  writeManifest(dir, manifest);

  const { entries, sectionCounts } = auditAgentDefinitions(dir, '.claude/agents');

  assert.equal(sectionCounts.DRIFT, 0);
  assert.equal(sectionCounts.CUSTOMIZATION, 0);
  assert.equal(sectionCounts.CONFLICT, 0);
  assert.equal(sectionCounts.UNTRACKED, 0);
  assert.ok(sectionCounts.IN_SYNC > 0);
  // No entry should report this file as anything other than clean.
  assert.deepEqual(entries, [{ status: 'ok', filePath: relPath, message: 'already in sync', syncCommand: null, severity: 'required' }]);
});

test('regression: a section that never existed is still reported as a plain missing gap, not UNTRACKED', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-frontend.md');
  const content = frontendMd();
  const withoutRetryLogic = content.replace(/## Retry Logic\n[\s\S]*?(?=\n## |$)/, '');
  fs.writeFileSync(path.join(dir, relPath), withoutRetryLogic, 'utf8');
  // No manifest at all — project never had this feature.

  const { entries } = auditAgentDefinitions(dir, '.claude/agents');
  const retryEntry = entries.find((e) => e.message.includes('Retry Logic'));
  assert.ok(retryEntry, 'expected a Retry Logic entry');
  assert.equal(retryEntry.status, 'gap');
  assert.match(retryEntry.message, /missing$/);
  assert.equal(retryEntry.syncCommand, 'caf-init curate --sync-only');
});

test('DRIFT: reproduces CDR-38 — old Retry Logic content untouched since baseline, template has since changed', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-frontend.md');
  const content = frontendMd();

  const oldRetryLogicBody = [
    'Verify passes → write `verify-report.md` with Status: PASS.',
    'Verify fails → fix, retry up to 3x → if still failing, stop and write',
    '`verify-report.md` with Status: NEEDS_HUMAN',
  ].join('\n');
  const oldContent = content.replace(/## Retry Logic\n[\s\S]*?(?=\n## |$)/, `## Retry Logic\n${oldRetryLogicBody}\n`);
  fs.writeFileSync(path.join(dir, relPath), oldContent, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, oldContent); // baseline == current (file untouched since generate)
  writeManifest(dir, manifest);

  const { entries, sectionCounts } = auditAgentDefinitions(dir, '.claude/agents');
  assert.equal(sectionCounts.DRIFT, 1);
  const drift = entries.find((e) => e.message.includes('Retry Logic'));
  assert.equal(drift.status, 'gap');
  assert.match(drift.message, /DRIFT/);
  assert.equal(drift.syncCommand, 'caf-init curate --sync-only');
});

test('CUSTOMIZATION: file edited since baseline, template unchanged — never flagged as auto-syncable', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-frontend.md');
  const content = frontendMd();

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, content); // baseline == original generated content
  writeManifest(dir, manifest);

  // Now the user hand-edits Allowed Tools after the baseline was set; template is unchanged.
  const customized = content.replace(
    /## Allowed Tools\n[\s\S]*?(?=\n## )/,
    '## Allowed Tools\nCustom note added by the user, not touching anything else.\n'
  );
  fs.writeFileSync(path.join(dir, relPath), customized, 'utf8');

  const { entries, sectionCounts } = auditAgentDefinitions(dir, '.claude/agents');
  assert.equal(sectionCounts.CUSTOMIZATION, 1);
  assert.equal(sectionCounts.DRIFT, 0);
  const custom = entries.find((e) => e.message.includes('Allowed Tools'));
  assert.equal(custom.status, 'declined');
  assert.match(custom.message, /CUSTOMIZATION/);
  assert.equal(custom.syncCommand, null);
});

test('CONFLICT: both file (since baseline) and template (since baseline) changed', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-frontend.md');
  const content = frontendMd();

  const oldRetryLogicBody = 'Verify passes → write `verify-report.md` with Status: PASS.';
  const oldContent = content.replace(/## Retry Logic\n[\s\S]*?(?=\n## |$)/, `## Retry Logic\n${oldRetryLogicBody}\n`);

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, oldContent); // baseline = the old PASS-based wording
  writeManifest(dir, manifest);

  // The user also independently edited Retry Logic since that baseline — different from both
  // the baseline AND the current (new) template content.
  const userEdited = content.replace(
    /## Retry Logic\n[\s\S]*?(?=\n## |$)/,
    '## Retry Logic\nCustom retry note the user wrote themselves.\n'
  );
  fs.writeFileSync(path.join(dir, relPath), userEdited, 'utf8');
  assert.notEqual(hashSection(buildRetryLogicSection()), hashSection(oldRetryLogicBody));

  const { entries, sectionCounts } = auditAgentDefinitions(dir, '.claude/agents');
  assert.equal(sectionCounts.CONFLICT, 1);
  const conflict = entries.find((e) => e.message.includes('Retry Logic'));
  assert.equal(conflict.status, 'declined');
  assert.match(conflict.message, /CONFLICT/);
  assert.equal(conflict.syncCommand, null);
});

test('UNTRACKED: section present, project has no manifest at all (pre-feature project)', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-frontend.md');
  fs.writeFileSync(path.join(dir, relPath), frontendMd(), 'utf8');
  // No manifest written at all.

  const { entries, sectionCounts } = auditAgentDefinitions(dir, '.claude/agents');
  assert.ok(sectionCounts.UNTRACKED > 0);
  assert.equal(sectionCounts.DRIFT, 0);
  assert.equal(sectionCounts.CUSTOMIZATION, 0);
  assert.equal(sectionCounts.CONFLICT, 0);
  const untracked = entries.find((e) => e.message.includes('UNTRACKED'));
  assert.ok(untracked);
  assert.equal(untracked.status, 'declined');
  assert.equal(untracked.syncCommand, null);
});
