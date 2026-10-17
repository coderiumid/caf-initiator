Status: SUCCESS

# Verify Report — CAF-SDD-10

## T1
- Tests/src that mention `buildSpecSkill`/`caf-spec` (A-1): `sdd02-planner-spec`, `sdd02b-spec-v3`, `sdd02c-spec-active`, `sdd02d-planner-audit`, `sdd02e-planner-read`, `sdd03c2d-skill-rename`, `sdd03f-stale-text`, `sdd05a-caf-design`, `sdd05b-caf-breakdown`, `skills-pointer`, `skills-scaffold`, `skills-spec`, `skills-templates`. Of these, 10 failed on the change (see T3 list). `sdd02-planner-spec`, `sdd05a`, `sdd05b`, `skills-pointer/-scaffold/-templates` did not.
- A-2: goldens holding the skill text: `pre-sdd03c2d/skills.*.json` (needed `sinceSdd10`); `pre-sdd03d/` and the others did not fail.
- `caf-spec.skill.v4.md`: 75 newlines, no trailing newline (the repo convention: source = skill minus the one trailing newline, as for v3 and `caf-traceability`); `diff` against the v3 render: exactly the six places, no other. No finding contradicts an AC.

## Acceptance Criteria
- AC-1: automated-test — `test/sdd10-spec-v4.test.js` (sha256 `0701f633…de6ad` of the source, 76 lines, one trailing newline). Builder text was generated from the file, not retyped.
- AC-2: automated-test — `test/sdd10-spec-v4.test.js` applies the six replacements to the v3 fixture and compares with the live text.
- AC-3: automated-test — `test/sdd10-spec-v4.test.js` (no `-` marker, `Tidak ada` twice, no `flow.md`, no `TODO`).
- AC-4: automated-test — `pre-sdd10/caf-spec.v3.SKILL.md` recorded from HEAD before `src/` changed (77 lines); `sdd02b`/`sdd02c`/`sdd02d`/`sdd02e`/`sdd03f` still hold `SPEC_V3_SHA256`/`SPEC_FINAL_SHA256`, unchanged, now on v3 read from the fixture or from the live v4 turned back into v3 (`specV4ToV3`).
- AC-5: automated-test — `test/sdd10-spec-v4.test.js` (planner of both fixtures vs `pre-sdd06` through `sinceSdd06`; every other skill file vs `pre-sdd03c2d` skills golden).
- AC-6: automated-test — `test/sdd10-spec-v4.test.js` (v3 file byte-identical after write and dry run).
- AC-7: automated-test — existing sha256 checks of `caf-traceability`/`caf-design`/`caf-breakdown` pass, untouched.
- AC-8: command — `npm test` | expect: exit 0 — observed: exit 0. Tests 995 → 1003 (+8), pass 1003, fail 0. Test files 50 → 51 (the new `sdd10-spec-v4.test.js`).
- AC-9: manual — `CLAUDE.md`: v4 bullet with the six changes and the rollout (delete the skill file, `scaffold skills`), "differ on purpose" sentence replaced. UNVERIFIED by executor; Ganjar reads.

## Tests changed (T3)
No assertion or hash was loosened; only the source of the text.
- `sdd02b-spec-v3.test.js`: hash check on `withBanner(SPEC_V3)` (fixture); written file read through `specV4ToV3`.
- `sdd02c-spec-active.test.js`: `assertActiveSpec` takes `specV4ToV3(md)` for the hash and the 77 lines.
- `sdd02d-planner-audit.test.js`, `sdd02e-planner-read.test.js`, `sdd03f-stale-text.test.js`: `sha256(specV4ToV3(buildSpecSkill()))`.
- `sdd03c2d-skill-rename.test.js`: the golden's `caf-spec` goes through `sinceSdd10`.
- `skills-spec.test.js` (not named in the ticket's T3, but it holds v3 text): the expected `Status:` line is now the v4 one, and the ban on the word `NEEDS_HUMAN` became "exactly one occurrence, the `Status:` line of the template" (the other forbidden report/verdict words stay forbidden). This is the one place where an assertion is narrowed in form; flagged for Ganjar.
- New: `test/helpers/since-10.js`, `test/fixtures/pre-sdd10/caf-spec.v3.SKILL.md`, `test/sdd10-spec-v4.test.js`.
