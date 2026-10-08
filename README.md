# CAF Initiator

**CAF (Coderium Agent Framework)** runs AI agents as an engineering team that takes a ticket from plan to pull request. It has two parts:

- **[caf-initiator](https://github.com/coderiumid/caf-initiator)** (this repo) prepares a repository. Its CLI, `caf-init`, detects the stack, package manager and ticket tracker, then writes CAF's starter files: knowledge base, agent definitions, workflow docs, slash commands and skills.
- **[caf-orchestrator](https://github.com/coderiumid/caf-orchestrator)** runs the agents. When a ticket becomes ready, it works through the agents in sequence and opens the pull request.

You can use `caf-init` on its own: the agents it generates also run directly in Claude Code.

`caf-init` never calls an AI model. Everything it writes is a deterministic draft built from what it detected; anything it could not detect is left as a `TODO`, never guessed.

The full CAF specification is in [`CAF.md`](./CAF.md).

## Links

| | |
|---|---|
| **Official site** | [caf.coderium.id](https://caf.coderium.id/) |
| **caf-initiator** (this repo) | [github.com/coderiumid/caf-initiator](https://github.com/coderiumid/caf-initiator) |
| **caf-orchestrator** | [github.com/coderiumid/caf-orchestrator](https://github.com/coderiumid/caf-orchestrator) |

## Contents

- [Links](#links)
- [Quick start](#quick-start)
- [Installation](#installation)
- [What gets generated](#what-gets-generated)
- [Commands](#commands)
  - [`scaffold`](#caf-init-scaffold)
  - [`scaffold skills`](#caf-init-scaffold-skills)
  - [`scaffold complete-drafts`](#caf-init-scaffold-complete-drafts)
  - [`curate`](#caf-init-curate)
  - [`docs`](#caf-init-docs)
  - [`export`](#caf-init-export)
- [Working with caf-orchestrator](#working-with-caf-orchestrator)
- [Repo mode](#repo-mode-monorepo-vs-single_repo)
- [Safety guarantees](#safety-guarantees)
- [Development](#development)

## Quick start

```bash
# 1. Preview — detects the stack and lists what would be written
npx -p caf-initiator caf-init scaffold --dry-run

# 2. Generate the drafts (asks before each step)
npx -p caf-initiator caf-init scaffold

# 3. Optional: add the CAF skills
npx -p caf-initiator caf-init scaffold skills

# 4. In your AI runner (e.g. Claude Code), fill in the TODOs
/caf-complete-drafts

# 5. Check the result, then review the diff and commit
npx -p caf-initiator caf-init curate --check-drafts
```

Run from inside the target repository, or pass `--dir <path>`.

## Installation

Requires **Node.js 18 or newer**.

```bash
npm install -g caf-initiator      # then: caf-init <command>
```

From source:

```bash
git clone https://github.com/coderiumid/caf-initiator.git
cd caf-initiator
npm install
npm link                          # makes `caf-init` available globally
```

## What gets generated

```
<your repo>/
├── CLAUDE.md                        # project context for agents (draft)
├── AGENTS.md                        # concrete rules for agents (draft)
├── .caf/
│   ├── tasks/README.md              # per-ticket artifact convention
│   ├── knowledge/
│   │   ├── INDEX.md                 # status of the optional reference docs
│   │   ├── golden-examples/         # RULES.md pointing at your best files
│   │   └── decisions/               # ADR drafts
│   ├── workflows/
│   │   ├── task-completion.md       # Definition of Done
│   │   ├── piv-workflow.md          # Plan → Implement → Verify
│   │   └── agent-handoff.md
│   └── .generate-manifest.json      # section baselines, written by `curate`
└── .claude/
    ├── agents/caf-*.md              # agent definitions
    ├── commands/caf-*.md            # companion slash commands
    └── skills/caf-*/SKILL.md        # only with `scaffold skills`
```

Setup also appends ignore rules for `.caf/discovery/*/` and `.caf/audits/*/` to `.gitignore`.

## Commands

`caf-init` with no subcommand prints help.

| Command | What it does |
|---|---|
| `caf-init scaffold` | Run the whole setup chain, confirming each step |
| `caf-init scaffold <target>` | Run one part of it |
| `caf-init curate` | Audit an existing CAF setup, then offer to sync agent sections with the current templates |
| `caf-init curate --check-drafts` | Read-only check of the drafts after they were filled in |
| `caf-init curate baseline` | Record the current agent sections as the tracking baseline |
| `caf-init docs` | Scaffold optional reference docs under `docs/` |
| `caf-init export` | Copy agent definitions and commands to other AI runners |

Every command accepts `--dir <path>` (default: current directory). `--dry-run` shows what would happen without writing.

### `caf-init scaffold`

Bare `scaffold` runs these steps in order, asking before each one after Setup:

| Step | Target name | Output |
|---|---|---|
| Setup | (always first) | `CLAUDE.md`, `AGENTS.md`, `.caf/tasks/README.md`, `.caf/knowledge/INDEX.md`. Checks for existing AI-tool config first; detects stack and tracker |
| Golden Examples | `golden-examples` | Lets you pick reference files; writes `RULES.md` with a do/don't skeleton |
| ADR | `adr` | ADR drafts for technical decisions already visible in the repo |
| Agents | `agents` | Agent definitions you select, plus their companion slash commands |
| Task Completion | `task-completion` | `.caf/workflows/task-completion.md` from the verify scripts in `package.json` |
| Workflow | `workflow` | `piv-workflow.md` and `agent-handoff.md` from the agent roster |
| AI Draft Completion | `complete-drafts` | The `/caf-complete-drafts` command |

Two more targets exist but only run when named explicitly:

| Target | Output | Why it is not in the chain |
|---|---|---|
| `skills` | `.claude/skills/caf-*/SKILL.md` | It offers to edit agent definitions that already exist |
| `feature-catalog-sync` | The `/caf-feature-catalog-sync` command | Its catalog needs manual review before it is usable |

Notes:

- `scaffold workflow` needs an agent roster; run `scaffold agents` first.
- Agents on offer: Planner, Architect, Frontend and Backend (per assigned app), extra per-app implementation agents, QA, Reviewer, Documentation, Auditor, PM, UX Designer. CAF recommends starting with Planner plus one implementation agent.
- The tracker is detected from `.linear/`, `atlassian.yml` or a README mention. Otherwise you are asked (Linear, Jira, GitHub Issues); it is never silently defaulted.

Options:

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | current directory |
| `--dry-run` | Show detection results without writing anything | `false` |
| `--app <app-path>` | Restrict to one app. Used by `golden-examples`, `adr`, `agents`, `task-completion` | all apps |
| `--agent-dir <path>` | Where agent definitions are read and written | `.claude/agents` |
| `--command-dir <path>` | Where slash commands are written | `.claude/commands` |
| `--force` | Overwrite existing files. `agents` target: agent definitions and their commands. `skills` target: `SKILL.md` files only. Manual edits in an overwritten file are lost and the `curate` manifest is not updated | `false` |
| `--mode <single\|mono>` | Override the detected [repo mode](#repo-mode-monorepo-vs-single_repo) | auto-detect |
| `--scope <dirs...>` | `SINGLE_REPO`, `agents` target: limit the implementation agent to these directories | whole repo |
| `--role <implementer\|frontend\|backend>` | `SINGLE_REPO`, `agents` target: role and filename of the one implementation agent | `implementer` |

### `caf-init scaffold skills`

Writes five universal skills into `.claude/skills/<name>/SKILL.md`.

| Skill | What it tells the reader | Agents that point at it |
|---|---|---|
| `caf-verify` | The repo's real lint, typecheck, test and build commands | implementation agents, QA |
| `caf-scope-discipline` | Stay inside the task's scope; report what is outside it, don't fix it | implementation agents, Planner, Architect, Reviewer, Documentation |
| `caf-no-guess` | Cite what you read; an unknown becomes an open item, never an invented fact | all of the above |
| `caf-escalate` | When to stop and hand the task back to a human | implementation agents |
| `caf-piv` | Plan, wait for the go-ahead, implement, verify | none (manual sessions only) |

Auditor, PM and UX Designer agents get no skills.

**How a skill reaches its reader**

- **Manual session.** Claude Code picks skills up through their frontmatter `description`, so a free-form coding prompt still gets the PIV, verification and scope rules.
- **CAF agent.** The agent definition gets a `## Skills` section listing `Read` pointers to the skill files. A `skills:` frontmatter key is not used because it is ignored when an agent is started with `claude --agent`.

**DRAFT skills**

`caf-verify` is built from the scripts detected in `package.json`. If one of the four slots has no script, that slot is written as a `TODO` line and the skill gets a `DRAFT` banner. While the banner is there:

- agents are told to ignore the skill, and
- no agent gets a pointer to it.

To activate it, resolve the `TODO` lines and remove the whole banner: both the `> DRAFT ...` sentence and the `> Agents: this skill is NOT ready...` line.

**Pointers in existing agent definitions**

- For each agent without a `## Skills` section you get a preview and a per-file confirmation.
- The write happens only if the new content is the old content plus exactly that one section.
- An agent that already has a `## Skills` section is never edited. If a pointer is missing there, the command names it and you add the line yourself.
- An agent file whose name is not a known CAF kind is asked with default **No**.
- Agents generated by `scaffold agents` *after* this target get their pointers automatically.

**Other rules**

- An existing `SKILL.md` is never overwritten, unless `--force` is passed.
- A skill is not written if a folder with the same name minus the `caf-` prefix exists (`caf-verify/` vs `verify/`). Exit code 1.
- `## Skills` is not tracked by `curate`: it is never reported as drift and never rewritten by a sync.

Agents follow skills with high but not perfect reliability. Skills are guidance; enforcement stays with the Verify, QA and Reviewer stages.

### `caf-init scaffold complete-drafts`

Generates `.claude/commands/caf-complete-drafts.md`, a command you run in your AI runner to fill in the `TODO`s that the other steps left behind.

The command makes the AI work in four phases: read the repo, report a plan and its questions and **stop for your answers**, fill in the drafts, verify. It is instructed to:

- take facts only from the code and cite the file (verification commands, conventions, concrete rules);
- never invent human-owned content such as business context, PRD, ADR reasoning or golden-example choices. Those come only from your answers; otherwise the `TODO` stays;
- edit only `Role`, `Scope` and `Verify Checklist` in agent definitions, leaving tracked sections, `## Skills` and the frontmatter alone;
- work only on skills that still carry a `DRAFT` banner, and never invent a verification command;
- never commit or push.

When agent definitions exist, this step offers to record their baseline first. Say yes: without a baseline taken before the AI runs, a changed tracked section cannot be detected afterwards.

### `caf-init curate`

Bare `curate` prints an audit report and then offers to sync agent sections: update the ones that drifted from the template, and add tracked sections that are missing (each addition is confirmed separately). Use the flags to run one side only.

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | current directory |
| `--agent-dir <path>` | Directory containing the agent definitions | `.claude/agents` |
| `--audit-only` | Report only, non-interactive. Exit code 1 on required gaps (for CI) | `false` |
| `--sync-only` | Skip the report and go straight to the sync | `false` |
| `--check-drafts` | Read-only check of completed drafts (see below) | `false` |
| `--output <file>` | Also save the audit report as Markdown | none |
| `--dry-run` | With `--sync-only` or `baseline`: show what would happen, no writes, no prompts | `false` |
| `--yes` | With `baseline`: skip the confirmation prompt | `false` |
| `--mode <single\|mono>` | Override the detected repo mode | auto-detect |

#### Section tracking

For sections whose content depends only on the agent's kind, `curate` compares the actual content against the current template, so a template fix can reach agents generated earlier.

Tracked sections: `Allowed Tools`, `Input`, `Output`, `Working Pattern (PIV)`, `Retry Logic`, `What to Look For` (Auditor only) and `Report Format` (Auditor, Reviewer, QA).

Not tracked: `Role`, `Scope`, `Verify Checklist`, `Constraints`, `Skills`. They hold per-project data.

Each tracked section has a baseline hash in `.caf/.generate-manifest.json`. Comparing baseline, current file and current template gives one of five statuses:

| Status | Meaning | What `curate` sync does |
|---|---|---|
| `IN_SYNC` | File matches baseline and template | nothing |
| `DRIFT` | File unchanged since baseline, template changed | updates the section and the baseline |
| `CUSTOMIZATION` | File edited since baseline, template unchanged | never written; reported |
| `CONFLICT` | Both file and template changed | never written; reported |
| `UNTRACKED` | No baseline yet | never written; run `curate baseline` |

Only `DRIFT` is ever written, and `DRIFT` requires the file to match its baseline exactly. A section you edited by hand can therefore never be overwritten.

> **Known issue.** Two sections can read as `DRIFT` right after `curate baseline`, although nobody changed the template:
>
> - `Input` of the QA and Reviewer agents in a monorepo. A sync would replace it with a generic version without the app names.
> - `Working Pattern (PIV)` of the PM and UX Designer agents. A sync would replace it with the generic wording.
>
> Run `curate --sync-only --dry-run` first and review what it would change.

#### `caf-init curate baseline`

Records the current content of every untracked section as its baseline. It never edits file content and does not check whether that content matches the template, so review the sections first.

#### `caf-init curate --check-drafts`

Read-only check after `/caf-complete-drafts` or manual editing. Exit code 1 on any `FAIL`. Cannot be combined with `--audit-only` or `--sync-only`.

| Check | Level |
|---|---|
| A tracked agent section changed or was removed since its baseline | `FAIL` |
| A `<pm> run <script>` command names a script that does not exist in the relevant `package.json` | `FAIL` |
| A generate-time `{{...}}` placeholder is left (runtime tokens like `{{TICKET-ID}}` are fine) | `FAIL` |
| A golden-example path in a `RULES.md` table does not exist | `FAIL` |
| An agent's `## Skills` section points at a skill file that does not exist | `FAIL` |
| A tracked agent section has no baseline, so it cannot be verified | `WARN` |
| A file path cited in `CLAUDE.md`, `AGENTS.md` or `docs/` does not exist | `WARN` |
| The `DRAFT` banner is gone from `CLAUDE.md`, `AGENTS.md`, a `RULES.md` or a `docs/` file | `WARN` |
| An agent's `## Skills` section points at a skill that still has its `DRAFT` banner | `WARN` |
| A skill has open `TODO` lines but no `DRAFT` banner | `WARN` |
| A skill's `DRAFT` banner was only partly removed, so agents would ignore the skill forever | `WARN` |
| `TODO`s still open, per file (in a skill: only lines that start with `TODO`) | `INFO` |

The check covers what code can verify. Whether the business content is true is still yours to review. Agent frontmatter (`tools:`) is not covered by the baseline; check it in the diff.

### `caf-init docs`

Scaffolds optional reference docs. None of them is required for the CAF pipeline, existing files are never overwritten, and interactive mode asks per item.

| Item (`--include`) | File |
|---|---|
| `product` | `docs/product/prd.md` |
| `architecture` | `docs/architecture/system-overview.md` |
| `schema` | `docs/schema/erd.md` |
| `testing-strategy` | `docs/testing-strategy.md` |
| `api-contract` | `docs/api-contract.md` (only offered when frontend and backend are separate apps in the same repo) |
| `--feature <name...>` | `docs/product/features/<name>.md` |

Also accepts `--dir`, `--dry-run` and `--mode`.

### `caf-init export`

Copies the Claude Code agent definitions, slash commands or both to other AI runners, converting the format where needed.

| Runner | Agents go to | Commands go to | Scope enforcement |
|---|---|---|---|
| OpenCode | `.opencode/agent/` | `.opencode/commands/` | known enforcement bugs |
| Cline | `.cline/agents/` | `.clinerules/workflows/` | relies on model compliance only |
| Cursor | `.cursor/agents/` | `.cursor/commands/` | not yet validated |
| Kiro | `.kiro/agents/` | `.kiro/steering/` | not yet validated |

Only Claude Code is validated to technically enforce an agent's tool and scope restrictions. Before it writes, the command shows this warning and asks you to confirm the risk (default: No). You can also publish to a custom folder. Skills are not exported.

| Option | Description | Default |
|---|---|---|
| `--dir <path>` | Target repo directory | current directory |
| `--agent-dir <path>` | Source directory of the agent definitions | `.claude/agents` |
| `--kind <agent\|command\|both>` | What to publish | `agent` |
| `--dry-run` | Show what would be published without writing | `false` |
| `--force` | Overwrite files that already exist at the destination | `false` |

## Working with caf-orchestrator

[caf-orchestrator](https://github.com/coderiumid/caf-orchestrator) is a separate service. When a ticket becomes ready (a Linear state or a GitHub Issue label), it clones the repo, runs the agents headlessly in sequence, opens a pull request and reports back on the ticket.

You do not need the orchestrator to use what `caf-init` generates. The agents also run directly in Claude Code, or through the generated `/caf-run-pipeline` command.

If you do use it, three things in this repo matter:

- **Agent filenames.** The orchestrator calls agents by name: `caf-planner`, `caf-frontend`, `caf-backend`, `caf-qa`, `caf-reviewer`, `caf-documentation`. It does not call `caf-implementer`, so in a single-package repo generate the implementation agent with `--role frontend` or `--role backend` (see [Repo mode](#repo-mode-monorepo-vs-single_repo)).
- **Report formats.** Agents hand over through files in `.caf/tasks/<TICKET-ID>/`, and the orchestrator parses their status lines word for word. Those lines live in the tracked sections `Retry Logic` and `Report Format`; leave them as generated.
- **Skills.** Agents started by the orchestrator read skills through the `## Skills` pointers, the same as anywhere else.

Installation, configuration, triggers and the dashboard are documented in the caf-orchestrator repository.

## Repo mode: `MONOREPO` vs `SINGLE_REPO`

Every command that runs stack detection first decides the repo mode.

- **`MONOREPO`**: the root has a `workspaces` field, `pnpm-workspace.yaml`, `turbo.json`, `nx.json` or `lerna.json`, or `apps/*` / `packages/*` contain a `package.json`. The apps are the workspace packages.
- **`SINGLE_REPO`**: anything else. This is not an error. The repo root is the only app.

`--mode single` or `--mode mono` overrides detection on `scaffold`, `docs` and `curate`. The mode is not stored; pass it again on later runs.

What changes in `SINGLE_REPO`:

- One root `CLAUDE.md`; `RULES.md` sits directly in `.caf/knowledge/golden-examples/`.
- `scaffold agents` offers one implementation agent, `caf-implementer`, instead of the frontend/backend split. Verify commands are the root scripts, unscoped.
- `--scope domain,application` limits that agent to those directories. Every directory must exist.
- `--role frontend` or `--role backend` writes the same agent as `caf-frontend.md` or `caf-backend.md`. Use this when the project runs through `caf-orchestrator`, which routes only those two filenames. The role is your choice; it is never inferred from the framework.

`--scope` and `--role` are refused in `MONOREPO`. With bare `scaffold`, use the comma form for `--scope` so the directories are not read as the target argument.

The package manager comes from the root `packageManager` field, then from the lockfile. If neither exists, `CLAUDE.md` gets a `TODO` and workspace-scoped commands are written as `TODO` lines. The one exception: unscoped root commands fall back to `npm run <script>`, so check those.

## Safety guarantees

- **Existing files are never overwritten.** The exceptions are explicit: `--force`, and the cases below.
- **`curate` sync rewrites a section only when it is `DRIFT`**, which means you have not touched it since its baseline.
- **`curate` sync adds a missing tracked section** only after you confirm it, section by section.
- **`scaffold skills` adds a `## Skills` section to an existing agent** only after your confirmation, and only when the result is the old file plus that one section.
- **Setup appends its ignore rules to an existing `.gitignore`** and leaves every other line alone.
- **`--dry-run` uses the same code path as a real run** and writes nothing.
- **No guessing.** Undetected values become `TODO`s (one exception: the `npm run` fallback described under [Repo mode](#repo-mode-monorepo-vs-single_repo)). A leftover generate-time placeholder such as `{{APP_1}}` aborts the write.
- **No AI calls.** Output is deterministic.

## Development

```bash
npm test                                                  # node --test, no extra dependency
node src/index.js scaffold --dir /tmp/some-repo --dry-run # try it against a scratch repo
```

There is no lint or build step.

```
src/
├── index.js      # CLI entry (commander)
├── util.js       # writeIfAbsent and other file helpers
├── commands/     # one file per command or scaffold target
├── steps/        # the four Setup steps: audit, detect stack, detect tracker, generate drafts
├── templates/    # pure build*() functions that render the generated Markdown
└── utils/        # repo-mode detection, section parsing and diffing, manifest, runner targets
test/             # tests, fixtures and the frozen MONOREPO snapshot
CAF.md            # the CAF specification
CLAUDE.md         # architecture notes and invariants for contributors
```

Read [`CLAUDE.md`](./CLAUDE.md) before changing file generation or `curate`: it lists the invariants the tests protect.

## License

MIT. See [LICENSE](LICENSE).
