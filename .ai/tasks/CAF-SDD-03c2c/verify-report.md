Status: SUCCESS

# Verify Report — CAF-SDD-03c2c

Branch `ai-agent/CAF-SDD-03c2c` (5 local commits, nothing pushed). `npm test`: 840 tests, 839 pass, 0 fail, 1 `todo` (the `implementation` fallback test, still there).

## Start checks
- sha256 of `requirements.md` and `tasks.md` as found differed from the expected values. One trailing newline added to each (the files ended in `.` and `9`), recomputed: both now match (`d3ee4cb1…799f`, `e290ea8b…3a87`). Content otherwise untouched. `.ai/` is in `.gitignore`, so these three files are not committed.
- main holds 03c2b (merge `f1f273a`; `planner-constraints` warning in `src/commands/audit.js`).
- A2 holds, so no STOP: the builder gets `implementationRoles` and `appPaths` (role -> `['.']` for SINGLE_REPO whole-repo, app paths or `--scope` dirs otherwise).

## T1 audit result
- `src/`: `agents.js` (file name, prompt, messages, comments, `PREVIEW_COMMANDS` entry), `run-pipeline-command.js` (5 mentions), `fix-review-command.js` (3), `review-command.js` (2), `ticket-preview-commands.js` (comments), `plan-command.js` (comments).
- `test/`: `sdd03b3`, `sdd03c1`, `sdd03c2`, `sdd03c3`, `sdd03f`, `single-repo-scaffold`, `skills-scaffold`, `sdd03b1`, helpers `default-file-set`, `commands-render`, `mono-snapshot`. Golden dirs mention the names as recorded data.
- Docs: README (7 places), CLAUDE.md (many, mostly ticket history), CAF.md (2).
- Name appears in no other generated text (`INDEX.md`, `piv-workflow.md`, `agent-handoff.md`: none).
- `AGENTS.md` "retry (max 3x)" is the verify retry inside one agent (A4 holds). The "max 3x" in the command's section on respawning is the same thing. Both unchanged.
- Snapshot: one entry expected, one entry changed.
- A3 was partly wrong: the helper `mono-snapshot.js` hardcodes the file name, so it had to change (one line). `commands-render.js` and `default-file-set.js` needed no change.

## Evidence per AC
- AC-1: automated-test — `test/sdd03c2c-run-command.test.js` "AC-1: <variant>" (6 variants, against `pre-sdd03c2c/file-set.*`)
- AC-2: automated-test — "AC-2: the builder ... golden" and "AC-2: commands.<variant>" (mono qa/validator, `--role` frontend/backend)
- AC-3: automated-test — "AC-3: single-nuxt default ..." and "AC-3: the builder gives the section routing only to ..."
- AC-4: automated-test — "AC-4: ..." (plain and customized old file, no old file, dry run)
- AC-5: automated-test — "AC-5: caf-plan-ticket.md is in HIDDEN_COMMAND_FILES ..." and "... not touched by a new scaffold"
- AC-6: automated-test — "AC-6: <variant> — <file> is the golden after the rename" plus the unchanged `REVIEW_MARKERS`/`FIX_REVIEW_MARKERS` tests in `sdd03b3-commands.test.js`
- AC-7: automated-test — "AC-7: no scaffolded command ..." and "AC-7: git grep over src ..."; command: `git grep -n -E "caf-run-pipeline|caf-plan-ticket" -- src` | expect: only allowed lines — observed: 9 lines, all listed below
- AC-8: automated-test — "AC-8: <fixture> — curate audit on the old repo ..." plus the existing `sdd03c1` AC-4 test
- AC-9: manual — `git diff main -- test/fixtures/snapshots/mono-pnpm.json`: one entry, `files[".claude/commands/caf-run-pipeline.md"]` is now `files[".claude/commands/caf-run.md"]` with the renamed text; no other entry. Matches T1.
- AC-10: manual — README ("/caf-run and /caf-plan-ticket (CAF-SDD-03c2c)" section and the lines it touches), CLAUDE.md (new section at the end, `--scope` line), CAF.md (2 lines).
- AC-11: command: `npm test` | expect: exit 0 — observed: 0 fail, 1 todo; `git diff main --stat -- test/fixtures/frozen-kinds` — empty.

## `git grep` lines left in `src`, with the reason
- `agents.js:67` `'caf-plan-ticket.md'` — the new `HIDDEN_COMMAND_FILES` entry (AC-5).
- `agents.js:75` `PREVIEW_COMMANDS` entry — builder kept; `isHiddenCommand` stops the write.
- `agents.js:76`, `plan-command.js:2,10,15`, `ticket-preview-commands.js:1` — comments about `/caf-plan-ticket` (history).
- `agents.js:691,693` — comment and the existence check of `caf-run-pipeline.md` for the AC-4 note.

## Old tests changed, and why
- `sdd03b3-commands.test.js`: `WRITTEN_FILES` (no plan-ticket, `caf-run.md`); SINCE map; review/fix-review golden read with the one name changed; message of one assertion.
- `sdd03c1-stop-scaffold.test.js`: `KEPT_COMMAND_FILES`; `since03c2c` map on commands and files; hidden list is nine; precondition file.
- `sdd03c2-validator-default.test.js`: file-set relation, the plan-ticket byte-identity test became "not written", review diff and pipeline golden read renamed, file name.
- `sdd03c2b-planner-clarify.test.js`: golden put through `sinceSdd03c2c`.
- `sdd03c3-single-repo-roster.test.js`: `golden()` reads through the ticket, `RUN_PIPELINE` path, hidden count nine, precondition file.
- `sdd03f-stale-text.test.js`: pipeline golden read renamed.
- `single-repo-scaffold.test.js`, `skills-scaffold.test.js`, `sdd03b1-validator.test.js`: file name or comment.
- New helper `test/helpers/since-03c2c.js`. `mono-snapshot.js`: the file name key.
- No golden dir changed (`git diff main` over all `pre-sdd*` and `frozen-kinds` is empty except the new `pre-sdd03c2c`).

## Snapshot entries changed
`mono-pnpm.json`: `caf-run-pipeline.md` -> `caf-run.md` (name and text). Nothing else.

## Unexpected
- The expected sha256 did not match as delivered (missing final newline); resolved by the rule in the task.
- `.ai/` is gitignored, so this report and the spec files stay uncommitted.
- Three entries of the routing step could not be copied from existing text: the new section routing is written in the ticket's words (`## Frontend Tasks` / `## Backend Tasks`), no TODO word.
- README line about "in SINGLE_REPO one Implementer instead" (the `scaffold` notes) is older than this ticket and was left as is.
- Rollout order unchanged: no orchestrator dependency (it never calls `/caf-run-pipeline` or `/caf-plan-ticket`).
