# Verify Report — CAF-SDD-03c2
Ticket: CAF-SDD-03c2
Agent: claude (implementation, local commits only)
Status: SUCCESS

Branch `ai-agent/CAF-SDD-03c2`, from `main` at `78433d9` (03f merged). Nine local commits, nothing pushed, no PR, no merge.
`requirements.md` and `tasks.md` were not edited (sha256 matched after one trailing newline: `47b188cb…428bb`, `56e6808d…c9bd2`).
`.ai/` is git-ignored in this repo, so these three files are not in any commit.

## Acceptance Criteria

| AC | Kind | Evidence |
|----|------|----------|
| AC-1 | automated-test | `test/sdd03c2-validator-default.test.js`: "AC-1/AC-2: mono-pnpm — the default scaffold has caf-validator in place of caf-qa and gains caf-plan, nothing else" (offered kinds, agents, commands, every written path, `.caf` dirs, against `test/fixtures/pre-sdd03c2/file-set.mono-pnpm.json`); "AC-1: the roster named by the ticket, per stack". Observed: pass. |
| AC-2 | automated-test | Same file, "AC-1/AC-2: single-nuxt — …" and the roster test (planner, architect, implementer, validator, reviewer + `caf-plan.md`). Observed: pass. |
| AC-3 | automated-test | "AC-3: a generated caf-qa.md is left byte-for-byte…", "AC-3: a customized caf-qa.md…" (caf-qa.md identical, caf-validator.md written, exactly one note naming caf-orchestrator and caf-validator), "AC-3: no caf-qa.md in the repo → the note is not printed". Observed: pass. |
| AC-4 | automated-test | "AC-4: validator and /caf-plan are not hidden; the five hidden kinds still are" (`HIDDEN_CANDIDATE_KINDS` is exactly the five; `isOfferedCandidate`; `HIDDEN_COMMAND_FILES` has no `caf-plan.md`). Also `sdd03c1-stop-scaffold` "AC-5: HIDDEN_CANDIDATE_KINDS holds exactly the five dropped kinds". Observed: pass. |
| AC-5 | automated-test | "AC-5: <fixture> — /caf-plan-ticket is byte-identical, /caf-complete-drafts too but for the agent file it lists" and "AC-5: <fixture> — /caf-review and /caf-fix-review differ only at the /caf-review-ticket reference" (changed lines held the reference, new lines do not, ≤3 lines). Observed: pass. **Deviation:** `/caf-complete-drafts` is not byte-identical, see Proposed Spec Changes P-1. |
| AC-6 | automated-test | "AC-6: <5 inputs> — roster with validator: the gate is caf-validator and validate-report.md, nothing of caf-qa" (×5); "AC-6: <5 inputs> — roster with qa: the golden plus the spec status section only" (×5; section removed by structure, rest equals `pre-sdd03c2/run-pipeline.json`); "AC-6: a scaffold with the default roster writes /caf-run-pipeline with the validator gate". Observed: pass. |
| AC-7 | automated-test | "AC-7: /caf-run-pipeline states the spec status rules, for both gates" (reads `requirements.md` before the implementation agent; `Status: NEEDS_CLARIFICATION` / `BLOCKING` without `Answer:` → STOP, `Status: NEEDS_HUMAN`; `DRAFT`/`APPROVED` go on; never writes `requirements.md`/`tasks.md`; proposals from `verify-report.md`, the gate report and `review-notes.md` shown, not applied; no TODO word). Observed: pass. |
| AC-8 | automated-test | "AC-8: /caf-plan stops for NEEDS_CLARIFICATION and NEEDS_HUMAN, and reports APPROVED as ready". Observed: pass. |
| AC-9 | automated-test | "AC-9: <fixture> — reviewer Input names validate-report.md and qa-report.md; the rest is the golden" (×2; every other section equal to `pre-sdd03c2/reviewer.*.json`; the `from the implementation agent` phrase kept). Observed: pass. |
| AC-10 | automated-test | "AC-10: <fixture> — pre-ticket planner and reviewer: curate sync writes only their Input" (×2, byte comparison of the tree; only the two agent files, their `## Input`, plus the manifest and sync-state bookkeeping), "AC-10: <fixture> — a customized Input is not overwritten" (×2). Observed: pass. |
| AC-11 | automated-test, command | Test: "AC-11: <fixture> — planner Input has no .caf/discovery/ and no /caf-discovery-start; the rest is the golden" (×2), "AC-11: <fixture> — INDEX.md does not name the PM Agent, the review commands not /caf-review-ticket" (×2). Observed: pass. Command `git grep -n -E "caf-discovery-start\|caf-review-ticket\|PM Agent" -- src` → **not empty (35 lines)**; every line is listed with its reason below, as the AC allows. |
| AC-12 | automated-test | "AC-12: <fixture> — agents, commands, skills, workflow, then curate --audit-only: nothing for validator, planner, reviewer or /caf-plan" (×2): no `warn`/`gap` entry as scaffolded; after `curate baseline` every entry for them is `ok`; no rollout warning. Observed: pass. |
| AC-13 | manual | Read the diff of `test/fixtures/snapshots/mono-pnpm.json` (6 insertions, 6 deletions, 7 entries) and matched it with the T1 list: see "Snapshot entries". There is no single-nuxt snapshot. Observed: the 7 entries are exactly the 7 predicted; `stack` is equal. |
| AC-14 | manual | Read `README.md` (sections "The default roster: validator and /caf-plan", "The agents and commands the design ends with", "The validator kind", the `/caf-plan` paragraph) and `CLAUDE.md` (last section, plus the amended hidden/stale sentences). Observed: all four statements are present — default roster has `caf-validator` and `/caf-plan`; `qa`, `plan-ticket`, `run-pipeline`, `architect`, `implementer` transitional; reviewer/planner `## Input` via `curate sync`, commands and `piv-workflow.md` via delete + scaffold again; adding `caf-validator.md` to a repo with `caf-qa.md` switches the orchestrator gate. |
| AC-15 | command | `npm test` → exit 0; `tests 756 / pass 755 / fail 0 / todo 1`. `git diff --stat -- test/fixtures/frozen-kinds/` → empty (also `git diff --stat main -- …` empty). The `todo` test remains: `test/kind-guard.test.js:118` `{ todo: 'fallback berbahaya; putuskan sebelum rilis penghapusan penuh (Q-1)' }`. Note: the directory holds 15 goldens, not 14 (P-3). |

## T1 — audit results (done before any change to `src/`)

- **A1 (hiding mechanism) — right in substance, wrong in shape.** There was no single mechanism separate from `HIDDEN_CANDIDATE_KINDS`: `validator` was hidden by *not being an entry of `buildCandidates()`* (`buildValidatorAgent` in `src/commands/agents.js`, reached only from tests), and `/caf-plan` by *nothing under `src/` importing `plan-command.js`* (a test walked `src/` for that). No AC changed.
- **A2 (roster) — partly wrong in shape.** The roster is not one list: MONOREPO comes from `buildCandidates()`, SINGLE_REPO from `buildSingleRepoCandidates()` (inserts the implementer before the `qa` entry). It is still one place to change. But `qa` could not simply be replaced: `test/helpers/frozen-kinds.js` renders *every* `buildCandidates()` entry and 2 of the 15 `frozen-kinds` goldens are `qa`. Removing `qa` from `buildCandidates()` would have broken them, so `qa` stays a candidate and is filtered by a new `SUPERSEDED_CANDIDATE_KINDS` (not `HIDDEN_CANDIDATE_KINDS`, which a 03c1 test pins to exactly five). The goldens are untouched. Tests and fixtures that lock `qa`/the hidden validator in the roster, all updated (listed below): `sdd03c1-stop-scaffold`, `sdd03b1-validator`, `sdd03e-validator-commands`, `sdd03b3-commands`, `sdd02-planner-spec`, `sdd02c-spec-active`, helpers `default-file-set`, `commands-render`, `mono-snapshot`, `old-repo`, and the snapshot. `test/fixtures/pre-sdd03c1/` and `frozen-kinds/` stayed as recorded. Nothing locked `qa` in the roster outside what T1 found, so no STOP.
- **A3 (`/caf-run-pipeline`) — wrong in shape.** It was not rendered from the roster at all: the QA gate (`caf-qa`, `qa-report.md`, `qaRetryCount`) was hard-coded in `src/templates/run-pipeline-command.js` stage 5, the PR body and the summary table. Only `hasDocumentation`/`hasArchitect` followed the roster. A `gate` option was added (default `qa` = old text).
- **A4 — right.** `buildInputSection(kind, appNames)` in `src/templates/agent-md.js`; `Input` is in `SYNCABLE_SECTIONS`; reviewer's app list is read back by `parseInputAppNames` from the phrase `from the implementation agent` (kept).
- **A5 — partly right.** `/caf-plan` step 5 already stopped on `Status: NEEDS_CLARIFICATION` with questions, but did not mention `NEEDS_HUMAN` and did not report `APPROVED` as ready. Text added (`stopSection`), tests added.
- **A6 — right.** `writeIfAbsent`/`writeIfAbsentGuarded` never overwrite; with `qa` no longer offered, `caf-qa.md` is not even a target. The note is new (printed when `caf-validator.md` was written and `caf-qa.md` exists).
- **A7 — wrong in shape.** `review-notes.md` has no `## Proposed Spec Changes`. The reviewer's `## Output` reads that part of `verify-report.md` and copies each entry under `### For Developer` of `review-notes.md` (`REVIEWER_SPEC_WORKFLOW`); the validator proposes with a `Proposed Spec Changes:` line under `### Notes` of `validate-report.md`. The command text names the real sources. No AC changed (AC-7 says "usulan … dari `verify-report.md`, laporan gate, dan `review-notes.md`").
- **Not in the assumptions, found in T1 (derived output, no AC changed):** `/caf-complete-drafts` lists the agent files that exist (P-1); `readAgentRoster` (`src/utils/read-agent-roster.js`) had no `caf-validator`, so `piv-workflow.md` would have said "QA — NOT present … TODO: confirm" and `agent-handoff.md` would have listed `caf-validator.md` as a custom agent (P-2); the planner's `## Constraints` points at the Input fallback that AC-11 removes (P-4).
- **Occurrences of the stale references:** see "git grep lines left". Test files that mention them: `test/discovery-sections.test.js` (pm/ux-designer builders, unchanged), `sdd02-planner-spec`, `sdd02d`, `sdd03b3`, `sdd03c1` (all handled below).

## Old tests changed, and why

| Test file | Change | Reason |
|---|---|---|
| `sdd03b1-validator.test.js` | "validator is not a scaffold candidate" ×4+1 reversed: candidate in every mode and offered; MONOREPO render has `caf-validator.md` and no `caf-qa.md`; `scaffold agents` writes `caf-validator.md` equal to `buildValidatorAgent` and no `caf-qa.md`; picker filter → `isOfferedCandidate`; header comment. | They locked the hidden validator, which is what this ticket reverses. |
| `sdd03e-validator-commands.test.js` | "AC-12 validator stays hidden" ×3 reversed the same way; AC-10 Working Pattern test skips the validator (new in `rendered`, no entry in the pre-03e record); golden planner/reviewer get the live Input (`withLiveInput`). | Same; the Working Pattern test iterates every candidate; the ticket changed `## Input` of those two agents. |
| `sdd03c1-stop-scaffold.test.js` | Expected values = pre-03c1 golden minus the dropped, **through `since03c2`** (qa→validator, + `caf-plan.md`); "validator stays hidden" and "/caf-plan stays hidden" assertions reversed; `KEPT_COMMAND_FILES` gains `caf-plan.md`; `qa` removed from "stays offered" (it is not offered now), validator/qa candidate checks. | They pin the default scaffold of 03c1, which 03c2 changes on purpose. The goldens of `pre-sdd03c1/` are not touched. |
| `sdd03b3-commands.test.js` | `WRITTEN_FILES` + `caf-plan.md`; "/caf-plan hidden" ×4 → written and equal to `buildPlanMd`; "no command imports the builder" → only `commands/agents.js`; `SINCE_03C1` for `/caf-complete-drafts` (qa→validator line) and `/caf-run-pipeline` (builder render, gate `validator`); review commands: the opening paragraph may differ at the `/caf-review-ticket` sentence (replacement strings written out). | Hidden → written; derived output; AC-5 text change. |
| `sdd03f-stale-text.test.js` | `renderPipeline` strips the spec status section; golden planner gets live Input. | `/caf-run-pipeline` gained a section; planner Input changed. |
| `sdd02-planner-spec.test.js` | Kinds loop excludes the validator; the five literals of the removed Input fallback dropped from the "still says" list (`.caf/discovery/{TICKET-ID}/prd.md`, `requirements.md as usual, with the Status: line…`, `directly with Status: NEEDS_HUMAN`, `and still create tasks.md`, `## Open Questions`), each checked absent from the live planner; the rest of the list kept and still passes. | The validator is a candidate; the fallback flow is removed (AC-11). |
| `sdd02c-spec-active.test.js` | `validator` added to the `tools:` table. | The validator is now rendered by `renderAgents`. |
| `sdd02d-planner-audit.test.js` | Three Input tests: the 02d `## Input` lines are asserted to exist in the 02d render and be gone live; live Input = 02d Input minus the fallback flow (`dropFallback`); heading list minus the fallback heading; statuses named taken from `## Output` only. | The three lines 02d changed were inside the removed flow. |
| `sdd02e-planner-read.test.js` | `OLD_PLANNER` = pre-02e golden with the live Input. | Ticket is about `## Output`; Input changed afterwards. |
| `sdd03b2-reviewer-spec.test.js` | `OLD_REVIEWER` = golden with the live Input. | Same, for the reviewer. |
| `false-drift.test.js` | Legacy-manifest test: `DRIFT: 3`, drifted list `Input`, `Output`, `Working Pattern (PIV)` of the reviewer. | The reviewer's `## Input` is a real DRIFT against the legacy manifest now. The fixture `legacy-manifest/` is untouched. |
| Helpers `default-file-set`, `commands-render`, `mono-snapshot` | Picker filter → `isOfferedCandidate`; `mono-snapshot` renders the validator through `buildValidatorAgent` and passes `gate`. | They mimic the picker / what a scaffold writes. |
| Helper `old-repo.js` | Leaves out the validator. | "A repo scaffolded before 03c1" never had it; the recorded `curate-old-repo.*.json` is compared unchanged. |
| New `helpers/swap-input.js` | `withLiveInput`. | Used by the tests above. |

Searched for `caf-qa`, `qa-report`, `plan-ticket`, `discovery`, `PM Agent`, `INDEX.md` across all test files before editing; tests that matched but needed no change: `qa-report-format`, `reviewer-report-format`, `retry-logic-role-aware`, `kind-guard`, `skills-*`, `complete-drafts`, `single-repo-scaffold`, `discovery-sections` (they build `qa`/discovery kinds directly, which are unchanged).

## Snapshot entries changed (`test/fixtures/snapshots/mono-pnpm.json`, regenerated once, at T9)

Predicted in T1, confirmed by `git diff`: removed `.claude/agents/caf-qa.md`; added `.claude/agents/caf-validator.md`; changed `.claude/agents/caf-planner.md` (Input), `.claude/agents/caf-reviewer.md` (Input), `.claude/commands/caf-run-pipeline.md` (validator gate + spec section), `.caf/workflows/piv-workflow.md` and `.caf/workflows/agent-handoff.md` (roster). Unchanged: `CLAUDE.md`, `AGENTS.md`, `.caf/tasks/README.md`, `task-completion.md`, `caf-architect.md`, `caf-frontend.md`, `caf-backend.md`, and `stack`. No unexpected entry. No `caf-plan.md` entry (the snapshot renders no command but `/caf-run-pipeline`). There is no single-nuxt snapshot.

## git grep lines left (`git grep -n -E "caf-discovery-start|caf-review-ticket|PM Agent" -- src`, 35 lines)

None is in a planner `## Input`, in `caf-review.md`/`caf-fix-review.md` output, or in `INDEX.md`.
- `src/commands/agents.js:68, 75` — `HIDDEN_COMMAND_FILES` entries: the names of commands that are deliberately not written. They must stay.
- `agents.js:89` — `PREVIEW_COMMANDS` entry for `caf-review-ticket.md`; it is skipped by `isHiddenCommand`. Builders stay until the full-removal ticket (03c1 rule).
- `agents.js:505, 517` — message when UX Designer is picked without PM; both kinds are hidden, the branch is dead for the picker and kept with the kind.
- `agents.js:828, 831` — companion-command group of the PM kind; filtered by `HIDDEN_COMMAND_FILES`.
- `src/templates/agent-md.js:112` — `buildInputSection` for `pm`/`ux-designer`: their own tracked `## Input` (frozen-kinds goldens `pm.*`, `ux-designer.*`).
- `src/templates/discovery-commands.js:1, 42, 47, 51, 60, 70, 116, 118, 123, 130, 132, 151, 226, 281, 305, 306, 311, 321, 355, 366, 371` — the builders and agent text of the PM/UX Designer kinds and `/caf-discovery-start`. Hidden but not removed; their output is held byte for byte by `frozen-kinds` and `pre-sdd03b3`.
- `src/templates/discovery-to-ticket.js:6, 187, 188, 208` — the `/caf-discovery-to-ticket` builder (hidden command, held by `pre-sdd03b3`).
- `src/templates/run-pipeline-command.js:5`, `ticket-preview-commands.js:3` — code comments comparing patterns; not generated text.

Not matched by the pattern but still in generated text, left on purpose: the `.gitignore` lines for `.caf/discovery/` and `.caf/audits/` (Out of Scope), `.caf/discovery/` in `.caf/knowledge/INDEX.md` (AC-11 asks only for "PM Agent"), and the planner `## Constraints` pointer (P-4).

## Things that were not obvious

- `curate --audit-only` on a repo that was only scaffolded (no `curate baseline`) reports every section of every agent as `declined`/UNTRACKED, the planner's and the validator's alike — not new. The AC-12 test therefore checks "no warning, no gap" as scaffolded and "all `ok`" after `curate baseline`.
- `VALIDATOR_SCOPE` still contains the `TODO: code/artifact area…` string. It is the existing scope string of `buildValidatorAgent`, moved into a constant so the candidate and the builder share it; no new TODO text was written.
- The validator branch of `/caf-run-pipeline` treats `Status: NEEDS_HUMAN` of the validate report as a stop that does not use the retry budget (nothing to fix in the code), and `UNVERIFIED` rows as non-failing with the `Unverified:` line carried to the Final Summary. Both follow `buildValidateReportFormat`; the spec did not say, so this is my reading (P-5).

## Proposed Spec Changes

- **P-1 (AC-5).** `/caf-complete-drafts` cannot be byte-identical to the golden: it lists the agent files that exist (`listDraftFiles`), and AC-1 swaps `caf-qa.md` for `caf-validator.md`. Its template is unchanged; one line differs (`- .claude/agents/caf-qa.md` → `- .claude/agents/caf-validator.md`, sorted). Proposed wording for AC-5: "identik byte-for-byte … kecuali satu baris daftar agent yang mengikuti roster". Same class as the 03c1 note "`/caf-complete-drafts` lists fewer agent files".
- **P-2 (Scope).** Add `src/utils/read-agent-roster.js` (and the derived `piv-workflow.md`/`agent-handoff.md` text) to the list of things that may change. Without it a new repo's `piv-workflow.md` reads "QA — NOT present … (TODO: confirm)" and `agent-handoff.md` lists `caf-validator.md` as a custom agent. The change is small: `caf-validator` is a known role, listed only when its file exists, and the QA line is dropped only when `caf-validator.md` exists and `caf-qa.md` does not; a repo with `caf-qa.md` only reads exactly as before. AC-14 already assumes `piv-workflow.md` is regenerated.
- **P-3 (AC-15).** "14 golden `frozen-kinds`" — the directory holds 15 files (7 kinds × 2 fixtures + `implementer.single-nuxt`; `test/helpers/frozen-kinds.js` `FROZEN` has 15). None changed.
- **P-4 (Out of Scope / 03c2b).** Removing the Discovery fallback from the planner's `## Input` (AC-11) leaves the planner's `## Constraints` saying "see Fallback — Discovery draft in the Input section". `## Constraints` is out of scope here, so it was not touched; the pointer now dangles. The Constraints ticket (03c2b) should drop it. Recorded in `CLAUDE.md` as a known gap.
- **P-5 (AC-6/AC-7).** State what the validator gate does with `Status: NEEDS_HUMAN` (stop, no retry) and with `UNVERIFIED` rows (not a failure; `Unverified:` line copied to the Final Summary). Implemented as above; confirm or correct.
- **P-6 (Assumptions A1–A3, A7).** Shape corrections only, as recorded in T1: A1 two mechanisms (not a candidate / not imported), A2 not one list and `qa` must stay a candidate for `frozen-kinds`, A3 the gate was hard-coded, A7 `review-notes.md` has no `## Proposed Spec Changes`.
- **P-7 (Decision).** `qa` is kept as a candidate and filtered by `SUPERSEDED_CANDIDATE_KINDS` rather than added to `HIDDEN_CANDIDATE_KINDS`, because a 03c1 test and the requirements both treat the latter as exactly the five dropped kinds. If you prefer a single list, that test and the requirement text change.

## Commits (local)

```
0be96b9 Record the pre-CAF-SDD-03c2 render: default file sets, commands, INDEX.md, planner, reviewer
ee8ad9b Add failing tests for CAF-SDD-03c2 (red)
7992c60 Put the validator and /caf-plan in the default scaffold in place of qa
9fb2e5a Print one note when caf-validator.md is added to a repo that has caf-qa.md
34f4e78 Make /caf-run-pipeline follow the roster's gate and the spec status
bebb2f5 Add the stop rules of NEEDS_CLARIFICATION, NEEDS_HUMAN and APPROVED to /caf-plan
13ae54d Point the reviewer Input at validate-report.md and drop the stale references
b62f045 Regenerate the MONOREPO snapshot for CAF-SDD-03c2
d279b46 Document the default validator and /caf-plan … in README.md and CLAUDE.md
```

`git diff --stat main`: 41 files, +1245 / −226. `src/` touched: `commands/agents.js`, `templates/{agent-md,run-pipeline-command,plan-command,fix-review-command,review-command,knowledge-index-md}.js`, `utils/read-agent-roster.js`. Not touched: `tools:`, `## Skills`, `## Retry Logic`, `## Output`, the planner `## Constraints`, kind `qa`, `implementer`, `SINGLE_REPO`, `--role`, the unknown-kind fallback, the orchestrator, any skill text, `/caf-plan-ticket`, `/caf-complete-drafts` (template).
