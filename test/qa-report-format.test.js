// CAF-QAREPORT-01 — `## Report Format` and `## Retry Logic` for kind 'qa' (and Retry Logic for
// 'reviewer') follow the artifact contract caf-orchestrator actually parses.
//
// Bug being closed: buildRetryLogicSection(kind) was role-aware only for DISCOVERY_KINDS, so 'qa'
// and 'reviewer' got the Delivery text ("write `verify-report.md` with `Status: SUCCESS`") — the
// wrong file for both, and a value neither readQaReport() (Status: PASS|FAIL) nor
// readReviewerReport() (Verdict:) treats as success. buildReportFormatSection('qa') also returned
// null, so caf-qa.md had no report skeleton at all.
//
// The parser copies below mirror caf-orchestrator's report-reader.ts. The two repos are separate
// npm packages with no shared import, so — same as CAF-REVIEWER-FORMAT-01 — the contract is
// guarded by asserting the template against a copy of the regexes rather than by importing them.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAgentMd,
  buildQaReportFormat,
  buildReportFormatSection,
  buildRetryLogicSection,
} from '../src/templates/agent-md.js';
import { parseSections, sectionBody } from '../src/utils/agent-sections.js';

function bodyOf(content, header) {
  const { lines, sections } = parseSections(content);
  const s = sections.find((x) => x.header === header);
  return s ? sectionBody(lines, s) : null;
}

// Copy of the line-anchored, case-sensitive parse readQaReport() performs (CAF-QAREPORT-01 Task 1
// in caf-orchestrator): the `Status:` line only, uppercase PASS/FAIL, fail-safe to FAIL.
const QA_STATUS_LINE = /^.*Status:\s*(.+)$/m;

function parseQaStatus(raw) {
  const statusLine = QA_STATUS_LINE.exec(raw)?.[1] ?? '';
  return /^PASS\b/.test(statusLine.replace(/[*`]/g, '').trim()) ? 'PASS' : 'FAIL';
}

test('buildQaReportFormat: skeleton carries a parseable, uppercase Status line', () => {
  const content = buildQaReportFormat();
  assert.match(content, /^Status: PASS \| FAIL$/m);
  assert.match(content, /\.caf\/tasks\/<TICKET-ID>\/qa-report\.md/);
  assert.match(content, /### Verification Matrix/);
  assert.match(content, /### Findings/);
  // The skeleton must never point QA at the implementation agent's artifact/literal.
  assert.doesNotMatch(content, /verify-report\.md/);
  assert.doesNotMatch(content, /Status: SUCCESS/);
});

test('a report filled in from the skeleton parses PASS/FAIL the way readQaReport() does', () => {
  const skeleton = buildQaReportFormat();
  assert.equal(parseQaStatus(skeleton.replace('Status: PASS | FAIL', 'Status: PASS')), 'PASS');
  assert.equal(parseQaStatus(skeleton.replace('Status: PASS | FAIL', 'Status: FAIL')), 'FAIL');
  // Old/wrong contract must not accidentally read as a pass.
  assert.equal(parseQaStatus(skeleton.replace('Status: PASS | FAIL', 'Status: SUCCESS')), 'FAIL');
});

test('buildReportFormatSection(qa) is buildQaReportFormat, and is rendered into caf-qa.md', () => {
  assert.equal(buildReportFormatSection('qa'), buildQaReportFormat());
  const md = buildAgentMd({ name: 'caf-qa', role: 'role', scope: 'scope', kind: 'qa', slug: 'caf-qa' });
  assert.equal(bodyOf(md, 'Report Format'), buildQaReportFormat());
  // "What to Look For" stays auditor-only.
  assert.equal(bodyOf(md, 'What to Look For'), null);
});

test('buildRetryLogicSection(qa) points at qa-report.md with PASS/FAIL, never verify-report/SUCCESS', () => {
  const body = buildRetryLogicSection('qa');
  assert.match(body, /qa-report\.md/);
  assert.match(body, /Status: PASS/);
  assert.match(body, /Status: FAIL/);
  assert.doesNotMatch(body, /verify-report\.md/);
  // "SUCCESS" may appear only as a value explicitly called out as NOT a pass, never as the
  // literal QA is told to write.
  assert.doesNotMatch(body, /Status: SUCCESS/);
  assert.doesNotMatch(body, /NEEDS_HUMAN/);
});

test('buildRetryLogicSection(reviewer) defers to the Report Format Verdict contract', () => {
  const body = buildRetryLogicSection('reviewer');
  assert.match(body, /review-notes\.md/);
  assert.match(body, /Report Format/);
  assert.doesNotMatch(body, /verify-report\.md/);
  assert.doesNotMatch(body, /\bSUCCESS\b/);
  // The exact Verdict values live in Report Format only — this section must not restate the list
  // (a second copy is exactly what drifts). Naming CHANGES REQUESTED as the fail-safe default for
  // a missing/unparseable Verdict line is a statement about the parser, not a value menu.
  assert.doesNotMatch(body, /APPROVE \| CHANGES REQUESTED \| DEFER/);
  assert.doesNotMatch(body, /\bAPPROVE\b/);
});

test('the Report Format fence in caf-qa.md is not misread as a section boundary', () => {
  // parseSections is fence-aware (CAF-SECTIONPARSE-01); the skeleton embeds literal `## QA Report`
  // lines inside a fence, which must not become real sections.
  const md = buildAgentMd({ name: 'caf-qa', role: 'role', scope: 'scope', kind: 'qa', slug: 'caf-qa' });
  const { sections } = parseSections(md);
  assert.equal(sections.filter((s) => s.header.startsWith('QA Report')).length, 0);
  assert.equal(sections.filter((s) => s.header === 'Report Format').length, 1);
});
