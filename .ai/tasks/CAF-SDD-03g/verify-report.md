Status: SUCCESS

# Verify Report — CAF-SDD-03g

Branch `ai-agent/CAF-SDD-03g` (from main `9efc5d6`, which has 03c2d: `caf-self-verify`, `RENAMED_SKILLS` in `src/templates/skill-md.js:53`). Four local commits, nothing pushed:
`da89bf8` golden + helpers, `ad094a0` red tests, `52af190` implementation + old tests, `8039a06` docs.

## Checksums (step 1)
Both files differed from the ticket hashes as delivered (requirements `8ba18fe4…`, tasks `99ad78ec…`). After appending one newline to each, both match: requirements `244e3421…0c6e`, tasks `f007cb57…9d6b`. The files were edited only by that trailing newline. `.ai/` is in `.gitignore`, so the spec files and this report are not in any commit.

## Acceptance Criteria
- AC-1: automated-test — `test/sdd03g-unknown-kind.test.js` ("AC-1" x3): known kinds with/without `caf-`, `caf-foo.md`/`my-agent.md` unknown, `admin.md` implementation via `implementationSlugs` (monorepo and SINGLE_REPO), known kind wins over equal slug
- AC-2: automated-test — "AC-2" x3 (real and `--dry-run`, byte-identical file, `unknownKind` in result, manifest untouched); `test/kind-guard.test.js` AC-7 (no longer `todo`)
- AC-3: automated-test — "AC-3" x2: `admin.md#Output` DRIFT synced, dry-run drift list equals the recorded one minus the custom file
- AC-4: automated-test — "AC-4" x2: `--dry-run` and `--yes`, no manifest entry for the unknown file, section hashes of the others equal a repo without it
- AC-5: automated-test — "AC-5" x2: exactly one `unknown-kind` warning, no entry/gap, exit code, gap counts and section counts equal to the same repo without the file
- AC-6: automated-test — `test/sdd03c1-stop-scaffold.test.js` AC-4 (old repo vs `pre-sdd03c1/curate-old-repo.*.json`, both fixtures) passes unchanged; "AC-6" in the new file for the pre-sdd03g known-only report
- AC-7: automated-test — "AC-7" x2 against `test/fixtures/pre-sdd03g/curate.with-custom.json`: one `WARN` ("unknown kind … not checked"), no `FAIL` (also after editing a section of the file), other findings equal the golden, tree unchanged
- AC-8: automated-test — "AC-8" x2 (also `--dry-run`): not offered, unchanged, one line; per-app agent still offered. `skills-pointer` H10 rewritten
- AC-9: automated-test — "AC-9" x2: `--mode single` makes `apps/admin` unknown, `--mode mono` keeps it, through `agentsSync`, `curate --sync-only`, `curateBaseline`, `curate --audit-only`
- AC-10: automated-test — "AC-10" (4 scaffold variants equal `pre-sdd03g/scaffold.*.json`), `repo-context`, `frozen-kinds` tests; command: `git diff --stat -- test/fixtures/snapshots/ test/fixtures/frozen-kinds/` | expect empty — observed: empty
- AC-11: manual — README.md ("Which agent files `curate` recognizes", skills section, rollout warnings bullet), CLAUDE.md (new section "Recognizing an agent file", two stale sentences updated), CAF.md (one paragraph after the agent table). Reviewer should read them; see "Unexpected" for CAF.md
- AC-12: command: `npm test` | expect exit 0, `todo 0` — observed: tests 880, pass 880, fail 0, todo 0

## T1 — audit
- `detectKind` callers in `src/` (A1 holds, six places): `agents-sync.js` (`implementation` template for any name), `audit.js` (same, plus `rolloutWarnings` skipped the kind), `curate-baseline.js` (same), `check-drafts.js` (same), `skills.js` (`skillsForKind(detectKind)` and `isRecognizedKind`, default answer No). No call in `export` or `readAgentRoster`: `readAgentRoster` matches the role slugs by name and returns the rest as `custom`; `export` has no kind detection. So nothing to put under Proposed Spec Changes.
- `agentSlug('implementation', app)`: `src/commands/agents.js` (file name of the candidate), `src/templates/agent-md.js:28` (definition). Now also the only source of `implementationSlugs`.
- A3 holds for `curate`/`curate baseline` flags (`--mode` is declared on `curate`), but the CLI did not pass it to `curateBaseline`, and `agentsSync` ignored it: both now take `repoMode`; `curate()` forwards it to `agentsSync`.
- A2 holds: `makeOldRepo` renders known kinds only; the recorded `curate-old-repo.*.json` still match.
- A4 holds: `listDraftFiles` globs `<agentDir>/*.md`.
- No AC contradicted; no STOP.

## Old tests changed (goldens untouched)
- `test/devops-kind-detection.test.js` (regression test): asserted `detectKind('apps-web.md')` / `'random-unknown-name.md'` is `implementation`. Now `apps-web.md` is `implementation` only when `['apps-web']` is passed, `null` otherwise. Reason: fallback removed.
- `test/sdd03d-implementation-spec.test.js` AC-6: precondition asserted `web.md` is the fallback kind. Now `detectKind(web.md, ['web'])`. Same reason.
- `test/sdd02d-planner-audit.test.js` AC-10 (both fixtures): expected no warnings with a custom `security.md`. Now expects no `tools` warning and exactly one `unknown-kind` warning for it (Q-2).
- `test/skills-pointer.test.js` H10: held "unrecognized kind asked with default No". Rewritten: per-app agent (`payments.md`, package name `payments`) is offered with default Yes; `custom.md` is not offered, unchanged, listed in `pointers.unknownKind`.
- `test/helpers/frozen-kinds.js`: `renderAgents` got optional `extraApps` and `dir` (existing callers unchanged).
- `test/kind-guard.test.js`: `todo` option and the stale comment removed from AC-7.

## Unexpected
- Result shapes: first version added `unknownKind: []` to the results of `agentsSync`, `curateBaseline` and `scaffold skills`; recorded reports (`curate-old-repo`, `skills-pointer`) compare those results entry for entry and failed. `unknownKind` is therefore present only when non-empty.
- CAF.md has no section about `curate` at all, so AC-11's "bagian perilaku saat ini" had no obvious home; I added one paragraph after the agent table in Layer 2. Move it if you prefer another place.
- `test/sdd03c2d-skill-rename.test.js` AC-5 ("the implementation fallback is not checked") still passes, now because the file is unknown; its title is out of date, left alone.
- `audit` summary line still says "rollout steps `curate sync` does not carry" and now also counts `unknown-kind` warnings; text unchanged on purpose (recorded outputs).
- `curate baseline` with only unknown files prints "Nothing to baseline — every existing section already has a manifest entry." next to the skip lines.
- The golden recorder (`test/helpers/record-sdd03g.mjs`) was run once from unchanged `src/` and is kept for reference; do not rerun.

## Proposed Spec Changes
Tidak ada
