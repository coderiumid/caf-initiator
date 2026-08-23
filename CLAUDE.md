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

- Run the CLI: `node src/index.js [--dir <path>] [--dry-run]` (or `npm start`)
- No test suite, linter, or build step is configured in `package.json` — don't invent commands
  that don't exist there.
- Try it end-to-end against a scratch directory before trusting changes: `node src/index.js --dir /tmp/some-repo --dry-run`.

## Architecture

Linear 4-step pipeline, driven by `src/index.js`, each step in `src/steps/`:

1. **`01-audit-existing-tools.js`** — scans the target dir for existing AI-tool config
   (`.claude`, `.kiro`, `.opencode`, `openspec`, `.cursor`). If found, prompts the user to
   coexist, consolidate (manual, not automated), or cancel. Returns `{ action: 'continue' | 'stop' }`;
   `index.js` exits early on `'stop'`.
2. **`02-detect-stack.js`** — reads `package.json`, lockfiles, and monorepo markers
   (`turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`) to detect package manager,
   monorepo apps (`apps/*/package.json`, `packages/*/package.json`), per-app framework
   (via dependency-name signatures, most-specific-first order), and database (from
   `prisma/schema.prisma` or `.env.example`).
3. **`03-detect-tracker.js`** — detects Linear/Jira from marker files or README mentions;
   otherwise prompts the user. Never silently defaults to a tracker.
4. **`04-generate-drafts.js`** — renders templates from `src/templates/` and writes them via
   `writeIfAbsent`/`ensureDir`.

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
