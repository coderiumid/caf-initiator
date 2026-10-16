Status: SUCCESS

# CAF-SDD-03c3 — verify report

Branch `ai-agent/CAF-SDD-03c3` (local, nothing pushed). `npm test`: 776 tests, 775 pass, 0 fail, 1 todo (the `implementation` fallback test of `kind-guard.test.js`, kept). `requirements.md` and `tasks.md` were not edited; each got one trailing newline to match the given sha256 (088f47c3…, 09c75149…).

## Evidence per AC

| AC | Kind | Evidence |
|---|---|---|
| AC-1 | automated-test | `test/sdd03c3-single-repo-roster.test.js::AC-1: single-nuxt default — planner, architect, frontend, backend, validator, reviewer; the commands are the golden commands` |
| AC-2 | automated-test | `…::AC-2: single-nuxt.frontend / single-nuxt.backend — the file set and every file are byte-for-byte the golden` (golden `test/fixtures/pre-sdd03c3/`) |
| AC-3 | automated-test | `…::AC-3: caf-frontend.md and caf-backend.md of the default are the --role frontend and --role backend files` |
| AC-4 | automated-test | `…::AC-4: implementer is never offered, in SINGLE_REPO or MONOREPO; it is superseded, not hidden` (also asserts `HIDDEN_CANDIDATE_KINDS` is the five kinds); `…::AC-4: --role implementer is refused` (extra, see Proposed Spec Changes) |
| AC-5 | automated-test | `…::AC-5: a generated / a customized caf-implementer.md is left byte-for-byte…one note`; `…::AC-5: a caf-frontend.md that already exists is not overwritten`; `…::AC-5: a repo without caf-implementer.md gets no note` |
| AC-6 | automated-test | `…::AC-6: /caf-run-pipeline of the default roster names caf-frontend and caf-backend, not caf-implementer`; `…::AC-6: …rendered for a roster with implementer is byte-for-byte the golden` |
| AC-7 | automated-test | `…::AC-7: (i) / (ii) / (iii)…` — passed before any `src/` change: `readAgentRoster` already handled all three cases (see T1) |
| AC-8 | automated-test | `…::AC-8: .claude/commands/caf-complete-drafts.md / .caf/workflows/agent-handoff.md differs from the golden only on lines that name the implementation agents` |
| AC-9 | automated-test | `…::AC-9: mono-pnpm — the file set and every file are byte-for-byte the golden`; plus `test/repo-context.test.js` against the untouched `snapshots/mono-pnpm.json` |
| AC-10 | automated-test + command | `…::AC-10: no dead builder name is left in src/`, `…::the eight commands are still hidden, and their CLI target still says so`, `…::a selection that holds the auditor, PM and UX Designer still writes none…`; frozen-kinds goldens unchanged. command: `git grep -n -E "<8 builder names>" -- src` \| exit 1, empty output |
| AC-11 | automated-test | `…::AC-11: single-nuxt — agents, commands, skills, workflow, then curate --audit-only: nothing for frontend, backend or validator` |
| AC-12 | manual | `git diff main -- test/fixtures/snapshots/` is empty: no snapshot entry changed, as T1 predicted (mono-pnpm unaffected). `mono-pnpm.json` was not regenerated. |
| AC-13 | manual | README.md: `--role` row, "Implementer is replaced", roster line, SINGLE_REPO bullets incl. "Migrating a repo that has `caf-implementer.md`". CLAUDE.md: Repo mode bullet, 03c1 bullets, new section "SINGLE_REPO roster and the dead builders (CAF-SDD-03c3)". |
| AC-14 | command | `npm test` \| exit 0 (776/775/0 fail/1 todo); `git diff --stat main -- test/fixtures/frozen-kinds/` \| empty. `kind-guard.test.js` todo test still present. |

## T1 result (read-only audit)

- **A1 holds.** `--role` set the candidate's kind (`implementer` default, or `frontend`/`backend`); `buildSingleRepoCandidates` inserted that one candidate before `qa`. Both agents use the same fields, so default and `--role` are byte-identical (AC-3 test).
- **A2 holds.** The rendered `caf-frontend.md` (`--role frontend`) has `## Scope`: "Whole repository — this is a single-package repo with no per-app split…". No sentence says it is the only implementation agent. No STOP.
- **A3 holds.** `/caf-run-pipeline` takes `implementationRoles` from the picked candidates (`agents.js`), and `implementationSection` lists them generically. No hard-coded `caf-implementer`. Finding (no spec change needed): its routing step 4 says "matches more than one agent's scope → ask the user"; with two whole-repo agents a task always matches both. Text left as is (out of scope, "nothing else in the command moved").
- **A4 holds.** Callers of the eight builders: only `agents.js` (`PREVIEW_COMMANDS` entries for design/qa/review-ticket, `companionGroups` for auditor/PM) behind `isHiddenCommand`, `feature-catalog-sync.js` (after an unconditional hidden-return), and `test/sdd03c1-stop-scaffold.test.js`. No CLI target and no `curate audit`/`export` path reaches them.
- **A5 holds.** `scaffold agents` uses `writeIfAbsentGuarded`: existing files are skipped; `detectLegacyCollision` looks for `frontend.md`, not `caf-implementer.md`, so no collision. Only the note was new.
- Roster readers: `readAgentRoster` already listed Implementer only when its file exists and dropped Frontend/Backend rows only when an implementer exists without them → AC-7 needed no `src/` change.

## Code removed (each with its T1 evidence)

- `src/templates/audit-commands.js` (both exports; callers: dead `companionGroups`, sdd03c1 test).
- `src/templates/discovery-to-ticket.js` (`buildDiscoveryToTicketMd`; same).
- `src/templates/feature-catalog.js` (`buildFeatureCatalogSyncMd`; only the unreachable tail of `featureCatalogSync`).
- `buildDiscoveryStartMd` from `discovery-commands.js`, with `uxBranch`, `PRD_SECTIONS`, `FLOW_SECTIONS` (reference count 1 = definition only after the removal).
- `buildDesignTicketMd`, `buildQaCheckMd`, `buildReviewTicketMd` from `ticket-preview-commands.js`.
- In `agents.js`: their imports, three `PREVIEW_COMMANDS` entries, `companionGroups` loop, `getTracker`/`detectTracker` import, the "UX Designer without PM" block.
- `featureCatalogSync`: body after the hidden-return, prompts/detect imports (signature kept; `scaffold.js` unchanged).

## Left on purpose

- `HIDDEN_COMMAND_FILES`, `HIDDEN_CANDIDATE_KINDS`, `isHiddenCommand` (and its guard in the preview loop), the "no longer scaffolded" CLI message.
- All agent kinds and texts (pm, ux-designer, auditor, documentation, devops, implementer, qa), `buildPmAgentMd`/`buildUxDesignerAgentMd`, `DISCOVERY_*` constants.
- `src/utils/architecture-signatures.js`: now has no caller, but it is not a command builder (Q-3 scope); kept, doubt → leave. Candidate for a later cleanup.
- In `ticket-preview-commands.js`, helper parameters/branches only the removed builders used (`optionalFocus` etc.): not proven dead without reading each; left.
- `SINGLE_REPO_ROLES` still contains `implementer` (builder level; tests/goldens use it).

## Old tests changed or deleted

- `test/sdd03c1-stop-scaffold.test.js`: added `since03c3` mapping (implementer → frontend+backend) to the offered/agents/files expectations; "implementer is offered/written where it was" → "not offered/written"; the "keeps caf-implementer.md" test now expects frontend+backend. Reason: they held the default roster. **Deleted** `AC-2: …the builders of the eight dropped commands still render the text recorded before 03b3` (2 tests, one per fixture) and 5 imports: it tested only the removed builders.
- `test/sdd03b3-commands.test.js`: single-nuxt `PIPELINE_ROLES` and the `/caf-complete-drafts` expectation use frontend+backend instead of caf-implementer (default roster).
- `test/sdd03c2-validator-default.test.js`: roster expectations read through implementer→frontend+backend; `isOfferedCandidate({kind:'implementer'})` now false; `/caf-complete-drafts` list likewise.
- `test/single-repo-scaffold.test.js`: default scaffold expects frontend+backend and no implementer; the implementer-content tests (`SINGLE_REPO implementer…`, `--scope writes the implementer scope…`, `curate on a freshly generated caf-implementer.md…`) now build the kind with `role: 'implementer'`; `--role` default test and "candidates offered" test updated.
- Helpers/tests passing `role || 'implementer'` to `buildSingleRepoCandidates` now pass `role`: `test/helpers/default-file-set.js`, `test/helpers/commands-render.js`, `test/sdd03b1-validator.test.js`.
- Not touched: `test/helpers/frozen-kinds.js`, `sdd03e` (they ask for `'implementer'` by name, still valid), all goldens.

## Snapshot entries changed

None. `test/fixtures/snapshots/mono-pnpm.json`, `test/fixtures/frozen-kinds/*` unchanged (`git diff main --stat` empty for both). New golden: `test/fixtures/pre-sdd03c3/` (4 files, recorded first, commit 8f76940).

## Commits (local)

1. `8f76940` Record the pre-CAF-SDD-03c3 goldens
2. `3eb0910` Tests (red)
3. `0e4cbe7` SINGLE_REPO roster + implementer superseded + note
4. Remove dead command builders
5. Docs (README.md, CLAUDE.md)

`.ai/` is gitignored, so this report and the ticket files are not in any commit.

## Proposed Spec Changes

(Proposals only; the spec was not edited.)

1. **`--role implementer` is refused.** Spec says `--role frontend|backend` stays and is silent on `implementer`. Since the picker filters `implementer`, accepting it would generate no implementation agent. `--role` now accepts `frontend|backend` only (`SINGLE_REPO_OFFERED_ROLES`, `src/index.js`, `agents()`); error: `unknown --role "implementer" (choices: frontend, backend)`. Suggest adding this to Scope/AC-4.
2. **Routing ambiguity in `/caf-run-pipeline`** (finding, A3): two agents with identical whole-repo scope make step 4 always ask the user. Suggest a follow-up ticket (frontend/backend scope text or routing rule); not changed here.
3. **AC-7 passed before implementation**: the roster reader already supported all three cases. Suggest noting it in the spec.
4. **Dead-code scope**: `architecture-signatures.js` is now orphaned; suggest naming it in a cleanup ticket.
5. Note wording (AC-5): printed when `caf-implementer.md` exists and frontend/backend are in the selection (written or skipped), not only when newly written.
