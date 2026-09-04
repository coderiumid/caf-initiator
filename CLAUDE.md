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
     `prisma/schema.prisma` or `.env.example`).
  3. **`03-detect-tracker.js`** — detects Linear/Jira from marker files or README mentions;
     otherwise prompts the user. Never silently defaults to a tracker.
  4. **`04-generate-drafts.js`** — renders templates from `src/templates/` and writes them via
     `writeIfAbsent`/`ensureDir`.
- **`src/commands/scaffold.js`** (`runScaffold`/`runScaffoldTarget`) — chains Setup → Golden
  Examples → ADR → Agents → Task Completion → Workflow, each step confirmed interactively (bare
  `scaffold`), or runs one target standalone (`scaffold <target>`).
- Other top-level commands (`audit.js`/`curate.js`, `export.js`, `reference-docs.js`) are layered
  on top of the same `detectStack`/`writeIfAbsent` primitives but are not part of the init chain.

`src/util.js` provides the shared file-system primitives. **`writeIfAbsent` never overwrites an
existing file** — this is the core safety guarantee of the tool (target repos may already have
partial CAF setups or unrelated content at the same paths). Preserve this behavior in any change
that touches file generation.

`--dry-run` must produce identical detection output and log what *would* be written, without
touching the filesystem — keep write paths and dry-run paths going through the same
`writeIfAbsent`/`ensureDir` helpers rather than branching logic per-step.

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
`buildRetryLogicSection` takes a `kind` (CAF-RETRYLOGIC-01). The four builders that still have
no Discovery branch are listed in `DISCOVERY_GUARDED_SECTIONS` (`src/utils/agent-sections.js`)
and forced to return `null` for those kinds until
`.ai/tasks/CAF-DISCOVERY-SECTIONS-01/requirements.md` lands. When adding a syncable section,
either branch on Discovery or add it to that guard list — don't leave it comparing a generic
template against a Discovery file.

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
