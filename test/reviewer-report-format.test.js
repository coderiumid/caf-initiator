// CAF-REVIEWER-FORMAT-01 — `## Report Format` becomes kind-aware for `reviewer`, so
// `caf-reviewer.md` gives an explicit Verdict contract matching caf-orchestrator's strict
// parser (report-reader.ts). Root cause: reviewer had no `## Report Format` section at all
// (section was auditor-only), so the agent wrote "Overall Verdict: APPROVED" — a reasonable
// guess with no explicit instruction — which the strict word-boundary regex `/\bAPPROVE\b/i`
// does not match ("APPROVED"'s trailing "D" breaks the boundary), silently defaulting to
// CHANGES_REQUESTED (CDR-43 in coderium-web-v2).
//
// Two guarantees tested here, in order of importance:
//   1. No regression: kind `auditor`'s `## Report Format`/`## What to Look For` is byte-for-byte
//      unchanged, and every other kind still gets `null` (not part of that kind's template).
//   2. `reviewer` gets a real `## Report Format` section whose Verdict line content matches
//      report-reader.ts's parsers word-for-word — verified by running copies of the actual
//      regexes from report-reader.ts (caf-orchestrator), not an approximation.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import prompts from 'prompts';

import { auditAgentDefinitions } from '../src/commands/audit.js';
import { agentsSync } from '../src/commands/agents-sync.js';
import { buildReportFormatSection, buildAgentMd } from '../src/templates/agent-md.js';
import { SYNCABLE_SECTIONS, parseSections, sectionBody } from '../src/utils/agent-sections.js';
import { setSectionBaseline, writeManifest, readManifest, getBaselineHash } from '../src/utils/generate-manifest.js';
import { hashSection, compareSection, SECTION_STATUS } from '../src/utils/section-diff.js';

function makeTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'caf-reviewer-report-format-test-'));
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

// Golden string extracted from `git show HEAD` (i.e. the working tree immediately before this
// ticket's changes) via a detached worktree + dynamic import — not retyped from memory, so a
// transcription mistake can't produce a false pass here (Task 1 requirement: kind `auditor`
// must not change at all).
const GOLDEN_AUDITOR_REPORT_FORMAT =
  'Save the report to `.caf/audits/<DATE>/audit-report.md` (this name is reserved for a full-repo\n' +
  "scan by this agent — the scoped `/caf-audit-scan` command uses the suffix `-{scope-slug}`).\n\n" +
  'The frontmatter `tools` above deliberately does NOT grant `Write` (this agent is read-only\n' +
  'against the repo), so save the file via a Bash redirect/heredoc — the only write allowed, and\n' +
  "ONLY under `.caf/audits/`. TODO: if you'd rather use `Write` for this, add `Write` to the\n" +
  'frontmatter and constrain its scope in the Scope section — a human decision.\n\n' +
  '```markdown\n' +
  '## Audit: <DATE>\n' +
  '## Agent: auditor (agent)\n' +
  '## Scope: <area being scanned>\n\n' +
  '## Summary\n\n' +
  '<1-2 sentence summary of the state of the scanned area>\n\n' +
  '## Priority Findings (max 5)\n\n' +
  '### 1. [CATEGORY] <short title>\n' +
  '- **Location:** `path/to/file.ext:line`\n' +
  '- **Category:** `BUG` / `PERFORMANCE` / `TECH_DEBT` / `COVERAGE`\n' +
  '- **Severity:** Critical / Moderate\n' +
  '- **Issue:** <concrete description, why this is a problem>\n' +
  '- **Impact:** <consequence if left unaddressed>\n' +
  '- **Suggestion:** <short direction for a fix, not a full implementation>\n\n' +
  '### 2. ...\n\n' +
  '## Non-Priority Findings (recorded, not proposed as tasks)\n\n' +
  '- <category, file:line location, severity Minor — short list, no detail>\n\n' +
  '## Notes\n\n' +
  '<things that need human attention — e.g. needs an architectural decision, requested scope\n' +
  'turned out to be broader than can be covered, or a security indication that falls outside\n' +
  "the Auditor's scope>\n\n" +
  '### Sensitive Data Exposure\n\n' +
  '<sensitive data/credential exposure findings, regardless of original category — leave empty if none>\n\n' +
  '- **Location:** `path/to/file.ext:line`\n' +
  '- **Original Category:** `BUG` / `PERFORMANCE` / `TECH_DEBT` / `COVERAGE`\n' +
  '- **Exposed Data:** <type of data only, e.g. "password hash in endpoint response" —\n' +
  '  DO NOT write the actual value/payload>\n' +
  '- **Issue:** <short description>\n' +
  '```\n\n' +
  'Severity Critical / Moderate → Priority Findings; Minor → Non-Priority\n' +
  'Findings. Group findings by module/area within each section. Sensitive-data-exposure\n' +
  'findings go under `## Notes` § `### Sensitive Data Exposure`\n' +
  '(full rule in the "What to Look For" section).\n\n' +
  'The cap of 5 Priority Findings applies specifically to this agent because it scans the entire\n' +
  "repo (budget control for the weekly AI run). `/caf-audit-scan` has no cap because it's scoped to\n" +
  'whatever area the user requested.';

test('regression: buildReportFormatSection(auditor) is byte-for-byte unchanged', () => {
  assert.equal(buildReportFormatSection('auditor'), GOLDEN_AUDITOR_REPORT_FORMAT);
});

test('regression: buildReportFormatSection returns null for every kind except auditor/reviewer', () => {
  for (const kind of ['planner', 'architect', 'frontend', 'backend', 'implementation', 'qa', 'documentation', 'devops', 'pm', 'ux-designer']) {
    assert.equal(buildReportFormatSection(kind), null, `expected null for kind=${kind}`);
  }
});

test('buildReportFormatSection(reviewer) returns non-null content with an explicit Verdict skeleton', () => {
  const content = buildReportFormatSection('reviewer');
  assert.notEqual(content, null);
  assert.match(content, /Verdict: APPROVE \| CHANGES REQUESTED \| DEFER/);
  assert.match(content, /### Security Audit/);
  assert.match(content, /### Qualitative Review/);
  assert.match(content, /### Verdict Rationale/);
  assert.match(content, /### For Developer/);
});

test('builder output matches the actual rendered caf-reviewer.md content (single source of truth)', () => {
  const md = buildAgentMd({ name: 'caf-reviewer', role: 'role', scope: 'scope', kind: 'reviewer', slug: 'caf-reviewer' });
  assert.equal(bodyOf(md, 'Report Format'), buildReportFormatSection('reviewer'));
  // reviewer does NOT get "What to Look For" — that stays auditor-only (out of this ticket's scope).
  assert.equal(bodyOf(md, 'What to Look For'), null);
});

test('curate audit: fixture without Report Format reads as missing (gap), not DRIFT/UNTRACKED', () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-reviewer.md');
  const full = buildAgentMd({ name: 'caf-reviewer', role: 'role', scope: 'scope', kind: 'reviewer', slug: 'caf-reviewer' });

  // Fixture simulating a reviewer file generated before this ticket — no Report Format section
  // at all (mirrors the CDR-43 root cause: the section never existed for this kind).
  const { lines, sections } = parseSections(full);
  const reportFormatSection = sections.find((s) => s.header === 'Report Format');
  const withoutReportFormat = [...lines.slice(0, reportFormatSection.startLine), ...lines.slice(reportFormatSection.endLine)].join('\n');
  assert.equal(bodyOf(withoutReportFormat, 'Report Format'), null, 'precondition: fixture has no Report Format section');

  fs.writeFileSync(path.join(dir, relPath), withoutReportFormat, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, withoutReportFormat);
  writeManifest(dir, manifest);

  const { entries } = auditAgentDefinitions(dir, '.claude/agents');
  const reportFormatEntry = entries.find((e) => e.filePath === relPath && /Report Format/.test(e.message));
  assert.ok(reportFormatEntry, 'expected a gap entry for the missing Report Format section');
  assert.equal(reportFormatEntry.status, 'gap');
  assert.match(reportFormatEntry.message, /section `## Report Format` missing/);
});

test('curate sync: inserts Report Format into a fixture that lacks it, without disturbing other sections', async () => {
  const dir = makeTmpProject();
  const relPath = path.join('.claude', 'agents', 'caf-reviewer.md');
  const full = buildAgentMd({ name: 'caf-reviewer', role: 'role', scope: 'scope', kind: 'reviewer', slug: 'caf-reviewer' });

  const { lines, sections } = parseSections(full);
  const reportFormatSection = sections.find((s) => s.header === 'Report Format');
  const withoutReportFormat = [...lines.slice(0, reportFormatSection.startLine), ...lines.slice(reportFormatSection.endLine)].join('\n');
  const roleBefore = bodyOf(withoutReportFormat, 'Role');
  const scopeBefore = bodyOf(withoutReportFormat, 'Scope');
  const retryLogicBefore = bodyOf(withoutReportFormat, 'Retry Logic');

  fs.writeFileSync(path.join(dir, relPath), withoutReportFormat, 'utf8');

  const manifest = { version: 1, files: {} };
  baselineEverySection(manifest, relPath, withoutReportFormat);
  writeManifest(dir, manifest);

  prompts.inject([true]); // auto-confirm "Add section ... ?" (agentsSync prompts for new-section insertion)
  await agentsSync({ dir, agentDir: '.claude/agents' });

  const after = fs.readFileSync(path.join(dir, relPath), 'utf8');
  assert.equal(bodyOf(after, 'Report Format'), buildReportFormatSection('reviewer'));
  assert.equal(bodyOf(after, 'Role'), roleBefore, 'Role section must be untouched');
  assert.equal(bodyOf(after, 'Scope'), scopeBefore, 'Scope section must be untouched');
  assert.equal(bodyOf(after, 'Retry Logic'), retryLogicBefore, 'Retry Logic section must be untouched');
});

// --- Regex-match test against copies of caf-orchestrator's report-reader.ts parsers ---
//
// Copied verbatim from report-reader.ts (caf-orchestrator repo, src/infrastructure/reports/
// report-reader.ts, as of CAF-ORCH-PRREVIEW-03) — cross-repo import isn't practical (separate
// npm packages), so these are literal copies with this comment naming the source, per
// requirements.md/tasks.md Task 3 instruction. If report-reader.ts's regexes change, this test
// (and its comment) must be updated to match, or drift goes undetected.
const VERDICT_LINE = /^.*Verdict:\s*(.+)$/im;

// readReviewerReport() — the LOOSE parser, used by the pre-PR pipeline gate
// (run-agent-pipeline.use-case.ts) and the one CDR-43 actually hit.
function looseVerdictFromRaw(raw) {
  const verdictLine = VERDICT_LINE.exec(raw)?.[1] ?? '';
  if (/CHANGES REQUESTED/i.test(verdictLine)) return 'CHANGES_REQUESTED';
  if (/\bAPPROVE\b/i.test(verdictLine)) return 'APPROVE';
  if (/\bDEFER\b/i.test(verdictLine)) return 'DEFER';
  return 'CHANGES_REQUESTED'; // silent default, matches report-reader.ts
}

// readInitialReviewReport() — the STRICT parser, used by webhook mode `initial`
// (run-pr-review.use-case.ts). Throws (UnrecognizedVerdictError) on no/garbled match instead of
// defaulting.
function strictVerdictFromRaw(raw) {
  const verdictLine = VERDICT_LINE.exec(raw)?.[1]?.trim();
  if (!verdictLine) throw new Error('no Verdict line');
  const cleaned = verdictLine.replace(/^[*_`]+|[*_`]+$/g, '').trim().toUpperCase();
  if (cleaned === 'APPROVE') return 'APPROVE';
  if (cleaned === 'CHANGES REQUESTED') return 'CHANGES_REQUESTED';
  if (cleaned === 'DEFER') return 'DEFER';
  throw new Error(`unrecognized Verdict: "${verdictLine}"`);
}

test('generated Report Format section content, filled in per its own template, satisfies both report-reader.ts parsers', () => {
  const section = buildReportFormatSection('reviewer');
  assert.notEqual(section, null);

  for (const [templateValue, expected] of [
    ['APPROVE', 'APPROVE'],
    ['CHANGES REQUESTED', 'CHANGES_REQUESTED'],
    ['DEFER', 'DEFER'],
  ]) {
    const raw = section
      .replace('Verdict: APPROVE | CHANGES REQUESTED | DEFER', `Verdict: ${templateValue}`)
      .concat('\n');
    assert.equal(looseVerdictFromRaw(raw), expected, `loose parser mismatch for ${templateValue}`);
    assert.equal(strictVerdictFromRaw(raw), expected, `strict parser mismatch for ${templateValue}`);
  }
});

test("CDR-43 regression guard: the section's own instructions forbid the exact wording that broke the loose parser", () => {
  // The bug: an agent guessing "Overall Verdict: APPROVED" without explicit instruction. Assert
  // the section text spells out the literal allowed values so an agent following it verbatim
  // cannot reproduce that failure mode, and separately assert the old failure string still fails
  // the loose parser (documents why the fix matters).
  const section = buildReportFormatSection('reviewer');
  assert.match(section, /MUST be exactly one of the three values above/);
  assert.equal(looseVerdictFromRaw('Overall Verdict: APPROVED\n'), 'CHANGES_REQUESTED');
});
