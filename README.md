# CAF Initiator

**CAF (Coderium Agent Framework)** runs AI agents as an engineering team that takes a ticket from plan to pull request. It has two parts:

- **[caf-initiator](https://github.com/coderiumid/caf-initiator)** (this repo) prepares a repository. Its CLI, `caf-init`, detects the stack, package manager and ticket tracker, then writes CAF's starter files: knowledge base, agent definitions, workflow docs, slash commands and skills.
- **[caf-orchestrator](https://github.com/coderiumid/caf-orchestrator)** runs the agents. When a ticket becomes ready, it works through the agents in sequence and opens the pull request.

You can use `caf-init` on its own: the agents it generates also run directly in Claude Code.

`caf-init` never calls an AI model. Everything it writes is a deterministic draft built from what it detected; anything it could not detect is left as a `TODO`, never guessed.

CAF follows Spec-Driven Development: spec-first, moving toward spec-anchored, and not spec-as-source. The generated Planner writes the spec (`requirements.md`, with numbered acceptance criteria) before it writes `tasks.md`, stops on a blocking open question instead of guessing, and ties every task to the acceptance criteria it serves. Once a human marks the spec `APPROVED`, agents do not edit it: a proposed change is written in `verify-report.md`, next to one line of evidence per acceptance criterion, and a human decides. The generated Reviewer checks the change against that spec as well as the quality of the code (see [The spec-aware reviewer](#the-spec-aware-reviewer)). The spec is kept next to the code as the contract for the work; code is not generated from it. These are instructions in the generated files: `caf-init` does not check that an agent followed them.

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

One more target exists but only runs when named explicitly:

| Target | Output | Why it is not in the chain |
|---|---|---|
| `skills` | `.claude/skills/caf-*/SKILL.md` | It offers to edit agent definitions that already exist |

Notes:

- `scaffold workflow` needs an agent roster; run `scaffold agents` first.
- Agents on offer: Planner, Architect, Frontend and Backend (per assigned app; in `SINGLE_REPO` one Implementer instead), extra per-app implementation agents, QA, Reviewer. CAF recommends starting with Planner plus one implementation agent.
- Commands written: `/caf-plan-ticket` with the Planner, `/caf-run-pipeline` (Planner plus an implementation agent), `/caf-fix-review` and `/caf-review` (Reviewer) after a confirmation each, and `/caf-complete-drafts` from its own step.
- Five agents and eight commands are no longer scaffolded. See [No longer scaffolded](#no-longer-scaffolded).
- A `validator` kind (`caf-validator.md`) exists in the code but is hidden: it is not on offer, no `scaffold` run writes it, and nothing in the pipeline calls it yet. See [The validator kind](#the-validator-kind-hidden).
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

Writes seven universal skills into `.claude/skills/<name>/SKILL.md`.

| Skill | What it tells the reader | Agents that point at it |
|---|---|---|
| `caf-verify` | The repo's real lint, typecheck, test and build commands | implementation agents, QA |
| `caf-scope-discipline` | Stay inside the task's scope; report what is outside it, don't fix it | implementation agents, Planner, Architect, Reviewer, Documentation |
| `caf-no-guess` | Cite what you read; an unknown becomes an open item, never an invented fact | all of the above |
| `caf-escalate` | When to stop and hand the task back to a human | implementation agents |
| `caf-piv` | Plan, wait for the go-ahead, implement, verify | none (manual sessions only) |
| `caf-spec` | The `requirements.md` (spec) format: scope, findings, open questions, acceptance criteria with a `Verify:` line (`automated test`, `command:` or `manual:`) | Planner |
| `caf-traceability` | Link every acceptance criterion to tasks, code and a named test; one evidence line per criterion in `verify-report.md` (`automated-test`, `command`, `build-only`, `manual` or `none`) | Planner, Frontend, Backend — always written as a `DRAFT`, so no pointer yet |

Auditor, PM and UX Designer agents get no skills.

**How a skill reaches its reader**

- **Manual session.** Claude Code picks skills up through their frontmatter `description`, so a free-form coding prompt still gets the PIV, verification and scope rules.
- **CAF agent.** The agent definition gets a `## Skills` section listing `Read` pointers to the skill files. A `skills:` frontmatter key is not used because it is ignored when an agent is started with `claude --agent`.

**DRAFT skills**

`caf-verify` is built from the scripts detected in `package.json`. If one of the four slots has no script, that slot is written as a `TODO` line and the skill gets a `DRAFT` banner. While the banner is there:

- agents are told to ignore the skill, and
- no agent gets a pointer to it.

To activate it, resolve the `TODO` lines and remove the whole banner: both the `> DRAFT ...` sentence and the `> Agents: this skill is NOT ready...` line.

`caf-traceability` is written with a `DRAFT` banner in every repo. It has no `TODO` line; remove its banner once you have tested the skill in a real agent run. A skill file that already exists is never replaced: to get a newer version of a skill, delete the file and run `scaffold skills` again.

`caf-spec` is active: it is written without a banner, and the Planner is pointed at it. It was a `DRAFT` until it passed a test with real agent runs.

**The Planner and `caf-spec`**

The generated Planner:

- has the tools `Read`, `Write`, `Glob` and `Grep`. `Glob` and `Grep` are read-only and let it look up facts about the repo by itself. It has no `Edit` and no `Bash`;
- reads the files that already exist in the task folder (`requirements.md`, `tasks.md`, `verify-report.md`) before it writes anything;
- does not write a `requirements.md` that says `Status: APPROVED` when it is asked to change it. It writes the proposed change in `verify-report.md` under `## Proposed Spec Changes` and stops. The status of that refusal is the first line of `verify-report.md`, `Status: NEEDS_HUMAN`; it is never written in `requirements.md`;
- reads what it claims. A fact that `Read`, `Glob` or `Grep` can answer is read before any artifact is written. A `Finding:` or an acceptance criterion about how a file or a module behaves comes from a file it opened in that run: a summary in `CLAUDE.md`, an ADR or a file name from `Glob` only shows where to look. The ADRs in `.caf/knowledge/decisions/` whose name relates to the ticket are read and named in a `Finding:`, and a `Glob` result that is mostly `node_modules` or hidden tool directories is narrowed;
- does not put a reading off. No artifact says that something is still to be read, compared, checked or found out, in whatever words, and no task in `tasks.md` asks the implementer to find out a fact the spec needs (a task may tell the implementer to read the file it is about to change). What reading can answer is read; what a human must decide is an open question;
- does not guess. A claim that comes neither from a file it read nor from the ticket is written `Assumption A-n:` with what it rests on, never as a `Finding:` or as a fact in an acceptance criterion. A `Finding:` holds only what was observed; a conclusion or a prediction is an assumption. A word of doubt ("maybe", "it seems") is written on an assumption line only;
- writes one observable behavior per acceptance criterion, and a file path or a symbol name only in a `Finding:`, on an assumption line and on a `Verify:` line, never in the outcome, the scope, the decisions or the `When ... then` sentence;
- ends a `tasks.md` that holds tasks with `## Coverage`: one line per acceptance criterion, with the tasks that serve it;
- writes the same list, number or term the same way in every artifact, and reads the files it wrote again before it ends the run;
- writes `Tidak ada` for a section with nothing to say, never a placeholder (`- -`, an empty section, `TBD`);
- writes no `tasks.md` at all while a `BLOCKING` question has no `Answer:`. The one exception is a ticket run (the headless marker): there it still writes the blocked note, because caf-orchestrator fails when the file is missing;
- names the test file, or the task that creates it, for every acceptance criterion with `Verify: automated test`;
- starts its final message with one plain line, `Status: <value>`, with no bold and nothing before it;
- uses one status convention: the status of `requirements.md` is a `Status:` line with the values `DRAFT`, `NEEDS_CLARIFICATION`, `APPROVED` and `NEEDS_HUMAN`. Its `## Input` no longer calls it a heading (`## Status: PLAN`).

These are instructions in the generated file: `caf-init` does not check that an agent followed them.

Two skills say something else on a few points, and the agent definition wins. `caf-no-guess` (item 4) tells an agent to write an open item as a line that starts with the to-do word; the Planner's `## Output` names that item and says no such line is written in its artifacts. `caf-spec` writes `-` for an empty section and `Assumption:` with no number. Neither skill was changed, so there is nothing to roll out for them.

**Getting this in a repository scaffolded earlier**

| What | How it gets there |
|---|---|
| `caf-spec` without the banner | By hand. The existing skill file is never replaced: remove the three banner lines, or delete the file and run `caf-init scaffold skills` again |
| The Planner's `## Input`, `## Output` and `## Allowed Tools` | `caf-init curate sync` (only where you have not edited the section) |
| The pointer to `caf-spec` in the Planner's `## Skills` | By hand. `scaffold skills` never edits an agent that already has a `## Skills` section; it prints the path that is not listed there. Add the line ``- `.claude/skills/caf-spec/SKILL.md` `` to the list |
| `Glob` and `Grep` in the Planner's frontmatter | By hand. `curate sync` does not write frontmatter: change the line to `tools: [Read, Write, Glob, Grep]` |

Until the frontmatter line is changed, the Planner's `## Allowed Tools` names two tools it does not have yet.

The two steps done by hand are reported by the audit report of `caf-init curate` as warnings (see [Rollout warnings](#rollout-warnings)), so an older Planner is no longer shown as "already in sync".

No npm release carries this yet: a release of `caf-init` waits until caf-orchestrator handles a repo without `caf-documentation` (CAF-SDD-04, see [No longer scaffolded](#no-longer-scaffolded)).

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

`Input` of the QA and Reviewer agents in a monorepo also names the apps assigned at generate time. `curate` reads that list back from the section itself, so a sync updates the wording around it and keeps the list. If the list cannot be read with certainty (the sentence was reworded), the section is never treated as `DRIFT`: it is left untouched and `curate --sync-only` lists it as not comparable.

`Working Pattern (PIV)` of the PM and UX Designer agents is compared against their own Discovery wording, not the generic one. The Validator and the Reviewer have a pattern of their own too (see [Working Pattern per role](#working-pattern-per-role)); every other agent keeps the generic one.

Both used to read as `DRIFT` right after `curate baseline` and a sync rewrote them (the app names were lost). A manifest written by an earlier version works unchanged; its format did not change.

#### Rollout warnings

Two parts of a template change never reach an agent file through `curate sync`: the frontmatter and the `## Skills` section. The audit report lists them as warnings, under the agent definitions, marked `!`:

| Warning | When | What to do |
|---|---|---|
| `tools:` differs | The frontmatter `tools:` list of an agent is not the list the template gives its kind. The message names the file, the tools it has now and the tools of the template. The order of the list does not matter | Edit the frontmatter line by hand, or leave it if you changed it on purpose (an MCP tool you added, for example) |
| Skill pointer missing | A skill that is mapped to the agent's kind, exists in `.claude/skills/` and has no DRAFT banner is not listed in the agent's `## Skills`. The message names the agent and the skill | With a `## Skills` section: add the pointer line by hand. Without one: run `caf-init scaffold skills`, which offers to add the section |

- They are warnings only. They are counted on their own line in the summary and never change the exit code, also with `--audit-only`.
- A skill that still has its DRAFT banner is never asked for.
- Only agent files whose name is a known CAF kind are checked. A custom agent file is not compared.
- The check is read-only and uses the same tables the generator renders from.

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

### The spec-aware implementation agents

The generated `caf-frontend.md`, `caf-backend.md` and `caf-implementer.md` work against the spec. Their `## Output` section tells them to:

- **Read first.** Before changing any code, read the files that already exist in the task folder: `requirements.md`, `tasks.md`, and `verify-report.md` if present.
- **Stop when the spec is not ready.** If `requirements.md` says `Status: NEEDS_CLARIFICATION`, or a question marked `BLOCKING` has no `Answer:`, change no code and write `verify-report.md` with `Status: NEEDS_HUMAN` and the reason. `Status: DRAFT` and `Status: APPROVED` do not stop the work.
- **Treat every acceptance criterion as a contract.** Implement each criterion that falls in the agent's scope as it is written. A criterion the agent cannot satisfy is reported, never skipped silently.
- **Never edit the spec.** Do not write `requirements.md` or `tasks.md`, not even a status line. If the spec is wrong, ambiguous, impossible to satisfy or contradicts the code, write the proposed change in `verify-report.md` under `## Proposed Spec Changes` and stop with `Status: NEEDS_HUMAN`.
- **Give evidence per criterion.** One line per criterion in `verify-report.md`, in one of the five forms the validator and the reviewer judge: `automated-test`, `command`, `build-only`, `manual` or `none`. `manual`, `build-only` and `none` are not counted as passed. The full layout of `verify-report.md` is in `.caf/workflows/agent-handoff.md`.

What did not change: only `## Output` is different. The tools (`Read`, `Write`, `Edit`, `Bash`), `## Allowed Tools`, `## Input`, `## Retry Logic` and `## Skills` are as before, and so is an agent file whose name no kind claims (it is treated as a plain implementation agent and keeps the one-line `## Output`).

**Getting this in a repository scaffolded earlier**

| What | How it gets there |
|---|---|
| The `## Output` of `caf-frontend.md`, `caf-backend.md` and `caf-implementer.md` | `caf-init curate sync` (only where you have not edited the section) |
| The `verify-report.md` layout in `.caf/workflows/agent-handoff.md` (the `## Acceptance Criteria` and `## Proposed Spec Changes` parts) | By hand, and only if the file is older than those parts. It has no sync and is never overwritten: delete it and run `caf-init scaffold workflow` again |

Like every other instruction in a generated file, these are instructions to the agent: `caf-init` does not check that an agent followed them.

### The spec-aware reviewer

The generated `caf-reviewer.md` reviews the change against the spec, on top of its security and code quality review. Its `## Output` section tells it to:

- **Read** `requirements.md`, `tasks.md`, `design.md` if present, `verify-report.md`, `validate-report.md` if present, the ADRs in `.caf/knowledge/decisions/`, and the diff.
- **Scope.** Report a file or change that no task and no Scope In item covers as a scope deviation, and a task the diff does not reflect as a task not done. Each finding names the task or the Scope item.
- **Acceptance criteria.** Map every criterion to its task and to its evidence line in `verify-report.md`. A criterion with `manual`, `build-only` or `none` evidence, or with no evidence line, is listed as `needs human check` and is not counted as passed.
- **Spec integrity.** Treat a change to the goal, the scope or a criterion of `requirements.md` in a commit after the one that set `Status: APPROVED` as a blocking finding. Raise every entry under `## Proposed Spec Changes` of `verify-report.md` to a human. Report an ADR violation with the name of the ADR.

What did not change: the reviewer's tools (`Read`, `Write`, `Bash`), its `## Input`, and `review-notes.md` with its `Verdict: APPROVE | CHANGES REQUESTED | DEFER` line. The findings go into the parts that report already has. The reviewer does not run the tests or the verification gate again, and it does not edit code, tests or the spec.

A reviewer generated earlier gets the new text from `caf-init curate sync`, as a drift of its `Output` section (and of its `Working Pattern (PIV)`, see [Working Pattern per role](#working-pattern-per-role)); a section you edited is never overwritten. The `/caf-review` and `/caf-fix-review` commands follow the same spec (see [Spec-aware commands](#spec-aware-commands)); `/caf-review-ticket` is unchanged. Like every other instruction in a generated file, these are instructions to the agent: `caf-init` does not check that a review followed them.

### Spec-aware commands

Two generated commands take the spec into account. Their names, their argument (a PR number) and the formats caf-orchestrator reads (`review-notes.md` with its verdict, `fix-review-log.md` with `Status: FIXED | SKIPPED | NOT_APPLICABLE`) are the same as before.

- **`/caf-review`** looks for the artifact folder of the PR, `.caf/tasks/{TICKET-ID}/`, with the ticket ID it resolved from the argument, the PR and its head branch (or from the user). When the folder has a `requirements.md`, the reviewer is given the folder and checks the change against the spec. When it does not, the review still runs as a code-only review, and both the posted PR Review and the summary in chat say that no spec was checked.
- **`/caf-fix-review`** never edits `requirements.md`. A review comment that asks to change the goal, the scope or an acceptance criterion is written as a proposal under `## Proposed Spec Changes` in `verify-report.md`, logged as `SKIPPED` with a note that starts `Needs a human decision:`, and listed separately for the user. Every other comment is assessed and fixed as before.

Commands are not tracked by `caf-init curate`: `curate sync` does not update them, and an existing command file is never overwritten. To get the new text in a repository scaffolded earlier, delete `.claude/commands/caf-review.md` or `caf-fix-review.md` and run `caf-init scaffold agents` again (or use `--force`, which also overwrites your edits).

A third command, **`/caf-plan`**, exists in the code but is hidden: no `scaffold` run writes it. It takes a ticket ID or free text (which gets a kebab-case slug of at most five words), uses `.caf/tasks/<ID-or-slug>/` as the artifact folder, spawns `caf-planner` for the Specify, Clarify, Plan, Tasks workflow without repeating the planner's rules, and stops once `tasks.md` is written. The `caf-spec` skill it relies on is active now, but the command stays hidden until the ticket that connects it; `/caf-plan-ticket` is still the command that is generated.

### No longer scaffolded

The spec-driven design dropped five agents and eight commands. A new repo does not get them:

| | No longer written |
|---|---|
| Agents | Documentation, DevOps, PM, UX Designer, Auditor |
| Commands | `/caf-discovery-start`, `/caf-discovery-to-ticket`, `/caf-audit-scan`, `/caf-audit-to-ticket`, `/caf-design-ticket`, `/caf-qa-check`, `/caf-review-ticket`, `/caf-feature-catalog-sync` |

- **A repo scaffolded earlier keeps them.** No file is deleted or changed. The kinds are still known, so `caf-init curate` audits and syncs those agent files exactly as before.
- **They cannot be selected.** The agent picker does not list them and there is no flag for it. `caf-init scaffold feature-catalog-sync` still resolves, says the command is no longer scaffolded and writes nothing; `curate` still reports the missing command file as an optional gap.
- **Implementer stays for now.** The design drops it too, but in `SINGLE_REPO` without `--role` it is the only implementation agent and `/caf-run-pipeline` needs one. It stays scaffolded until the ticket that settles the default role (CAF-SDD-03c3).
- **Architect and QA stay** until what replaces them is connected.
- **A new repo has no Documentation agent**, so `/caf-run-pipeline` is written with its "no Documentation Agent" stage, and `piv-workflow.md` lists the role as not present.
- **Some generated text still mentions them** (the planner's Discovery fallback, `.gitignore` lines for `.caf/discovery/` and `.caf/audits/`, a reference to `/caf-review-ticket` in the review commands). That text is unchanged on purpose and is cleaned up in a later ticket.
- **No npm release yet.** caf-orchestrator still expects `caf-documentation`; a release of `caf-init` with this change waits until the orchestrator handles a repo without it (CAF-SDD-04).

### The validator kind (hidden)

`caf-init` knows a `validator` agent kind, written as `caf-validator.md`. It is not a scaffold candidate: `scaffold agents` neither offers nor writes it, and neither `/caf-run-pipeline` nor caf-orchestrator calls it. It becomes available with the ticket that connects it to the pipeline. Until then `qa` and `qa-report.md` are unchanged.

What is in place today:

- **Detection.** A file named `caf-validator.md` is recognized by `curate` as kind `validator` and compared against the validator template, like any other kind.
- **Tools.** `Read`, `Write`, `Bash`. No `Edit`: the validator changes no code, test, spec or `verify-report.md`. The only file it writes is `validate-report.md`.
- **What it does.** It reads `requirements.md`, `tasks.md` and `verify-report.md`, runs the commands of its `## Verify Checklist` (the same commands the implementation agents get, for every detected app), and gives each acceptance criterion one status. It may run those commands, read-only `git diff`, `git log`, `git status`, `git show`, and the `Verify: command:` lines of the spec under the rules below; nothing else.
- **Proposed spec changes.** The validator never edits `requirements.md` or `tasks.md`. A change it would propose is one line under `### Notes` of `validate-report.md` that starts with `Proposed Spec Changes:`; it does not write `verify-report.md`.
- **Skills.** The skills of `qa` plus `caf-traceability` (no pointer to the latter while it is a `DRAFT`).

Per criterion:

| Status | When |
|---|---|
| `PASS` | `automated-test` or `command` evidence that the validator ran itself and that matches the criterion |
| `FAIL` | It was run and the result contradicts the criterion; the observed output is written down |
| `UNVERIFIED` | Everything else: `manual` or `build-only` evidence, evidence that names no test, a test that does not import the production code, a command it may not run, or no evidence line at all (`no evidence reported`) |

#### Commands from the spec

An acceptance criterion can name its own check, `Verify: command: <command> | expect: <exit code or output>`. The rules are in the validator's `## Allowed Tools`, where its Bash limit is:

- **Status.** The command is run only when `requirements.md` says `Status: APPROVED`. With any other status it is not run.
- **Form.** One command, or commands chained with `&&`.
- **Rejected.** Never run when the command itself (the part before ` | expect:`) contains `;`, `|`, a redirect (`>`, `>>`, `<`), `$()`, a backtick, `sudo`, `rm`, `curl`, `wget` or `git push`.
- **Not run** (status or form): the criterion is `UNVERIFIED`, with the reason. It is never `FAIL`.
- **Run:** the exit code or output is compared with `expect:`. `PASS` only on a match; otherwise `FAIL`, with the output observed.

These are instructions to the agent, not an enforced allowlist: nothing in the runner blocks a command.

`validate-report.md` (in `.caf/tasks/<TICKET-ID>/`):

```markdown
## Validate Report — {TICKET-ID}
Ticket: {TICKET-ID}
Agent: caf-validator
Status: PASS | FAIL | NEEDS_HUMAN
Unverified: {count} — {AC ids, comma-separated, or "none"}

### Acceptance Criteria
| AC | Status | Evidence kind | Evidence |

### Verification Gate
| Command | Result |

### Verification Gate Gaps

### Notes
```

`Status: PASS` means no criterion is `FAIL` and every gate command passed. `UNVERIFIED` criteria do not turn the report into `FAIL`, but their count and ids are always on the `Unverified:` line. `NEEDS_HUMAN` means the validation could not be done (a missing `requirements.md` or `verify-report.md`). How a pipeline reads this file is not decided yet; the `Status:` line has the same shape as the one in `qa-report.md`.

### Working Pattern per role

`## Working Pattern (PIV)` used to be the same Plan, Implement, Verify cycle for every agent. The Validator and the Reviewer read and report rather than plan and implement, so each has its own three steps (the heading keeps its name):

- **Validator:** read the spec (its `Status:` line, every criterion and its `Verify:` line), `tasks.md`, `verify-report.md` and the change; run the Verify Checklist, then the `Verify: command:` lines it may run; write `validate-report.md` with one row per criterion and its evidence.
- **Reviewer:** read the spec and the reports, then the diff; compare every criterion and the scope with the change; write `review-notes.md` with its `Verdict:` line.

Every other agent keeps the generic cycle, and the PM and UX Designer agents their Discovery wording.

Rollout to a repository scaffolded earlier: `caf-init curate sync` carries the changed sections as ordinary drift, the reviewer's `Working Pattern (PIV)`, and the validator's `Allowed Tools`, `Output` and `Working Pattern (PIV)`. A section you edited is reported and never overwritten. The frontmatter `tools:` did not change for either agent; if you ever need to change it, that is done by hand, since `curate sync` never writes frontmatter.

## Working with caf-orchestrator

[caf-orchestrator](https://github.com/coderiumid/caf-orchestrator) is a separate service. When a ticket becomes ready (a Linear state or a GitHub Issue label), it clones the repo, runs the agents headlessly in sequence, opens a pull request and reports back on the ticket.

You do not need the orchestrator to use what `caf-init` generates. The agents also run directly in Claude Code, or through the generated `/caf-run-pipeline` command.

If you do use it, three things in this repo matter:

- **Agent filenames.** The orchestrator calls agents by name: `caf-planner`, `caf-frontend`, `caf-backend`, `caf-qa`, `caf-reviewer`, `caf-documentation`. A repo scaffolded now has no `caf-documentation` (see [No longer scaffolded](#no-longer-scaffolded)); the orchestrator has to handle that before this version is released. It does not call `caf-implementer`, so in a single-package repo generate the implementation agent with `--role frontend` or `--role backend` (see [Repo mode](#repo-mode-monorepo-vs-single_repo)).
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
