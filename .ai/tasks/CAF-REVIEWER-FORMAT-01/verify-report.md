## Status: SUCCESS

## Ticket: CAF-REVIEWER-FORMAT-01

## Summary
`caf-reviewer.md` had no `## Report Format` section (it was `auditor`-only), so the reviewer
agent wrote Verdicts based on reasonable-but-unspecified guesses (e.g. "Overall Verdict:
APPROVED"), which caf-orchestrator's word-boundary regex `/\bAPPROVE\b/i` does not match
("APPROVED"'s trailing "D" breaks the boundary) — silently falling back to `CHANGES_REQUESTED`
and blocking the pipeline at `NEEDS_HUMAN` (CDR-43 in `coderium-web-v2`). Fixed by giving
`buildReportFormatSection(kind)` a `reviewer` branch whose Verdict skeleton is copied verbatim
from caf-orchestrator's `buildInitialReviewPrompt()` (`run-pr-review.use-case.ts`,
CAF-ORCH-PRREVIEW-03) — not rewritten from memory, per the execution prompt's explicit
instruction; the actual file content was read from `/Users/ganjarhadiatna/Projects/CAF/caf-orchestrator`
after the user provided the repo path mid-session.

## Checkpoint: Task 1 investigation (reported mid-session, confirmed by user before continuing)
- **2-source-of-truth risk, as required by the ticket:** `buildReportFormatSection('reviewer')`
  (`caf-initiator`, static) and `buildInitialReviewPrompt()` (`caf-orchestrator`, runtime) both
  now carry the same Verdict skeleton, copied by hand, no shared import (separate npm packages,
  separate deploy cadence). Recommendation given to the user: **document, don't single-source**
  — cross-repo single-sourcing (shared package/build-time fetch) is disproportionate for one
  string; mitigated instead with cross-referencing comments in both files' neighborhoods (this
  repo's side: the comment above `buildReviewerReportFormat()` in `agent-md.js`) and a
  regex-lock test (Task 3) that fails loudly if the generated content stops satisfying
  `report-reader.ts`'s parsers. User confirmed proceeding on this basis (no scope expansion to
  single-sourcing).
- Also found while reading `report-reader.ts`: there are actually **two** Verdict parsers, not
  one — `readReviewerReport()` (loose, `/\bAPPROVE\b/i` et al., used by the pre-PR pipeline gate,
  the one CDR-43 actually hit) and `readInitialReviewReport()` (strict exact-match, used only by
  webhook mode `initial`). The ticket's acceptance criteria targets the loose regex family
  (`/\bAPPROVE\b/i`, `/\bDEFER\b/i`); the canonical content also satisfies the strict parser
  (verified in Task 3), so both are covered by the same fix.
- Confirmed `review-command.js` (interactive `/caf-review`, same repo) is not a third
  independent copy of this contract — it already just points at "format EXACTLY like
  `caf-reviewer.md`" (line 196), which previously resolved to nothing (part of the bug) and now
  resolves to the new `Report Format` section.
- Separately noted (not fixed, out of scope): `readReviewerReport()`'s silent
  default-to-`CHANGES_REQUESTED` on an unrecognized Verdict is a structural gap distinct from
  this ticket's fix — recorded in `open-items.md` per the ticket's Eksplisit Out of Scope
  instruction.

## Acceptance Criteria — evidence

- [x] `buildReportFormatSection(kind)` menghasilkan konten yang benar untuk `kind='reviewer'`,
  dengan baris Verdict yang match persis regex `/\bAPPROVE\b/i`, `/\bDEFER\b/i` dst di
  `report-reader.ts`.
  - `src/templates/agent-md.js` — new `buildReviewerReportFormat()`, wired into
    `buildReportFormatSection('reviewer')`.
  - Verified: `test/reviewer-report-format.test.js` — `generated Report Format section content,
    filled in per its own template, satisfies both report-reader.ts parsers`. This test runs
    literal copies of `report-reader.ts`'s `VERDICT_LINE` regex plus both its loose
    (`readReviewerReport`) and strict (`readInitialReviewReport`) parsing logic against the
    generated section (with its `{...}` Verdict placeholder filled in with each of `APPROVE`,
    `CHANGES REQUESTED`, `DEFER`) and asserts the parsed verdict for all three — all pass.
  - Also: `CDR-43 regression guard` test asserts the section explicitly instructs "MUST be
    exactly one of the three values above", and documents that the old failure string ("Overall
    Verdict: APPROVED") still fails the loose parser (proving why explicit instruction matters).
- [x] Kind `auditor` — TIDAK berubah sama sekali (byte-for-byte).
  - `test/reviewer-report-format.test.js` — `regression: buildReportFormatSection(auditor) is
    byte-for-byte unchanged`. The golden string was extracted via `git show HEAD` into a
    detached worktree and dynamically imported (not retyped by hand), so a transcription mistake
    can't produce a false pass.
- [x] Kind lain (bukan `auditor`/`reviewer`) — tetap `null` (tidak berubah).
  - `test/reviewer-report-format.test.js` — `regression: buildReportFormatSection returns null
    for every kind except auditor/reviewer`, covers all 10 remaining `KNOWN_KINDS` entries.
- [x] `curate audit` terhadap fixture `caf-reviewer.md` TANPA section ini → terbaca sebagai
  "missing" (bukan `DRIFT`/`UNTRACKED`).
  - `test/reviewer-report-format.test.js` — `curate audit: fixture without Report Format reads
    as missing (gap), not DRIFT/UNTRACKED` — asserts `status === 'gap'` and message matches
    `` section `## Report Format` missing ``.
- [x] `curate sync` terhadap fixture yang sama → section ter-INSERT dengan benar, tidak
  mengganggu section lain (`Role`, `Scope`, dst).
  - `test/reviewer-report-format.test.js` — `curate sync: inserts Report Format into a fixture
    that lacks it, without disturbing other sections` — asserts `Role`/`Scope`/`Retry Logic`
    bodies are unchanged after sync, and the inserted `Report Format` body matches
    `buildReportFormatSection('reviewer')` exactly.
- [x] Regression: seluruh test suite sebelumnya tetap 100% pass.
  - This is `caf-initiator`'s own suite (confirmed — the 262-test count referenced in
    requirements.md belongs to `caf-orchestrator`, not this repo; not run here, out of scope).
    `caf-initiator`'s suite before this ticket: 64 tests, all passing. After: `node --test
    test/*.test.js` → **72 tests, 72 pass, 0 fail** (64 pre-existing + 8 new in
    `reviewer-report-format.test.js`).
- [ ] Setelah `curate sync` dijalankan ke `coderium-web-v2`/`umkm-pos`: **explicitly out of
  scope for this session** (Eksplisit Out of Scope in requirements.md — separate session, user
  retriggers CDR-43 manually).

## Files changed
- `src/templates/agent-md.js` — `buildReportFormatSection('reviewer')` branch
  (`buildReviewerReportFormat()`), `buildAuditContractSections()` extended to render
  `## Report Format` (only, not `## What to Look For`) for kind `reviewer`.
- `test/reviewer-report-format.test.js` — new, 8 tests.
- `README.md` — `Report Format` row in the content-level section tracking table updated from
  "Auditor-only" to role-aware; history paragraph added.
- `.ai/tasks/CAF-REVIEWER-FORMAT-01/open-items.md` — new: silent-default lenient-parser
  observation, and the 2-source-of-truth risk writeup.

## Explicitly not done (per Eksplisit Out of Scope / Batasan Scope)
- `curate sync` was not run against `coderium-web-v2`/`umkm-pos`.
- `buildInitialReviewPrompt()`/any `caf-orchestrator` code was not modified — read-only access.
- `readReviewerReport()`'s silent-default lenient parsing was not changed — recorded as an
  observation in `open-items.md` only.
