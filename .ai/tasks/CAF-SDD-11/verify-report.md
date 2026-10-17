Status: SUCCESS

# Verify Report — CAF-SDD-11

## T1
- Read `PLANNER_SPEC_WORKFLOW`, `buildOutputSection` and the tests that hold the planner `## Output`. The rule goes between the `Status:` bullet and the `Tidak ada` bullet of `### 1. Specify`. The golden `pre-sdd11/` was recorded (`test/helpers/record-sdd11.mjs`) from the HEAD of CAF-SDD-10 before `src/` changed.
- A-2 result: tests that failed on the new line: `sdd02e-planner-read`, `sdd03f-stale-text`, `sdd03g-unknown-kind`, `sdd05a-caf-design`, `sdd05b-caf-breakdown`, `sdd06-artifact-contract`, `sdd10-spec-v4` (mine), and `repo-context` (the frozen MONOREPO snapshot). `sdd02d-planner-audit` and `sdd07` did not fail. No finding contradicts an AC.

## Acceptance Criteria
- AC-1: automated-test — `test/sdd11-planner-language.test.js` (the seven lines verbatim, inside `### 1. Specify`, after the `Status:` bullet), both fixtures.
- AC-2: automated-test — `test/sdd11-planner-language.test.js` (render minus the lines equals the golden; `tools:` and every other section byte-identical), both fixtures.
- AC-3: automated-test — `test/sdd11-planner-language.test.js` (`## Output` of every other kind equals `pre-sdd11/output-by-kind.*.json`).
- AC-4: automated-test — `test/sdd11-planner-language.test.js` (no `TODO`, no heading, no status value, no avoid-list wording, one rule).
- AC-5: automated-test — `test/sdd11-planner-language.test.js` (`DRIFT` carried with no other change; hand-edited `Output` is `CONFLICT`, file byte-identical on dry run and real run).
- AC-6: automated-test — existing sha256 checks of `caf-spec` (v4), `caf-design`, `caf-breakdown` pass untouched; the new test also checks none carries the rule.
- AC-7: command — `npm test` | expect: exit 0 — observed: exit 0. Tests 1003 → 1015 (+12), pass 1015, fail 0. Test files 51 → 52.
- AC-8: manual — `CLAUDE.md`: new section at the end ("Language of the Planner's artifacts (CAF-SDD-11)": rule, fixed words, D-2, rollout, other agents out of scope); the 03c2b "Out of scope ... language" sentence now points to it. UNVERIFIED by executor; Ganjar reads.
- AC-9: manual — needs a real dispatch of the planner on one Indonesian and one English ticket. UNVERIFIED: not run by the executor (Ganjar's dispatch).

## Tests changed (T4)
Only the golden side of the comparison goes through `test/helpers/since-11.js`; goldens untouched, no assertion loosened.
- `sdd02e-planner-read.test.js` (AC-11 planner), `sdd03f-stale-text.test.js` (AC-… planner Output), `sdd05a-caf-design.test.js` (AC-7 planner + sync), `sdd05b-caf-breakdown.test.js` (AC-7 planner + sync), `sdd06-artifact-contract.test.js` (AC-4 planner), `sdd10-spec-v4.test.js` (AC-5 planner): `sinceSdd11(...)` wrapped around the existing since-chain.
- `sdd03g-unknown-kind.test.js`: `sinceSdd11Files(...)` on the recorded scaffold.
- `test/fixtures/snapshots/mono-pnpm.json`: checked first that only `.claude/agents/caf-planner.md` differs from the live render (stack and all other files identical), then regenerated that one entry. Not a precedent.
- New: `test/helpers/since-11.js`, `test/helpers/record-sdd11.mjs`, `test/fixtures/pre-sdd11/`, `test/sdd11-planner-language.test.js`.
