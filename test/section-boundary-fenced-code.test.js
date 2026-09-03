// Regression test for CAF-SECTIONPARSE-01 — see .ai/tasks/CAF-SECTIONPARSE-01/.
//
// Bug: caf-auditor.md's "## Report Format" section embeds a fenced report skeleton whose
// literal `## Audit: <DATE>`, `## Summary`, `## Priority Findings`, `## Notes`, etc. lines were
// misread by the (fence-unaware) boundary detector as real section headings. `replaceSectionBody`
// then only rewrote up to the first fake heading, leaving the rest of the old body duplicated at
// the end of the file.
import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildAgentMd, buildReportFormatSection } from '../src/templates/agent-md.js';
import { parseSections, sectionBody, replaceSectionBody, TEMPLATE_SECTION_ORDER } from '../src/utils/agent-sections.js';
import { extractSection, hashSection } from '../src/utils/section-diff.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { setSectionBaseline, writeManifest } from '../src/utils/generate-manifest.js';

function auditorMd() {
  return buildAgentMd({
    kind: 'auditor',
    name: 'Auditor',
    role: 'Scans the repo for issues.',
    scope: 'Whole repo (read-only).',
    scripts: { lint: 'lint', typecheck: 'typecheck', test: 'test', build: 'build' },
    packageManager: 'pnpm',
    slug: 'caf-auditor',
  });
}

test('sanity: caf-auditor.md Report Format body embeds fake ## headings inside a fenced block', () => {
  const content = auditorMd();
  const { lines, sections } = parseSections(content);
  const reportFormat = sections.find((s) => s.header === 'Report Format');
  assert.ok(reportFormat, 'expected a Report Format section');
  const body = sectionBody(lines, reportFormat);
  assert.match(body, /```markdown/);
  assert.match(body, /^## Audit: <DATE>$/m);
  assert.match(body, /^## Summary$/m);
});

test('replaceSectionBody on Report Format replaces the whole section, no duplicated tail content', () => {
  const content = auditorMd();
  const { lines, sections } = parseSections(content);
  const reportFormat = sections.find((s) => s.header === 'Report Format');
  const originalBody = sectionBody(lines, reportFormat);

  const newBody = 'Replacement report format body — should fully replace the original.';
  const updated = replaceSectionBody(lines, reportFormat, newBody);

  // The new body must be present exactly once.
  const occurrences = updated.split(newBody).length - 1;
  assert.equal(occurrences, 1);

  // None of the original body's distinctive fenced-block content should survive anywhere in
  // the file — a fence-unaware parser stops rewriting at the first fake `## Audit:` heading and
  // leaves everything after it (including this fake heading itself) duplicated at the file's tail.
  assert.doesNotMatch(updated, /## Audit: <DATE>/);
  assert.doesNotMatch(updated, /```markdown/);
  assert.ok(!originalBody || !updated.includes('### 1. [CATEGORY]'));

  // File must still parse as well-formed: exactly one "## Report Format" heading, and it must be
  // the last section (per TEMPLATE_SECTION_ORDER) with no stray duplicate sections after it.
  const { sections: updatedSections } = parseSections(updated);
  const reportFormatCount = updatedSections.filter((s) => s.header === 'Report Format').length;
  assert.equal(reportFormatCount, 1);
  assert.deepEqual(
    updatedSections.map((s) => s.header),
    sections.map((s) => s.header)
  );
});

test('extractSection/hashSection on Report Format do not truncate at the fake headings either', () => {
  const content = auditorMd();
  const { lines, sections } = parseSections(content);
  const reportFormat = sections.find((s) => s.header === 'Report Format');
  const fullBody = sectionBody(lines, reportFormat);
  const extracted = extractSection(content, 'Report Format');

  assert.equal(extracted, fullBody);
  assert.equal(hashSection(extracted), hashSection(fullBody));
  // Must include content that comes AFTER the fake headings inside the fenced block.
  assert.match(extracted, /Severity Critical \/ Moderate → Priority Findings/);
});

test('TEMPLATE_SECTION_ORDER sanity: Report Format is last', () => {
  assert.equal(TEMPLATE_SECTION_ORDER[TEMPLATE_SECTION_ORDER.length - 1], 'Report Format');
});

test('integration: curate sync on a full caf-auditor.md file fixes DRIFT in Report Format with no duplication elsewhere', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-sectionparse-integration-'));
  fs.mkdirSync(path.join(dir, '.claude', 'agents'), { recursive: true });
  const relPath = path.join('.claude', 'agents', 'caf-auditor.md');

  const current = auditorMd();
  const { lines, sections } = parseSections(current);

  // Simulate a stale Report Format (baseline == old content, template has since changed) while
  // every other section (including the neighboring "What to Look For") is already in sync —
  // reproduces the real coderium-web-v2 scenario end to end, not just in isolation.
  const oldReportFormatBody = 'Old report format instructions (pre-template-update).';
  const oldContent = current.replace(
    /## Report Format\n[\s\S]*$/,
    `## Report Format\n${oldReportFormatBody}\n`
  );

  const manifest = { version: 1, files: {} };
  for (const s of sections) {
    const body = s.header === 'Report Format' ? oldReportFormatBody : sectionBody(lines, s);
    setSectionBaseline(manifest, relPath, s.header, hashSection(body));
  }
  writeManifest(dir, manifest);
  fs.writeFileSync(path.join(dir, relPath), oldContent, 'utf8');

  await agentsSync({ dir, agentDir: '.claude/agents', dryRun: false });

  const synced = fs.readFileSync(path.join(dir, relPath), 'utf8');

  // Report Format now carries the current template body (fenced skeleton included) exactly once.
  const reportFormatOccurrences = synced.split('## Report Format').length - 1;
  assert.equal(reportFormatOccurrences, 1);
  assert.equal(extractSection(synced, 'Report Format'), buildReportFormatSection('auditor'));

  // No stale duplicated tail content anywhere in the file.
  assert.doesNotMatch(synced, /Old report format instructions/);

  // Every other section (in particular the untouched "What to Look For" right before it) is
  // byte-for-byte identical to the original current content.
  assert.equal(extractSection(synced, 'What to Look For'), extractSection(current, 'What to Look For'));

  // File parses as well-formed: same section headers, same order, no phantom/duplicate sections.
  const { sections: syncedSections } = parseSections(synced);
  assert.deepEqual(
    syncedSections.map((s) => s.header),
    sections.map((s) => s.header)
  );
});
