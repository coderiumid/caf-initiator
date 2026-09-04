# CAF Initiator

CLI that automates the initial setup of the **Coderium Agent Framework (CAF)** in any repository.

Instead of manually creating knowledge-base files, agent definitions, workflow docs, and golden examples one by one, `caf-init` detects your project's stack, tracker, and conventions — then scaffolds the entire CAF structure for you.

---

## What is CAF?

CAF (Coderium Agent Framework) is a framework for turning AI into a full engineering team member that can work on tickets from planning through to Pull Request — autonomously. It defines a layered structure (knowledge base → agent definitions → artifact handoff → quality gates → orchestration) that lives inside your repo and improves over time.

See [`CAF.md`](./CAF.md) for the full specification.

---

## Features

- **Auto-detection** — scans `package.json`, monorepo configs, ORM schemas, and CI files to identify your stack (frameworks, package manager, apps/packages structure)
- **Existing tool audit** — checks for `.claude/`, `.cursor/`, `.kiro/`, `.opencode/` and warns before overwriting
- **Tracker detection** — identifies Linear, Jira, or GitHub Issues usage from repo signals
- **Draft generation** — creates `CLAUDE.md`, `AGENTS.md`, and `.ai/tasks/README.md` tailored to your detected stack
- **Golden examples selector** — scans source files and helps you pick the best-written ones as AI reference material, always paired with a `RULES.md` do/don't skeleton (and offers to backfill one for pre-existing golden-examples folders that predate this pairing)
- **Reference docs scaffolder** — optional, read-only Layer 1 docs (`docs/product/prd.md`, Feature Specs, `docs/architecture/system-overview.md`, `docs/api-contract.md`, `docs/schema/erd.md`, `docs/testing-strategy.md`); never required, asks per item, `api-contract.md` only offered when FE+BE are detected as separate apps in the repo
- **ADR draft generator** — detects technical decisions already made (ORMs, frameworks, auth patterns) and drafts Architecture Decision Records
- **Agent scaffolder** — generates agent definition files (Planner, Architect, QA, Reviewer, per-app implementation agents, etc.)
- **Multi-target publish** — copies agent definitions to other AI runner directories (`.kiro/agents/`, `.opencode/agents/`, etc.)
- **Workflow docs generator** — creates `piv-workflow.md` and `agent-handoff.md` from your agent roster
- **Interactive menu** — run `caf-init` without arguments for a guided experience
- **Dry-run mode** — preview what would be generated without writing any files

---

## Installation

### From npm

```bash
npm install -g caf-initiator
```

Or run without installing:

```bash
npx -p caf-initiator caf-init scaffold
```

### From source

```bash
# Clone the repository
git clone https://github.com/ganjardbc/caf-initiator.git
cd caf-initiator

# Install dependencies
npm install

# Link globally (makes `caf-init` available everywhere)
npm link
```

### Requirements

- **Node.js** ≥ 18

---

## Usage

Run from within your target repository, or pass `--dir` to point at one. `caf-init` with no subcommand prints help — there's no interactive top-level menu; pick a subcommand explicitly (`scaffold`, `export`, `curate`, `docs`).

### Run Everything

```bash
caf-init scaffold [--dir <path>] [--dry-run] [--agent-dir <path>]
```

Executes **Setup → Golden Examples → ADR → Agents → Task Completion → Workflow** sequentially, with a skip-confirmation before each step after Setup. `docs` (Reference Docs) and `feature-catalog-sync` are never part of this chain — both are opt-in, run them explicitly (see below).

### Run One Part

```bash
caf-init scaffold <target> [--dir <path>] [--dry-run] [--app <app-path>] [--agent-dir <path>] [--command-dir <path>]
```

`<target>` is one of `golden-examples`, `adr`, `agents`, `task-completion`, `workflow`, `feature-catalog-sync`. Behavior is identical to running that part standalone — `scaffold` is purely an access point, not a different pipeline. `scaffold workflow` without an existing agent roster in `--agent-dir` fails with a clear error (run `scaffold agents` first).

---

## Commands

### `caf-init` (no subcommand)

Prints help. `--dir`/`--dry-run`/`--workspace-glob` are declared on the root program but only take effect when a subcommand consumes them.

### `caf-init scaffold`

Bare: run **Setup → Golden Examples → ADR → Agents → Task Completion → Workflow** in sequence, with a skip-confirmation before each step after Setup — see "Run Everything" above. With a target argument, run only that part.

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | `cwd` |
| `--dry-run` | Show detection results without writing anything | `false` |
| `--app <app-path>` | Restrict to a specific app path — used by `golden-examples`/`adr`/`agents`/`task-completion` targets | all apps |
| `--agent-dir <path>` | Directory to read/write agent definitions | `.claude/agents` |
| `--command-dir <path>` | Directory to write companion slash commands — used by `agents`/`feature-catalog-sync` targets | `.claude/commands` |

#### `caf-init scaffold golden-examples`

Scan the target repo and interactively select candidate files for `.caf/knowledge/golden-examples/`.

Every generated `.caf/knowledge/golden-examples/{{app}}/` folder is paired with a `RULES.md` do/don't skeleton (content always left `TODO` — reasoning is a human call). If an app's golden-examples folder already has files but no `RULES.md` (e.g. from before this pairing existed), the command flags the gap and offers to backfill it.

### `caf-init docs`

Scaffold optional, read-only Layer 1 reference docs: `docs/product/prd.md`, `docs/product/features/{{feature-name}}.md` (Feature Specs), `docs/architecture/system-overview.md`, `docs/api-contract.md`, `docs/schema/erd.md`, `docs/testing-strategy.md`. None of these are ever required for the CAF pipeline to run — existing files are never overwritten, and interactive mode asks per item before creating a placeholder.

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | `cwd` |
| `--dry-run` | Show detection results without writing anything | `false` |
| `--include <items...>` | Non-interactive: only generate these items (`product`, `architecture`, `schema`, `testing-strategy`, `api-contract`) | interactive prompts |
| `--feature <name...>` | Non-interactive: Feature Spec names to generate placeholders for | interactive prompt |

`docs/api-contract.md` is only offered when the detected stack has separate frontend and backend apps in the same repo — skipped for a pure-frontend consumer of an external API.

#### `caf-init scaffold adr`

Detect technical decisions already made in the target repo and draft ADR skeletons for `.caf/knowledge/decisions/`.

#### `caf-init scaffold agents`

Interactively scaffold agent definitions (Planner, Architect, per-app implementation, QA, Reviewer, Documentation, DevOps, Auditor, PM, UX Designer) into `.claude/agents/` or equivalent.

#### `caf-init scaffold task-completion`

Draft `.caf/workflows/task-completion.md` (Definition of Done) from verify scripts detected in `package.json`.

#### `caf-init scaffold workflow`

Draft `.caf/workflows/piv-workflow.md` and `agent-handoff.md` from the agent roster already generated in `.claude/agents/`. Fails with a clear error if the agent roster is empty — run `caf-init scaffold agents` first.

#### `caf-init scaffold feature-catalog-sync`

Generate the `/caf-feature-catalog-sync` slash command, with the code-scan strategy baked in from the detected architecture (controller-based / DDD-layer). Only reachable via this explicit target — never part of bare `scaffold`, since its output needs manual review (a `TODO`-filled catalog) before it's usable.

### `caf-init export`

Copy already-generated agent definitions to other AI runner targets, with explicit enforcement-risk warnings.

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | `cwd` |
| `--agent-dir <path>` | Source directory containing existing agent definitions | `.claude/agents` |
| `--kind <agent\|command\|both>` | What to publish — agent definitions, companion slash commands, or both | `agent` |
| `--dry-run` | Show what would be published without writing anything | `false` |

### `caf-init curate`

Audit report (read-only, Layer 1-4 compliance) then offer to sync missing/drifted sections into `.claude/agents/*.md`. Bare runs both; `--audit-only`/`--sync-only` isolate one side for CI gates or direct use.

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | `cwd` |
| `--agent-dir <path>` | Directory containing existing agent definitions | `.claude/agents` |
| `--output <file>` | Also save the audit report as markdown to this path | none |
| `--audit-only` | Report only, non-interactive — exit code 1 on required gaps (for CI gates) | `false` |
| `--sync-only` | Skip the audit report, go straight to the sync flow | `false` |
| `--dry-run` | With `--sync-only`: show what would be added/updated without writing or prompting | `false` |

#### Content-level section tracking

`curate audit`/`curate sync` compare section *content*, not just heading presence, for a
fixed set of sections recoverable from the agent's `kind` alone:

| Section | Varies by kind? |
|---|---|
| `Allowed Tools` | kind-only |
| `Input` | kind-only |
| `Output` | kind-only |
| `Working Pattern (PIV)` | constant |
| `Retry Logic` | **role-aware** — Discovery (`pm`, `ux-designer`) vs. everything else |
| `What to Look For` | **Auditor-only** — not part of any other kind's template |
| `Report Format` | **Auditor-only** |

`Role`/`Scope`/`Verify Checklist` are excluded — they hold real per-project data that isn't
recoverable from `kind` alone.

`Retry Logic` became role-aware in CAF-RETRYLOGIC-01. Discovery agents produce
`prd.md`/`flow.md` for a human to read and never enter the pipeline that greps
`verify-report.md`, so they get an Open-Questions escalation instead of the
`Status: SUCCESS`/`NEEDS_HUMAN` contract every other kind gets. Before that, one generic
template was compared against every kind, and `curate sync` rewrote two production repos'
`caf-pm.md`/`caf-ux-designer.md` with the wrong role's instructions.

Discovery kinds also hold back `Allowed Tools`, `Input`, `Output`, and `Working Pattern
(PIV)`: those builders still answer for `pm`/`ux-designer` with generic Cluster 2 defaults,
so for those kinds they are treated as not part of the template at all (reported
`UNTRACKED`, never written) rather than compared. Giving them real Discovery content is
tracked in `.ai/tasks/CAF-DISCOVERY-SECTIONS-01/requirements.md`.

Each such section is tracked in a per-project manifest at `.caf/.generate-manifest.json`
(hash of the section content at the last generate/sync). A 3-way comparison — baseline vs.
current file content vs. current template — classifies every present section into one of
five statuses:

| Status | Meaning | `curate sync` behavior |
|---|---|---|
| `IN_SYNC` | Matches both baseline and template | no action |
| `DRIFT` | File untouched since baseline, template has since changed | auto-synced, manifest re-baselined |
| `CUSTOMIZATION` | File edited since baseline, template unchanged | **never written** — reported, needs manual review |
| `CONFLICT` | Both file and template changed since baseline | **never written** — reported, needs manual review |
| `UNTRACKED` | Section present, no manifest baseline yet | **never written** — run `curate baseline` first |

The core safety guarantee: `curate sync` only ever writes a section whose status is `DRIFT`
— which by construction requires the file's current content to exactly match its last known
baseline. A section you've hand-edited since then can never satisfy that, so it can never be
silently overwritten. `CUSTOMIZATION`/`CONFLICT`/`UNTRACKED` sections are always printed at
the end of the run (git-status style), never silently skipped.

### `caf-init curate baseline`

Backfill for projects that used `caf-init curate` before this manifest-tracking feature
existed (no `.caf/.generate-manifest.json` yet — every section reads as `UNTRACKED`).
Records the **current** content of every untracked, syncable section as its baseline exactly
as-is — it never edits file content, and never guesses whether that content matches the
latest template. Review sections manually first if you haven't already; after baselining,
`curate sync` treats content unchanged since that moment as safe to auto-sync.

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | `cwd` |
| `--agent-dir <path>` | Directory containing existing agent definitions | `.claude/agents` |
| `--dry-run` | Show what would be baselined without writing or prompting | `false` |
| `--yes` | Skip the confirmation prompt | `false` |

---

## Project Structure

```
caf-initiator/
├── src/
│   ├── index.js                 # CLI entry point (commander setup)
│   ├── util.js                  # Shared file I/O helpers
│   ├── commands/
│   │   ├── setup.js             # Orchestrates audit → detect → draft
│   │   ├── golden-examples.js   # Source file scanner + selector (+ RULES.md pairing)
│   │   ├── reference-docs.js    # Optional Layer 1 reference docs scaffolder
│   │   ├── adr.js               # ADR detection + skeleton drafter
│   │   ├── agents.js            # Agent definition scaffolder
│   │   ├── export.js            # Multi-runner target publisher (agents and/or commands)
│   │   ├── agents-sync.js       # Add missing sections to already-generated agent defs
│   │   ├── task-completion.js   # Definition of Done generator
│   │   ├── workflow.js          # Workflow docs generator
│   │   ├── feature-catalog-sync.js # /caf-feature-catalog-sync command generator
│   │   ├── audit.js             # Layer 1-4 compliance audit report (+ per-section status)
│   │   ├── curate.js            # audit.js + agents-sync.js, one entry point
│   │   ├── curate-baseline.js   # `curate baseline` — manifest backfill for untracked sections
│   │   └── scaffold.js          # `scaffold` bare chain + `scaffold <target>` dispatch
│   ├── steps/
│   │   ├── 01-audit-existing-tools.js  # Check for existing AI tool configs
│   │   ├── 02-detect-stack.js          # Framework/monorepo/DB detection
│   │   ├── 03-detect-tracker.js        # Linear/Jira/GitHub Issues detection
│   │   └── 04-generate-drafts.js       # CLAUDE.md / AGENTS.md drafter
│   ├── templates/
│   │   ├── claude-md.js         # CLAUDE.md template generator
│   │   ├── agents-md.js         # AGENTS.md template generator
│   │   ├── agent-md.js          # Individual agent definition template
│   │   ├── adr.js               # ADR skeleton template
│   │   ├── piv-workflow-md.js   # PIV workflow doc template
│   │   ├── agent-handoff-md.js  # Agent handoff doc template
│   │   ├── tasks-readme.js      # .ai/tasks/README.md template
│   │   ├── task-completion-md.js      # Definition of Done template
│   │   ├── reference-docs-md.js       # PRD/Feature Spec/system-overview/api-contract/ERD/testing-strategy templates
│   │   ├── golden-example-rules-md.js # RULES.md template for golden-examples/{{app}}/
│   │   ├── knowledge-index-md.js      # Knowledge base index template
│   │   ├── feature-catalog.js         # Feature catalog template (TODO-filled, needs review)
│   │   ├── artifact-by-role.js        # Artifact-by-role reference template
│   │   ├── audit-commands.js          # curate audit report command snippets
│   │   ├── audit-report-format.js     # curate audit report formatting
│   │   ├── discovery-commands.js      # Discovery-phase slash command templates
│   │   ├── discovery-to-ticket.js     # Discovery-to-ticket handoff template
│   │   ├── review-command.js          # Review slash command template
│   │   ├── fix-review-command.js      # Fix-review slash command template
│   │   ├── run-pipeline-command.js    # Run-pipeline slash command template
│   │   └── ticket-preview-commands.js # Ticket preview slash command templates
│   └── utils/
│       ├── decision-signatures.js  # Heuristic signatures for ADR detection
│       ├── architecture-signatures.js # Controller-based vs DDD-layer detection
│       ├── package-scripts.js      # package.json script parser
│       ├── read-agent-roster.js    # Parse existing agent definitions
│       ├── read-caf-config.js      # CAF configuration reader
│       ├── runner-targets.js       # AI runner directory mapping
│       ├── runner-command.js       # AI runner command-dir mapping
│       ├── opencode-agent-transform.js   # Agent def → OpenCode format transform
│       ├── opencode-command-transform.js # Command def → OpenCode format transform
│       ├── agent-sections.js       # Canonical agent-def section parsing
│       ├── canonical-sections.js   # Canonical Layer 1-4 section definitions
│       ├── section-headers.js      # Section header parsing helpers
│       ├── collision-check.js      # Detects filename collisions across targets
│       ├── sync-state.js           # curate sync-state tracking (missing-section decline decisions)
│       ├── section-diff.js         # Section hashing + 3-way IN_SYNC/DRIFT/CUSTOMIZATION/CONFLICT/UNTRACKED comparison
│       ├── generate-manifest.js    # .caf/.generate-manifest.json read/write (per-section baseline hashes)
│       └── scoring.js              # Golden example candidate scoring
├── CAF.md                       # Full CAF specification
├── package.json
└── .gitignore
```

---

## How It Works

1. **Audit** — checks if any AI coding tool configs (`.claude/`, `.cursor/`, `.kiro/`, etc.) already exist and asks how to proceed
2. **Detect stack** — reads `package.json`, monorepo configs (`turbo.json`, `nx.json`, `pnpm-workspace.yaml`), ORM schemas, and directory structure to identify your apps, frameworks, and package manager
3. **Detect tracker** — looks for Linear, Jira, or GitHub Issues signals in the repo
4. **Generate drafts** — produces `CLAUDE.md`, `AGENTS.md`, and `.ai/tasks/README.md` populated with your detected stack info
5. **Golden examples** — scores source files by quality heuristics and lets you pick the best as reference material
6. **ADR detection** — identifies existing technical decisions (ORMs, auth, state management, etc.) and drafts ADR skeletons
7. **Agent scaffolding** — generates agent definition files for all CAF roles based on your stack
8. **Task completion** — drafts `.caf/workflows/task-completion.md` (Definition of Done) from verify scripts detected in `package.json`
9. **Workflow generation** — creates PIV workflow and agent handoff documentation from your agent roster

All file writes are **non-destructive** — existing files are never overwritten.

---

## License

UNLICENSED
