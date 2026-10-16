## Status: SUCCESS

## Ticket: CAF-DEVOPS-KIND-01

## Summary
`devops` was missing from `KNOWN_KINDS`, so `detectKind()` misclassified `caf-devops.md`/
`devops.md` as `implementation`, which would let `curate sync` overwrite the deliberately
restrictive `## Allowed Tools` (`Read`+`Bash`) with implementation's `Read`+`Write`+`Edit`+
`Bash` — a latent privilege-escalation gap, never triggered in a real project (confirmed no
`caf-devops.md` exists in `coderium-web-v2`/`umkm-pos`/`caf-orchestrator`). Fixed at the source,
plus `devops` hidden from the interactive agent-picker menu as defense-in-depth.

## Checkpoint: Task 1 investigation (reported mid-session, confirmed by user before continuing)
- `KNOWN_KINDS` has exactly one consumer, `detectKind()` (`src/utils/agent-sections.js`) — no
  other iteration site depends on its contents. Safe to extend.
- `buildToolsSection('devops')` (`TOOLS_BY_KIND`/`TOOLS_RATIONALE`, `src/templates/agent-md.js`)
  was **already kind-aware and correct** (`Read`+`Bash`) before this ticket — the only bug was
  `detectKind()` routing to the wrong kind. So no `DISCOVERY_GUARDED_SECTIONS`-style guard entry
  was needed for `Allowed Tools` once `KNOWN_KINDS` was fixed.
- `buildInputSection('devops')`/`buildOutputSection('devops')` have no `devops` branch and fall
  through to their generic constant TODO fallback (no `ARTIFACT_BY_ROLE.devops` entry) — honest
  ("not yet defined"), and this fallback never carries real content that could be lost to an
  overwrite, unlike the Discovery incident this guard pattern was built for. **Decision: no guard
  for Input/Output either** — user confirmed via checkpoint before Task 2/3 proceeded.
- No non-interactive `--agent <kind>` flag exists anywhere in the CLI (`src/commands/agents.js`
  only exposes an interactive multiselect) — so hiding `devops` from that one multiselect's
  choices is the complete UI-level fix; no separate flag-blocking path was needed.

## Acceptance Criteria — evidence

- [x] `detectKind('caf-devops.md')` (and relevant filename variants) returns `devops`, not
  `implementation`.
  - Fixed in two parts (`src/utils/agent-sections.js`): (1) `devops` added to `KNOWN_KINDS`; (2)
    the `caf-` prefix strip in `detectKind()` now checks the unprefixed remainder against
    `KNOWN_KINDS` instead of the narrower `CAF_PREFIXED_KINDS` (which deliberately still excludes
    `devops` — `agentSlug()` generates the unprefixed name `devops.md`, not `caf-devops.md`), so
    both spellings resolve correctly.
  - Verified: `test/devops-kind-detection.test.js` — `detectKind recognizes devops filenames`
    (`devops.md` and `caf-devops.md` both → `'devops'`).

- [x] `Allowed Tools` for kind `devops` guarded from `curate sync` until confirmed kind-aware (or
  fixed in this ticket if small scope).
  - Task 1 confirmed the builder was already kind-aware; user confirmed via checkpoint that no
    guard-list entry is needed — the `KNOWN_KINDS` fix alone closes the gap. Documented in
    `src/utils/agent-sections.js` (comment above `KNOWN_KINDS`) and `CLAUDE.md`.
  - Verified: `test/devops-kind-detection.test.js` — `buildToolsSection(devops) is unchanged by
    the KNOWN_KINDS fix` and `curate audit: a correctly-generated caf-devops.md (Read+Bash) reads
    IN_SYNC, not DRIFT`.

- [x] Regression: full test suite (48 tests from prior sessions) still 100% pass.
  - `npm test` → 57/57 pass (48 pre-existing + 9 new across `test/devops-kind-detection.test.js`
    and `test/devops-menu-hidden.test.js`). No pre-existing test file was modified.

- [x] New test: fixture `caf-devops.md` with correct `Allowed Tools` (Read+Bash) → `curate audit`
  does not report `DRIFT`/overwrite to `implementation`'s version.
  - `test/devops-kind-detection.test.js` — `curate audit: a correctly-generated caf-devops.md
    (Read+Bash) reads IN_SYNC, not DRIFT` and `regression guard: ... confirm the pre-fix failure
    mode is gone` (runs `agentsSync`, asserts `Allowed Tools` body unchanged, no `Write`/`Edit`,
    `result.drifted` empty).

- [x] Explicit decision + rationale recorded for `Input`/`Output` (guard or leave).
  - Decision: **leave unguarded**. Rationale recorded in `src/utils/agent-sections.js` (comment
    above `KNOWN_KINDS`) and `CLAUDE.md` ("Content-level section tracking" section): both builders
    fall through to a constant generic TODO placeholder for `devops`, which is accurate ("CAF.md
    doesn't define the DevOps artifact contract yet") and has no real content an overwrite could
    destroy.

- [x] `devops` no longer appears in the interactive `caf-init scaffold agents` picker — confirmed
  by reading the option list before/after.
  - `src/commands/agents.js`: added `HIDDEN_CANDIDATE_KINDS = ['devops']`, filtered out of the
    `prompts` `choices` array at the multiselect call site. Candidate definition (`kind: 'devops'`
    entry in `buildCandidates()`) left intact — only the offer is suppressed, per ticket
    instruction not to delete the builder definition.
  - Verified: `test/devops-menu-hidden.test.js` — `devops candidate still exists in
    buildCandidates()` and `devops is listed in HIDDEN_CANDIDATE_KINDS and would be filtered from
    the multiselect choices` (also asserts every other candidate stays offered, count == total-1).
  - No live `caf-init scaffold agents` run was performed (explicitly out of scope) — verified by
    reading `buildCandidates()`/the `choices` construction directly, which is what the ticket's
    "or membaca daftar opsi di kode" alternative allows.

- [x] Non-interactive path decision.
  - Investigated: `src/commands/agents.js`'s `agents()` export takes only `{ dir, app, agentDir,
    commandDir, dryRun, overwrite }` — no `--agent`/kind-selection flag exists anywhere in the CLI
    (checked `src/index.js` command wiring too). There is no non-interactive path to block;
    documented in the code comment above `HIDDEN_CANDIDATE_KINDS` and in this report so a future
    flag addition knows to consult this decision.

## Files changed
- `src/utils/agent-sections.js` — `devops` added to `KNOWN_KINDS`; `detectKind()` prefix-strip
  check switched from `CAF_PREFIXED_KINDS` to `KNOWN_KINDS`; removed now-unused
  `CAF_PREFIXED_KINDS` import.
- `src/commands/agents.js` — `HIDDEN_CANDIDATE_KINDS` added and applied as a filter on the
  multiselect `choices`; `buildCandidates` exported for testability.
- `test/devops-kind-detection.test.js` — new (7 tests).
- `test/devops-menu-hidden.test.js` — new (2 tests).
- `.ai/tasks/CAF-RETRYLOGIC-01/open-items.md` — `devops` entry marked fixed, cross-referenced to
  this ticket.
- `CLAUDE.md` — new paragraph documenting the `KNOWN_KINDS` privilege-escalation pattern and the
  no-guard-needed decision for `devops`.

## Verify Checklist
- [x] `npm test` → 57/57 pass (0 fail)
- [x] Byte-for-byte regression: `detectKind()` unchanged for every other `KNOWN_KINDS` entry +
  `implementation` fallback (`test/devops-kind-detection.test.js`, `regression: every other
  KNOWN_KINDS entry...`)
- [x] `buildToolsSection` output for `planner`/`frontend`/`implementation`/`auditor`/`pm` unchanged
  (`test/devops-kind-detection.test.js`, `regression: buildToolsSection output for every
  non-devops kind is unchanged`)
- [x] Existing Discovery/Delivery retry-logic and section-tracking suites untouched and still pass
  (`test/retry-logic-role-aware.test.js`, `test/audit-agent-sections.test.js`, unmodified)

## Out of scope (confirmed not touched)
- No `caf-init scaffold agents` run to actually generate `caf-devops.md` anywhere.
- No changes to `coderium-web-v2`/`umkm-pos`/`caf-orchestrator`.
- No overlap with `CAF-DISCOVERY-SECTIONS-01` (pm/ux-designer content) — separate ticket, untouched.
