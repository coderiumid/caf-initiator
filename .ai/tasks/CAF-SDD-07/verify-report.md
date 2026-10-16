Status: SUCCESS

# Verify report — CAF-SDD-07

| AC | Status | Evidence kind | Evidence |
|----|--------|---------------|----------|
| AC-1 | PASS | automated-test | `test/sdd07-agent-clarity.test.js` — Coverage lines directly after the `tasks.md` bullet for frontend/backend (mono-pnpm) and implementer/frontend/backend (single-nuxt); `implementation` and every other kind's `Output` compared with `pre-sdd03d/output-by-kind.json`. |
| AC-2 | PASS | automated-test | same file — five reviewer lines verbatim, old two absent, `\bAPPROVE\b`/`CHANGES REQUESTED`/`\bDEFER\b` absent from the reviewer `Output` (both fixtures). |
| AC-3 | PASS | automated-test | same file — four step-2 lines verbatim, gap bullet follows unchanged; `Verify Checklist` equal to `pre-sdd07` (both fixtures). |
| AC-4 | PASS | automated-test | same file — two pipe lines after the "claims" line; no `\|` escape in the text. |
| AC-5 | PASS | automated-test | same file — headings equal to golden for all 9 renders, no `TODO` in changed lines, `check-drafts` findings and `TODO` count equal to golden. |
| AC-6 | PASS | automated-test | same file — new text removed and old put back equals `pre-sdd07` byte for byte (9 renders); `frozen-kinds` and the other kind tests pass through `since-07`. |
| AC-7 | PASS | automated-test | same file — `curate sync` on golden-generated frontend/backend/reviewer/validator (baseline recorded), both fixtures: `Output` is `DRIFT`, file equals fresh render and differs from golden only inside `## Output`; hand-edited `Output` is `CONFLICT`, file unchanged byte for byte. |
| AC-8 | PASS | command | `npm test` → exit 0, 985 tests, 985 pass, 0 fail. `pre-sdd07` untouched since its commit (`git diff 1c48501 HEAD -- test/fixtures` shows only `snapshots/mono-pnpm.json`); no older golden edited. |
| AC-9 | UNVERIFIED | manual | Section "Agent text clarified (CAF-SDD-07)" added to `CLAUDE.md`, after 06; it covers the four changes and locations, `curate sync` DRIFT rollout, reviewer text without verdict values (Retry Logic / Report Format), backticks only, goldens unedited and read through `since-07` (incl. `frozen-kinds/implementer.single-nuxt.json`), and `pre-sdd07/` never regenerated. Needs a human read. |

### Notes
- Commits (local only, nothing pushed): ticket files (dddb1e8) → `pre-sdd07` golden + `record-sdd07.mjs` (1c48501, before any `src/` change) → `src/` change → test updates + snapshot → new test → `CLAUDE.md` → this report.
- **A-1 verified** in `../caf-orchestrator/src`: `CHANGES_REQUESTED` drives the retry/fix loop (`run-agent-pipeline.use-case.ts:1190,1202`); `DEFER` maps to a PR `COMMENT` (`run-pr-review.use-case.ts:28`) and enters no retry loop. `REVIEWER_RETRY_LOGIC` already says a blocked review uses DEFER. No conflict.
- **A-2 deviation:** `ac-summary.ts` (`splitRow`) keeps a `|` inside a backtick pair in one cell **and also** accepts the `\|` escape. The ticket assumed no escape support. As the ticket instructs, the text states the backtick rule only.
- **A-3, A-4 held.** `frozen-kinds.test.js` compares the golden file directly, so the transformation was added in the test (`sinceSdd07` on each golden section), not in the golden.
- **Old tests changed (goldens untouched), and why:**
  - `frozen-kinds.test.js` — golden `sections` read through `sinceSdd07` (implementer golden holds the old `Output`).
  - `sdd03b1-validator.test.js` — regex "Run every command of the Verify Checklist" → "Run the commands of the Verify Checklist" (step 2 rewritten).
  - `sdd03c2-validator-default.test.js` — reviewer golden read through `sinceSdd07` (`goldenReviewer`).
  - `sdd03c2b`, `sdd03c3`, `sdd03g` — recorded file sets wrapped in `sinceSdd07Files`.
  - `sdd03c2d-skill-rename.test.js` — agents golden `content` through `sinceSdd07` before the rename.
  - `sdd03d-implementation-spec.test.js` — `reviewer` added to `CHANGED_LATER` (its `Output` now differs from the pre-03d one).
  - `sdd03e-validator-commands.test.js` — validator/reviewer/planner goldens read through `sinceSdd07` (`readOld`).
- **`mono-pnpm.json`:** four entries changed, exactly `caf-frontend.md`, `caf-backend.md`, `caf-validator.md`, `caf-reviewer.md` (checked by a diff of old vs. new snapshot before writing). Not a precedent.
- **Not verifiable by tests:** whether a real reviewer picks the right verdict, whether a real validator stops splitting cells and runs only the named apps' checklist. Only the text is held.
- Proposed Spec Changes: none.
