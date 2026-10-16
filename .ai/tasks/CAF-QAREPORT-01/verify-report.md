## Verify Report — CAF-QAREPORT-01
Ticket: CAF-QAREPORT-01
Agent: caf-init (manual, via Claude Code)
Status: SUCCESS

### Task 1 — `coderiumid/caf-initiator` (src/templates/agent-md.js)
- [x] `buildQaReportFormat()` added — qa-report.md skeleton, follows
      `buildReviewerReportFormat()`'s style. Literal `Status: PASS | FAIL` line,
      uppercase, on its own line.
- [x] `buildReportFormatSection(kind)` — `if (kind === 'qa') return buildQaReportFormat();`
      added before the auditor branch.
- [x] `buildAuditContractSections(kind)` — `qa` now renders `## Report Format` into
      the agent body (previously auditor/reviewer only).
- [x] `buildRetryLogicSection(kind)` — `qa` case added: `qa-report.md` /
      `Status: PASS`|`FAIL`, not `verify-report.md`/`SUCCESS`.
- [x] `buildRetryLogicSection(kind)` — `reviewer` case added: points to
      `review-notes.md`/`Verdict`, defers to the Report Format section for the
      exact values (no duplication).
- [x] Test suite run: `npm test` → 78/78 pass. `frontend`/`backend`/`implementation`/
      other Delivery kinds confirmed byte-identical to pre-change output
      (`test/retry-logic-role-aware.test.js` regression oracle).

### Task 2 — `coderiumid/caf-orchestrator` (src/infrastructure/reports/report-reader.ts)
- [x] `readQaReport()` replaced free `/\bPASS\b/` scan with line-anchored
      `Status:` match (same pattern as `VERDICT_LINE`), exact match after
      `trim()` (not a prefix match — a review caught that `/^PASS\b/` let an
      unfilled skeleton placeholder `"Status: PASS | FAIL"` read as PASS).
- [x] Fallback is `FAIL` when no `Status:` line is found (fail-safe).
- [x] New unit tests: `Status: PASS`→PASS, `Status: FAIL`→FAIL, `Status: SUCCESS`
      (wrong contract)→FAIL, unfilled placeholder `"PASS | FAIL"`→FAIL, "PASS" in
      body but not on Status line→FAIL, missing Status line→FAIL, missing
      file→undefined.
- [x] `npx vitest run tests/unit/report-reader.test.ts` → 19/19 pass.
      `tsc --noEmit` clean. `eslint` clean. Full suite 350/352 (2 pre-existing,
      unrelated `events-route.test.ts` SSE timing flakes).

### Task 3 — `ganjardbc/umkm-pos`
- [x] `.claude/agents/caf-qa.md`: `## Scope` filled in (full-repo read-only,
      cross-frontend/backend), `## Verify Checklist` filled in (manual
      acceptance-criteria walkthrough), `## Retry Logic` replaced with the
      `qa-report.md`/`Status: PASS`|`FAIL` contract, `## Report Format` added,
      DRAFT banner removed.
- [x] `.claude/agents/caf-reviewer.md`: `## Retry Logic` audited — was still on
      `verify-report.md`/`Status: SUCCESS`, fixed to `review-notes.md`/`Verdict`.
- [x] Committed to `main` (cherry-picked from a short-lived feature branch onto
      `main` per explicit request, then rebased onto a remote commit that landed
      in between): `1c4f84e`. Pushed to `origin/main`.

### Task 4 — `ganjardbc/coderium-web-v2`
- [x] Same edits as Task 3, confirmed byte-identical diff to `umkm-pos`.
- [x] Committed on `ai-agent/CAF-QAREPORT-01`: `60277f9`. Pushed to origin.

### Notes
All four repos' working trees are clean after commit. All four pushed to
origin: `caf-initiator`/`caf-orchestrator`/`coderium-web-v2` on branch
`ai-agent/CAF-QAREPORT-01` (PRs not yet opened), `umkm-pos` directly on `main`
per explicit request. No PRs opened yet.

---

## Commit Diffs

### caf-initiator (ff5bebf)
```diff
diff --git a/src/templates/agent-md.js b/src/templates/agent-md.js
index 84e2e92..c00c7a1 100644
--- a/src/templates/agent-md.js
+++ b/src/templates/agent-md.js
@@ -329,8 +329,50 @@ don't use other values (e.g. NEEDS_HUMAN is for the automated pipeline's retry c
 Verdict line).`;
 }
 
+// qa's contract (CAF-QAREPORT-01): qa-report.md's `Status:` line is what caf-orchestrator's
+// readQaReport() (report-reader.ts) parses to decide PASS vs FAIL. The parse is line-anchored on
+// `Status:` and case-sensitive on the literal PASS/FAIL, and anything it can't parse falls back to
+// FAIL (fail-safe) — so the skeleton below must keep that line, uppercase and on its own line.
+// Before this existed, buildReportFormatSection('qa') returned null and Retry Logic told QA to
+// write `verify-report.md` with `Status: SUCCESS` — the wrong file and a value this parser never
+// treats as PASS. Same cross-repo caveat as buildReviewerReportFormat(): caf-orchestrator is a
+// separate npm package, so this contract is guarded by a test here, not by a shared import.
+export function buildQaReportFormat() {
+  return `Save the report to \`.caf/tasks/<TICKET-ID>/qa-report.md\`.
+
+\`\`\`
+## QA Report — {TICKET-ID}
+Ticket: {TICKET-ID}
+Agent: caf-qa
+Status: PASS | FAIL
+
+### Verification Matrix
+| # | Acceptance Criteria (requirements.md) | How Verified | Result |
+|---|---------------------------------------|--------------|--------|
+| 1 | {criterion, verbatim from requirements.md} | {command run / manual step} | PASS or FAIL |
+
+### Findings
+{for every FAIL row: what was expected, what actually happened, \`path/to/file.ext:line\`, and the
+steps to reproduce — or "None" if everything passed}
+
+### Notes
+{anything the Reviewer or the developer should know; out-of-scope observations go here, not in
+the matrix}
+\`\`\`
+
+\`Status\` MUST be exactly \`PASS\` or \`FAIL\` — uppercase, on its own \`Status:\` line.
+caf-orchestrator reads ONLY that line (line-anchored, case-sensitive) and treats anything else,
+including \`SUCCESS\`/\`OK\`/\`Passed\`/an empty value, as \`FAIL\`. A \`PASS\` appearing elsewhere in the
+report (e.g. a Result cell in the matrix above) is NOT read as the report status.
+
+\`Status: PASS\` only if EVERY acceptance criterion in the matrix passed. One FAIL row → \`Status: FAIL\`.
+Every row needs a real verification (a command that was actually run, or a manual step that was
+actually performed) — an unverified criterion is a FAIL, not a PASS.`;
+}
+
 export function buildReportFormatSection(kind) {
   if (kind === 'reviewer') return buildReviewerReportFormat();
+  if (kind === 'qa') return buildQaReportFormat();
   if (kind !== 'auditor') return null;
   return `Save the report to \`.caf/audits/<DATE>/audit-report.md\` (this name is reserved for a full-repo
 scan by this agent — the scoped \`/caf-audit-scan\` command uses the suffix \`-{scope-slug}\`).
@@ -365,7 +407,7 @@ ${buildWhatToLookForSection(kind)}
 ${buildReportFormatSection(kind)}
 `;
   }
-  if (kind === 'reviewer') {
+  if (kind === 'reviewer' || kind === 'qa') {
     return `
 ## Report Format
 ${buildReportFormatSection(kind)}
@@ -391,6 +433,32 @@ export function buildWorkingPatternSection() {
 // utils/agent-sections.js for the sections that currently can't.
 export const DISCOVERY_KINDS = ['pm', 'ux-designer'];
 
+// CAF-QAREPORT-01: qa and reviewer don't produce `verify-report.md` at all — qa writes
+// `qa-report.md` (`Status: PASS|FAIL`, read by readQaReport()) and reviewer writes
+// `review-notes.md` (`Verdict:`, read by readReviewerReport()). The Delivery text below told both
+// to write `verify-report.md` with `Status: SUCCESS`, a file/value neither parser looks at.
+const QA_RETRY_LOGIC = [
+  'Verify passes → write `qa-report.md` with **`Status: PASS`** (this exact uppercase literal, on',
+  'its own `Status:` line — caf-orchestrator parses that line only and treats anything else,',
+  'including "SUCCESS"/"OK"/"Passed", as `FAIL`).',
+  'Verify fails → write `qa-report.md` with **`Status: FAIL`**, listing every failing acceptance',
+  'criterion with evidence (`path/to/file.ext:line`) and repro steps. Do NOT fix the code yourself',
+  'and do NOT retry-until-green: QA verifies, the implementation agent fixes — a `FAIL` is the',
+  'signal the pipeline routes back for rework.',
+  'Never leave `qa-report.md` unwritten: a missing report is not a pass.',
+  'See the Report Format section below for the full skeleton.',
+].join('\n');
+
+const REVIEWER_RETRY_LOGIC = [
+  'Review complete → write `review-notes.md` with the `Verdict:` line set to one of the values',
+  'listed in the Report Format section below (that section is the single source of the exact',
+  'values — do not restate or invent them here).',
+  'Blocked (missing diff/context, or the change needs a human architectural decision) → still write',
+  '`review-notes.md`, with the DEFER verdict and the reason under `### Verdict Rationale`.',
+  'Never leave `review-notes.md` unwritten: caf-orchestrator treats a missing or unparseable',
+  '`Verdict:` line as CHANGES REQUESTED, which stops the PR from going out with no explanation.',
+].join('\n');
+
 // Role-aware since CAF-RETRYLOGIC-01. Discovery agents produce `prd.md`/`flow.md` for a human to
 // read; they never enter the pipeline that greps `verify-report.md`, so the Delivery wording
 // below (write `Status: SUCCESS`) is actively wrong for them — `curate sync` wrote it into two
@@ -398,6 +466,8 @@ export const DISCOVERY_KINDS = ['pm', 'ux-designer'];
 // is unchanged, byte for byte, from before that fix.
 export function buildRetryLogicSection(kind) {
   if (DISCOVERY_KINDS.includes(kind)) return DISCOVERY_RETRY_LOGIC;
+  if (kind === 'qa') return QA_RETRY_LOGIC;
+  if (kind === 'reviewer') return REVIEWER_RETRY_LOGIC;
   return [
     'Verify passes → write `verify-report.md` with **`Status: SUCCESS`** (this exact literal word —',
     'caf-orchestrator greps for `\\bSUCCESS\\b` and treats anything else, including "PASS"/"DONE"/"OK",',
diff --git a/test/qa-report-format.test.js b/test/qa-report-format.test.js
new file mode 100644
index 0000000..afcc8f7
--- /dev/null
+++ b/test/qa-report-format.test.js
@@ -0,0 +1,99 @@
+// CAF-QAREPORT-01 — `## Report Format` and `## Retry Logic` for kind 'qa' (and Retry Logic for
+// 'reviewer') follow the artifact contract caf-orchestrator actually parses.
+//
+// Bug being closed: buildRetryLogicSection(kind) was role-aware only for DISCOVERY_KINDS, so 'qa'
+// and 'reviewer' got the Delivery text ("write `verify-report.md` with `Status: SUCCESS`") — the
+// wrong file for both, and a value neither readQaReport() (Status: PASS|FAIL) nor
+// readReviewerReport() (Verdict:) treats as success. buildReportFormatSection('qa') also returned
+// null, so caf-qa.md had no report skeleton at all.
+//
+// The parser copies below mirror caf-orchestrator's report-reader.ts. The two repos are separate
+// npm packages with no shared import, so — same as CAF-REVIEWER-FORMAT-01 — the contract is
+// guarded by asserting the template against a copy of the regexes rather than by importing them.
+
+import test from 'node:test';
+import assert from 'node:assert/strict';
+
+import {
+  buildAgentMd,
+  buildQaReportFormat,
+  buildReportFormatSection,
+  buildRetryLogicSection,
+} from '../src/templates/agent-md.js';
+import { parseSections, sectionBody } from '../src/utils/agent-sections.js';
+
+function bodyOf(content, header) {
+  const { lines, sections } = parseSections(content);
+  const s = sections.find((x) => x.header === header);
+  return s ? sectionBody(lines, s) : null;
+}
+
+// Copy of the line-anchored, case-sensitive parse readQaReport() performs (CAF-QAREPORT-01 Task 1
+// in caf-orchestrator): the `Status:` line only, uppercase PASS/FAIL, fail-safe to FAIL.
+const QA_STATUS_LINE = /^.*Status:\s*(.+)$/m;
+
+function parseQaStatus(raw) {
+  const statusLine = QA_STATUS_LINE.exec(raw)?.[1] ?? '';
+  return /^PASS\b/.test(statusLine.replace(/[*`]/g, '').trim()) ? 'PASS' : 'FAIL';
+}
+
+test('buildQaReportFormat: skeleton carries a parseable, uppercase Status line', () => {
+  const content = buildQaReportFormat();
+  assert.match(content, /^Status: PASS \| FAIL$/m);
+  assert.match(content, /\.caf\/tasks\/<TICKET-ID>\/qa-report\.md/);
+  assert.match(content, /### Verification Matrix/);
+  assert.match(content, /### Findings/);
+  // The skeleton must never point QA at the implementation agent's artifact/literal.
+  assert.doesNotMatch(content, /verify-report\.md/);
+  assert.doesNotMatch(content, /Status: SUCCESS/);
+});
+
+test('a report filled in from the skeleton parses PASS/FAIL the way readQaReport() does', () => {
+  const skeleton = buildQaReportFormat();
+  assert.equal(parseQaStatus(skeleton.replace('Status: PASS | FAIL', 'Status: PASS')), 'PASS');
+  assert.equal(parseQaStatus(skeleton.replace('Status: PASS | FAIL', 'Status: FAIL')), 'FAIL');
+  // Old/wrong contract must not accidentally read as a pass.
+  assert.equal(parseQaStatus(skeleton.replace('Status: PASS | FAIL', 'Status: SUCCESS')), 'FAIL');
+});
+
+test('buildReportFormatSection(qa) is buildQaReportFormat, and is rendered into caf-qa.md', () => {
+  assert.equal(buildReportFormatSection('qa'), buildQaReportFormat());
+  const md = buildAgentMd({ name: 'caf-qa', role: 'role', scope: 'scope', kind: 'qa', slug: 'caf-qa' });
+  assert.equal(bodyOf(md, 'Report Format'), buildQaReportFormat());
+  // "What to Look For" stays auditor-only.
+  assert.equal(bodyOf(md, 'What to Look For'), null);
+});
+
+test('buildRetryLogicSection(qa) points at qa-report.md with PASS/FAIL, never verify-report/SUCCESS', () => {
+  const body = buildRetryLogicSection('qa');
+  assert.match(body, /qa-report\.md/);
+  assert.match(body, /Status: PASS/);
+  assert.match(body, /Status: FAIL/);
+  assert.doesNotMatch(body, /verify-report\.md/);
+  // "SUCCESS" may appear only as a value explicitly called out as NOT a pass, never as the
+  // literal QA is told to write.
+  assert.doesNotMatch(body, /Status: SUCCESS/);
+  assert.doesNotMatch(body, /NEEDS_HUMAN/);
+});
+
+test('buildRetryLogicSection(reviewer) defers to the Report Format Verdict contract', () => {
+  const body = buildRetryLogicSection('reviewer');
+  assert.match(body, /review-notes\.md/);
+  assert.match(body, /Report Format/);
+  assert.doesNotMatch(body, /verify-report\.md/);
+  assert.doesNotMatch(body, /\bSUCCESS\b/);
+  // The exact Verdict values live in Report Format only — this section must not restate the list
+  // (a second copy is exactly what drifts). Naming CHANGES REQUESTED as the fail-safe default for
+  // a missing/unparseable Verdict line is a statement about the parser, not a value menu.
+  assert.doesNotMatch(body, /APPROVE \| CHANGES REQUESTED \| DEFER/);
+  assert.doesNotMatch(body, /\bAPPROVE\b/);
+});
+
+test('the Report Format fence in caf-qa.md is not misread as a section boundary', () => {
+  // parseSections is fence-aware (CAF-SECTIONPARSE-01); the skeleton embeds literal `## QA Report`
+  // lines inside a fence, which must not become real sections.
+  const md = buildAgentMd({ name: 'caf-qa', role: 'role', scope: 'scope', kind: 'qa', slug: 'caf-qa' });
+  const { sections } = parseSections(md);
+  assert.equal(sections.filter((s) => s.header.startsWith('QA Report')).length, 0);
+  assert.equal(sections.filter((s) => s.header === 'Report Format').length, 1);
+});
diff --git a/test/retry-logic-role-aware.test.js b/test/retry-logic-role-aware.test.js
index 8f87ded..42723f1 100644
--- a/test/retry-logic-role-aware.test.js
+++ b/test/retry-logic-role-aware.test.js
@@ -41,8 +41,14 @@ const DELIVERY_RETRY_LOGIC_PRE_FIX = [
   '`verify-report.md` with Status: NEEDS_HUMAN',
 ].join('\n');
 
+// CAF-QAREPORT-01 gave 'qa' and 'reviewer' their own Retry Logic (they write qa-report.md /
+// review-notes.md, never verify-report.md), so they are no longer part of this regression oracle —
+// their contract is guarded in test/qa-report-format.test.js instead. Every OTHER non-Discovery
+// kind must still be byte-identical to the pre-fix Delivery text.
+const CONTRACT_KINDS = ['qa', 'reviewer'];
+
 const DELIVERY_KINDS = [
-  ...KNOWN_KINDS.filter((k) => !DISCOVERY_KINDS.includes(k)),
+  ...KNOWN_KINDS.filter((k) => !DISCOVERY_KINDS.includes(k) && !CONTRACT_KINDS.includes(k)),
   'implementation',
   'devops',
   undefined,
diff --git a/test/reviewer-report-format.test.js b/test/reviewer-report-format.test.js
index 8a6dd7b..98bc9c2 100644
--- a/test/reviewer-report-format.test.js
+++ b/test/reviewer-report-format.test.js
@@ -99,8 +99,10 @@ test('regression: buildReportFormatSection(auditor) is byte-for-byte unchanged',
   assert.equal(buildReportFormatSection('auditor'), GOLDEN_AUDITOR_REPORT_FORMAT);
 });
 
-test('regression: buildReportFormatSection returns null for every kind except auditor/reviewer', () => {
-  for (const kind of ['planner', 'architect', 'frontend', 'backend', 'implementation', 'qa', 'documentation', 'devops', 'pm', 'ux-designer']) {
+// 'qa' dropped from this list at CAF-QAREPORT-01 — it now has its own skeleton
+// (buildQaReportFormat), covered in test/qa-report-format.test.js.
+test('regression: buildReportFormatSection returns null for every kind except auditor/reviewer/qa', () => {
+  for (const kind of ['planner', 'architect', 'frontend', 'backend', 'implementation', 'documentation', 'devops', 'pm', 'ux-designer']) {
     assert.equal(buildReportFormatSection(kind), null, `expected null for kind=${kind}`);
   }
 });
```

### caf-orchestrator (0e59af7)
```diff
diff --git a/src/infrastructure/reports/report-reader.ts b/src/infrastructure/reports/report-reader.ts
index 0eb6f3c..074ef51 100644
--- a/src/infrastructure/reports/report-reader.ts
+++ b/src/infrastructure/reports/report-reader.ts
@@ -43,11 +43,23 @@ export interface QaReport {
   raw: string;
 }
 
+// Line-anchored on the `Status:` line, same pattern as VERDICT_LINE below — a free `/\bPASS\b/`
+// scan over the whole report matched "PASS" anywhere (e.g. a table cell) and missed "PASSED"
+// (no trailing word boundary on "PASS" itself), both nondeterministic against a substantively
+// valid report. Case-sensitive on purpose: caf-qa.md's contract is the exact uppercase literal
+// `Status: PASS` / `Status: FAIL` (CAF-QAREPORT-01) — anything else, including a missing Status
+// line entirely, is fail-safe FAIL, never a silent PASS.
+const QA_STATUS_LINE = /^.*Status:\s*(.+)$/m;
+
 export async function readQaReport(workspacePath: string, ticketKey: string): Promise<QaReport | undefined> {
   const raw = await readIfExists(join(taskDir(workspacePath, ticketKey), 'qa-report.md'));
   if (raw === undefined) return undefined;
 
-  const status: QaStatus = /\bPASS\b/.test(raw) ? 'PASS' : 'FAIL';
+  // Exact match, not prefix: `/^PASS\b/` let an unfilled skeleton placeholder
+  // ("Status: PASS | FAIL") read as PASS, which is exactly the fail-safe case this parser
+  // exists to catch.
+  const statusLine = QA_STATUS_LINE.exec(raw)?.[1] ?? '';
+  const status: QaStatus = statusLine.trim() === 'PASS' ? 'PASS' : 'FAIL';
   return { status, raw };
 }
 
diff --git a/tests/unit/report-reader.test.ts b/tests/unit/report-reader.test.ts
index 86484e7..06b50e5 100644
--- a/tests/unit/report-reader.test.ts
+++ b/tests/unit/report-reader.test.ts
@@ -2,7 +2,7 @@ import { describe, it, expect, afterEach } from 'vitest';
 import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
 import { tmpdir } from 'node:os';
 import { join } from 'node:path';
-import { readFixReviewLog, readInitialReviewReport, UnrecognizedVerdictError } from '../../src/infrastructure/reports/report-reader.js';
+import { readFixReviewLog, readInitialReviewReport, readQaReport, UnrecognizedVerdictError } from '../../src/infrastructure/reports/report-reader.js';
 
 const dirs: string[] = [];
 
@@ -15,6 +15,15 @@ function writeFixReviewLog(ticketKey: string, content: string): string {
   return workspacePath;
 }
 
+function writeQaReport(ticketKey: string, content: string): string {
+  const workspacePath = mkdtempSync(join(tmpdir(), 'caf-orchestrator-report-reader-test-'));
+  dirs.push(workspacePath);
+  const taskDir = join(workspacePath, '.caf', 'tasks', ticketKey);
+  mkdirSync(taskDir, { recursive: true });
+  writeFileSync(join(taskDir, 'qa-report.md'), content);
+  return workspacePath;
+}
+
 function writeReviewNotes(ticketKey: string, content: string): string {
   const workspacePath = mkdtempSync(join(tmpdir(), 'caf-orchestrator-report-reader-test-'));
   dirs.push(workspacePath);
@@ -143,6 +152,82 @@ describe('readFixReviewLog', () => {
   });
 });
 
+describe('readQaReport', () => {
+  // CAF-QAREPORT-01: the old parser was a free /\bPASS\b/ scan over the whole file — matched a
+  // "PASS" table cell anywhere, missed "PASSED", and had no defined behavior for a missing/wrong
+  // Status line. This locks the line-anchored, fail-safe replacement down.
+  it('reads Status: PASS as PASS', async () => {
+    const md = ['## QA Report — GAN-114', 'Agent: caf-qa', 'Status: PASS'].join('\n');
+    const workspacePath = writeQaReport('GAN-114', md);
+
+    const result = await readQaReport(workspacePath, 'GAN-114');
+
+    expect(result?.status).toBe('PASS');
+  });
+
+  it('reads Status: FAIL as FAIL', async () => {
+    const md = ['## QA Report — GAN-114', 'Agent: caf-qa', 'Status: FAIL'].join('\n');
+    const workspacePath = writeQaReport('GAN-114', md);
+
+    const result = await readQaReport(workspacePath, 'GAN-114');
+
+    expect(result?.status).toBe('FAIL');
+  });
+
+  it('treats Status: SUCCESS (old/wrong contract) as FAIL, not a stray match', async () => {
+    const md = ['## QA Report — GAN-114', 'Status: SUCCESS'].join('\n');
+    const workspacePath = writeQaReport('GAN-114', md);
+
+    const result = await readQaReport(workspacePath, 'GAN-114');
+
+    expect(result?.status).toBe('FAIL');
+  });
+
+  it('treats an unfilled placeholder (Status: PASS | FAIL) as FAIL, not a prefix match', async () => {
+    const md = ['## QA Report — GAN-114', 'Status: PASS | FAIL'].join('\n');
+    const workspacePath = writeQaReport('GAN-114', md);
+
+    const result = await readQaReport(workspacePath, 'GAN-114');
+
+    expect(result?.status).toBe('FAIL');
+  });
+
+  it('treats "PASS" appearing in the body but not on the Status line as FAIL', async () => {
+    const md = [
+      '## QA Report — GAN-114',
+      'Status: FAIL',
+      '',
+      '### Verification Matrix',
+      '| # | Criteria | How Verified | Result |',
+      '| 1 | login works | manual | PASS |',
+      '| 2 | logout works | manual | FAIL |',
+    ].join('\n');
+    const workspacePath = writeQaReport('GAN-114', md);
+
+    const result = await readQaReport(workspacePath, 'GAN-114');
+
+    expect(result?.status).toBe('FAIL');
+  });
+
+  it('treats a missing Status line entirely as FAIL', async () => {
+    const md = ['## QA Report — GAN-114', 'Agent: caf-qa', '### Findings', 'None'].join('\n');
+    const workspacePath = writeQaReport('GAN-114', md);
+
+    const result = await readQaReport(workspacePath, 'GAN-114');
+
+    expect(result?.status).toBe('FAIL');
+  });
+
+  it('returns undefined when qa-report.md does not exist', async () => {
+    const workspacePath = mkdtempSync(join(tmpdir(), 'caf-orchestrator-report-reader-test-'));
+    dirs.push(workspacePath);
+
+    const result = await readQaReport(workspacePath, 'GAN-114');
+
+    expect(result).toBeUndefined();
+  });
+});
+
 describe('readInitialReviewReport', () => {
   it.each([
     ['APPROVE', 'Verdict: APPROVE'],

```

### umkm-pos (1c4f84e)
```diff
diff --git a/.claude/agents/caf-qa.md b/.claude/agents/caf-qa.md
index 63d0eec..6e3b124 100644
--- a/.claude/agents/caf-qa.md
+++ b/.claude/agents/caf-qa.md
@@ -9,14 +9,15 @@ model: sonnet
 
 # Agent: QA
 
-> DRAFT produced by caf-initiator — review and complete before use, especially the
-> parts marked TODO project-specific.
-
 ## Role
 Verifies the implementation meets the ticket's acceptance criteria.
 
 ## Scope
-TODO: code/artifact area QA may read — decide manually.
+Full repo, read-only: frontend + backend + any other app under this repo, plus the ticket
+artifacts in `.caf/tasks/{TICKET-ID}/`. QA verifies across app boundaries (an acceptance
+criterion frequently spans both frontend and backend), so it is not scoped to a single
+`apps/*` directory the way an implementation agent is. Does not modify code — only reads it
+and writes `qa-report.md`.
 
 ## Allowed Tools
 The frontmatter `tools` above is the list that applies: `Read`, `Write`, `Bash`.
@@ -39,12 +40,53 @@ Produces `qa-report.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.
 3. VERIFY — run the Verify Checklist below before declaring done
 
 ## Verify Checklist
-- [ ] TODO: this agent's scope is not a single app — no reference package.json for auto-detecting scripts
-- [ ] TODO: determine the relevant verification manually
+- [ ] Every acceptance criterion in `requirements.md` is checked off individually against the
+      actual behavior — not assumed to pass because the implementation agent's automated
+      checks/tests already ran (those verify the code runs; this checks it does what the ticket
+      asked for).
+- [ ] Any criterion that can't be verified by an automated script (a UI flow, a copy/wording
+      requirement, an edge case not covered by existing tests) is walked manually and the result
+      recorded in the Verification Matrix, not skipped.
 
 ## Retry Logic
-Verify passes → write `verify-report.md` with **`Status: SUCCESS`** (this exact literal word —
-caf-orchestrator greps for `\bSUCCESS\b` and treats anything else, including "PASS"/"DONE"/"OK",
-as `NEEDS_HUMAN`, which stops the whole pipeline and skips QA/Reviewer/PR creation).
-Verify fails → fix, retry up to 3x → if still failing, stop and write
-`verify-report.md` with Status: NEEDS_HUMAN
+Verify passes → write `qa-report.md` with **`Status: PASS`** (this exact uppercase literal, on
+its own `Status:` line — caf-orchestrator parses that line only and treats anything else,
+including "SUCCESS"/"OK"/"Passed", as `FAIL`).
+Verify fails → write `qa-report.md` with **`Status: FAIL`**, listing every failing acceptance
+criterion with evidence (`path/to/file.ext:line`) and repro steps. Do NOT fix the code yourself
+and do NOT retry-until-green: QA verifies, the implementation agent fixes — a `FAIL` is the
+signal the pipeline routes back for rework.
+Never leave `qa-report.md` unwritten: a missing report is not a pass.
+See the Report Format section below for the full skeleton.
+
+## Report Format
+Save the report to `.caf/tasks/<TICKET-ID>/qa-report.md`.
+
+```
+## QA Report — {TICKET-ID}
+Ticket: {TICKET-ID}
+Agent: caf-qa
+Status: PASS | FAIL
+
+### Verification Matrix
+| # | Acceptance Criteria (requirements.md) | How Verified | Result |
+|---|---------------------------------------|--------------|--------|
+| 1 | {criterion, verbatim from requirements.md} | {command run / manual step} | PASS or FAIL |
+
+### Findings
+{for every FAIL row: what was expected, what actually happened, `path/to/file.ext:line`, and the
+steps to reproduce — or "None" if everything passed}
+
+### Notes
+{anything the Reviewer or the developer should know; out-of-scope observations go here, not in
+the matrix}
+```
+
+`Status` MUST be exactly `PASS` or `FAIL` — uppercase, on its own `Status:` line.
+caf-orchestrator reads ONLY that line (line-anchored, case-sensitive) and treats anything else,
+including `SUCCESS`/`OK`/`Passed`/an empty value, as `FAIL`. A `PASS` appearing elsewhere in the
+report (e.g. a Result cell in the matrix above) is NOT read as the report status.
+
+`Status: PASS` only if EVERY acceptance criterion in the matrix passed. One FAIL row → `Status: FAIL`.
+Every row needs a real verification (a command that was actually run, or a manual step that was
+actually performed) — an unverified criterion is a FAIL, not a PASS.
diff --git a/.claude/agents/caf-reviewer.md b/.claude/agents/caf-reviewer.md
index 93b4aa1..4325d3e 100644
--- a/.claude/agents/caf-reviewer.md
+++ b/.claude/agents/caf-reviewer.md
@@ -51,11 +51,13 @@ Produces `review-notes.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to re
 - [ ] TODO: determine the relevant verification manually
 
 ## Retry Logic
-Verify passes → write `verify-report.md` with **`Status: SUCCESS`** (this exact literal word —
-caf-orchestrator greps for `\bSUCCESS\b` and treats anything else, including "PASS"/"DONE"/"OK",
-as `NEEDS_HUMAN`, which stops the whole pipeline and skips QA/Reviewer/PR creation).
-Verify fails → fix, retry up to 3x → if still failing, stop and write
-`verify-report.md` with Status: NEEDS_HUMAN
+Review complete → write `review-notes.md` with the `Verdict:` line set to one of the values
+listed in the Report Format section below (that section is the single source of the exact
+values — do not restate or invent them here).
+Blocked (missing diff/context, or the change needs a human architectural decision) → still write
+`review-notes.md`, with the DEFER verdict and the reason under `### Verdict Rationale`.
+Never leave `review-notes.md` unwritten: caf-orchestrator treats a missing or unparseable
+`Verdict:` line as CHANGES REQUESTED, which stops the PR from going out with no explanation.
 
 
 ## Report Format
```

### coderium-web-v2 (60277f9)
```diff
diff --git a/.claude/agents/caf-qa.md b/.claude/agents/caf-qa.md
index 63d0eec..6e3b124 100644
--- a/.claude/agents/caf-qa.md
+++ b/.claude/agents/caf-qa.md
@@ -9,14 +9,15 @@ model: sonnet
 
 # Agent: QA
 
-> DRAFT produced by caf-initiator — review and complete before use, especially the
-> parts marked TODO project-specific.
-
 ## Role
 Verifies the implementation meets the ticket's acceptance criteria.
 
 ## Scope
-TODO: code/artifact area QA may read — decide manually.
+Full repo, read-only: frontend + backend + any other app under this repo, plus the ticket
+artifacts in `.caf/tasks/{TICKET-ID}/`. QA verifies across app boundaries (an acceptance
+criterion frequently spans both frontend and backend), so it is not scoped to a single
+`apps/*` directory the way an implementation agent is. Does not modify code — only reads it
+and writes `qa-report.md`.
 
 ## Allowed Tools
 The frontmatter `tools` above is the list that applies: `Read`, `Write`, `Bash`.
@@ -39,12 +40,53 @@ Produces `qa-report.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to read.
 3. VERIFY — run the Verify Checklist below before declaring done
 
 ## Verify Checklist
-- [ ] TODO: this agent's scope is not a single app — no reference package.json for auto-detecting scripts
-- [ ] TODO: determine the relevant verification manually
+- [ ] Every acceptance criterion in `requirements.md` is checked off individually against the
+      actual behavior — not assumed to pass because the implementation agent's automated
+      checks/tests already ran (those verify the code runs; this checks it does what the ticket
+      asked for).
+- [ ] Any criterion that can't be verified by an automated script (a UI flow, a copy/wording
+      requirement, an edge case not covered by existing tests) is walked manually and the result
+      recorded in the Verification Matrix, not skipped.
 
 ## Retry Logic
-Verify passes → write `verify-report.md` with **`Status: SUCCESS`** (this exact literal word —
-caf-orchestrator greps for `\bSUCCESS\b` and treats anything else, including "PASS"/"DONE"/"OK",
-as `NEEDS_HUMAN`, which stops the whole pipeline and skips QA/Reviewer/PR creation).
-Verify fails → fix, retry up to 3x → if still failing, stop and write
-`verify-report.md` with Status: NEEDS_HUMAN
+Verify passes → write `qa-report.md` with **`Status: PASS`** (this exact uppercase literal, on
+its own `Status:` line — caf-orchestrator parses that line only and treats anything else,
+including "SUCCESS"/"OK"/"Passed", as `FAIL`).
+Verify fails → write `qa-report.md` with **`Status: FAIL`**, listing every failing acceptance
+criterion with evidence (`path/to/file.ext:line`) and repro steps. Do NOT fix the code yourself
+and do NOT retry-until-green: QA verifies, the implementation agent fixes — a `FAIL` is the
+signal the pipeline routes back for rework.
+Never leave `qa-report.md` unwritten: a missing report is not a pass.
+See the Report Format section below for the full skeleton.
+
+## Report Format
+Save the report to `.caf/tasks/<TICKET-ID>/qa-report.md`.
+
+```
+## QA Report — {TICKET-ID}
+Ticket: {TICKET-ID}
+Agent: caf-qa
+Status: PASS | FAIL
+
+### Verification Matrix
+| # | Acceptance Criteria (requirements.md) | How Verified | Result |
+|---|---------------------------------------|--------------|--------|
+| 1 | {criterion, verbatim from requirements.md} | {command run / manual step} | PASS or FAIL |
+
+### Findings
+{for every FAIL row: what was expected, what actually happened, `path/to/file.ext:line`, and the
+steps to reproduce — or "None" if everything passed}
+
+### Notes
+{anything the Reviewer or the developer should know; out-of-scope observations go here, not in
+the matrix}
+```
+
+`Status` MUST be exactly `PASS` or `FAIL` — uppercase, on its own `Status:` line.
+caf-orchestrator reads ONLY that line (line-anchored, case-sensitive) and treats anything else,
+including `SUCCESS`/`OK`/`Passed`/an empty value, as `FAIL`. A `PASS` appearing elsewhere in the
+report (e.g. a Result cell in the matrix above) is NOT read as the report status.
+
+`Status: PASS` only if EVERY acceptance criterion in the matrix passed. One FAIL row → `Status: FAIL`.
+Every row needs a real verification (a command that was actually run, or a manual step that was
+actually performed) — an unverified criterion is a FAIL, not a PASS.
diff --git a/.claude/agents/caf-reviewer.md b/.claude/agents/caf-reviewer.md
index 93b4aa1..4325d3e 100644
--- a/.claude/agents/caf-reviewer.md
+++ b/.claude/agents/caf-reviewer.md
@@ -51,11 +51,13 @@ Produces `review-notes.md` in `.caf/tasks/{TICKET-ID}/` for the next agent to re
 - [ ] TODO: determine the relevant verification manually
 
 ## Retry Logic
-Verify passes → write `verify-report.md` with **`Status: SUCCESS`** (this exact literal word —
-caf-orchestrator greps for `\bSUCCESS\b` and treats anything else, including "PASS"/"DONE"/"OK",
-as `NEEDS_HUMAN`, which stops the whole pipeline and skips QA/Reviewer/PR creation).
-Verify fails → fix, retry up to 3x → if still failing, stop and write
-`verify-report.md` with Status: NEEDS_HUMAN
+Review complete → write `review-notes.md` with the `Verdict:` line set to one of the values
+listed in the Report Format section below (that section is the single source of the exact
+values — do not restate or invent them here).
+Blocked (missing diff/context, or the change needs a human architectural decision) → still write
+`review-notes.md`, with the DEFER verdict and the reason under `### Verdict Rationale`.
+Never leave `review-notes.md` unwritten: caf-orchestrator treats a missing or unparseable
+`Verdict:` line as CHANGES REQUESTED, which stops the PR from going out with no explanation.
 
 
 ## Report Format
```
