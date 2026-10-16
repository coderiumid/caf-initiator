Status: SUCCESS

# CAF-SDD-05b — verify report

Branch `ai-agent/CAF-SDD-05a` (no new branch, no checkout of main), local commits only: nothing pushed, published or merged.

Gate: `npm test` → 927 tests, 927 pass, 0 fail (baseline at HEAD 05a before any change: 906 pass; `test/sdd05b-caf-breakdown.test.js` adds 21).

| AC | Status | Method | Evidence |
|----|--------|--------|----------|
| AC-1 | PASS | automated-test | `test/sdd05b-caf-breakdown.test.js` "AC-1": last of `SKILL_NAMES`, `draft: true`, frontmatter `name`/`description`, 3-line banner, `countOpenSkillTodos` = 0 |
| AC-2 | PASS | automated-test | "AC-2": sha256 of the skill without its banner = `52a01b914c6295f8e376febc6675a1c9f50bf097abb28c0b81d0624eded8afe9`, the hash of `caf-breakdown.skill.md` |
| AC-3 | PASS | automated-test | "AC-3": mapped to `planner` only, right after `caf-design`; older entries keep their order |
| AC-4 | PASS | automated-test | "AC-4": no pointer while the banner is there, pointer (last) once it is removed |
| AC-5 | PASS | automated-test | "AC-5": no status/verdict word, no wait/confirm wording, "Do not create tickets, and do not write to a tracker. A human creates them..." present |
| AC-6 | PASS | automated-test | "AC-6" (both fixtures): the 8 lines verbatim inside Specify, no new heading, no `TODO`, `check-drafts` findings equal to the golden's |
| AC-7 | PASS | automated-test | "AC-7" (both fixtures): removing the 8 lines gives the `pre-sdd05b` planner byte for byte; `tools:`, frontmatter, other tracked sections, `## Constraints`, headings equal |
| AC-8 | PASS | automated-test | "AC-8": no other kind mentions the skill or the rule; `architect` equals its frozen-kinds golden; the whole `frozen-kinds` suite still passes; `sdd05a-caf-design.test.js` passes reading its golden through `since-05b` (golden untouched) |
| AC-9 | PASS | automated-test | "AC-9" (both fixtures): `makeOldRepo` + `pre-sdd05b` planner → `Output` is `DRIFT`, rewritten, file differs only inside `## Output`; hand-edited `Output` → `CONFLICT`, tree identical byte for byte (dry and real run) |
| AC-10 | PASS | automated-test | "AC-10" (both fixtures): one `skill-pointer` warning naming `.claude/skills/caf-breakdown/SKILL.md` after the banner is removed, none while it is there; exit code, gaps, declined, section counts unchanged |
| AC-11 | PASS | automated-test | "AC-11": step 5 sentences on `buildPlanMd` (breakdown.md exists + `NEEDS_CLARIFICATION`, items shown, tracker tool only, one at a time, yes / edit / skip) |
| AC-12 | PASS | automated-test | "AC-12": explicit yes per ticket, never several in one step, never on silence, edit/skip meanings, IDs and titles reported, no write-back, no tracker tool → names the file and creates nothing |
| AC-13 | PASS | automated-test | "AC-13": exception for creating a ticket after an explicit yes; prohibitions on changing status of an existing ticket, posting to a PR, `git`, application code kept; rest of Constraints equals the golden |
| AC-14 | PASS | automated-test | "AC-14": putting the old step 5 and Constraints text back gives the `pre-sdd05b` `/caf-plan` exactly; none of the Planner's lines in the command; the existing "no Planner rule text" tests still pass |
| AC-15 | PASS | automated-test | "AC-15" (Linear, Jira, no tracker): one `breakdown.md` line; removing it gives the golden |
| AC-16 | PASS | command | `npm test` → exit 0, 927/927. `pre-sdd05b/` committed once, never rewritten; no older golden file edited (`git diff` of `test/fixtures` after the golden commit touches only `snapshots/mono-pnpm.json`). `mono-pnpm.json`: 2 entries changed, listed in Notes |
| AC-17 | PASS | manual | Read the section "The skill `caf-breakdown` and `breakdown.md` from the Planner (CAF-SDD-05b)" at the end of `CLAUDE.md`: DRAFT/planner-only skill; rule in `## Output` and skill; `NEEDS_CLARIFICATION` + one BLOCKING question, Draft PR; no orchestrator change; tickets only by `/caf-plan` after explicit yes; relaxed constraint; rollout (sync carries `## Output`, `/caf-plan` does not sync, banner and pointer by hand after dispatch test); `pre-sdd05b/` never regenerated. Two 05a sentences updated (`last of SKILL_NAMES`, out-of-scope line) |

### Notes

**T1 checks (before touching `src/`)**
- HEAD was the last 05a commit, `git status` showed only the untracked ticket folder; the ticket files were committed as their own commit, then the golden as its own commit (`44f39cf`), recorded from unchanged code with `test/helpers/record-sdd05b.mjs`.
- F-1, F-2, F-3, F-5, F-6 match `plan-command.js` / `agent-md.js` as read. F-7 confirmed: the 05a AC-7 test failed as soon as the two bullets were added.
- A-1 verified on the orchestrator side: `../caf-orchestrator/src/application/use-cases/run-agent-pipeline.use-case.ts` `stopForSpecIfNeeded` stops on `NEEDS_CLARIFICATION` using only `parseSpecStatus` and `findUnansweredBlockingQuestions`; `stopForClarification` → `parkSpecOnBranch` does `commitAll` + push (so `breakdown.md` rides along). No AC is read at that stop and there is no `breakdown.md` logic.
- A-2: neither the Planner's `## Output` nor `caf-spec` forbids a `requirements.md` outline without ACs. Mild tension only: Specify still says "Number every acceptance criterion". The two bullets are verbatim from the ticket, so I did not reword anything; the outline's ACs are written as `Tidak ada` by the planner's own empty-section rule. A dispatch test should confirm real behavior.
- A-4: `.caf/tasks/README.md` has one line per artifact; held only by the mono snapshot, `pre-sdd05a/tasks-readme.json` (05a AC-15) and the 03g/03c2c/03c3 scaffold goldens.
- Placement of the two bullets: right after the first bullet of Specify (reading the task folder), the position T3 names. Not the fallback "just before writing `requirements.md`".

**Old tests changed (goldens untouched), with reason**
- New helper `test/helpers/since-05b.js` (the 05b changes written out literally, independent of `src/`): planner bullets, `/caf-plan` step 5 and Constraints, README line.
- Through the helper: `sdd05a-caf-design` (AC-7 planner, AC-10 sync, AC-15 README), `sdd02e-planner-read` AC-11, `sdd03f-stale-text` AC-8, `sdd03g-unknown-kind` AC-10, `sdd03c2b-planner-clarify` AC-4, `sdd03c2c-run-command` AC-6, `sdd03c3-single-repo-roster` AC-2/AC-9. Reason: they compare a whole planner, `/caf-plan` or README with an older golden.
- `sdd02d-planner-audit` AC-1: the position of the 02d "read facts" rule in Specify is now shifted by the 8 new lines (`BREAKDOWN_LINES.length`).
- Skill list/count assertions now include `caf-breakdown` (skills-templates, skills-scaffold, skills-pointer, skills-spec, sdd02-planner-spec, sdd03c2d-skill-rename, sdd05a-caf-design AC-1/AC-3). In `sdd05a` AC-1 and `sdd02-planner-spec` AC-7 the "last"/"second to last" index moved by one; `sdd03c2d` deletes the new skill file from the render like it already did for `caf-design`; `skills-pointer` expects 9 written skills instead of 8.

**`mono-pnpm.json` entries changed (2 of 13):** `.claude/agents/caf-planner.md` and `.caf/tasks/README.md`. Only those two keys were rewritten (`git diff` shows 2 lines changed). `caf-plan.md` is not in the snapshot. `frozen-kinds` goldens did not change.

**Not covered by automation:** creating tickets in a real tracker (only the command text is held), and the dispatch test that decides removal of the banner (multi-outcome request → `breakdown.md` + stop; one-outcome many-step request → one spec, no `breakdown.md`).

Proposed Spec Changes: Tidak ada
