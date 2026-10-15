# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`caf-initiator` is a CLI (`caf-init`) that bootstraps CAF (Coderium Agent Framework) — Layer 1
knowledge-base files (`CLAUDE.md`, `AGENTS.md`, `.ai/tasks/README.md`, `docs/decisions/`,
`docs/golden-examples/`) — into an arbitrary **target repo**. It does not implement CAF itself;
it detects a target repo's stack/tracker and writes CAF's starter files into it.

`CAF.md` at the repo root is the full CAF spec/prompt that this tool implements a slice of
(Layer 1 file generation only — Layers 2-5 are manual/future work). It is reference material for
understanding *what* the generated files should contain, not an instruction to execute against
this repo.

## Commands

- Run the CLI: `node src/index.js <command> [options]` (bin name `caf-init` once installed/linked).
  Bare `node src/index.js` (or `npm start`) with no subcommand just prints help — there is no
  default action at the root.
- Main subcommands: `scaffold [target]` (init pipeline — see Architecture), `curate`
  (Layer 1-4 compliance audit + optional sync into `.claude/agents/*.md`, plus `curate baseline`
  for manifest backfill — see "Content-level section tracking" below), `export` (copy agent
  definitions to other AI runner targets), `docs` (optional Layer 1 reference docs). Run
  `node src/index.js --help` or `<command> --help` for full flags.
- `npm test` runs `node --test test/*.test.js` (Node's built-in test runner, no extra dependency).
  No linter or build step is configured in `package.json` — don't invent commands that don't
  exist there.
- Try it end-to-end against a scratch directory before trusting changes:
  `node src/index.js scaffold --dir /tmp/some-repo --dry-run`.

## Architecture

`src/index.js` is a `commander`-based CLI; each top-level command's logic lives in
`src/commands/`. The init pipeline itself is `caf-init scaffold`:

- **`src/commands/setup.js`** (`runSetup`) — the "Setup" step, a linear 4-step pipeline over
  `src/steps/`:
  1. **`01-audit-existing-tools.js`** — scans the target dir for existing AI-tool config
     (`.claude`, `.kiro`, `.opencode`, `openspec`, `.cursor`). If found, prompts the user to
     coexist, consolidate (manual, not automated), or cancel. Returns
     `{ action: 'continue' | 'stop' }`; `runSetup` exits early on `'stop'`.
  2. **`02-detect-stack.js`** — reads `package.json`, lockfiles, and monorepo markers
     (`turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`) to detect package manager,
     monorepo apps (`apps/*/package.json`, `packages/*/package.json`), per-app framework
     (via dependency-name signatures, most-specific-first order), and database (from
     `prisma/schema.prisma` or `.env.example`). The mode/package-manager/apps decision itself
     lives in `src/utils/repo-context.js` (`detectRepoContext`) — see "Repo mode" below.
  3. **`03-detect-tracker.js`** — detects Linear/Jira from marker files or README mentions;
     otherwise prompts the user. Never silently defaults to a tracker.
  4. **`04-generate-drafts.js`** — renders templates from `src/templates/` and writes them via
     `writeIfAbsent`/`ensureDir`.
- **`src/commands/scaffold.js`** (`runScaffold`/`runScaffoldTarget`) — chains Setup → Golden
  Examples → ADR → Agents → Task Completion → Workflow → AI Draft Completion, each step confirmed
  interactively (bare `scaffold`), or runs one target standalone (`scaffold <target>`).
- Other top-level commands (`audit.js`/`curate.js`, `export.js`, `reference-docs.js`) are layered
  on top of the same `detectStack`/`writeIfAbsent` primitives but are not part of the init chain.

`src/util.js` provides the shared file-system primitives. **`writeIfAbsent` never overwrites an
existing file** — this is the core safety guarantee of the tool (target repos may already have
partial CAF setups or unrelated content at the same paths). Preserve this behavior in any change
that touches file generation.

`--dry-run` must produce identical detection output and log what *would* be written, without
touching the filesystem — keep write paths and dry-run paths going through the same
`writeIfAbsent`/`ensureDir` helpers rather than branching logic per-step.

## Repo mode (`MONOREPO` / `SINGLE_REPO`)

`detectRepoContext` (`src/utils/repo-context.js`) is the only place that decides the repo mode;
don't re-derive it elsewhere — read `stack.mode` (or the legacy `stack.isMonorepo`). No
workspaces is **not** an error or a warning: it is `SINGLE_REPO` with
`apps = [{ name, path: '.' }]`. `--mode single|mono` (on `scaffold`, `docs`, `curate`) overrides
detection and must be threaded to every `detectStack` call a command makes.

- The app list is in a deterministic order: `findApps` sorts it by app path, in code-unit order
  (`byAppPath`, plain `<` — not `localeCompare`, so the locale can't change it either). Detection
  output must never depend on the order the file system or a glob lists entries in: fast-glob
  hands entries back as its directory reads complete, and before CAF-FIX-01 two calls on the same
  directory could return `apps/api, apps/web` or the reverse, which reached every file rendered
  from the list. Anything new that reads a directory or a glob and feeds a generated file sorts
  its result at the point it is read, not in each consumer. `test/fix01-detect-order.test.js`
  holds this with a stubbed `fs.readdir` (`test/helpers/readdir-order.js`, which must be the first
  import of a test file — fast-glob captures `fs.readdir` when it loads). The sort in
  `buildValidatorAgent` stays as a second guard; don't remove it.
- The MONOREPO path is frozen: `test/repo-context.test.js` compares detection plus every rendered
  file against `test/fixtures/snapshots/mono-pnpm.json`, recorded from the code before
  SINGLE_REPO support existed (renderer: `test/helpers/mono-snapshot.js`). Don't regenerate that
  snapshot to make a test pass — a diff there means MONOREPO output changed. It was regenerated
  once, on purpose, at CAF-SDD-03c1 (see "No longer scaffolded" below).
- SINGLE_REPO's default implementation agents are kinds `frontend` and `backend` (`caf-frontend.md`,
  `caf-backend.md`, both whole-repo scope), generated by `buildSingleRepoCandidates` in
  `src/commands/agents.js` instead of the frontend/backend app pickers (since CAF-SDD-03c3; before
  it the one agent was kind `implementer`). `--role frontend|backend` (SINGLE_REPO only) generates
  just one of them, with the same content as in the default — user-chosen, never inferred from the
  framework. `implementer` is in `SUPERSEDED_CANDIDATE_KINDS` and `--role implementer` is refused
  (`SINGLE_REPO_OFFERED_ROLES`), but `buildSingleRepoCandidates(.., 'implementer')` still builds the
  kind (tests and goldens use it). `--scope <dirs...>` writes their `## Scope` (and the
  `/caf-run-pipeline` commit whitelist) per directory; directories are validated, never inferred.
- `writeIfAbsent` runs `assertNoUnresolvedPlaceholders` (`src/utils/placeholder-check.js`) on
  everything it writes or dry-runs: a leftover generate-time `{{...}}` throws. `RUNTIME_TOKENS`
  (`{{TICKET-ID}}`, `{{feature-name}}`, ...) are the per-ticket tokens generated files keep on
  purpose — extend that list only for a token genuinely resolved at runtime.
- Known gap: the Planner's `## Input` (kind-only, syncable) still describes
  `## Frontend Tasks`/`## Backend Tasks` in SINGLE_REPO — it can't be made mode-aware without
  either changing MONOREPO output or making `curate sync` rewrite it (see
  `.ai/tasks/CAF-INIT-SINGLE-REPO/verify-report.md`).

## AI-assisted draft completion (`scaffold complete-drafts` / `curate --check-drafts`)

`caf-init` never calls a model and has no AI dependency — keep it that way (determinism is what
the tests and `curate`'s 3-way diff rest on). Instead `src/commands/complete-drafts.js` generates
`/caf-complete-drafts` (`src/templates/complete-drafts-command.js`), which the user runs in their
own AI runner, and `src/commands/check-drafts.js` verifies the result afterwards, read-only.

- The command's list of off-limits agent sections is rendered from `Object.keys(SYNCABLE_SECTIONS)`
  — never hand-copy it.
- A tracked section is compared against the **manifest baseline**, not the template (qa/reviewer
  `Input` embeds app names at generate time, so the kind-only template can't be the reference).
  Agents are `UNTRACKED` right after generation, so `complete-drafts` offers `curateBaseline`
  before the AI runs; without it the check reports `WARN`, never a false pass or a false `FAIL`.
- `check-drafts` must stay read-only (a test snapshots the tree before/after) and must only
  `FAIL` on things code can prove. Human-owned content (business context, PRD, ADR reasons,
  golden-example choice) is protected only by the command's ask-first instructions and the
  user's review — don't add a "check" that pretends otherwise, and don't soften the command's
  "leave the TODO and ask" into "infer a default".
- `listDraftFiles` (in `complete-drafts.js`) is the one inventory both the command and the
  checker use.

## Skills (`scaffold skills`)

`src/commands/skills.js` writes the universal CAF skills into `.claude/skills/<name>/SKILL.md` and
offers a `## Skills` pointer section to agent definitions that already exist. Explicit-only: it is
in `TARGETS` but not in `CHAIN_ORDER`. No `--skill-dir` — `curate` has no matching flag.

- `src/templates/skill-md.js` is the single source for the skill names (`SKILL_NAMES`, all
  `caf-`-prefixed), the kind → skills table (`SKILLS_BY_KIND`), the DRAFT banner
  (`hasSkillDraftBanner`) and the open-TODO predicate (`countOpenSkillTodos`). `skills.js`,
  `agents.js` and `check-drafts.js` all import from it — never hand-copy the table.
- `## Skills` is **not** in `SYNCABLE_SECTIONS` and must never be: which skills an agent points at
  is per-project data, and a syncable section would read as missing in every repo scaffolded
  earlier (and for pm/ux-designer). It is listed in `TEMPLATE_SECTION_ORDER` only because
  `insertSection` puts an unlisted header before `## Role`. `buildSkillsSection([])` returns `''`
  and `buildAgentMd`'s `skills` defaults to `[]`, so the frozen MONOREPO snapshot is unaffected.
  It renders before `## Constraints`, which is also where `insertSection` lands it.
- Agents read skills through `Read` pointers. Do not add a `skills:` frontmatter key (ignored under
  `claude --agent`) or the `Skill` tool to `TOOLS_BY_KIND` (changes the syncable
  `## Allowed Tools` for every kind, including read-only ones).
- The DRAFT banner is the only runtime gate. A pointer is written only for a skill whose file
  exists and has no banner; the section's rule text must not contain the word `TODO` (skills
  mention it in prose, and it would inflate `check-drafts`' per-agent count).
- `caf-piv` tells the reader to wait for the user's go-ahead, so it is mapped to no kind — a test
  enforces that. A skill an agent may point at must never say "wait for confirmation" and must
  never redefine a report file or status word (those live in the tracked sections). One
  deliberate, narrow exception (CAF-SDD-01): `caf-spec` defines the format of the spec artifact
  it exists for — `requirements.md`, including the `Status:` line inside it — and may name a
  report file. It still must not define the format or the status/verdict words of a report file
  (verify-report, validate-report, review-notes, qa-report). This covers `caf-spec` and
  `requirements.md` only; a test in `test/skills-spec.test.js` holds the boundary.
  A second one (CAF-SDD-02): `caf-traceability` states the per-AC evidence line of
  `verify-report.md` (`AC-n: automated-test — ...` and the four other forms: `command`,
  `build-only`, `manual`, `none`). It defines no status or verdict word and no other part of any
  report. The same five forms are in the verify-report format of
  `src/templates/agent-handoff-md.js`, so change both or neither (a test compares them).
- `caf-spec` is at v3 and `caf-traceability` at v2 since CAF-SDD-02b. Both are the ticket source
  verbatim, held by sha256 in `test/sdd02b-spec-v3.test.js` (`caf-traceability` also in
  `test/sdd02-planner-spec.test.js`; `caf-spec` as it is now, without its banner, in
  `test/sdd02c-spec-active.test.js`) — never reword them in `skill-md.js`. v3 adds: `Finding:` in
  section 3 (the ticket says X, the code shows Y), facts read from the code are not questions,
  an answered question keeps its original tag, no line numbers, and a third `Verify:` form,
  `command: <command> | expect: <exit code or output>`, reported in `verify-report.md` as
  `command` with the result observed. Nothing in caf-init runs or parses a `command:` — that is
  the validator's and the orchestrator's work (CAF-SDD-03b, 04).
- `caf-spec` is active since CAF-SDD-02c: the re-test of v3 with real dispatches passed, so the
  builder renders it without a banner (77 lines, the same text otherwise) and a planner gets a
  pointer to it. The pointer comes from the banner rule (`usableSkillPaths`), not from a
  hardcoded list — don't add one. `caf-spec` is mapped to `planner` only.
- `caf-traceability` is still born a DRAFT in every repo (no `TODO` line, its own 3-line banner,
  `SPEC_DRAFT_BANNER`), so no agent is pointed at it until a human removes the banner. Don't
  remove it from the template before the dispatch test with a validator.
- A skill already in a user's repo is never replaced (`writeIfAbsent`): a repo with the older
  text keeps it until the file is deleted by hand. A `caf-spec` written before 02c keeps its
  banner, and with it no pointer, until a human removes the banner.
  `caf-traceability` is mapped to `planner`, `frontend`, `backend` and `validator` (CAF-SDD-03b1)
  — not to `implementer`/`implementation`, which share the rest of the implementation list.
- Adding the section to an existing agent is the **one** sanctioned rewrite of an existing file:
  preview + per-file confirm, then `writeIfAbsent(..., { overwrite: true })` only after
  `isPureInsertion` proves new content = old content + exactly one block. An agent that already
  has `## Skills` is never edited, and `--force` never reaches agent files. Don't add another
  rewrite path, and don't relax that check.
- `caf-verify` is rendered by `buildVerifyChecklist` (exported from `agent-md.js`), the same
  function behind an agent's `## Verify Checklist` — keep it that way so the two can't disagree.

## Templates

`src/templates/*.js` export `build*({ ...detected stack/tracker fields })` functions returning
template-literal strings for the generated Markdown files. When adding a new generated file,
follow this same pattern: a pure `build*` function taking detection results, called from
`04-generate-drafts.js` and written via `writeIfAbsent`.

## Content-level section tracking (`curate audit`/`curate sync`/`curate baseline`)

`curate` doesn't just check whether a `## Heading` exists in an already-generated
`.claude/agents/*.md` file — for a fixed set of kind-only/constant sections (listed in
`SYNCABLE_SECTIONS`, `src/utils/agent-sections.js`) it compares actual content against the
current template. This closes the gap where a template bugfix (e.g. adding the `SUCCESS`
literal to Retry Logic — CDR-38) never propagated to already-generated files even via
`curate sync`.

The mechanism is a 3-way comparison (`src/utils/section-diff.js`, `compareSection`):
`baseline` (hash recorded in `.caf/.generate-manifest.json`, `src/utils/generate-manifest.js`,
at the last generate/sync) vs. `current` (hash of the file's content now) vs. `template` (hash
of what the template would produce now). This yields one of `IN_SYNC` / `DRIFT` /
`CUSTOMIZATION` / `CONFLICT` / `UNTRACKED`.

**Non-negotiable invariant**: `curate sync` only ever writes a section whose status is
`DRIFT` — which requires `current === baseline` by construction. A section edited since its
baseline can never be `DRIFT`, so it can never reach the write path
(`src/commands/agents-sync.js` — see the `if (status !== SECTION_STATUS.DRIFT) { ...; continue; }`
gate). Any change to this comparison or that gate must preserve that property; do not weaken
it for convenience, and add a byte-for-byte "file unchanged after sync" test for any new
status/branch that touches the write path.

A project that used `caf-init curate` before this feature existed has no manifest, so every
section reads as `UNTRACKED` (never a false `IN_SYNC`/`DRIFT`). `caf-init curate baseline`
backfills the manifest from current content as-is — it deliberately never edits file content
and never infers a baseline from git history (see `.ai/tasks/CAF-CURATE-DIFF-01/requirements.md`
for why that was rejected).

A section builder is only safe in `SYNCABLE_SECTIONS` if it answers correctly for **every**
`kind` in `KNOWN_KINDS` — including `pm`/`ux-designer`, whose files are rendered by
`discoveryAgentMd` (`src/templates/discovery-commands.js`), not `buildAgentMd`. A builder that
falls through to a Cluster 2 default for those kinds makes a correctly-generated Discovery
agent read as `DRIFT`, and `curate sync` then overwrites it — this is not hypothetical, it
happened to `caf-pm.md`/`caf-ux-designer.md` in two production repos and is the reason
`buildRetryLogicSection` takes a `kind` (CAF-RETRYLOGIC-01). `buildToolsSection`/
`buildInputSection`/`buildOutputSection` now have real `pm`/`ux-designer` branches too
(CAF-DISCOVERY-SECTIONS-01) — sourced from `DISCOVERY_ALLOWED_TOOLS`/`DISCOVERY_FOCUS` in
`src/templates/discovery-commands.js`, the same constants `discoveryAgentMd()` itself renders
from, so the compared-against template and the actual file content can never drift apart. There
is no more `DISCOVERY_GUARDED_SECTIONS` list — every entry in `SYNCABLE_SECTIONS` is compared
normally for every `KNOWN_KINDS` value. When adding a new syncable section, give it a real
Discovery branch (reusing a `discovery-commands.js` constant if the section already renders
there) rather than reintroducing a guard — a guard is a last resort for a section that hasn't
been designed for Discovery yet, not the default. `## Working Pattern (PIV)` follows the same rule
since CAF-SDD-03a2: `buildWorkingPatternSection(kind)` returns the Discovery wording (documents,
not code) for `pm`/`ux-designer`, a role pattern for `validator`/`reviewer` since CAF-SDD-03e (see
"Commands from the spec and the role Working Pattern" below), and the generic text for everything
else. The Discovery lines
are repeated there, not imported — `discoveryAgentMd()` still holds its own copy — and
`test/retry-logic-role-aware.test.js` plus the frozen-kinds goldens fail if the two differ. The
content question that was left open is decided: the Discovery text stays as rendered.

Not every tracked section is kind-only. `## Input` of `qa`/`reviewer` embeds the assigned app
paths (`appNames`, MONOREPO) at generate time, and nothing but the file records them. To compare
an **existing** section, `agents-sync.js` and `audit.js` therefore call
`templateForExistingSection(header, kind, body)` (`src/utils/agent-sections.js`), never
`SYNCABLE_SECTIONS[header](kind)` directly: it reads the app list back from the section body
(`parseInputAppNames`) and renders the template with it. Calling the kind-only builder there is
what made `curate sync` drop the app list (CAF-SDD-03a2). The kind-only call is still right for
"is this section part of the kind's template" and for the text of a section the file lacks.

- `null` from `templateForExistingSection` means the context is lost (sentence reworded, list not
  in the shape `buildInputSection` writes). The caller then compares as "template unchanged"
  (`templateHash = baselineHash`), which can only give `IN_SYNC` or `CUSTOMIZATION` — never
  `DRIFT`, so nothing is written. `curate sync` lists such sections (`unverifiable` in its
  result). Don't turn that into a guess or a fallback to the kind-only text.
- Reading from the current body is sound for the write path because only `DRIFT` is written and
  `DRIFT` requires current === baseline. No manifest field was added, so a manifest from before
  this fix works as is (`test/fixtures/legacy-manifest/`, recorded by the pre-fix code — never
  regenerate it).
- `parseInputAppNames` is anchored on the phrase `from the implementation agent`. A ticket that
  rewords that phrase in `buildInputSection` must keep the parser recognizing the old form, or
  every already-generated qa/reviewer `Input` becomes not comparable.
- `check-drafts` still compares against the manifest baseline only, so it needs none of this.

The planner's spec workflow (Specify, Clarify, Plan, Tasks — CAF-SDD-02) is rendered inside its
tracked `## Output`, after the one-line artifact contract (`PLANNER_SPEC_WORKFLOW` in
`agent-md.js`). It is there, not in `## Working Pattern (PIV)` and not in a section of its own,
because a CAF-SDD-03a2 test pins the Working Pattern of every non-Discovery kind (validator and
reviewer excepted since CAF-SDD-03e) to the generic
text and a new header would only reach existing planners through the interactive "add missing
section" prompt. An existing planner therefore gets it from `curate sync` as an ordinary `DRIFT`
of `Output`. Two things that text must keep: every artifact, path and stop token the planner had
before (`test/fixtures/pre-sdd02/` is the pre-change render — never regenerate it), and the
stop on the ticket path (CAF-SDD-03c2b: `Status: NEEDS_CLARIFICATION`, no `tasks.md`; see "The ticket run asks
through the status" below).
Since CAF-SDD-02c the planner has `Glob` and `Grep` on top of `Read` and `Write` (read-only, so a
fact about the repo is not a question; never `Bash` or `Edit`), and its `## Output` has two more
rules, both from a real dispatch: read the files that already exist in the task folder before
writing anything (a planner that did not re-read overwrote an approved spec with a DRAFT), and a
request to change an approved `requirements.md` is not written there — the proposal goes to
`verify-report.md` under `## Proposed Spec Changes` and the run stops with `Status: NEEDS_HUMAN`.
What that change must keep:
- The frontmatter `tools:` and `## Allowed Tools` are rendered from one map (`TOOLS_BY_KIND`), so
  a new tool changes both; the planner's rationale line names `Glob`/`Grep` as read-only.
  `## Allowed Tools` of every other kind is held by sha256 in `test/sdd02c-spec-active.test.js`.
- The two rules are whole lines added inside steps that already exist (the top of `### 1. Specify`,
  the end of `### An approved spec is a contract`): no new `###` heading. Everything else in the
  planner is byte-identical to `test/fixtures/pre-sdd02c/` — the pre-change render, never
  regenerate it. (CAF-SDD-02d changed `## Input` and `## Output` again; see below.)
- Rollout to a planner generated earlier is partly manual. `curate sync` carries `## Output` and
  `## Allowed Tools` as ordinary `DRIFT`. It does not write frontmatter, so `tools:` is edited by
  hand; and `## Skills` is not syncable and `scaffold skills` never edits an agent that has the
  section, so the `caf-spec` pointer is added by hand too. Until the frontmatter is edited, such a
  planner's `## Allowed Tools` names two tools it does not have. Don't make `## Skills` syncable
  or add a frontmatter write to close that gap.
- `mono-pnpm.json` was regenerated for this, one entry changed (`caf-planner.md`). Not a precedent.

Since CAF-SDD-02d the planner is stricter and has one status convention. Only its `## Input` and
`## Output` changed; everything else in the file, `tools:` and `## Allowed Tools` included, is
byte-identical to `test/fixtures/pre-sdd02d/` — the pre-change render, never regenerate it.
`test/sdd02d-planner-audit.test.js` holds every added or rewritten line verbatim and fails on any
other new line in the two sections. What that text must keep:
- `## Output` gained six rules, all whole lines inside steps that already exist (no new `###`
  heading): a fact `Read`/`Glob`/`Grep` can answer is read before it is written (this one was
  rewritten at CAF-SDD-02e, see below: it no longer says that what stays unknown is a `Finding:`);
  a section with nothing to say is written `Tidak ada`, never a placeholder; no `tasks.md` at all
  while a `BLOCKING` question has no `Answer:`; an AC with `Verify: automated test` names the test
  file or the task that creates it; the refusal to change an approved spec is the first line of
  `verify-report.md`, `Status: NEEDS_HUMAN`, never a line of `requirements.md`; the final message
  starts with one plain `Status: <value>` line.
- The rules are in `## Output`, not in `caf-spec`: a skill is never synced, and its text is held
  by sha256. Two of them differ from a skill on purpose, and the agent definition wins:
  `caf-spec` says to write `-` for an empty section, and `caf-no-guess` says to write an open
  item as a line that starts with the to-do word. Don't "fix" the skills to match.
- The word `TODO` must still not appear in that text (`check-drafts` counts it per agent), which
  is why the first rule said "a note ... that says something was not read yet".
- The ticket run (headless marker) was the one exception to "no `tasks.md`" (it wrote a blocked
  note) until CAF-SDD-03c2b dropped it, in `## Output` and `## Constraints` together; see "The
  ticket run asks through the status".
- One status convention: the status of `requirements.md` is a `Status:` line with the values
  `DRAFT`, `NEEDS_CLARIFICATION`, `APPROVED`, `NEEDS_HUMAN`, stated once in Specify. `## Input`
  used to call it a heading (`## Status: PLAN`, `## Status: NEEDS_HUMAN`); it now refers to that
  line. `PLAN` is not a status. A test rejects `## Status` anywhere in the planner.
- Rollout: `curate sync` carries `## Input` and `## Output` as ordinary `DRIFT`. A planner whose
  `## Input` was edited by hand is now a `CONFLICT` there (its template changed for the first
  time since CAF-SDD-02).
- `mono-pnpm.json` was regenerated for this, one entry changed (`caf-planner.md`). Not a precedent.
- Out of scope until their own tickets: the orchestrator's handling of `NEEDS_CLARIFICATION`
  (04b), and the language of the planner's artifacts (`Tidak ada` is a literal).

Since CAF-SDD-02e the planner reads what it claims, and neither puts a reading off nor guesses.
Only its `## Output` changed (`## Input` did not); everything else in the file is byte-identical
to `test/fixtures/pre-sdd02e/` — the pre-change render, never regenerate it.
`test/sdd02e-planner-read.test.js` holds every added line verbatim and fails on any other new
line in the section. The rules come from a re-test on two real tickets, where the 02d wording
came back as synonyms ("not compared yet", "not known yet") and as tasks that told the
implementer to read what the spec needed. What that text must keep:
- Eleven rules, all whole lines inside steps that already exist (no new `###` heading). Specify:
  a fact `Read`/`Glob`/`Grep` can answer is read before any artifact is written and is never
  handed on to the implementer (a task may say to read the file it is about to change); a
  `Finding:` or an AC about a behavior comes from a file opened with `Read` in this run, and a
  summary in `CLAUDE.md`, an ADR or a `Glob` name is a pointer; the ADRs whose name relates to the
  ticket are read and named in a `Finding:`, and a `Glob` result of mostly `node_modules` is
  narrowed; no artifact says something is still to be read, compared, checked or found out; an
  unsourced claim is `Assumption A-n:` with its basis; a `Finding:` is an observation; the
  planner's rules win over item 4 of `caf-no-guess`; an AC with several behaviors is split; a
  path or a symbol name only in a `Finding:`, an assumption and `Verify:`. Tasks: a `tasks.md`
  that holds tasks ends with `## Coverage`. Before declaring done: the same list, number or term
  everywhere, checked by reading the written files again.
- They state an intent, not a list of words to avoid: a list is what 02d had, and the synonyms
  got past it. A test rejects a quoted phrase in the "still to be read" rule. Don't add one.
- They replace the four 02d lines about a "not read yet" note, on purpose. The first sentence is
  kept. What reading cannot settle is no longer a `Finding:` that says what is not known: it is
  an assumption with its basis, or a question. Two 02d tests therefore compare the 02d text
  against `pre-sdd02e/`, not against the live render. The other five 02d rules are unchanged.
- The word `TODO` is still not in that text: the `caf-no-guess` line says "a line that starts
  with the to-do word".
- `## Coverage` is named inline, in backticks: a line that starts with `## ` would split the
  tracked section. (The blocked note of a ticket run, which held no tasks and got no coverage part,
  is gone since CAF-SDD-03c2b.)
- The skills are not changed (`caf-spec` and `caf-no-guess` are both held by sha256 in the test).
  Where they differ, the agent definition wins: `caf-spec` writes `Assumption:` with no number
  and lets a refactor ticket name the artifact in an AC.
- Rollout: `curate sync` carries `## Output` as ordinary `DRIFT`; a planner whose `## Output` was
  edited by hand is a `CONFLICT` and is left alone. Nothing to roll out for the skills.
- `mono-pnpm.json` was regenerated for this, one entry changed (`caf-planner.md`). Not a precedent.
- Out of scope until their own tickets: changing `caf-no-guess` (03f, if the re-test shows the
  one line is not enough), and whatever reads `tasks.md` learning about `## Coverage`.

Since CAF-SDD-02b that text also repeats three `caf-spec` v3 rules (what reading answers is a fact
and not a question, with at most 5 questions in the file; an answered question keeps its tag; the
three `Verify:` forms): change them there and in the skill together. `test/fixtures/pre-sdd02b/`
holds the SDD-02 planner render and the v2 `caf-spec` — never regenerate it.

The reviewer is spec-aware since CAF-SDD-03b2: `REVIEWER_SPEC_WORKFLOW` in `agent-md.js` is
rendered inside its tracked `## Output`, after the one-line artifact contract — the same placement
and the same reasons as the planner's text, so an existing reviewer gets it from `curate sync` as
an ordinary `DRIFT` of `Output`. It tells the reviewer to read the spec, the tasks, the reports
(`design.md` and `validate-report.md` "if present"), the ADRs and the diff, and to report scope
deviations, tasks not done, ACs whose evidence is `manual`/`build-only`/`none`/missing
(`needs human check`, never counted as passed), a change to an approved spec (blocking), every
`## Proposed Spec Changes` entry, and ADR violations by name. What that text must keep:
- `## Output` is the only reviewer section that changed. `## Input` (the sentence
  `parseInputAppNames` reads), `## Retry Logic`, `## Report Format` and `tools:` are byte-identical
  to `test/fixtures/pre-sdd03b2/` — the pre-change render, never regenerate it.
- It names no verdict value and adds no part to the `review-notes.md` skeleton: findings go under
  the `###` parts the skeleton already has. A test rejects `APPROVE`/`CHANGES REQUESTED`/`DEFER`
  in that text; `## Report Format` stays the single source.
- The reviewer reads evidence. It does not run the tests or the verification gate again and does
  not edit code, tests or the spec.
- `test/fixtures/legacy-manifest/` holds the hash of the old one-line reviewer `Output`, so the
  03a2 legacy-manifest test puts the pre-sdd03b2 reviewer in the repo and expects that one `DRIFT`.
- Out of scope until their own tickets: mapping a new skill to `reviewer`, and anything in the
  orchestrator (04). The commands became spec-aware in 03b3 — see "Commands and the spec" below.

The implementation agents are spec-aware since CAF-SDD-03d: `IMPLEMENTATION_SPEC_WORKFLOW` in
`agent-md.js` is rendered inside the tracked `## Output` of `frontend`, `backend` and
`implementer`, after the one-line artifact contract — the same placement and the same reasons as
the planner's text, so an agent generated earlier gets it from `curate sync` as an ordinary
`DRIFT` of `Output`. Five rules: read `requirements.md`, `tasks.md` and `verify-report.md` (if
present) before changing code; stop with `Status: NEEDS_HUMAN` when the spec says
`NEEDS_CLARIFICATION` or a `BLOCKING` question has no `Answer:` (`DRAFT` and `APPROVED` go on);
every AC is a contract and one that cannot be met is reported; never write `requirements.md` or
`tasks.md`, the proposal goes under `## Proposed Spec Changes` of `verify-report.md`; one evidence
line per AC. What that text must keep:
- Three kinds only, named in `SPEC_AWARE_IMPLEMENTATION_KINDS`. The `implementation` fallback of
  `detectKind()` shares the artifact line and must keep the line alone: giving it the text would
  make `curate sync` write it into every custom agent file. A test holds the `Output` of every
  other kind against `test/fixtures/pre-sdd03d/output-by-kind.json`.
- `## Output` is the only section that changed. Tools, `## Allowed Tools`, `## Input`,
  `## Retry Logic` and `## Skills` are byte-identical to `test/fixtures/pre-sdd03d/` — the
  pre-change render of the five cases (frontend/backend on mono-pnpm; implementer and both
  `--role` agents on single-nuxt, `test/helpers/implementation-agents.js`), never regenerate it.
- It has no vocabulary of its own. The five evidence lines are those of the verify-report format
  in `agent-handoff-md.js`, word for word (a test compares them with the rendered handoff), so
  the five evidence kinds are now named in five places: change all of them or none. The full
  layout of `verify-report.md` is referred to, not copied, and the word the orchestrator greps
  that file for is not in the text (the `Status:` words stay in `## Retry Logic`).
- Rollout to an agent generated earlier: `curate sync` carries `## Output`. `agent-handoff.md` has
  no sync; a repo whose copy predates the `## Acceptance Criteria` part gets it only by deleting
  the file and running `scaffold workflow` again.
- `test/fixtures/frozen-kinds/implementer.single-nuxt.json` was edited once for this, in
  `sections.Output` only, and `mono-pnpm.json` was regenerated with two entries changed
  (`caf-frontend.md`, `caf-backend.md`). Neither is a precedent.
- Out of scope until their own tickets: the `caf-traceability` pointer and banner, hiding
  `implementer` (03c3), and anything in the orchestrator (04).

The verify-report format lives in one generated file, `.caf/workflows/agent-handoff.md`
(`agent-handoff-md.js`). caf-orchestrator tests the WHOLE `verify-report.md` for `\bSUCCESS\b`,
so nothing added to that skeleton may contain the word outside the `Status:` line. That file is
written through `writeIfAbsent` and has no sync: a repo scaffolded earlier keeps its old format
until the file is regenerated by hand.

`curate audit` also prints two **rollout warnings** per agent file (CAF-SDD-02d,
`rolloutWarnings` in `src/commands/audit.js`), for the two parts of a template change that
`curate sync` does not carry: the frontmatter `tools:` list against the kind's template
(`templateToolsForKind` in `agent-md.js`, which covers pm/ux-designer through `DISCOVERY_TOOLS`),
and the active skills of the kind (`usableSkillPaths`, the generator's own banner rule) against
the paths named in `## Skills`. Before this an older planner with `tools: [Read, Write]` and no
`caf-spec` pointer read as "already in sync". What must stay true:
- Warnings only. They are returned as `warnings`, shown in Layer 2 with status `warn`, counted on
  their own summary line, and are never a gap or a `declined` entry: the exit code and every
  existing count are unchanged (`tools:` may be customized on purpose, a pointer left out by
  choice). `auditAgentDefinitions().entries` stays the section report alone.
- A repo with nothing to warn about prints nothing new: the recorded report of
  `test/fixtures/pre-sdd03c1/curate-old-repo.*.json` is compared entry for entry.
- Only files whose name is a known kind are checked. The `implementation` fallback is a guess
  about a custom file, so it is skipped. Tools are compared as a set.
- Read-only, deterministic, no model. The remedy in the message is the real one: frontmatter by
  hand; a pointer by hand when the agent has `## Skills`, `caf-init scaffold skills` when it has
  none. This reports the manual rollout steps, it does not perform them: don't turn it into a
  write, and don't make `## Skills` or frontmatter syncable.

`KNOWN_KINDS` must list every kind `detectKind()` should recognize — a kind missing from it
silently falls back to `implementation` (`Read`+`Write`+`Edit`+`Bash`), which is a privilege
escalation risk for any restricted kind (CAF-DEVOPS-KIND-01: `devops` was in `TOOLS_BY_KIND`
as read-only `[Read, Bash]` but missing from `KNOWN_KINDS`, so `caf-devops.md` misdetected as
`implementation`). Unlike the Discovery gap above, `devops` did NOT need a
`DISCOVERY_GUARDED_SECTIONS`-style guard entry once `KNOWN_KINDS` was fixed — its
`buildToolsSection` branch was already kind-aware and correct, and `buildInputSection`/
`buildOutputSection` fall through to a harmless constant TODO fallback for it (no real content to
lose). Add a guard only when a builder's fallback for a kind is itself wrong/misleading, not
merely generic.

`parseSections` (`src/utils/agent-sections.js`, shared by `replaceSectionBody` and by
`section-diff.js`'s `extractSection`/`hashSection`) is fence-aware: a `## ...` line inside a
` ``` ` fenced code block is not treated as a section boundary (CAF-SECTIONPARSE-01 — caf-auditor.md's
`## Report Format` embeds a report skeleton with literal `## Audit:`/`## Summary`/etc. lines
inside a fence). A `## `-style heading used as example content in a new template section MUST be
wrapped in a fenced code block for this reason — an unfenced example heading is still misread as
a real section boundary and will corrupt `curate sync` output.

## The `validator` kind (CAF-SDD-03b1; offered by default since CAF-SDD-03c2)

`validator` (`caf-validator.md`, tools `Read`/`Write`/`Bash`, no `Edit`) is a complete kind — it is
in `KNOWN_KINDS`, `CAF_PREFIXED_KINDS`, `TOOLS_BY_KIND`, `ARTIFACT_BY_ROLE` and `SKILLS_BY_KIND`,
and every tracked builder has a real branch for it. It was hidden until CAF-SDD-03c2 connected it
(see "The validator and /caf-plan in the default scaffold" at the end of this file); the bullets
below are still true unless that section says otherwise:

- Since CAF-SDD-03c2 it **is** an entry of `buildCandidates()`, offered by the picker
  (`isOfferedCandidate`); `HIDDEN_CANDIDATE_KINDS` is still only the five dropped kinds.
- The one way to render it is `buildValidatorAgent(dir, stack, { skills })` in
  `src/commands/agents.js`; `agents()` calls it for a validator candidate (the generic candidate
  path would give it no verification gate).
- Its `## Verify Checklist` is the repo's verification gate, built with `collectVerifyApps` (the
  derivation the implementation agents and `caf-verify` use) over every detected app. `qa`'s
  checklist is the two-line "not a single app" placeholder and stays that way (`qa` is frozen).
- Its `## Input` is kind-only: no app list, so `validator` is not in `APP_LIST_INPUT_KINDS` and
  needs no `templateForExistingSection` context.
- The per-AC rules are in its tracked `## Output` (`VALIDATOR_WORKFLOW` in `agent-md.js`, same
  placement and same reasons as `PLANNER_SPEC_WORKFLOW`); the `validate-report.md` skeleton and
  its status words are in `## Report Format` (`buildValidateReportFormat`). Its Retry Logic is its
  own (`VALIDATOR_RETRY_LOGIC`): it never gets the Delivery text, which tells an agent to fix and
  to write `verify-report.md`.
- Per AC: `PASS` only for `automated-test`/`command` evidence the validator ran itself; `FAIL`
  when run and contradicted; `UNVERIFIED` for everything else (`manual`, `build-only`, no named
  test, a test that imports no production code, a command it may not run, no evidence line).
  `UNVERIFIED` is never a report status and never makes the report `FAIL` on its own; the
  `Unverified:` line (count and ids) is mandatory.
- The five evidence kinds are now named in five places: the verify-report format
  (`agent-handoff-md.js`), the `caf-traceability` skill, `VALIDATOR_WORKFLOW`, since
  CAF-SDD-03b2 `REVIEWER_SPEC_WORKFLOW`, and since CAF-SDD-03d `IMPLEMENTATION_SPEC_WORKFLOW`.
  Change all five or none.
- `Status: PASS | FAIL | NEEDS_HUMAN` in `validate-report.md` keeps the shape `readQaReport()`
  parses for `qa-report.md` (first `Status:` line, uppercase). Nothing reads the file yet; under
  that parse `NEEDS_HUMAN` reads as not-a-pass. What the orchestrator does with it is CAF-SDD-04.
- Out of scope until their own tickets: renaming or removing `qa`, a `/caf-*` command for the
  validator, and removing the `caf-traceability` banner.

### Commands from the spec and the role Working Pattern (CAF-SDD-03e)

The validator runs the `Verify: command:` lines of the spec, and the validator and the reviewer
have a `## Working Pattern (PIV)` of their own. `test/sdd03e-validator-commands.test.js` holds the
text; `test/fixtures/pre-sdd03e/` is the pre-change render (validator, reviewer and planner per
fixture, and the Working Pattern of every kind) — never regenerate it.
- The command rules are in the validator's `## Allowed Tools` (`TOOLS_RATIONALE.validator`), where
  its Bash limit is: run only when `requirements.md` says `Status: APPROVED`; one command or an
  `&&` chain; rejected anywhere in the command itself (before ` | expect:`): `;`, `|`, a redirect
  (`>`, `>>`, `<`), `$()`, a backtick, `sudo`, `rm`, `curl`, `wget`, `git push`; not run →
  `UNVERIFIED` with the reason, never `FAIL`; run → compared with `expect:`, `PASS` on a match,
  otherwise `FAIL` with the output. `VALIDATOR_WORKFLOW` (`## Output`) refers to that section and
  does not repeat the rules. Text only: nothing in the runner enforces it.
- The validator still writes `validate-report.md` only. A proposed spec change is one line under
  `### Notes` of that file that starts with `Proposed Spec Changes:` — not the
  `## Proposed Spec Changes` part of `verify-report.md`, which the validator never writes, and not
  a new part of the `## Report Format` skeleton (unchanged).
- `buildWorkingPatternSection(kind)` returns `VALIDATOR_WORKING_PATTERN`/`REVIEWER_WORKING_PATTERN`
  for those two kinds; `buildAgentMd` passes the kind since this ticket (it passed none before).
  Every other kind, and no kind, renders byte-identical to `pre-sdd03e/working-pattern-by-kind.json`.
  The header keeps `(PIV)`: a renamed header reads as a missing section to `curate sync`. The
  pattern states no command rule, report format or verdict value; it refers to the sections that
  hold them (the validator's names `UNVERIFIED` once, as its Allowed Tools does).
- Neither kind has a `frozen-kinds` golden; none changed. `mono-pnpm.json` was regenerated for
  this, one entry changed (`caf-reviewer.md`, its Working Pattern only). Not a precedent.
- Rollout: `curate sync` carries the reviewer's `Working Pattern (PIV)` and the validator's
  `Allowed Tools`, `Output` and `Working Pattern (PIV)` as ordinary `DRIFT`; an edited section is
  a `CONFLICT` and is left alone. `tools:` did not change.

## Commands and the spec (CAF-SDD-03b3)

Slash commands are plain files written once through `writeIfAbsent`. They are **not** tracked:
the manifest records agent sections only, `curate audit`/`curate sync` never read
`.claude/commands/` (the existence check of `caf-feature-catalog-sync.md` went in CAF-SDD-03f), and nothing
propagates a template change to a command that already exists. A repo scaffolded earlier keeps
its old command until the file is deleted and scaffolded again. Don't describe a command change
as reaching existing repos through `curate sync`.

`test/fixtures/pre-sdd03b3/` is the render of all 13 commands for both fixtures from before this
ticket (`test/helpers/commands-render.js` runs the real scaffold commands on a temp copy) — never
regenerate it. `test/sdd03b3-commands.test.js` compares every command a scaffold still writes
against it, and `/caf-review` and `/caf-fix-review` differ only in the sections listed there.
Since CAF-SDD-03c1 eight of the 13 are no longer written: their builders are compared against the
same golden in `test/sdd03c1-stop-scaffold.test.js`, and two of the five that remain differ from
it only through the agents that are gone (see "No longer scaffolded" below).
A ticket that changes another command on purpose moves that file out of the identical list in
its own test and says so; it does not re-record the golden.

- `/caf-review` and `/caf-fix-review` are the webhook contract of caf-orchestrator
  (`run-pr-review.use-case.ts` mirrors their spawn prompts, `report-reader.ts` parses
  `fix-review-log.md`). Name, argument (a PR number), the verbatim prohibition sentence, the
  `review-notes.md` field list, the verdict → event table, the `fix-review-log.md` block and its
  three status values are held line by line in the test (`REVIEW_MARKERS`, `FIX_REVIEW_MARKERS`).
  Change text only inside a section that already exists; no new header, no new status value.
- `/caf-review` (sections 1, 3, 4, 5): the artifact folder is `.caf/tasks/{TICKET-ID}/` with the
  ticket ID step 0.5 resolved; with a `requirements.md` the reviewer gets the folder and its own
  `## Output` does the spec checks (referred to, not copied). Without one it is a code-only
  review, stated in the PR Review `body` and in chat. It never fails for a missing folder.
- `/caf-fix-review` (section 4, section 6, Constraints): a comment that asks to change goal,
  scope or an AC never edits `requirements.md`. The proposal is appended under
  `## Proposed Spec Changes` of `verify-report.md` — the one write besides `fix-review-log.md`,
  stated as an exception next to the unchanged prohibition sentence — and the log entry is
  `SKIPPED` with `Notes:` starting `Needs a human decision:`. The text must not contain the word
  the orchestrator greps `verify-report.md` for (a test holds that), and it tells the agent not
  to create `verify-report.md` when it is missing.
- `/caf-plan` (`src/templates/plan-command.js`, `buildPlanMd`) was **hidden** until CAF-SDD-03c2:
  nothing under `src/` imported it. It is now a `PREVIEW_COMMANDS` entry (written when the planner
  is picked) and the snapshot still has no entry for it. The `caf-spec` banner is gone (02c). It
  spawns `caf-planner` through the Task tool and carries none of the planner's rules — a test
  rejects planner rule text in it. `/caf-plan-ticket` is still generated, byte-identical, until
  03c replaces it.
- Out of scope until their own tickets: removing `/caf-plan-ticket` and the other commands to be
  dropped, renaming `/caf-run-pipeline` (03c), and anything in the orchestrator (04).

## No longer scaffolded (CAF-SDD-03c1)

A new repo no longer gets five agents (`documentation`, `devops`, `pm`, `ux-designer`, `auditor`)
and eight commands (`caf-discovery-start`, `caf-discovery-to-ticket`, `caf-audit-scan`,
`caf-audit-to-ticket`, `caf-design-ticket`, `caf-qa-check`, `caf-review-ticket`,
`caf-feature-catalog-sync`). This is "stop writing" only — the first half of a staged removal:

- Nothing was removed (the eight command builders were, at CAF-SDD-03c3, see the end of this file).
  Every kind is still in `KNOWN_KINDS` with its builder, the agent text is byte-identical, and the 15 `frozen-kinds` goldens still hold. A repo
  scaffolded earlier keeps its files, and `curate audit`/`curate sync` treat them as before
  (`test/fixtures/pre-sdd03c1/curate-old-repo.*.json`, recorded before the change). Don't delete a
  kind or a builder before the full-removal ticket: a kind missing from `KNOWN_KINDS` is detected
  as `implementation`.
- Agents: `HIDDEN_CANDIDATE_KINDS` (`src/commands/agents.js`) filters the picker, the only place
  a kind is chosen — `scaffold` has no flag that names an agent, and a test holds its flag list.
  The candidate definitions stay in `buildCandidates()`. A test that injects a candidate straight
  into `agents()` bypasses the picker and still gets the file; that is how the builders stay
  testable, not a path a user has.
- Commands: `HIDDEN_COMMAND_FILES` + `isHiddenCommand` (same file), checked where a command is
  **written**, not where it is offered — three of the eight belong to kinds that are still
  scaffolded (architect, qa, reviewer). `scaffold feature-catalog-sync` still resolves
  (`HIDDEN_TARGETS` in `scaffold.js` only takes it out of the help) and returns before detection
  and prompts, writing nothing. Since CAF-SDD-03f `curate audit` no longer reports the missing
  `caf-feature-catalog-sync.md` as an optional gap (nothing could close it), and a repo that has
  the file is audited as before: the file was only ever checked for existing.
- `implementer` is dropped by the design too but was **not** hidden: it was SINGLE_REPO's only
  implementation agent. CAF-SDD-03c3 replaced it (see the end of this file). `architect` and `qa`
  stay until `caf-design` and the connected validator exist.
- Derived output changed although no template did: a new repo has no Documentation agent, so
  `/caf-run-pipeline` is always rendered with `hasDocumentation: false` (the branch it always
  had), `/caf-complete-drafts` lists fewer agent files, and `piv-workflow.md`/`agent-handoff.md`
  list the roster as it is.
- The frozen snapshot follows what a scaffold writes: `test/helpers/mono-snapshot.js` skips
  hidden candidates and derives `hasDocumentation` from the candidates. `mono-pnpm.json` was
  regenerated once for this: three entries gone (`caf-documentation.md`, `caf-auditor.md`,
  `devops.md`), three changed (`piv-workflow.md`, `agent-handoff.md`, `caf-run-pipeline.md`).
  That is not a precedent for regenerating it.
- `test/fixtures/pre-sdd03c1/` is the default file set per fixture, mode and `--role` (paths
  only, `test/helpers/default-file-set.js`) and the `curate` report of an old repo
  (`test/helpers/old-repo.js`), both from before the change — never regenerate it.
- Generated text that still names a dropped agent or command (the planner's Discovery fallback,
  the `.gitignore` lines for `.caf/discovery/` and `.caf/audits/`, `/caf-review-ticket` in the
  review commands, the note about the PM agent in `.caf/knowledge/INDEX.md`) was unchanged on purpose
  here. CAF-SDD-03c2 fixed all of them except the `.gitignore` lines (kept on purpose); every rename
  is 03c2b.
- Do not publish a `caf-init` release with this change before caf-orchestrator handles a repo
  without `caf-documentation` (CAF-SDD-04).

## The final roster, and stale text aligned (CAF-SDD-03f)

The design ends with **five agents** — `caf-planner`, `caf-frontend`, `caf-backend`,
`caf-validator`, `caf-reviewer` — and **five commands** — `/caf-plan`, `/caf-run`, `/caf-review`,
`/caf-fix-review`, `/caf-complete-drafts`. Still scaffolded but transitional: `caf-architect`
(folded into the planner once a `caf-design` skill exists), `caf-qa` (renamed `caf-validator`),
`caf-implementer` (dropped), `/caf-run-pipeline` (becomes `/caf-run`) and `/caf-plan-ticket`
(replaced by `/caf-plan`). `caf-validator` and `/caf-plan` were still hidden when 03f was written;
CAF-SDD-03c2 put both in the default scaffold. Don't describe a transitional file as final, or a
final one as written by a scaffold when it is hidden.

Text that said something the code did not, now aligned. `test/sdd03f-stale-text.test.js` holds it,
against `test/fixtures/pre-sdd03f/` (planner, `piv-workflow.md`, `/caf-run-pipeline` from before the
ticket — never regenerate it):
- **Reviewer token.** The Parser Contract of `piv-workflow.md` names the `Verdict:` values the
  reviewer template writes (`APPROVE`, `CHANGES REQUESTED`, `DEFER`, with the space), which
  caf-orchestrator's `report-reader.ts` accepts (`test/reviewer-report-format.test.js` holds a copy of
  its regexes). `READY_FOR_HUMAN_REVIEW`/`NEEDS_CHANGES` were never written by any agent. Change the
  values in the reviewer's `## Report Format` and in `piv-workflow-md.js` together.
- **Roles not scaffolded.** `piv-workflow.md` lists Documentation, PM, UX Designer and Auditor as
  "not scaffolded" (`NOT_SCAFFOLDED_SLUGS`), with no TODO line. Any other absent role keeps the
  old "NOT present ... TODO: confirm" line.
- **Two retries.** The 3x is the verify retry inside one agent; the QA and Reviewer gates are the
  orchestrator's (default 1, `agents.qa.maxRetries`, `agents.reviewer.maxRetries`). `## Retry Logic`
  of the agents, `/caf-run-pipeline` and AGENTS.md still say "max 3x" and are unchanged on purpose.
- **Description of `/caf-run-pipeline`.** `Documentation →` appears only when `hasDocumentation`.
  Nothing else in the command moved; a repo that has the file keeps it.
- **Planner exception.** One rule in the planner `## Output`, right after the placement rule: on a
  refactor or config ticket only, the `When ... then` sentence of an AC may name the path or symbol
  that is the subject of the ticket. The `caf-spec` skill is unchanged (hash held); making it a
  skill rule is `caf-spec` v4 and a manual rollout. `curate sync` carries the rule as an ordinary
  `DRIFT` of `Output`.
- `mono-pnpm.json` was regenerated for this, three entries changed (`caf-planner.md`,
  `piv-workflow.md`, `caf-run-pipeline.md`). Not a precedent. `frozen-kinds` goldens did not change.
- The comments that counted four evidence kinds now say five (the verify-report format,
  `caf-traceability`, `VALIDATOR_WORKFLOW`, `REVIEWER_SPEC_WORKFLOW`, `IMPLEMENTATION_SPEC_WORKFLOW`).

## The validator and /caf-plan in the default scaffold (CAF-SDD-03c2)

A new repo gets `caf-validator.md` and `caf-plan.md`, and no `caf-qa.md`. Still transitional (not
final): `qa`, `plan-ticket`, `run-pipeline`, `architect` and `implementer`; their kinds, builders
and any file already in a repo are untouched. `test/sdd03c2-validator-default.test.js` holds the
ticket against `test/fixtures/pre-sdd03c2/` (default file sets, five commands, INDEX.md, planner,
reviewer, `/caf-run-pipeline`, from before it — never regenerate it).
- **Roster.** `qa` stays a `buildCandidates()` entry (frozen-kinds renders it, tests pick it) but
  is in `SUPERSEDED_CANDIDATE_KINDS`, not `HIDDEN_CANDIDATE_KINDS`, which still holds exactly the
  five dropped kinds (a test pins that). The picker filter is `isOfferedCandidate`, and the test
  helpers that mimic the picker use it too. `readAgentRoster` lists `caf-validator` only when its
  file exists and drops the QA line when `caf-validator.md` is there and `caf-qa.md` is not; a repo
  with `caf-qa.md` only reads exactly as before.
- **A repo that has `caf-qa.md`.** `caf-qa.md` is never touched (the picker cannot select `qa`, and
  `writeIfAbsent` would not overwrite it anyway). When `caf-validator.md` is written next to it,
  `agents()` prints one note: caf-orchestrator picks `caf-validator` when that file exists, so this
  switches the gate to `validate-report.md`.
- **`/caf-run-pipeline`** takes `gate: 'qa' | 'validator'` (default `qa`, which renders what it
  always did); `agents()` derives it from the picked candidates. The spec status section (`## Spec
  Status Check ...`, `SPEC_STATUS_SECTION`) is the only text a `qa` render adds to the pre-ticket
  golden; the test strips it by structure. It uses the vocabulary of the planner and the
  implementation agents (`Status:` values, `BLOCKING`, `Answer:`, `## Proposed Spec Changes`) and
  never writes `requirements.md` or `tasks.md`.
- **`/caf-plan`** reports `NEEDS_CLARIFICATION`/`NEEDS_HUMAN` to the human and runs no other agent;
  an `APPROVED` spec is reported as ready to be implemented. Planner rules stay in the planner.
- **`## Input`.** The reviewer's names `validate-report.md` and, for a repo still on `caf-qa`,
  `qa-report.md`, and keeps the phrase `from the implementation agent` that `parseInputAppNames`
  reads. The planner's lost the "Fallback — Discovery draft without a ticket" flow. Both reach a
  repo scaffolded earlier through `curate sync` as ordinary `DRIFT` (an edited `## Input` is a
  `CONFLICT` and is left alone). Commands and `piv-workflow.md` do not: delete the file and
  scaffold again. (The planner's `## Constraints` still pointed at the removed Discovery flow after
  this ticket; CAF-SDD-03c2b fixed it.)
- **Derived output moved without a template change:** `/caf-complete-drafts` lists `caf-validator.md`
  in place of `caf-qa.md` (so the "byte-identical" check of it is on the file minus that one line),
  and `piv-workflow.md`/`agent-handoff.md` list the roster as it is.
- **Older tests.** Tests of earlier tickets that compare a whole planner or reviewer with its
  pre-ticket golden put the live `## Input` into the golden first (`test/helpers/swap-input.js`);
  the Input change itself is held here, against the untouched golden. `makeOldRepo` leaves the
  validator out: a repo scaffolded earlier never had it.
- `mono-pnpm.json` was regenerated for this, seven entries: `caf-qa.md` gone, `caf-validator.md`
  added, `caf-planner.md`, `caf-reviewer.md`, `caf-run-pipeline.md`, `piv-workflow.md` and
  `agent-handoff.md` changed. Not a precedent. The `frozen-kinds` goldens did not change.
- Left for 03c2b: the rename of `/caf-run-pipeline` and `caf-verify`, removing `/caf-plan-ticket`,
  and the planner's `## Constraints`.

## The ticket run asks through the status (CAF-SDD-03c2b)

On a ticket run (the `[SYSTEM CONTEXT: Environment = headless...]` marker) a planner with an
unanswered `BLOCKING` question writes `requirements.md` with `Status: NEEDS_CLARIFICATION`, no
`tasks.md`, and stops. It used to write `Status: NEEDS_HUMAN` plus a blocked `tasks.md` note;
caf-orchestrator (SDD-04c) stops on `NEEDS_CLARIFICATION` before it needs `tasks.md`, pushes the
draft and asks on the ticket, and its routing throws on a `tasks.md` with no Frontend/Backend
section. `test/sdd03c2b-planner-clarify.test.js` holds the ticket against
`test/fixtures/pre-sdd03c2b/` (the default scaffold of the four variants before it — never
regenerate it).
- Only the planner's `## Output` (the ticket-run rule of Clarify, no exception to the no-`tasks.md`
  rule any more) and `## Constraints` changed. Neither says "Fallback", "Discovery" or "blocked";
  the refusal to change an approved spec is still `Status: NEEDS_HUMAN`, first line of
  `verify-report.md`, and is not touched.
- `## Constraints` is **not** in `SYNCABLE_SECTIONS` and must not become one (a rationale as for
  `## Skills`: it is per-project text). `buildBatasanSection` is exported only so that
  `rolloutWarnings` (`src/commands/audit.js`) can compare it: a planner whose `## Constraints` body
  differs from the template gets one `warn` entry (`check: 'planner-constraints'`) that names the
  section and says to edit it by hand. Warning only, as the other two: no gap, same exit code and
  counts. Only the planner is checked; a planner with no `## Constraints` is not warned about.
- Rollout: `curate sync` carries `## Output` (ordinary `DRIFT`); `## Constraints` is by hand. Order:
  caf-orchestrator with SDD-04c deployed first. An old planner under an old orchestrator keeps
  writing `tasks.md`; a new planner under an old orchestrator writes none on a ticket run with a
  `BLOCKING` question, and the run fails for the missing file.
- Tests of earlier tickets that held the old sentences were updated, not their goldens: those that
  compare a whole planner with a golden put the live `## Constraints` into the golden
  (`test/helpers/swap-constraints.js`), those that sync an old planner expect the old
  `## Constraints` to stay (sync never writes it), and the lines of the old ticket-run rule are
  listed where an older test counts the lines of `## Output`.
- `makeOldRepo` renders its agents from the live builders, so the recorded `curate` report of the
  old repo (`pre-sdd03c1/`) is compared as it was, with no warning; the warning is tested by
  putting the pre-ticket `## Constraints` into that repo's planner.
- `.caf/knowledge/INDEX.md` lost the paragraph that contrasted it with `.caf/discovery/{slug}/prd.md`.
  `readAgentRoster` is now held for a repo with only `caf-qa.md`, only `caf-validator.md` and both.
  `src/utils/architecture-signatures.js` (unused since 03c3) is removed.
- `mono-pnpm.json` was regenerated for this, one entry changed (`caf-planner.md`). Not a precedent.
- Left for 03c2c: renaming `/caf-run-pipeline` and `caf-verify`, removing `/caf-plan-ticket`, the
  routing step 4 of a single repo, the pipeline-level retry sentence. The planner's refusal of an
  approved-spec change on a ticket run (`verify-report.md` plus a `tasks.md` the orchestrator goes
  on to read) is unchanged, a backlog item.

## SINGLE_REPO roster and the dead builders (CAF-SDD-03c3)

SINGLE_REPO's default scaffold has `caf-frontend` and `caf-backend` (planner, architect, frontend,
backend, validator, reviewer) and no `caf-implementer`. `test/sdd03c3-single-repo-roster.test.js`
holds the ticket against `test/fixtures/pre-sdd03c3/` (single-nuxt default, `--role frontend`,
`--role backend` and mono-pnpm, file set and content, recorded by
`test/helpers/scaffold-contents.js` from before it — never regenerate it).
- **Roster.** `implementer` joins `qa` in `SUPERSEDED_CANDIDATE_KINDS`; `HIDDEN_CANDIDATE_KINDS` is
  still the five dropped kinds. Without `role`, `buildSingleRepoCandidates` builds both agents with
  the same fields `--role` uses, so `caf-frontend.md`/`caf-backend.md` are byte-identical to the
  `--role` files. `--role` results and mono-pnpm are byte-identical to the golden; the MONOREPO
  snapshot `mono-pnpm.json` was not regenerated.
- **A repo that has `caf-implementer.md`.** Never touched (`writeIfAbsent`). When it exists and
  frontend/backend are in the selection, `agents()` prints one note that caf-orchestrator routes to
  `caf-frontend`/`caf-backend` only. Nothing deletes the file.
- **Derived text follows the roster.** `/caf-run-pipeline` (`implementationRoles` from the picked
  candidates), `/caf-complete-drafts`, `piv-workflow.md`, `agent-handoff.md` and `readAgentRoster`
  already derived from the roster/files, so no template changed. Known gap: the pipeline's routing
  step asks the user when a task matches more than one agent's scope, and the two SINGLE_REPO agents
  share the whole-repo scope.
- **Tests that held `implementer` as the default** (`sdd03b3`, `sdd03c1`, `sdd03c2`,
  `single-repo-scaffold`, the helpers) read the pre-ticket golden through the new roster or pass
  `role: 'implementer'` to build the kind by hand. The goldens themselves are untouched.
- **Removed as dead:** the builders of the eight unscaffolded commands (`buildDiscoveryStartMd`,
  `buildDiscoveryToTicketMd`, `buildAuditScanMd`, `buildAuditToTicketMd`, `buildDesignTicketMd`,
  `buildQaCheckMd`, `buildReviewTicketMd`, `buildFeatureCatalogSyncMd`) with their files
  (`audit-commands.js`, `discovery-to-ticket.js`, `feature-catalog.js`), the companion-command
  groups and the UX-without-PM message of `agents()`, and the tail of `featureCatalogSync`. The
  agent builders and texts (`buildPmAgentMd`, `buildUxDesignerAgentMd`, auditor, documentation,
  devops), `HIDDEN_COMMAND_FILES`, `HIDDEN_CANDIDATE_KINDS` and the CLI message "no longer
  scaffolded" stay. `src/utils/architecture-signatures.js` was unused and left on purpose (removed at CAF-SDD-03c2b).
