# Verify Report — CAF-SDD-03f

Status: SUCCESS

Branch `ai-agent/CAF-SDD-03f` (from main at 64a6a8d). Local commits only, nothing pushed. `.ai/` is gitignored, so this file and the spec are not in the commits.

## Checklist
- [x] `npm test` — 720 tests, 719 pass, 0 fail, 1 `todo` (the `caf-foo.md` fallback test at `test/kind-guard.test.js:118`, still there)
- [x] `git diff --stat main -- test/fixtures/frozen-kinds/` — empty
- [x] spec hashes: both files matched the expected sha256 after one newline was appended to each (the pasted copies lacked the final newline)
- [ ] lint / typecheck / build — none configured in `package.json`

## Acceptance Criteria
| AC | Evidence | Where |
|----|----------|-------|
| AC-1 | automated-test | `test/sdd03f-stale-text.test.js` — "AC-1: <fixture> — the Parser Contract names the `Verdict:` values of the rendered reviewer" (reads the values from the rendered `caf-reviewer.md`, both fixtures) |
| AC-2 | automated-test | same file — "AC-2: a role that is not scaffolded is one flat line…" and "AC-2: a role that is present is still a checked line" |
| AC-3 | automated-test | same file — "AC-3: the verify retry inside one agent (up to 3x) and the orchestrator gate (default 1) are stated apart" |
| AC-4 | automated-test | same file — "AC-4: the description names Documentation only when the pipeline renders that stage" (4 cases: two fixtures × with/without) |
| AC-5 | automated-test | same file — "AC-5: <fixture> — `curate --audit-only` on a freshly scaffolded repo has no caf-feature-catalog-sync entry" |
| AC-6 | automated-test | same file — "AC-6: <fixture> — a repo that has caf-feature-catalog-sync.md is audited as before…"; also the unchanged recorded report `test/fixtures/pre-sdd03c1/curate-old-repo.*.json` (old repo has the file) |
| AC-7 | command | `git grep -n -i "all four" -- src test` → 3 lines left, none about evidence kinds (below). Also automated in "AC-7: no comment in src or test counts the evidence kinds as four" |
| AC-8 | automated-test | same file — "AC-8: planner on <fixture> — …" (2 tests × 2 fixtures) |
| AC-9 | automated-test | same file — "AC-9: planner on <fixture> — outside `## Output` the file is the pre-ticket golden, and `caf-spec` keeps its hash" (golden `test/fixtures/pre-sdd03f/planner.*.json`; `sha256(buildSpecSkill())` = `b8ba383c…98d0`) |
| AC-10 | automated-test | same file — "AC-10: <fixture> — sync of the pre-ticket planner writes `## Output`…" and "…a planner whose Output the user customized is not overwritten" (CONFLICT, file byte-identical) |
| AC-11 | automated-test | same file — "AC-11: piv-workflow.md is the pre-ticket golden with only the edits of AC-1 to AC-3 applied, for every roster" (4 rosters), "…keep their text", "AC-11: /caf-run-pipeline with Documentation is the golden byte for byte; without it only the description changed" |
| AC-12 | manual | README.md: line ~176 table now `Planner, Frontend, Backend, Validator`; planner bullet (~204) says it stops with `Status: NEEDS_HUMAN`, the first line of the same `verify-report.md` that holds `## Proposed Spec Changes`; new section "The agents and commands the design ends with" lists the five agents and five commands with `architect`, `qa`, `implementer`, `run-pipeline`, `plan-ticket` as transitional. Read after editing; also fixed two sentences that the audit change made wrong ("curate still reports the missing command file", "lists the role as not present") |
| AC-13 | manual | CLAUDE.md: new section "The final roster, and stale text aligned (CAF-SDD-03f)" (same lists; planner exception, audit gap removal, Verdict token, roles not scaffolded, two retries, snapshot); two older sentences about the audit gap updated |
| AC-14 | manual | CAF.md "What CAF Is": "CAF follows Spec-Driven Development" (spec-first heading toward spec-anchored, not spec-as-source) and "The Validator" paragraph |
| AC-15 | manual | CAF.md Layer 3: `verify-report.md` example is a copy of the skeleton in `src/templates/agent-handoff-md.js` (plain `Status:` line, five evidence forms, `## Proposed Spec Changes`); `validate-report.md` is copied from `buildValidateReportFormat()`; folder listing gained `validate-report.md`. Compared against the render, line by line |
| AC-16 | manual | CAF.md: PIV block says "up to 3x, inside this one agent" followed by "Two retries, not one" (verify retry up to 3x vs gate retry default 1, `agents.qa.maxRetries`/`agents.reviewer.maxRetries`); pipeline line says "verify retry up to 3x"; Layer 5 says Fastify + BullMQ; Technology Reference table says Fastify and BullMQ |
| AC-17 | manual | `git diff main -- test/fixtures/snapshots/mono-pnpm.json`: exactly 3 entries changed — `.claude/agents/caf-planner.md`, `.caf/workflows/piv-workflow.md`, `.claude/commands/caf-run-pipeline.md`. Same as T1 predicted; stack, file list and every other entry identical |
| AC-18 | command | `npm test` → exit 0 (720 tests, 0 fail); `git diff --stat main -- test/fixtures/frozen-kinds/` → empty; `todo` test at `test/kind-guard.test.js:118` still present |

## T1 findings (A2–A5)
- **A2 holds.** `piv-workflow.md` ← `buildPivWorkflowMd` (`src/templates/piv-workflow-md.js`); also read by `src/utils/canonical-sections.js` (headers only; no header changed) and written by `src/commands/workflow.js`. `/caf-run-pipeline` ← `buildRunPipelineMd` (`src/templates/run-pipeline-command.js`). Locked by: `test/fixtures/snapshots/mono-pnpm.json` (both files + `caf-planner.md`), and `test/fixtures/pre-sdd03b3/commands.*.json` holds the command only as a golden that the 03b3 test compares through the builder, so it did not need a change. No golden carried the literal description text in a way that failed.
- **A3 holds.** The reviewer template writes `Verdict: APPROVE | CHANGES REQUESTED | DEFER` (with spaces, `src/templates/agent-md.js` `buildReviewerReportFormat`). The orchestrator's parsers, copied in `test/reviewer-report-format.test.js`, accept `CHANGES REQUESTED` (`/CHANGES REQUESTED/i`), `/\bAPPROVE\b/i`, `/\bDEFER\b/i`, and the strict form is an exact match after stripping emphasis. `READY_FOR_HUMAN_REVIEW`/`NEEDS_CHANGES` appeared only in `piv-workflow-md.js` and the snapshot.
- **A4 holds.** CAF.md is a static document; nothing renders it and no test reads it. Layer 3 is "Layer 3 — Artifact Handoff"; retry text is in "Working Pattern: PIV" and "Full Pipeline"; the orchestrator is in "Layer 5" and "Technology Reference". SDD went into "What CAF Is".
- **A5 holds in substance, differs in form.** The optional entry is not in a list: `OPTIONAL_DOCS` in `src/commands/audit.js` holds the five reference docs, and the `caf-feature-catalog-sync.md` entry was a separate inline block right after it. A file that exists was never audited beyond `exists()`: no entry, no content check. So "stays audited as before" means "no entry, as before"; removing the block is the whole change. I judged this not to contradict an AC and went on; see Proposed Spec Changes.
- **"max 3x" locations:** `piv-workflow-md.js` (2, changed), `run-pipeline-command.js:378`, `agents-md.js:16`, `CAF.md` (2, changed), and `## Retry Logic` of agents via goldens. The command, AGENTS.md and agent `## Retry Logic` are out of scope (AC-11 / constraint) and unchanged.
- **"all four" locations:** `agent-md.js` (2 comments about evidence kinds — fixed to "all five"); left: `agents.js:764` (four companion commands of auditor/PM), `ticket-preview-commands.js:30` (four preview commands), `test/skills-scaffold.test.js:104` (four scripts). None is about evidence kinds.
- No golden of `frozen-kinds` holds text that changed (planner is not frozen), so no stop condition applied.

## Old tests changed
1. `test/sdd02e-planner-read.test.js` — "AC-11: planner on <fixture> — inside `## Output` only the rules of this ticket are new…" (×2 fixtures). It locked the full set of lines new since `pre-sdd02e`; the planner now has one more rule. Added `SDD03F_EXCEPTION` and filter it out of the new-lines comparison and the "every other line is where it was" comparison, so the 02e text is still held line for line.
2. `test/sdd03e-validator-commands.test.js` — "AC-13: <fixture> — curate sync writes the new text of the changed sections only…" (×2). It put the 03e-era planner in the repo and asserted the planner was not touched. Now the planner's `Output` drifts too: `expectedDrift` includes `caf-planner.md#Output`, and the planner is asserted equal to a fresh render.
3. `test/fixtures/snapshots/mono-pnpm.json` regenerated (not a test edit): 3 entries, listed above (AC-17).
4. New: `test/sdd03f-stale-text.test.js` (24 tests); new goldens `test/fixtures/pre-sdd03f/` (planner ×2 fixtures, `piv-workflow.json` 4 rosters, `run-pipeline.json` 4 cases), recorded before `src/` was touched (commit d153148).

Searched all of `test/` for the changed text (`READY_FOR_HUMAN_REVIEW`, `NEEDS_CHANGES`, `NOT present`, `max 3x`, the description string, `feature-catalog-sync`, the placement rule). Other tests that touch these files compare through the builders or the snapshot, and passed unchanged.

## Commits (local)
- d153148 golden pre-sdd03f
- f7416de failing tests
- 74c6dbd src changes (piv-workflow, run-pipeline description, audit, planner Output, "all five" comments) + the two old-test updates
- 80261a6 snapshot
- d0e799e README.md + CLAUDE.md
- 5b8540f CAF.md

## Proposed Spec Changes
- A5 says the optional entry is "defined in one list in `audit.js`". It is a separate inline block next to the `OPTIONAL_DOCS` list. No AC is affected. Reword if the spec is reused.
- AC-7 expects an empty `git grep`; three lines remain with other meanings (listed above). The AC already allows this when each is noted.
- AC-12 asks that the planner `NEEDS_HUMAN` sentence name the file. README line ~204 already named `verify-report.md` for the proposal; the sentence was tightened to say the status line is in that same file.

## Notes
- Not touched: 03c2/03c3 references (`.caf/discovery/`, `/caf-review-ticket`, PM text in INDEX.md), skill contents, `tools:`, `## Skills`, `## Retry Logic`, the orchestrator, `test/fixtures/frozen-kinds/`.
- Rollout: the planner `Output` reaches existing repos through `curate sync` as an ordinary `DRIFT`; `piv-workflow.md` and `/caf-run-pipeline` are written once and have no sync, so an existing repo keeps its old text until the file is deleted and scaffolded again.
