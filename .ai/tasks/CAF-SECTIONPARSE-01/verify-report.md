# Verify Report: CAF-SECTIONPARSE-01 — Fix Section Boundary Parser

## Status: SUCCESS

## Bug Reproduction (Task 1)

New test file: `test/section-boundary-fenced-code.test.js`.

Before the fix, run on the unfixed code:

```
node --test test/section-boundary-fenced-code.test.js
```

Result: **3 of 4 tests FAILED**, confirming the reported bug:

- `replaceSectionBody on Report Format replaces the whole section, no duplicated tail content` —
  FAIL: `doesNotMatch` on `## Audit: <DATE>` and `` ```markdown `` both matched (old body's
  fenced skeleton survived, appended after the fake `## Audit:` heading it was wrongly treated
  as a section boundary).
- `extractSection/hashSection on Report Format do not truncate at the fake headings either` —
  FAIL: extracted body cut off at the first fenced `##` line, missing everything after it
  (e.g. the `Severity Critical / Moderate → Priority Findings` line near the end).
- `sanity: caf-auditor.md Report Format body embeds fake ## headings inside a fenced block` —
  passed (this one only asserts the fixture shape, not the bug).

This confirms the reported data-corruption bug (section duplication in `replaceSectionBody`,
plus a matching truncation bug in `extractSection`/`hashSection`) is real and reproducible, not
just reported.

## Task 2 — Scope of Affected Functions

Found **one** shared boundary-detection function, not two separate ones as `design.md` was
unsure about:

- `parseSections()` in `src/utils/agent-sections.js` is the single source of section-boundary
  detection (naive `^##\s` line match across all lines).
- `replaceSectionBody()` (same file) uses `parseSections()`'s output (`startLine`/`endLine`)
  directly.
- `section-diff.js`'s `extractSection()` and (transitively) `hashSection()`/`compareSection()`
  call `parseSections()` too (imported from `agent-sections.js`) — no separate/duplicated
  boundary logic there.

Scope is **narrower** than `design.md` anticipated ("perlu dicek apakah duplikasi logic atau satu
fungsi dipakai bersama" — it's one shared function). Fixing `parseSections()` alone fixes both
call sites. This was reported to the user as the Task 2 checkpoint before starting Task 3.

## Fix Applied (Task 3)

`src/utils/agent-sections.js`, `parseSections()`:

```diff
 export function parseSections(content) {
   const lines = content.split(/\r?\n/);
   const sections = [];
   let current = null;
+  let inFencedBlock = false;
   lines.forEach((line, idx) => {
+    // A `## ...` line inside a fenced code block (e.g. the report skeleton embedded in
+    // caf-auditor.md's "Report Format" section) is example content, not a real section
+    // boundary — see CAF-SECTIONPARSE-01.
+    if (/^```/.test(line)) {
+      inFencedBlock = !inFencedBlock;
+      return;
+    }
+    if (inFencedBlock) return;
     const m = line.match(/^##\s+(.*)$/);
     if (m) {
       if (current) current.endLine = idx;
       current = { header: m[1].trim(), startLine: idx };
       sections.push(current);
     }
   });
   if (current) current.endLine = lines.length;
   return { lines, sections };
 }
```

Adds fenced-code-block state tracking exactly per `design.md`'s pseudocode. No other file
touched for the fix — both `replaceSectionBody` and `extractSection`/`hashSection` consume this
one function's output, so the single change fixes both.

After the fix, `test/section-boundary-fenced-code.test.js` — all 4 tests PASS (plus a 5th
integration test added for Task 5, see below).

## Task 4 — Regression Test (Full Suite)

```
node --test test/*.test.js
```

Result: **38 / 38 PASS, 0 FAIL, 0 cancelled.**

- 33 pre-existing tests (across `agents-sync-drift.test.js`, `audit-agent-sections.test.js`,
  `curate-baseline.test.js`, `generate-manifest.test.js`, `section-diff.test.js`) — all pass
  unchanged. No regression in section-parsing behavior for the majority case (sections without
  embedded fake headings).
- 5 new tests in `test/section-boundary-fenced-code.test.js` (4 from Task 1 reproduction + 1
  integration test added for Task 5) — all pass.

No old test went from PASS to FAIL. No investigation-and-STOP triggered.

## Task 5 — Integration Test (End-to-End)

Added `integration: curate sync on a full caf-auditor.md file fixes DRIFT in Report Format with
no duplication elsewhere` in `test/section-boundary-fenced-code.test.js`. Builds a full
`caf-auditor.md` fixture (via `buildAgentMd({ kind: 'auditor', ... })`), sets the manifest
baseline so `Report Format` reads as `DRIFT` and everything else as `IN_SYNC`, runs
`agentsSync()` for real, and asserts:

- `## Report Format` appears exactly once in the synced output and its body matches the current
  template exactly.
- No trace of the old (stale) Report Format content remains anywhere in the file.
- The neighboring `## What to Look For` section (untouched, `IN_SYNC`) is byte-for-byte identical
  before and after sync.
- The full section list/order in the synced file is unchanged from the original.

## Task 6 — Documentation

Added a note to `CLAUDE.md` under "Content-level section tracking" documenting that
`parseSections` is now fence-aware and that any new template section embedding example `##`
headings must wrap them in a fenced code block.

## Scope Confirmation

- Files changed: `src/utils/agent-sections.js` (fix), `test/section-boundary-fenced-code.test.js`
  (new), `CLAUDE.md` (doc note).
- **No changes made to `coderium-web-v2` or `umkm-pos`** in this session — this ticket is scoped
  entirely to `caf-initiator`. Retrying `curate sync` in those two repos is explicit out-of-scope
  per the ticket, to be done as a separate session after this fix is confirmed `SUCCESS`.
- `--yes`/non-interactive UX for `curate sync` — not touched, per explicit out-of-scope note.

## Definition of Done — Checklist

- [x] Bug reproduced via test SEBELUM fix (FAIL), PASS SESUDAH fix
- [x] All affected functions fixed (single shared `parseSections`, confirmed not more than 2 in
      Task 2, actually just 1)
- [x] 33 old + 5 new = 38 tests, 100% pass
- [x] No changes to `coderium-web-v2`/`umkm-pos`
