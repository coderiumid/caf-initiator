Status: SUCCESS

| AC | Status | Method | Evidence |
|---|---|---|---|
| AC-1 | PASS | automated-test | `test/sdd06-artifact-contract.test.js`: planner `## Output` first sentence equals the new text on mono-pnpm and single-nuxt; `ARTIFACT_BY_ROLE` other roles literal; other kinds' sentence equals their own value. |
| AC-2 | PASS | automated-test | Same file: `agent-handoff.md` with the Planner row put back is the `pre-sdd06` golden byte for byte; the only changed line is the Planner row; count of the success word outside `Status:` lines unchanged. |
| AC-3 | PASS | automated-test | Same file: the line sits verbatim right after the split-AC line, once; the `###` heading list and section list are the golden's; no `TODO`; `check-drafts` findings for the planner are equal before and after. |
| AC-4 | PASS | automated-test | Same file: with the sentence and the line put back, the planner is the golden byte for byte; the only added lines are the sentence and the two lines of the new bullet; the only removed line is the old sentence; tools line and all other sections equal. |
| AC-5 | PASS | automated-test | Same file: no other kind renders the new text. The `frozen-kinds` tests, `reviewer`, `validator`, `frontend` and `backend` tests pass with no assertion changed. |
| AC-6 | PASS | automated-test | Same file: `makeOldRepo` with the `pre-sdd06` planner baselined. Dry run writes nothing, sync reports `Output` as `DRIFT` and rewrites only inside `## Output`. A hand-edited `Output` is `CONFLICT` and the file tree is unchanged byte for byte. |
| AC-7 | PASS | command | `npm test` | expect: exit 0 — observed exit 0, 949 pass, 0 fail. `pre-sdd06` and every older golden are unchanged (`git diff 2d3adab HEAD -- test/fixtures` shows only the new `pre-sdd06/` files and `snapshots/mono-pnpm.json`). `mono-pnpm.json` differs in two entries only: `.claude/agents/caf-planner.md` and `.caf/workflows/agent-handoff.md`. |
| AC-8 | UNVERIFIED | manual | `CLAUDE.md` section "Artifact contract and the outline line (CAF-SDD-06)" after the 05b section. It states: the one source `ARTIFACT_BY_ROLE.planner` for the sentence and the roster row; the new Specify line and why it is separate from the numbering line; no sync for `agent-handoff.md` (delete and `scaffold workflow`) while `## Output` arrives through `curate sync`; `pre-sdd06/` never regenerated. A human should read it. |

### Notes
- T1: F-1..F-6 and A-1..A-3 checked against the code, no conflict with any AC. `ARTIFACT_BY_ROLE` is read only by `agent-md.js` and `agent-handoff-md.js` (A-1). The numbering line is at `agent-md.js` in `PLANNER_SPEC_WORKFLOW`, the anchor line follows it (F-4).
- Deviation of form: the working tree was not literally clean at start. The only untracked path was `.ai/tasks/CAF-SDD-06/` (the ticket files), which were committed first as their own commit. `git pull` on main reported up to date.
- Golden recorded before any `src/` change with `test/helpers/record-sdd06.mjs` (planner and default `agent-handoff.md`, both fixtures), in its own commit.
- New line is two source lines (cut at 100 columns), as T3 allowed.
- Old tests changed, and why (all because they compare the planner or `agent-handoff.md` against an older golden that has the old sentence; none had an assertion weakened, goldens untouched; they read the golden through `test/helpers/since-06.js`):
  - `sdd02-planner-spec`: the literal list of artifact text the planner still says now holds the new sentence (only an addition); the Output first-line comparison goes through `sinceSdd06`.
  - `sdd02b-spec-v3`, `sdd02c-spec-active`, `sdd02d-planner-audit`: the contract-line comparison goes through `sinceSdd06`.
  - `sdd02e-planner-read`: the golden Output goes through `sinceSdd06`, and the new outline lines are excluded as "later" lines, as was done for the 03f and 03c2b lines (the anchor line was itself new in 02e).
  - `sdd03f-stale-text`, `sdd05a-caf-design`, `sdd05b-caf-breakdown`: the golden planner Output / content goes through `sinceSdd06` after the earlier helpers.
  - `sdd03c2b-planner-clarify`, `sdd03c3-single-repo-roster`, `sdd03g-unknown-kind`: golden file sets go through `sinceSdd06Files` (planner and `agent-handoff.md`).
  - `repo-context`: no test change; its snapshot entries were updated (below).
- Snapshot entries changed in `test/fixtures/snapshots/mono-pnpm.json`: `.claude/agents/caf-planner.md` and `.caf/workflows/agent-handoff.md` only (stack and all other files verified equal before writing). Not a precedent.
- Local commits only: no push, publish or merge. Branch `ai-agent/CAF-SDD-06`.
- AC-8 is a manual check; it is marked UNVERIFIED by the rules of the spec, not failed. Everything else is verified by a test run in this session.
- Proposed Spec Changes: Tidak ada
