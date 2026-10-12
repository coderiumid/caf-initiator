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
- SINGLE_REPO's implementation agent is kind `implementer` (`caf-implementer.md`), generated by
  `buildSingleRepoCandidates` in `src/commands/agents.js` instead of the frontend/backend app
  pickers. caf-orchestrator only routes `caf-frontend`/`caf-backend`, so the CLI prints a warning
  rather than pretending it is routed. `--role frontend|backend` (SINGLE_REPO only) generates that
  same one agent as kind `frontend`/`backend` instead (`caf-frontend.md`/`caf-backend.md`) for
  projects that do run through the orchestrator — user-chosen, never inferred from the framework.
  `--scope <dirs...>` writes its `## Scope` (and the
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
  `test/sdd02-planner-spec.test.js`) — never reword them in `skill-md.js`. v3 adds: `Finding:` in
  section 3 (the ticket says X, the code shows Y), facts read from the code are not questions,
  an answered question keeps its original tag, no line numbers, and a third `Verify:` form,
  `command: <command> | expect: <exit code or output>`, reported in `verify-report.md` as
  `command` with the result observed. Nothing in caf-init runs or parses a `command:` — that is
  the validator's and the orchestrator's work (CAF-SDD-03b, 04).
- `caf-spec` and `caf-traceability` are born a DRAFT in every repo (no `TODO` line, their own
  3-line banner), so no agent is pointed at them until a human removes the banner. The banner
  stays in the template until CAF-SDD-02c (after the re-test of v3 passes); don't remove it, or
  add a planner pointer, before that. A skill already in a user's repo is never replaced
  (`writeIfAbsent`): a repo with the older text keeps it until the file is deleted by hand.
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
not code) for `pm`/`ux-designer` and the generic text for everything else. The Discovery lines
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
because a CAF-SDD-03a2 test pins the Working Pattern of every non-Discovery kind to the generic
text and a new header would only reach existing planners through the interactive "add missing
section" prompt. An existing planner therefore gets it from `curate sync` as an ordinary `DRIFT`
of `Output`. Two things that text must keep: every artifact, path and stop token the planner had
before (`test/fixtures/pre-sdd02/` is the pre-change render — never regenerate it), and the
headless stop on the ticket path (`Status: NEEDS_HUMAN` + the blocked `tasks.md` note):
caf-orchestrator throws when the planner leaves no `tasks.md`.
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

The verify-report format lives in one generated file, `.caf/workflows/agent-handoff.md`
(`agent-handoff-md.js`). caf-orchestrator tests the WHOLE `verify-report.md` for `\bSUCCESS\b`,
so nothing added to that skeleton may contain the word outside the `Status:` line. That file is
written through `writeIfAbsent` and has no sync: a repo scaffolded earlier keeps its old format
until the file is regenerated by hand.

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

## The `validator` kind (hidden — CAF-SDD-03b1)

`validator` (`caf-validator.md`, tools `Read`/`Write`/`Bash`, no `Edit`) is a complete kind — it is
in `KNOWN_KINDS`, `CAF_PREFIXED_KINDS`, `TOOLS_BY_KIND`, `ARTIFACT_BY_ROLE` and `SKILLS_BY_KIND`,
and every tracked builder has a real branch for it — but it is hidden until the ticket that
connects it to the pipeline (03c/04):

- It is **not** an entry of `buildCandidates()`, and must not become one before that ticket.
  `HIDDEN_CANDIDATE_KINDS` is not involved: it filters the picker and, since CAF-SDD-03c1, what
  `test/helpers/mono-snapshot.js` renders, while `test/helpers/frozen-kinds.js` still renders
  every candidate, hidden ones included.
- The one way to render it is `buildValidatorAgent(dir, stack, { skills })` in
  `src/commands/agents.js`. No command calls it; only `test/sdd03b1-validator.test.js` does.
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
- The five evidence kinds are now named in four places: the verify-report format
  (`agent-handoff-md.js`), the `caf-traceability` skill, `VALIDATOR_WORKFLOW`, and since
  CAF-SDD-03b2 `REVIEWER_SPEC_WORKFLOW`. Change all four or none.
- `Status: PASS | FAIL | NEEDS_HUMAN` in `validate-report.md` keeps the shape `readQaReport()`
  parses for `qa-report.md` (first `Status:` line, uppercase). Nothing reads the file yet; under
  that parse `NEEDS_HUMAN` reads as not-a-pass. What the orchestrator does with it is CAF-SDD-04.
- Out of scope until their own tickets: renaming or removing `qa`, a `/caf-*` command for the
  validator, and removing the `caf-traceability` banner.

## Commands and the spec (CAF-SDD-03b3)

Slash commands are plain files written once through `writeIfAbsent`. They are **not** tracked:
the manifest records agent sections only, `curate audit`/`curate sync` never read
`.claude/commands/` (except the existence check of `caf-feature-catalog-sync.md`), and nothing
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
- `/caf-plan` (`src/templates/plan-command.js`, `buildPlanMd`) is **hidden**: no file under
  `src/` imports it (a test walks `src/` for that), so no scaffold run writes `caf-plan.md` and
  the snapshot has no entry. It stays hidden until the `caf-spec` banner is removed (02c) and the
  ticket that connects it; don't add it to `PREVIEW_COMMANDS` or to a prompt before that. It
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

- Nothing was removed. Every kind is still in `KNOWN_KINDS` with its builder, every command
  builder and template is byte-identical, and the 15 `frozen-kinds` goldens still hold. A repo
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
  and prompts, writing nothing. `curate audit` still reports the missing
  `caf-feature-catalog-sync.md` as an optional gap: `curate` was left exactly as it was.
- `implementer` is dropped by the design too but is **not** hidden: in SINGLE_REPO without
  `--role` it is the only implementation agent, and `/caf-run-pipeline` is only offered with one.
  It stays scaffolded until CAF-SDD-03c3 decides the default role. `architect` and `qa` stay
  until `caf-design` and the connected validator exist.
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
  review commands, the note about the PM agent in `.caf/knowledge/INDEX.md`) is unchanged on purpose; fixing
  it is a later ticket (03c2), and so is every rename.
- Do not publish a `caf-init` release with this change before caf-orchestrator handles a repo
  without `caf-documentation` (CAF-SDD-04).
