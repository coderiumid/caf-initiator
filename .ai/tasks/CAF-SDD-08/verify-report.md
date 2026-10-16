Status: SUCCESS

# Verify report — CAF-SDD-08

| AC | Status | Method | Evidence |
|----|--------|--------|----------|
| AC-1 | PASS | automated-test | `test/sdd08-rename.test.js`: old file absent, `run-command.js` exports `buildRunMd` and not the old name, no old name in `src/` or `test/` (fixtures and the test itself excepted) |
| AC-2 | PASS | command | `npm test` exit 0 (989 pass, 0 fail); `git diff --stat 0a50f87 -- test/fixtures` empty; `mono-pnpm.json` untouched |
| AC-3 | PASS | automated-test | same test: base content with old names replaced equals new content; changed lines are only the export line and the `run-pipeline.md` JSDoc line (git rename shows 2 insertions, 2 deletions) |
| AC-4 | PASS | manual | read `git diff 0a50f87..HEAD` outside `run-command.js`: only import paths, `buildRunMd`, `generateRun` and `run-command.js` in comments; no assertion, generated text or fixture line changed |
| AC-5 | PASS | automated-test | same test: count of `/caf-run-pipeline` in `src/` and `README.md` equals the count at the commit before the rename |
| AC-6 | PASS | command | `npm test` exit 0 |
| AC-7 | PASS | manual | `CLAUDE.md` section "Builder of `/caf-run` renamed (CAF-SDD-08)" has the four items |

### Notes
- T1: HEAD was the 07 commit, `git status` showed only the tickets. F-1..F-6, A-1..A-3 hold. `scripts/` and `.github/` have no old name. Baseline `npm test` was 985 pass before changes. Users found: 3 in `src/` (`agents.js`, `fix-review-command.js`, `ticket-preview-commands.js`) and 9 in `test/` (7 tests, 2 helpers), as F-2.
- Deviation: the old names also appear in `.claude/settings.local.json` (gitignored permission entries, not a module reader) and the old `CLAUDE.md` sections (history). Neither touched.
- Deviation: `README.md` has `/caf-run-pipeline` mentions (old command name); unchanged.
- Commits (local, not pushed): 0a50f87 ticket files, cb3f2b6 `git mv` + export/JSDoc, 595dad5 users, 8e1e9ae test, f8e2dea CLAUDE.md. `verify-report.md` is left uncommitted.
- Tests: 989 pass (985 + 4 new), 0 skipped; the git-based tests would `skip` without git history.
- Proposed Spec Changes: none
