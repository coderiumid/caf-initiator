Status: SUCCESS

# CAF-SDD-03c2b — verify report

Branch `ai-agent/CAF-SDD-03c2b`, local commits only (no push, PR, merge or publish).
Start checks: `requirements.md` and `tasks.md` hashes matched after adding one trailing newline
to each (c2deacda…, 6c1cc590…); main held 03c3 (`sdd03c3-single-repo-roster.test.js` present).
Neither spec file was edited otherwise. (`.ai/` is gitignored, so they and this report are not committed.)

Commits:
1. `4771608` golden `test/fixtures/pre-sdd03c2b/` (default scaffold of 4 variants, every file)
2. `700ebb1` tests (red)
3. `5898e36` planner Output/Constraints, audit warning, INDEX.md, util removal, older tests updated
4. `5ca0cb3` snapshot
5. `d655e0e` README.md + CLAUDE.md

## Evidence per AC

| AC | Kind | Evidence |
|---|---|---|
| AC-1 | automated-test | `test/sdd03c2b-planner-clarify.test.js` "AC-1: {single-nuxt,mono-pnpm}.default" |
| AC-2 | automated-test | same file, "AC-2: …" |
| AC-3 | automated-test | same file, "AC-3: …" (no Fallback/Discovery/blocked; refusal still `NEEDS_HUMAN` first line of verify-report.md) |
| AC-4 | automated-test | same file, "AC-4: …" ×4 variants against `pre-sdd03c2b/`: only `Output` and `Constraints` of the planner differ, `tools:` and all other files (agents included) byte-identical, INDEX.md aside (AC-7) |
| AC-5 | automated-test | same file, "AC-5: …" (Constraints not syncable; sync writes only Output; customized Output → CONFLICT, untouched) |
| AC-6 | automated-test | same file, "AC-6: …" (one `planner-constraints` warn, no gap, same exit code/counts, recorded old-repo report equal except that warning; none for other kind/custom file/no planner) |
| AC-7 | automated-test | same file, "AC-7: …" (INDEX.md = golden minus the `.caf/discovery/` paragraph) |
| AC-8 | automated-test | same file, "AC-8: (i)/(ii)/(iii)" (already true before; now locked, `custom` empty) |
| AC-9 | command | `git grep -n "architecture-signatures" -- src test` → no output, exit 1; file removed. Also automated-test "AC-9" |
| AC-10 | manual | `git diff` of `test/fixtures/snapshots/mono-pnpm.json` read: `stack` equal, same file keys, only `.claude/agents/caf-planner.md` changed (checked by script) |
| AC-11 | manual | README.md (Planner rules, rollout table row, rollout order paragraph, Rollout warnings table, "No longer scaffolded" bullet) and CLAUDE.md (new section "The ticket run asks through the status (CAF-SDD-03c2b)" + stale lines fixed) read |
| AC-12 | command | `npm test` → exit 0: 801 tests, 800 pass, 0 fail, 1 todo (the `implementation` fallback `todo` test, still present in `test/kind-guard.test.js`). `git diff --stat main -- test/fixtures/frozen-kinds/` → empty |

## T1 findings (read-only, before touching `src/`)

- A1 holds: no `frozen-kinds` golden for the planner (15 goldens, none planner).
- A2 holds: `INDEX.md` is built by `buildKnowledgeIndexMd` (`src/templates/knowledge-index-md.js`); the paragraph "Difference from `.caf/discovery/{slug}/prd.md` …" (4 lines).
- A3 holds: `rolloutWarnings` (`src/commands/audit.js`) returns `{ status: 'warn', filePath, message, check }`; a planner-only check fits next to the `tools`/`skill-pointer` ones.
- A4 differs in form, not in outcome (see Proposed Spec Changes): `makeOldRepo` renders agents from the **live** builders, so its planner already has the new `## Constraints` after the change and the recorded report gets **0** new warnings, not 1. Nothing else in the report changes. The "+1 warning" case is tested by putting the pre-ticket Constraints into that repo's planner. Not more than one warning, nothing changed elsewhere → no stop.
- Sentences that changed (builder `src/templates/agent-md.js`): `buildBatasanSection` (Constraints: `NEEDS_HUMAN` + `tasks.md` blocked, "Fallback — Discovery"); `PLANNER_SPEC_WORKFLOW` Clarify bullet "Ticket run … `NEEDS_HUMAN` in place of `NEEDS_CLARIFICATION`, plus the blocked `tasks.md` note … only case where it is written". Output's "no `tasks.md` at all" rule line itself carried no exception text (the exception lived in the ticket-run bullet). Code comments that said the opposite were updated.
- `readAgentRoster` was already correct for the three cases; only the validator-only case was locked indirectly.
- `architecture-signatures` importers: none in `src`/`test` (only a sentence in CLAUDE.md).
- Expected snapshot change: `caf-planner.md` only — confirmed.

## Older tests changed, and why

All because a sentence or a section they pinned changed on purpose. No golden was edited or regenerated except `mono-pnpm.json` (T7).

- `test/sdd02-planner-spec.test.js`: Clarify test asserted `Status: NEEDS_HUMAN` on the ticket path → now asserts it is absent; literal `` `Status: NEEDS_HUMAN` + `tasks.md` blocked `` removed from the AC-5 literal list; `syncedOf` and the "everything outside Output" restore put the old/live `## Constraints` back (sync never writes it).
- `test/sdd02b-spec-v3.test.js`: same `syncedOf`/restore; assertion that Constraints equals the SDD-02 render removed.
- `test/sdd02c-spec-active.test.js`: restore chain and "whole file is the fresh render" now account for Constraints.
- `test/sdd02d-planner-audit.test.js`: AC-3 test no longer says the ticket run keeps its blocked note (asserts the 02d rule was in the 02d render and is gone live); AC-8 outside-sections restore and "lacks only the block 02e replaced" now also the ticket-run rule; sync test expects the old Constraints to stay.
- `test/sdd02e-planner-read.test.js`: added `SDD03C2B_TICKET_RUN_OLD/NEW` line lists (like the existing 03f exception) to the added/removed-line comparisons; restore and sync expectations account for Constraints.
- `test/sdd03c2-validator-default.test.js`: planner Input test skips `Output`/`Constraints`; "curate sync writes only Input" now: planner Input **and** Output, old Constraints stay; "customized Input is not overwritten": planner's untouched Output is synced, Input stays.
- `test/sdd03c3-single-repo-roster.test.js`: byte-for-byte golden comparisons skip the two files this ticket changed on purpose (planner, INDEX.md), which `sdd03c2b` holds against its own golden.
- `test/sdd03e-validator-commands.test.js`: sync expectation for the planner keeps the old Constraints.
- `test/sdd03f-stale-text.test.js`: added-lines comparison includes the ticket-run rule (old/new); restore and sync expectations account for Constraints.
- New helper `test/helpers/swap-constraints.js`.
- Not changed: `sdd03b3`, `sdd03c1` (curate-old-repo comparison still passes as recorded), `kind-guard` (todo stays).

## Snapshot entries changed

`test/fixtures/snapshots/mono-pnpm.json`: `.claude/agents/caf-planner.md` only (stack and file list identical).

## Proposed Spec Changes

Not a request to change the goal, scope or any AC; for the record:
1. A4 says the old-repo report grows by exactly one warning. Since `makeOldRepo` renders from the live builders the report is unchanged (0 warnings); AC-6's "identical except one planner warning" is verified by giving that repo a planner with the pre-ticket Constraints. Suggest wording A4 as "the report is unchanged, and gains exactly one planner warning when the planner holds the pre-ticket Constraints".
2. AC-5 ("only `## Output` is written") holds for a planner whose Input/Allowed Tools are already current. Older tests that sync a pre-02d/02c planner still see those sections drift as before.
3. Unexpected: the planner's refusal of an approved-spec change on a ticket run (`verify-report.md` + a `tasks.md` the orchestrator goes on to read) is unchanged per Q-1; nothing here touches it.
