# CAF-SDD-03c2d — Verify Report
Status: SUCCESS

Branch `ai-agent/CAF-SDD-03c2d`, 4 local commits (708538f golden+helpers, 3ebb5b3 red tests, 1b8228e implementation + old tests, aebc60e docs). Nothing pushed.

## Start conditions
- sha256 of the files as delivered did not match (requirements `6a8657ec…`, tasks `f01916fb…`). One newline appended at the end of each, as the ticket says: now requirements `11848dae…cc970` and tasks `b51011ae…4d75`, both match.
- Main contains 03c2c (HEAD 981bf29; `caf-plan-ticket.md` in `HIDDEN_COMMAND_FILES`).
- Note: `.ai/` is in `.gitignore`, so `requirements.md`, `tasks.md` and this report are not part of any commit.

## T1 result (read-only audit, before touching src/)
- `caf-verify` in `src/`: `skill-md.js` (SKILL_NAMES, IMPLEMENTATION_SKILLS, SKILLS_BY_KIND qa/validator, builder name, builder map, caf-piv text, comments), comments in `skills.js` and `agents.js`. Nothing else.
- Docs: README.md (skill table, DRAFT paragraph, collision example), CAF.md (4 lines), CLAUDE.md (2 current-behavior lines, 3 history lines).
- Tests: sdd02-planner-spec, sdd03b1-validator, skills-check-drafts, skills-pointer, skills-scaffold, skills-templates, skills-section (data only). Fixtures: only `pre-sdd03d/{frontend,backend,implementer}.single-nuxt.json` (`contentWithSkills`).
- A1 holds: a default scaffold (all 6 VARIANTS) never writes the name (test AC-8). A2 holds: `pre-sdd03c1/curate-old-repo.*.json` mention neither skill nor `.claude/skills` (test AC-6). A3 holds: only the three single-nuxt `pre-sdd03d` files carry the old pointer. A4 holds: snapshot unchanged.
- `check-drafts`/`complete-drafts` find skills by path (`.claude/skills/*/SKILL.md` glob, pointers = backtick spans ending `/SKILL.md`), not by name, so an old folder is still read.
- No finding contradicts an AC or A1–A4. Minor inconsistency inside the spec, not a contradiction: AC-1 says six other skills are byte-identical, but the scope lists the `caf-piv` text, which names the skill and therefore changes. The test holds every skill to "golden with the name replaced, nothing else"; the skills that never mention the name are checked byte-identical.

## Evidence per AC
- AC-1: `test/sdd03c2d-skill-rename.test.js` "AC-1" (names/table/order; skill files per fixture vs `pre-sdd03c2d/skills.*.json`) — automated-test
- AC-2: same file, "AC-2" per fixture vs `agents.*.json` — automated-test
- AC-3: "AC-3" real run, `--dry-run`, `--force`, and no-old-folder case (one note, old file byte-identical, exit code undefined) — automated-test
- AC-4: "AC-4" two tests (old pointer → renamed line, no edit; no old pointer → pre-ticket line verbatim) — automated-test
- AC-5: "AC-5" four tests (warning per agent, no duplicate `skill-pointer`, read-only incl. `curate sync`; missing/DRAFT/already-pointed → none; no pointer → `skill-pointer` with new path; `implementation` fallback skipped) — automated-test
- AC-6: "AC-6/AC-7" per fixture (old-text repo: `checkDrafts` findings + audit warnings + entries equal golden) and "AC-6: recorded curate-old-repo fixtures" — automated-test. Existing sdd03c1 old-repo test still green.
- AC-7: same tests, plus `listDraftFiles` still lists the old folder — automated-test
- AC-8: "AC-8" (6 default variants + skills run, files and printed text) — automated-test; command: `git grep -n "caf-verify" -- src` — result below
- AC-9: manual: snapshot/frozen-kinds tests pass unchanged; `git diff --stat main -- test/fixtures/frozen-kinds test/fixtures/snapshots` is empty; no regeneration was run (T8 skipped: T1 expected no change) — manual
- AC-10: manual: README.md, CAF.md, CLAUDE.md read; new CLAUDE.md section added, history lines left — manual
- AC-11: command: `npm test` → exit 0, 858 pass, 0 fail, 1 todo (the `implementation` fallback test, "AC-7: an unknown kind (caf-foo.md) …" still marked todo); `git diff --stat main -- test/fixtures/frozen-kinds` empty — command

## `git grep -n "caf-verify" -- src` (left on purpose)
- `src/templates/skill-md.js:53` — `RENAMED_SKILLS = { 'caf-verify': 'caf-self-verify' }`, the constant for the old name; it is what the note, the "not listed there" line and the warning read.
Only that line. Also left in the docs on purpose: README.md:323 (the `skill-renamed` bullet) and CLAUDE.md history lines (725, 764, 828) and the new section.

## Old tests changed
- Renamed `caf-verify` → `caf-self-verify` (mechanical; the skill's name is what they assert): sdd02-planner-spec, sdd03b1-validator, skills-check-drafts, skills-pointer, skills-scaffold, skills-templates. In skills-scaffold the collision example became `caf-self-verify` vs `self-verify/` (both the fixture folder and the expected path).
- `sdd03d-implementation-spec` "AC-6 … Skills is unchanged": reads the `pre-sdd03d` golden through `replaceAll('caf-verify','caf-self-verify')`; golden untouched.
- `skills-section.test.js` left as is (uses the path as inert data).
- Helper `frozen-kinds.js`: `renderAgents(fixture, { skillsFor })` got an optional argument; default output unchanged.

## Snapshot entries changed
None. `mono-pnpm.json` and `frozen-kinds` goldens untouched.

## Unexpected
- The `.ai/` folder is git-ignored (report and spec stay local).
- Delivered files lacked the final newline (see start conditions).
- AC-1's "six other skills identical" vs the scope's `caf-piv` text (see T1).
- My first AC-5 test put the DRAFT banner at the end of the file; `hasSkillDraftBanner` only reads the first 15 lines. Test fixed, not the code.
- `test/helpers/skills-render.js` was added to record and compare the goldens; the one-off recorder script was not kept.
