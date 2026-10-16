# Verify Report: CAF-FORCE-REBASELINE-01

Status: **SUCCESS**

## What was built

`caf-init curate baseline --force --file <path> --section <header>` — explicit, scoped
re-baseline for one `CONFLICT` section. Never writes file content, only
`.caf/.generate-manifest.json`.

Design decision (Task 1, confirmed with user): a flag on the existing `curate baseline`
subaction, not a new top-level command. Reuses the existing `[subaction]`/options pattern
in `src/index.js` instead of adding another CLI surface.

## Files changed

- `src/commands/curate-baseline.js` — added `curateForceRebaseline()`
- `src/index.js` — wired `--force`, `--file`, `--section` options onto `curate baseline`
- `test/curate-force-rebaseline.test.js` — new, 7 tests
- `README.md` — new `### curate init baseline --force` section with full invocation example
- `CLAUDE.md` — usage note under "Content-level section tracking", referencing the
  `caf-auditor.md`/`CAF-SECTIONPARSE-01` case this was built for

## Example invocation

```bash
caf-init curate baseline --force \
  --file .claude/agents/caf-auditor.md \
  --section "Report Format" \
  --dir /path/to/target-repo
```

Interactive by default — prints the section's current content and the predicted
post-rebaseline status, then prompts for confirmation. Add `--yes` to skip the prompt
(scripting) or `--dry-run` to preview without writing anything.

Rejects any status other than `CONFLICT`, with a message pointing at the right command:

| Actual status | Message |
|---|---|
| `DRIFT` | "Use `caf-init curate --sync-only` instead." |
| `CUSTOMIZATION` | "Already tracked as your customization — nothing to do." |
| `IN_SYNC` | "Already IN_SYNC — nothing to do." |
| `UNTRACKED` | "Use `caf-init curate baseline` (no --force) instead." |

Missing `--file` or `--section` is rejected outright (no bulk/implicit target — one section
per invocation, by design).

## One correction to the ticket's acceptance criteria

`requirements.md`/`tasks.md` describe the post-rebaseline status as "`IN_SYNC` or
`CUSTOMIZATION`". Implemented behavior is **`IN_SYNC` or `DRIFT`**, not `CUSTOMIZATION` — and
this isn't a shortcut, it's forced by `compareSection`'s own definition
(`src/utils/section-diff.js`): re-baselining sets `baseline := current`, so `current` always
equals the new baseline immediately afterward. `CUSTOMIZATION` requires `current !== baseline`
by definition, so it is structurally unreachable right after a rebaseline — the correct
post-state comparing current-vs-new-baseline-vs-template is either `IN_SYNC` (current matches
template too) or `DRIFT` (current matches the new baseline but the template has since moved
on — same as any freshly-recorded section). This was caught by the first test run (asserted
`CUSTOMIZATION`, got `DRIFT`) rather than assumed — see the two dedicated tests below. Test
and doc wording were both written to `DRIFT` to match the codebase's real invariant rather
than the ticket's literal wording.

## Test results

```
node --test test/*.test.js
```

```
# tests 71
# suites 0
# pass 71
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

64 pre-existing tests unchanged and passing, plus 7 new tests in
`test/curate-force-rebaseline.test.js`:

1. **CONFLICT → DRIFT**: current content differs from template after re-baseline. Asserts
   file content byte-for-byte unchanged (`assert.equal(after, before)` on the raw file
   bytes) and manifest hash now equals `hashSection(currentBody)`.
2. **CONFLICT → IN_SYNC**: current content happens to equal the template after re-baseline.
   Both branches of the post-state are exercised, not just one (ticket Task 3 explicitly
   asked for both).
3. **Refuses DRIFT**: baseline manifest unchanged byte-for-byte (`assert.equal` on the raw
   manifest file), `rebaselined: false`.
4. **Refuses IN_SYNC**: same manifest-unchanged assertion.
5. **Refuses UNTRACKED**: no manifest file created at all.
6. **`--dry-run` on CONFLICT**: manifest unchanged, nothing written.
7. **Missing `--file`/`--section`**: rejected without touching the filesystem.

A "user declines the confirmation prompt" test was attempted but dropped — `prompts()` in
this non-TTY test environment hangs waiting on stdin rather than resolving to a falsy
default, so it can't be exercised without stdin mocking infrastructure that doesn't exist
in this test suite yet (none of the pre-existing tests mock `prompts()` either — they all
pass `yes: true`). The confirmation gate itself is still covered structurally: every
positive-path test explicitly passes `yes: true` or `dryRun: true`, and the code path that
writes the manifest is unreachable without one of those two flags — this is the same
verification pattern the existing `curate-baseline.test.js` uses.

## Out of scope (per ticket, not done here)

- No re-baseline was run against `coderium-web-v2`/`umkm-pos` — that's the next, separate
  session, using the invocation example above once this capability is confirmed `SUCCESS`
  here.
- No auto-detection of "safe to re-baseline" — the command has no git-history awareness;
  the human verifies that first (as was already done manually for `caf-auditor.md` in both
  target repos before this ticket existed).
