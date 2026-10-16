Status: SUCCESS

# CAF-SDD-05a — Verify report

Branch `ai-agent/CAF-SDD-05a` from `main` (2bb11e3). Local commits only: nothing pushed, published or merged. `npm test`: 906 pass, 0 fail.

## Acceptance criteria

| AC | Status | Method | Evidence |
|----|--------|--------|----------|
| AC-1 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-1: caf-design is the last of SKILL_NAMES, born a DRAFT ...` and `::AC-1: scaffold skills writes .claude/skills/caf-design/SKILL.md — mono-pnpm / single-nuxt` |
| AC-2 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-2: the skill without its banner is the ticket source, verbatim (sha256)` (hash of `caf-design.skill.md`) |
| AC-3 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-3: caf-design is mapped to planner and to no other kind ...` |
| AC-4 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-4: while caf-design has its banner no planner points at it; without the banner it does` |
| AC-5 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-5: the skill names no status or verdict word ...` |
| AC-6 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-6: planner on mono-pnpm / single-nuxt — the Plan step holds the six lines ...` |
| AC-7 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-7: planner on <fixture> — outside the six lines the file is the pre-ticket golden, byte for byte` (golden `pre-sdd05a/planner.*.json`) |
| AC-8 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-8: planner on <fixture> — no TODO in the six lines, and check-drafts counts what it counted` |
| AC-9 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-9: architect on <fixture> ...` and `::AC-9: architect is still offered ...`; the existing `frozen-kinds` tests pass unchanged |
| AC-10 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-10: <fixture> — sync of the pre-ticket planner reports Output as DRIFT ...` and `::... a planner whose Output was edited by hand is a CONFLICT and the file is unchanged byte for byte` (built on `makeOldRepo`) |
| AC-11 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-11: <fixture> — a skill-pointer warning names caf-design once its banner is gone, and not while it is there` |
| AC-12 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-12: /caf-run with an Architect skips the stage when design.md exists, and keeps the spawn criteria` |
| AC-13 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-13: /caf-run without an Architect says design.md is the Planner’s ...` |
| AC-14 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-14: outside the two Architect-stage paragraphs /caf-run is the pre-ticket golden, byte for byte` |
| AC-15 | PASS | automated-test | `test/sdd05a-caf-design.test.js::AC-15: the tasks README names the Planner as the writer of design.md ...` |
| AC-16 | PASS | command | `npm test` \| exit 0 (906 pass, 0 fail). `pre-sdd05a` and every older golden unchanged; `mono-pnpm.json` differs in 3 entries only (see Notes) |
| AC-17 | PASS | manual | Read the new section "The skill `caf-design` and `design.md` from the Planner (CAF-SDD-05a)" at the end of `CLAUDE.md`: DRAFT and planner-only; rule in `## Output` and in the skill; rides the spec gate, no orchestrator change; `architect` stays until a follow-up; rollout (sync carries `## Output`, banner and `## Skills` pointer by hand after a dispatch test); `pre-sdd05a/` never regenerated. A human should re-read it. |

## Commits (local)

1. `docs: Add ticket files for CAF-SDD-05a` (the three ticket files, as given)
2. `test: Record pre-sdd05a golden before CAF-SDD-05a changes` (recorded before any `src/` change)
3. `feat: Add caf-design skill and let the Planner write design.md (CAF-SDD-05a)` (T2–T6)
4. `docs: Document CAF-SDD-05a in CLAUDE.md` (T7)

### Notes

- **T1 findings.** Checked against the code: F-1 (`PLANNER_SPEC_WORKFLOW` Plan step), F-5 (`architectSection`), F-4 (reader side, `design.md` "if present" in reviewer and validator workflows) match. F-3/A-2: `../caf-orchestrator/src` exists and has no `design.md` or `architect` reference; in caf-initiator `design.md` appears only in template text. F-2, F-6, F-7 and A-4 were confirmed by the passing tests rather than by a separate read. No finding contradicts an AC.
- **Deviation of form (no AC changed).** The golden `pre-sdd05a/` was recorded by a new helper `test/helpers/record-sdd05a.mjs`, run once. Its shape: `planner.<fixture>.json` (`kind, fixture, file, content`), `run-pipeline.json` (8 inputs per fixture: Architect, Documentation and gate `validator`/`qa`), `tasks-readme.json` (3 tracker values). The helper `test/helpers/since-05a.js` (the three text changes written out literally) is how older tests read their own goldens through this ticket.
- **Which old tests held the changed text** (found by running the suite after the change, then edited; no golden touched). Plan/Architect/README text: `sdd02e-planner-read` (AC-11 Output lines), `sdd03f-stale-text` (AC-8 planner, AC-11 `/caf-run`), `sdd03c2-validator-default` (AC-6 `/caf-run` with qa), `sdd03c2c-run-command` (AC-2, AC-3 `caf-run.md`, moved to read through `since-05a`), `sdd03c2b-planner-clarify` (AC-4), `sdd03c3-single-repo-roster` (AC-2, AC-6, AC-9), `sdd03g-unknown-kind` (AC-10, scaffold contents incl. the README), and the snapshot test `repo-context`. The `caf-run.md` comparisons that were "identical to the golden" now go through `since-05a` and the new test holds the outside-the-paragraph identity (AC-14).
- **Skill list tests** updated for the eighth skill (`caf-design`, appended, planner only): `skills-templates`, `skills-scaffold`, `skills-pointer`, `skills-spec`, `sdd02-planner-spec` (the "last skill" assertion is now "second to last"), `sdd03c2d-skill-rename` (the new file is ignored in the rename golden comparison).
- **Snapshot.** `test/fixtures/snapshots/mono-pnpm.json`: only 3 entries changed: `.claude/agents/caf-planner.md`, `.claude/commands/caf-run.md`, `.caf/tasks/README.md`. Not a precedent. `frozen-kinds` goldens unchanged.
- `.ai/tasks` was not gitignored, so no `git add -f` was needed. `git fetch` showed `main` equal to `origin/main`.
- The hash of the ticket files was not verified, as instructed. The skill body in `skill-md.js` was generated from `caf-design.skill.md` by script (backticks escaped), and the test checks the sha256 of the result without its banner.
- Proposed Spec Changes: none.
