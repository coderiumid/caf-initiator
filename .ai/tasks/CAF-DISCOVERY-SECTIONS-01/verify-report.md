# Verify Report: CAF-DISCOVERY-SECTIONS-01

## Status: SUCCESS

## Summary

`buildToolsSection`/`buildInputSection`/`buildOutputSection` (`src/templates/agent-md.js`) now
have real `pm`/`ux-designer` branches, sourced from `DISCOVERY_ALLOWED_TOOLS`/`DISCOVERY_FOCUS`
— new exports in `src/templates/discovery-commands.js`, the same constants `discoveryAgentMd()`
itself renders from. `DISCOVERY_GUARDED_SECTIONS` (`src/utils/agent-sections.js`,
`CAF-RETRYLOGIC-01`) is removed entirely; `SYNCABLE_SECTIONS` compares all three sections
normally for every kind now.

## Task 1 — Investigation (checkpoint, confirmed by user before implementation)

Confirmed: `caf-pm.md`/`caf-ux-designer.md` are rendered by `discoveryAgentMd()`
(`discovery-commands.js`), not `buildAgentMd` — same pattern as `Retry Logic`
(`CAF-RETRYLOGIC-01`). The canonical content for all three sections already existed verbatim in
`discoveryAgentMd()`'s literal `## Allowed Tools` block and the `focus.input`/`focus.output`
params passed by `buildPmAgentMd()`/`buildUxDesignerAgentMd()` — matching
`requirements.md`'s "Konten yang Direcover" word-for-word, already in English. No translation or
new content design was needed; the work was making `agent-md.js`'s builders reachable from that
same source instead of falling through to Cluster 2 defaults.

`Working Pattern (PIV)` wording alignment (optional item): user decided **skip, separate
ticket** (`AskUserQuestion`, 2026-09-04). Not touched in this ticket. Logged as still-open in
`.ai/tasks/CAF-RETRYLOGIC-01/open-items.md`.

## Task 2 — Role-aware builders

Content verified copy-paste-exact against `requirements.md`, not retyped from memory:

- **Allowed Tools** (`pm`/`ux-designer`, identical): the Read/Write/tracker-prohibition block —
  moved verbatim into `DISCOVERY_ALLOWED_TOOLS` (`discovery-commands.js`), which
  `discoveryAgentMd()`'s template now interpolates (was an inline literal) and
  `buildToolsSection(kind)` returns for `DISCOVERY_KINDS`.
- **Input**: `DISCOVERY_FOCUS.pm.input` / `DISCOVERY_FOCUS['ux-designer'].input` — moved verbatim
  from the `focus: { input: ... }` object literals previously inlined in
  `buildPmAgentMd`/`buildUxDesignerAgentMd`. Different per agent, as required
  (pm: optional feature-catalog/prd/tracker reads; ux-designer: required `prd.md` from PM Agent).
- **Output**: `DISCOVERY_FOCUS.pm.output` / `DISCOVERY_FOCUS['ux-designer'].output` — same
  relocation. Different per agent (pm: `prd.md` + conditional `flow.md`; ux-designer: `flow.md`).

Test proving word-for-word match against `requirements.md` (copied inline as
`CANONICAL_*` constants, then asserted equal):

```
test/discovery-sections.test.js
  buildToolsSection(pm/ux-designer) matches the canonical text word-for-word         ok
  buildInputSection(pm/ux-designer) matches ... and differs between them              ok
  buildOutputSection(pm/ux-designer) matches ... and differs between them             ok
  builder output matches the actual rendered file content (single source of truth)    ok
```

The last test additionally proves the builder output is byte-identical to what
`buildPmAgentMd({})`/`buildUxDesignerAgentMd({})` actually renders — not just equal to a
hand-copied string, but equal to the real generated file.

Kind other than Delivery/`auditor`/`devops` unaffected — `DISCOVERY_FOCUS[kind]` is `undefined`
for every non-Discovery kind, so the new branches in `buildInputSection`/`buildOutputSection`
fall through unchanged; `buildToolsSection` unchanged for the same reason
(`DISCOVERY_KINDS.includes(kind)` is `false`).

## Task 3 — Guard removed

`DISCOVERY_GUARDED_SECTIONS` and `guardDiscovery()` deleted from `src/utils/agent-sections.js`.
`SYNCABLE_SECTIONS['Allowed Tools'|'Input'|'Output']` now call the builders directly, same shape
as `'Retry Logic'` already had. Comment block above `SYNCABLE_SECTIONS` rewritten to explain why
the guard is gone (see `CLAUDE.md` "Content-level section tracking" for the durable version of
this explanation). `Retry Logic` untouched — still calls `buildRetryLogicSection(kind)` exactly
as before.

## Task 4 — Regression evidence

Full suite: **64/64 pass** (57 pre-existing + 7 new in `test/discovery-sections.test.js`).

```
$ node --test test/*.test.js
...
# tests 64
# suites 0
# pass 64
# fail 0
# cancelled 0
```

**Byte-for-byte, no regression for other kinds** — `test/discovery-sections.test.js`, test
`"regression: Allowed Tools/Input/Output for every Delivery kind + auditor is unchanged,
byte-for-byte"`: golden strings captured live off HEAD (`planner`/`auditor`/`devops` Tools,
`frontend`/`auditor`/`devops` Input, `frontend`/`auditor`/`devops` Output) asserted equal to the
post-change builder output. Passed.

Also updated the now-obsolete `CAF-RETRYLOGIC-01` guard test in
`test/retry-logic-role-aware.test.js` (`"Discovery-guarded sections are held back for Discovery
kinds only"` → was asserting `SYNCABLE_SECTIONS[header](kind) === null` for the three guarded
headers; that assumption is no longer true, so the test is rewritten to assert they're live for
every kind, renamed to reflect CAF-DISCOVERY-SECTIONS-01 superseding the guard).

**`curate audit` on a correct fixture → `IN_SYNC`, not `DRIFT`** —
`"curate audit: correctly-generated caf-pm.md/caf-ux-designer.md read IN_SYNC on Allowed
Tools/Input/Output"`: builds both `caf-pm.md` and `caf-ux-designer.md` via the real
`buildPmAgentMd`/`buildUxDesignerAgentMd`, baselines every section, then asserts
`compareSection()` returns `IN_SYNC` for all three target sections on both files. (`Working
Pattern (PIV)` deliberately excluded from this assertion — still legitimately `DRIFT`, see Task
1 note above; not part of this ticket's DoD.)

**`curate audit`/`curate sync` on a broken fixture → `DRIFT` then repaired** —
`"regression guard: a fixture still carrying the old generic-TODO content reads DRIFT and curate
sync repairs it to the Discovery version"`: constructs a `caf-pm.md` fixture with the pre-fix
generic Cluster 2 fallback content (what `buildToolsSection`/`buildInputSection`/
`buildOutputSection` produced for `kind='pm'` before this ticket) in place of Allowed
Tools/Input/Output, baselines it, confirms `auditAgentDefinitions` reports `DRIFT` on all three,
runs `agentsSync()`, then asserts the file now contains the exact Discovery-correct text and the
manifest baseline was updated to match. Proves the unguard is safe in the direction that matters
— a still-broken production file gets *fixed*, not further corrupted.

## Out of scope — untouched, confirmed

- `coderium-web-v2` / `umkm-pos` — not touched this session; their `caf-pm.md`/`caf-ux-designer.md`
  repair is separate follow-up work now that the builder is correct.
- `caf-auditor.md` `## Report Format` CONFLICT — unrelated, not touched.
- `## Working Pattern (PIV)` wording alignment — explicitly deferred per user decision (see Task 1).

## Files changed

- `src/templates/discovery-commands.js` — added `DISCOVERY_ALLOWED_TOOLS`, `DISCOVERY_FOCUS`
  exports; `discoveryAgentMd()` and `buildPmAgentMd`/`buildUxDesignerAgentMd` now reference them
  instead of inline literals (single source, byte-identical rendered output).
- `src/templates/agent-md.js` — `buildToolsSection`/`buildInputSection`/`buildOutputSection` gain
  Discovery branches backed by the above.
- `src/utils/agent-sections.js` — `DISCOVERY_GUARDED_SECTIONS`/`guardDiscovery()` removed;
  `SYNCABLE_SECTIONS` calls builders directly.
- `test/discovery-sections.test.js` — new, 7 tests (see Task 4).
- `test/retry-logic-role-aware.test.js` — 1 test updated to match post-guard-removal behavior.
- `.ai/tasks/CAF-RETRYLOGIC-01/open-items.md` — heading-mismatch item annotated resolved, PIV
  wording alignment noted as still open/deferred.
- `CLAUDE.md` — "Content-level section tracking" section updated to describe the current
  (post-guard) state instead of the now-stale `DISCOVERY_GUARDED_SECTIONS` description.
