# CAF — Coderium Agent Framework
### Universal Guide (runs on any project)

> **How to use this document:** put this file at the repo root as `CAF.md`, then run the prompt
> `"Study CAF.md and execute it"` with an AI coding agent (Claude Code, etc.).
> The AI reads **Section 0** first, runs detection against the repo, then builds
> Layers 1–5 to fit the project — not by following any example stack that may be written here.

---

## Section 0 — Execution Instructions for the AI

**Don't create files right away.** Follow this order:

### Step 1 — Audit the Repo's Current State
Check whether the repo already has configuration for another AI coding agent:
```
.claude/        ← Claude Code
.kiro/          ← Kiro
.opencode/      ← OpenCode
openspec/       ← OpenSpec
.cursor/        ← Cursor
```
- **If none** → go on to Step 2 and start from scratch.
- **If one or more exist** → do NOT overwrite anything. First report to the user which
  files/folders were found, then ask: consolidate (pick one source of truth, migrate the
  relevant content) or let them coexist. Don't make this decision yourself.

### Step 2 — Detect Project Structure & Stack
Read the following files to fill in the placeholders throughout this document:
- `package.json` (root) → check `workspaces`, check for a monorepo tool (`turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`)
- For each detected app/package → read its `package.json` → identify the framework (Vue/React/Next/Nest/Express/Django/etc.) and package manager (pnpm/npm/yarn/bun)
- Check `prisma/schema.prisma`, `.env.example`, or other ORM config → identify the database
- Check `README.md` for the project's business/domain context

Fill in the placeholder table in **Appendix A** from these detection results before continuing.

### Step 2b — Determine the Repo Mode
Before filling in any app placeholder, determine `{{REPO_MODE}}`. **Finding no workspaces is
NOT an error and NOT a gap** — it is `SINGLE_REPO` mode, a fully supported mode.

| Condition at the repo root | `{{REPO_MODE}}` |
|---|---|
| `workspaces` in `package.json`, or `pnpm-workspace.yaml` / `turbo.json` / `nx.json` / `lerna.json`, or a `package.json` under `apps/*` / `packages/*` | `MONOREPO` |
| Anything else | `SINGLE_REPO` |

- **`MONOREPO`** → the app list = each workspace package; `{{APP_1}}`, `{{APP_2}}`, `{{apps_dir}}`
  are filled from detection as usual.
- **`SINGLE_REPO`** → exactly one app: `name` from the root `package.json` (if absent, use the
  repo folder name), path `.`. Per-app placeholders are **not used at all** — don't leave them
  empty and don't fill them with guesses:
  - One `CLAUDE.md` at the root, no `{{APP_N}}/CLAUDE.md`.
  - One implementation agent, `caf-implementer.md` (not `caf-frontend.md`/`caf-backend.md`).
    Minimal roster: `caf-planner`, `caf-implementer`, `caf-qa`, `caf-reviewer`.
  - `.caf/knowledge/golden-examples/RULES.md` directly in that folder, with no app subfolder.
  - Quality gates use the non-monorepo form (`{{PKG_MANAGER}} run <script>`, no `--filter`).
  - `caf-implementer`'s scope defaults to the whole repo. If the repo has clear directory
    boundaries (e.g. domain layers in a DDD repo), the scope may be written per directory — the
    directory list is decided by the user, not guessed.
- `{{PKG_MANAGER}}`: the `packageManager` field in the root `package.json` first; if absent, from
  the lockfile (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `package-lock.json`). Neither present →
  ask the user, don't assume.
- If detection gets it wrong, the user can override the mode explicitly. In the CLI: `caf-init scaffold
  --mode single|mono` (per-directory scope: `--scope <dir...>`). The CLI flow and the "AI reads
  this document" flow must arrive at the same `{{REPO_MODE}}`.
- Caveat: `caf-orchestrator` currently routes only `caf-frontend`/`caf-backend`. Until its
  routing is updated, `caf-implementer` is used directly in Claude Code or through
  `/caf-run-pipeline`.
- If this `SINGLE_REPO` project does run through `caf-orchestrator`, its single implementation
  agent is written under a name the orchestrator routes: `caf-frontend.md` or
  `caf-backend.md` (still one agent, scope still the whole repo / per directory). The role is
  **asked of the user**, not guessed from the framework. In the CLI: `caf-init scaffold agents --role
  frontend|backend` (default `implementer`).

**Also check for these optional Layer 1 documents** (they come from the Product/Design domain
and are not created by CAF — CAF only reads them if present):
```
docs/product/prd.md              ← product-level PRD
docs/architecture/system-overview.md
docs/api-contract.md             ← or an OpenAPI/GraphQL schema
docs/schema/erd.md
docs/testing-strategy.md
```
- **If present** → note them as references; the relevant agents will read them (see Layer 2).
- **If absent** → don't make them mandatory and don't treat this as a gap that must be closed.
  Ask the user whether they want empty placeholder files created (with a DRAFT banner) or
  skipped entirely. The absence of these documents **must not** stop or block the
  pipeline — CAF keeps working from the ticket description as usual.

### Step 3 — Detect the Ticket Tracker
Look for signs of which tracker is used:
- `.linear/`, a mention of "linear" in the README/CI config → **Linear**
- `.jira/`, `atlassian.yml`, a mention of "jira"/"atlassian" → **Jira**
- No indication at all → **ask the user** (don't assume). Options: Linear / Jira / GitHub Issues.

Use the result to pick the matching **Layer 5** variant (see the branching section below).

> **Context note:** the steps in this Section 0 set up Cluster 2 (Delivery) —
> see "4-Cluster Structure" for the full context if your project also plans to
> build Cluster 1 (Discovery) or Cluster 4 (Audit). Cluster 2 can still run on its own
> without the other clusters.

### Step 4 — Execute in Phases
Run **Phase 1 → Phase 4** in the order given in "Implementation Order" below.
After each phase, **stop and report** to the user before moving on to the next phase —
don't run Phase 3 (VPS/webhook automation) without explicit confirmation, because that phase
involves credentials and live infrastructure.

### Step 5 — Don't Duplicate Content
If the project already has part of Layer 1 (e.g. a `CLAUDE.md` exists), **update/complete** it,
don't overwrite it wholesale. CAF's principle: living documents that evolve, not a paste-once template.

---

## What CAF Is

CAF is a framework for turning AI into a member of the engineering team that can take a
ticket from start to Pull Request automatically. The AI doesn't just help write code — it
plans, implements, verifies, and reports its results, following the rules and conventions
the team has set.

CAF is not a finished product you install once and are done with. It is a **structure built
incrementally** inside your project's repo, and it gets better with iteration.

CAF is not tied to any particular stack, tracker, or AI runner — this document is generic and
adapts itself through the detection process in Section 0.

---

## 4-Cluster Structure

CAF operates in 4 clusters, grouped by **access level**, not by org chart:

| Cluster | Name | Access | Status |
|---|---|---|---|
| 1 | Discovery | Documents only, no tracker-write | Design mature, executed manually case by case |
| 2 | Delivery | Repo + tracker + GitHub (full credentials) | **Active — this is what Section 0 through Layers 1-5 below describe** |
| 3 | Release | Infra + deployment credentials | Deferred — see the note below |
| 4 | Audit | Read-only to production, tracker-write through an approval gate | Design mature, executed manually case by case |

**This document (Section 0 through Layers 1-5) is the full specification of Cluster 2.** Clusters 1, 3,
and 4 are described briefly below — their level of detail doesn't match Cluster 2 yet because they
haven't been verified end-to-end under repeated production conditions.

**Commands that involve a substantive judgment (not just an exist-check/string
match) must be verified with a real dispatch** — run the command for real in Claude Code,
not just by reading the generator code or simulating it manually by following the instructions.
A prompt contract that is consistent on paper doesn't guarantee the LLM complies in a real run,
especially for rules that require judgment (as opposed to mechanical rules). A fixture with mixed
cases (positive and negative in one run) is more convincing than fixtures tested one at a time.

### Cluster 1 — Discovery
Agents: Product Manager, UX Designer (optional, only when the ticket touches a user-facing surface).
Document access only — the PM Agent does **not** have direct write access to the tracker; tickets
are created through a separate approval gate (same pattern as Cluster 4), so that no AI can
create work for the team without human review.

Artifact: `.caf/discovery/{{slug}}/` → `prd.md` (problem, target user, success metric, scope,
out-of-scope, dependencies), `flow.md`, `handoff.md` (maps the slug to ticket IDs once created).

**Branch isolation:** `discovery-start` creates a `discovery/{{slug}}` branch before writing
anything — the same pattern as `ai-agent/{{TICKET-ID}}` in Cluster 2, just with a different prefix
because there is no ticket ID yet during discovery. Discovery artifacts (`prd.md`, `flow.md`) stay
drafts until a human reviews them through a separate PR; they don't go straight into `main`. If the
`discovery/{{slug}}` branch already exists (discovery was started before), the command checks it
out and continues, rather than creating a new branch.

**Ticket breakdown is not 1:1 with the slug.** The approval gate (`discovery-to-ticket`) reads
`## Scope` in `prd.md` and `## Main Flow` in `flow.md`, then proposes a ticket breakdown
based on them — one ticket for a small feature, or several tickets with a dependency
chain for a feature whose scope naturally splits (e.g. infrastructure vs. business logic vs.
client). Each proposed ticket is shown one at a time for confirmation (`yes`/`edit`/`skip`)
— there is no batch-approve. The dependency order between tickets (if any) is recorded in
`handoff.md`.

**Open questions still unanswered when discovery finishes don't block tickets from being
created** — but they must be recorded in the relevant ticket's description (not just in
`prd.md`/`flow.md`), so they don't get lost once the ticket enters Cluster 2's implementation queue.
This is a deliberate decision: discovery doesn't have to be 100% complete before moving on, but
incompleteness has to be transparent, not hidden behind a ticket that looks ready to work on.

**`handoff.md` format:** a table of the tickets actually created (ID, title, URL, note
as-is/edited), a list of skipped proposals, and a separate section for open questions
carried into specific tickets (not generic questions, but tagged with which ticket they're
relevant to). This file is the only one the `discovery-to-ticket` command writes in the
discovery folder — `prd.md`/`flow.md` remain read-only to it.

**Skipped proposals are left hanging in `handoff.md` — there is no auto-archive.**
If some ticket proposals are rejected/skipped at the approval gate, their record stays there
permanently as history; no automated process deletes, moves, or archives them. The same
applies to Auditor findings in Cluster 4 (see below) that don't become tickets.

The PM Agent reads `docs/product/feature-catalog.md` (read-only, see Layer 1) to learn the
existing capabilities before proposing something new — instead of reading the code directly.

### Cluster 3 — Release *(deferred)*
Agents: Quality Assurance (staging), DevOps. **Not running yet** — waiting until a project has
real staging infrastructure to test against. If your project deploys straight to `main` without
staging, skip this cluster entirely; don't create a staging environment just to fill in
this cluster.

### Cluster 4 — Audit
Agent: Auditor, running independently to check production that is already live — unlike Cluster 3's
staging QA, which is a gate before release. Coverage: functional bugs + tech debt/performance,
**excluding deep security scanning** (outside the CAF Auditor's responsibility).

Artifact: `.caf/audits/{{DATE}}/`, reports use Critical/Moderate/Minor severity. Findings
become bug tickets through the same approval gate as Cluster 1 → they enter Cluster 2
as regular tickets. Findings that don't become tickets stay recorded in the
`.caf/audits/{{DATE}}/audit-report*.md` report — there is no auto-archive, same as skipped
discovery proposals (see Cluster 1).

**The security-scanning exclusion still holds, with one important exception.** The CAF Auditor
does not actively look for security patterns (injection, hardcoded secrets, auth bypass, etc. — that
stays out of scope, the domain of a separate security review). But if the Auditor **finds**
exposure of sensitive data/credentials (password/password_hash, token, secret, PII) as a side
effect of a regular functional bug/tech debt/performance scan — whatever its original category —
that finding does **not** go into `## Priority Findings`/`## Non-Priority Findings` and is **never**
proposed as a ticket through `discovery-to-ticket`/`audit-to-ticket`. It goes into
`## Notes` (the Sensitive Data Exposure subsection), with an actionable description
(location, type of data) but without quoting the actual exposed value/payload. The follow-up
handling route is a human decision outside the normal tracker.

Reason for this exception: the "exclude security scanning" boundary originally only covered the
Auditor *looking for* security patterns. It didn't cover *finding one by accident* — and that is
just as serious (sometimes more concretely dangerous) as a pattern that was actively looked for.
Consistency requires treating both the same: reported, but never automatically turned into a
public ticket.

**Severity scheme: `Critical`/`Moderate`/`Minor`** (not 4 levels) — `Critical` and
`Moderate` go into `## Priority Findings`, `Minor` goes into `## Non-Priority Findings`. Finding
categories: `BUG`, `PERFORMANCE`, `TECH_DEBT`, `COVERAGE` — `SECURITY` is deliberately absent as a
category (see the exclusion above).

**Tracker labels aren't always granular per category.** If the tracker workspace/project doesn't
have separate labels for performance/tech-debt/test-coverage, those categories may collapse into
one general label (e.g. "Improvement") and be distinguished by priority alone. That's a
tracker limitation, not an Auditor failure — if per-category granularity matters,
create the new labels in the tracker before the audit runs, rather than forcing it from the command side.

Cadence: manual trigger for now. A weekly schedule is a future target, not the current
default — don't set up cron/a scheduler for this unless explicitly asked.

### Routing: When a Ticket Goes Through Cluster 1 First

| Condition | Route |
|---|---|
| A new feature/module with user or business impact | **Must go through Cluster 1 first** |
| An enhancement, bug fix, or purely internal technical infra change | **Skip, straight to Cluster 2** |

The deciding criterion: **has the feature's viability already been validated**, not the
size of the work. A small ticket whose viability has never been validated still has to go
through Cluster 1; a large ticket whose viability is already clear (e.g. a big but purely
technical refactor) may go straight to Cluster 2.

Routine bug fixes are usually created manually by the human QA team — they're not part of
any agent flow and don't need to go through any cluster.

---

## Working Pattern: PIV (Plan → Implement → Verify)

Every agent in CAF follows the same working pattern:

```
PLAN       → write a plan first, don't touch code yet
IMPLEMENT  → execute per the plan
VERIFY     → check it yourself before claiming done (lint, typecheck, test)
              if it fails → fix and retry (max 3x)
              if it still fails → stop, escalate to a human
```

This prevents the two most common problems in AI coding: coding straight away with no direction,
and claiming to be done without verification.

---

## Full Pipeline

```
Incoming ticket ({{TRACKER}}/GitHub Issues)
  ↓
Planner Agent      — read the ticket, write a plan (don't touch code)
  ↓
Architect Agent    — decide the technical approach (optional, for complex tasks)
  ↓
{{APP_1}}/{{APP_2}} Agent — implementation + self-verify (retry max 3x)
  ↓
Documentation Agent — update docs (parallel, non-blocking)
  ↓
QA Agent           — in-depth testing, edge-case checks
  ↓
Reviewer Agent     — qualitative review (approach, technical debt, security)
  ↓
Open PR + Mention Developer
  ↓
[next phase] AI PR Reviewer — responds to human reviewers' comments
```

**Important note:** human review is still mandatory before merging. There is no auto-merge under
any circumstances.

---

## The 5 Layers to Build

### Layer 1 — Project Knowledge Base
> The foundation that lets the AI actually understand your project

**Required files** (match the number of `{{APP_N}}/CLAUDE.md` files to the number of detected apps;
with `{{REPO_MODE}}` = `SINGLE_REPO` there is no `{{APP_N}}/CLAUDE.md` and no
`golden-examples/{{APP_N}}/` subfolder — see Step 2b):

```
CLAUDE.md                       ← main instructions for Claude Code (<150 lines)
AGENTS.md                       ← instructions for every AI coding agent (cross-tool)
{{APP_1}}/CLAUDE.md             ← {{APP_1}}-specific conventions (e.g. frontend)
{{APP_2}}/CLAUDE.md             ← {{APP_2}}-specific conventions (e.g. backend)

.caf/knowledge/                 ← CAF-generated, written by caf-initiator — different from docs/ below
  INDEX.md                       ← status bridge (✓/✗) to the docs/ documents below, see the note
  decisions/                    ← ADRs: why technical decisions were made
    adr-001-*.md
  golden-examples/               ← REFERENCES to real code, not copies (see Principles below)
    {{APP_2}}/
      RULES.md                    ← path to the original file + pattern name + do/don't reasons
    {{APP_1}}/
      RULES.md                    ← path to the original file + pattern name + do/don't reasons

docs/                            ← project-owned, read-only for CAF — NEVER written by
                                     caf-initiator itself (one exception: the optional
                                     `caf-init docs` command may scaffold EMPTY placeholders
                                     at the user's explicit request; humans still write the content)
  product/
    prd.md                       ← optional, product-level reference (see the note below)
    feature-catalog.md           ← catalog of existing capabilities, synced from code
                                     (see the feature-catalog-sync command), read by the PM Agent
                                     in Cluster 1 before proposing a new feature
    features/
      {{feature-name}}.md         ← optional, Feature Spec — written by humans for large/
                                     ambiguous features before the ticket is broken down, linked manually from the ticket
  architecture/
    system-overview.md           ← optional, high-level architecture overview
  schema/
    erd.md                        ← optional, documented data relationships (complements the actual schema)
  api-contract.md                ← optional/conditional, required if FE+BE are separate within one repo
  testing-strategy.md            ← optional, conventions & coverage targets (different from the per-ticket qa-report)
```

**Principles:**
- `CLAUDE.md` contains **behavior only**, not general explanations the AI already knows
- `golden-examples` are **reference-based, not copies.** `RULES.md` in
  `.caf/knowledge/golden-examples/{{app}}/` points to the **original file's path in the codebase**
  (from Step 2's detection) — it doesn't copy its content. `RULES.md` contains: the file path, the
  pattern name, and **why** this file is a good example (which parts must be imitated/do, which
  parts happen to be there but must not be imitated/don't). A deliberate trade-off: one extra lookup
  (read `RULES.md` first, then open the original file) — but the example stays "alive", changes
  along with the codebase, and never becomes a frozen snapshot that quietly drifts from the real code.
  Without `RULES.md`, a golden example is ambiguous — the AI has to guess which parts are the
  pattern and which are coincidental.
- ADRs answer **"why"**, not just "what the rule is"
- Iterative: every time an agent gets a convention wrong, update its knowledge base (see the pattern:
  a convention that emerges organically during testing → documented afterwards, not predicted up front)
- `docs/product/prd.md`, `docs/architecture/system-overview.md`, `docs/api-contract.md`,
  `docs/schema/erd.md`, `docs/testing-strategy.md` are **optional and read-only** for
  CAF — they are reference documents that may come from other teams (Product/Design), read by agents
  when available (see Layer 2), but **never a mandatory prerequisite** before the pipeline
  runs. If they're absent, agents keep working from the ticket description as usual.
  `.caf/knowledge/INDEX.md` links to these documents with a ✓ present/✗ not yet present status,
  so agents know what's available without probing the filesystem themselves.

> **`.caf/discovery/{{slug}}/prd.md` is not `docs/product/prd.md`.** The first is a per-feature
> draft artifact written by the PM Agent during Cluster 1 (see the Cluster 1 structure above) — not
> necessarily final, not necessarily relevant across features. The second is the product-level PRD,
> project-owned, reused across tickets, and read-only for CAF like the other Layer 1 documents. Don't
> mix the two up when generating or reading artifacts.

> **Different from the other Layer 1 documents:** `feature-catalog.md` is not purely read-only like
> `prd.md` — its content is periodically synced from code through a generate command (see
> `caf-initiator`), with strict idempotency rules: new entries are appended, draft entries
> are refreshed, entries already written by a human are never overwritten automatically, and entries
> that disappear from the code are marked stale rather than deleted. This command still must not
> modify any code file — the direction is one-way, from code to catalog, never the reverse.

---

### Layer 2 — Agent Definitions
> Every agent has a clear role, scope, and contract

Store them in `.claude/agents/` (for Claude Code) or the equivalent folder for other tools
(`.kiro/agents/`, `.opencode/agents/`, etc. — match the AI runner the project chose).

**Structure of each agent file:**
```markdown
## Role
[one sentence: what this agent's role is]

## Scope
[which code areas it may access/change]

## Allowed Tools
[read-only or write, which MCP servers it may access]

## Input
[which artifacts it receives from the previous agent]

## Output
[which artifacts it produces for the next agent]

## Working Pattern (PIV)
[explicit instructions: plan first, then implement, then verify]

## Verify Checklist
[concrete commands that must be run before finishing — filled from the scripts detected in package.json]

## Retry Logic
[if verify fails: fix and retry up to N times]
```

**8 Specialist Agents (match the {{APP_1}}/{{APP_2}} names to the detection results; in `SINGLE_REPO`
the two {{APP_1}}/{{APP_2}} rows are replaced by a single `caf-implementer` agent — see Step 2b):**

| Agent | Phase | Output Artifact |
|---|---|---|
| Planner | Plan | `requirements.md`, `tasks.md` |
| Architect | Plan (optional) | `design.md` |
| {{APP_1}} (e.g. Frontend) | Implement + Verify | code + `verify-report.md` |
| {{APP_2}} (e.g. Backend) | Implement + Verify | code + `verify-report.md` |
| QA | In-depth Verify | `qa-report.md` |
| Reviewer | Qualitative review | `review-notes.md` |
| Documentation | Parallel | update `docs/` |
| DevOps | Post-merge (next phase) | deployment |

**Model Routing (token-efficient):**
- Small/cheap model → simple tasks (rename, format, lookup)
- Standard model → standard implementation, debugging, review
- Most capable model → complex architecture, big decisions

> Real-world implementation note: before assigning agents to a complex ticket that involves
> more than one app, run the Planner Agent on its own first — contract gaps between layers
> (e.g. a query parameter that doesn't exist yet in the backend DTO) are often only caught at this
> stage, and that's a sign the pipeline is working correctly, not a sign the ticket is incomplete.

**Optional input for the Planner & Architect Agents:**
Besides the ticket description from the tracker, the Planner Agent may read Layer 1 reference
documents when available, in this priority order: `docs/product/features/{{feature-name}}.md` (Feature
Spec, if the ticket is linked to one) → `docs/product/prd.md` → the ticket description alone.
For tasks involving more than one app, the Architect Agent may also read
`docs/architecture/system-overview.md`, `docs/api-contract.md`, and `docs/schema/erd.md` if they
exist, as additional context before writing `design.md`.

This is **not a mandatory gate** — if any or all of these documents are absent, the Planner/Architect
keeps working as usual from the ticket description alone. CAF never stops the pipeline
just because these reference documents haven't been written; that's outside CAF's control and responsibility.

#### Skills (optional)

A skill is a reusable working rule, stored in `.claude/skills/<name>/SKILL.md`.
It serves two purposes: (1) manual coding sessions driven by free-form prompts still get PIV,
quality gates, and scope rules even without invoking an agent; (2) agents can share conventions
without bloating `CLAUDE.md`.

CAF's built-in skills are **universal** and all start with `caf-`: `caf-verify` (the repo's actual
verification commands), `caf-scope-discipline`, `caf-no-guess`, `caf-escalate`, and `caf-piv`
(manual sessions only). CAF does **not** ship a library of framework conventions: those go stale
quickly and are a guess about the target repo.

**How a skill reaches its reader:**

- Manual sessions: triggered automatically through the `description` in the skill's frontmatter.
- Agents: through an optional `## Skills` section in the agent definition, containing **`Read` pointers**
  to the skill files, e.g. `.claude/skills/caf-no-guess/SKILL.md`.

**Test findings (don't repeat these):**

- A `skills:` key in the agent frontmatter **has no effect** when the agent is run with
  `claude --agent <name>` (how the orchestrator invokes agents): the skill is never loaded. Don't
  rely on it.
- Adding the `Skill` tool to an agent does work, but it changes the tool list of every agent,
  including read-only agents (Auditor, DevOps). Don't do it.
- An agent without a pointer doesn't see the skill at all, so skills don't leak into agents that
  aren't pointed at them.
- **The orchestrator must not use `--bare`**: that flag disables agent discovery in
  `.claude/agents/`, so `claude --agent caf-planner` fails with "agent not found".

**Rules:**

- A skill that still carries a `DRAFT` banner isn't ready: agents must ignore it, and no pointer to
  it is written. `caf-verify` carries a `DRAFT` banner as long as any verification script
  is undetected (written as a `TODO` line, not a guessed command).
- `caf-piv` says to wait for the user's approval, so it is **never** pointed at by an agent: a
  headless run has nobody to answer.
- A skill must not change a contract the orchestrator parses (report file names, status words).
  When a skill conflicts with the agent definition, the agent definition wins.
- Built-in mapping: implementation agents get `caf-verify`, `caf-scope-discipline`,
  `caf-no-guess`, `caf-escalate`; QA gets `caf-verify`, `caf-no-guess`; Planner, Architect,
  Reviewer, Documentation get `caf-scope-discipline`, `caf-no-guess`; Auditor, DevOps, PM,
  UX Designer get no skills.
- Must be tested with a real dispatch before relying on it: make sure the agent actually applies
  the skill on a task that doesn't mention the skill, and actually ignores a `DRAFT` skill.

---

### Layer 3 — Artifact Handoff
> Agents don't "chat" with each other — they pass files to each other

Every ticket has its own folder. An agent reads the previous agent's output from this folder,
not from memory or chat. The folder name follows the ticket key from the tracker in use
(`ENG-123` for Linear/Jira, or the issue number for GitHub Issues) — consistent with the
`ai-agent/{{TICKET-ID}}` branch name.

```
.caf/tasks/{{TICKET-ID}}/
  requirements.md    ← Planner Agent: what is requested, acceptance criteria
  design.md          ← Architect Agent: technical approach (if needed)
  tasks.md           ← Planner Agent: concrete task breakdown
  verify-report.md   ← {{APP_1}}/{{APP_2}} Agent: implement + verify results
  qa-report.md       ← QA Agent: in-depth test results
  review-notes.md    ← Reviewer Agent: qualitative review results
```

**Different in nature from Layer 1 documents:** the files in `.caf/tasks/{{TICKET-ID}}/` above are
artifacts **generated by agents**, specific to one ticket, and archived once the ticket is done.
Layer 1 documents (`docs/product/prd.md`, `docs/product/features/*.md`,
`docs/architecture/system-overview.md`, `docs/api-contract.md`, `docs/schema/erd.md`) are the
opposite: **read-only input**, reused across tickets, and never written or modified by an agent —
only read. Don't mix up these two kinds when generating a new artifact.

**`verify-report.md` format:**
```markdown
## Ticket: {{TICKET-ID}}
## Status: SUCCESS / NEEDS_HUMAN

## Attempt Log
- Attempt 1: FAIL — [error]
- Attempt 2: PASS

## Acceptance Criteria
- [x] criterion 1 — met in File.ext line N
- [x] criterion 2 — met in service.ext

## Quality Gate
- Lint: PASS
- Typecheck: PASS
- Test: PASS / SKIP (reason)

## Notes
[deviations from the plan, if any]
```

---

### Layer 4 — Quality Gates
> Checkpoints that are actually executed, not just text instructions

**The minimum required** (fill the commands from the scripts that actually exist in the detected
`package.json` — don't assume script names without verifying):
```bash
# Non-monorepo:
{{PKG_MANAGER}} typecheck   # must pass
{{PKG_MANAGER}} lint        # must pass
{{PKG_MANAGER}} test        # must pass (if relevant tests exist)
{{PKG_MANAGER}} build       # must pass before the PR is opened

# Monorepo (MUST be scoped to the relevant workspace, DO NOT run at the root):
{{PKG_MANAGER}} --filter {{APP_N}} typecheck   # scoping syntax differs per package manager,
{{PKG_MANAGER}} --filter {{APP_N}} lint        # see each package manager's documentation
{{PKG_MANAGER}} --filter {{APP_N}} test
{{PKG_MANAGER}} --filter {{APP_N}} build

# IMPORTANT: first verify that these scripts really exist as separate entries in
# package.json — sometimes typecheck is "bundled" into the build script (e.g. `tsc -p . && build`),
# not an entry of its own. If so, record it as a gap and run it manually, don't
# assume it exists. A missing script = report it as an infrastructure gap, don't
# create a fake quality gate.
```

**Why scoping is mandatory, not just tidy:** in a monorepo, root scripts usually
delegate to a task runner (`turbo lint`, `nx run-many`) that fans out to ALL workspaces.
An unscoped quality gate is therefore not just slow — it executes changes outside the
ticket's scope. A real case: an agent working on a frontend ticket ran `pnpm lint`
at the root, `eslint --fix` also ran in `apps/api`, and backend files unrelated
to the ticket got reformatted and ended up in the diff. The same applies to
`build` (building the whole monorepo for one app) and `test`. Conversely, if a script only
exists in the app and not at the root, the unscoped command simply fails — the agent burns through
its retries and stops with a false needs-a-human status.

**General principle — an uncertain fallback must admit it, not guess.** This applies
more broadly than the lint/typecheck commands above: whenever a command
executed AUTOMATICALLY by an agent depends on a value that sometimes fails to be detected (package
manager, workspace name, tool version, etc.), the agent's instructions must explicitly say "TODO,
verify manually" when the value is uncertain — NOT silently use a guessed value that
looks plausible (e.g. assuming `npm` when the package manager wasn't detected).

The reason is concrete, not abstract caution: a command that is wrong but looks valid
produces a misdirected failure — retries run out because the command itself is wrong
(not because the ticket's code is wrong), ending in a `NEEDS_HUMAN` status that is actually a
misdiagnosis (the developer is told to check the code, when the problem is the verify command).
An honest `TODO` fallback is caught and fixed faster than a command that is "almost
right".

**A special case more dangerous than a false NEEDS_HUMAN: a command that never
finishes (watcher/daemon).** If verification-script detection picks the wrong one (e.g. `test:watch`
instead of `test`, because name matching only used a loose pattern match and `test:watch`
happened to be declared first in `package.json`), the agent can run a command that
never exits — not a failure, but a total hang that never reaches any status at all.
If automatic command detection relies on name matching, **prefer an
exact match on the script name first, and only fall back to pattern matching** when there is no exact match
— not the other way around.

**Create `.caf/workflows/task-completion.md`** containing:
- An explicit Definition of Done
- The commands that must be run
- Documentation update rules (new endpoint → update api-contract.md, etc.)
- A PR checklist before the branch is considered ready

**Recommended additions:**
- Custom lint rules for critical rules that must never be broken (specific to the project's domain,
  e.g. a query without a `tenant_id` scope, business logic in a controller)
- A git hook as the last backstop
- Check for stale committed build artifacts (compiled `.js`/`.d.ts` output) — these can
  make the lint gate unreliable because of errors in files the AI shouldn't be editing

**If `verify-report.md` has status `NEEDS_HUMAN`:**
- The pipeline stops
- An automatic comment is posted on the ticket with an error summary
- The ticket status changes to "Blocked" or "Needs Review"
- The mentioned developer handles it manually

---

### Layer 5 — Orchestration
> The engine that runs the pipeline automatically. **Pick one variant based on the result of Step 3.**

**Infrastructure components (the same for every tracker):**
```
Small VPS (~$5-6/month)
  └── Webhook Receiver (Express, ~150 lines)
        └── Spawn an AI runner per agent (on-demand, not always on)
              └── MCP access: {{TRACKER}} MCP + GitHub MCP / gh CLI
```

#### Variant A — Linear
```
Linear event (ticket status changes to "Ready for AI")
  → POST /webhook/linear
  → verify the signature
  → parse the ticket ID + description
  → git checkout -b ai-agent/{{TICKET-ID}}
  → spawn: planner agent
  → spawn: {{APP_1}} agent (reads .caf/tasks/{{TICKET-ID}}/)
  → read verify-report.md
      SUCCESS  → comment on Linear, branch ready for review
      NEEDS_HUMAN → error comment on Linear, stop the pipeline
```
What needs to be set up: Linear API token, GitHub token, Anthropic API key, Linear webhook secret.

#### Variant B — Jira
```
Jira event (status changes to "In Progress" / a custom "Ready for AI" status)
  → POST /webhook/jira
  → verify the signature (x-hub-signature header, shared secret)
  → parse the issue key, summary, description, assignee
  → git checkout -b ai-agent/{{TICKET-ID}}
  → spawn: planner agent
  → spawn: {{APP_1}} agent (reads .caf/tasks/{{TICKET-ID}}/)
  → read verify-report.md
      SUCCESS  → post a comment on Jira, branch ready for review
      NEEDS_HUMAN → post an error comment, change the status to "Blocked", stop the pipeline
```
What needs to be set up: Jira API token + email, Jira base URL, Jira project key, Jira webhook
secret, GitHub token, Anthropic API key.

Important technical differences: the Jira payload is more verbose (`issue.key`, `issue.fields.summary`,
`issue.fields.status.name`); status transitions use numeric IDs (fetch them first with
`GET /rest/api/3/issue/{key}/transitions`); comments are posted via
`POST /rest/api/3/issue/{key}/comment` in ADF or plain-text format.

#### Variant C — GitHub Issues (fallback with no external tracker)
```
GitHub Issue event ("ready-for-ai" label added)
  → GitHub webhook / GitHub Actions trigger
  → parse the issue number + body
  → git checkout -b ai-agent/issue-{{NUMBER}}
  → spawn: planner agent → spawn: {{APP_1}} agent
  → read verify-report.md
      SUCCESS  → comment on the issue, branch ready for review
      NEEDS_HUMAN → error comment, "blocked" label, stop the pipeline
```
What needs to be set up: a GitHub token with Actions + Issues scope, Anthropic API key.

---

## Recommended Full Folder Structure

```
project-root/
├── CLAUDE.md                        ← Layer 1, <150 lines
├── AGENTS.md                        ← Layer 1, cross-tool compatible
│
├── .claude/
│   ├── agents/
│   │   ├── caf-planner.md           ← Layer 2
│   │   ├── caf-architect.md         ← Layer 2
│   │   ├── {{app_1}}.md             ← Layer 2 — NOT prefixed, see the note below
│   │   ├── {{app_2}}.md             ← Layer 2 — NOT prefixed, see the note below
│   │   ├── caf-qa.md                ← Layer 2
│   │   ├── caf-reviewer.md          ← Layer 2
│   │   └── caf-documentation.md     ← Layer 2
│   └── commands/
│       ├── caf-plan-ticket.md       ← Layer 2, Planner companion
│       ├── caf-design-ticket.md     ← Layer 2, Architect companion
│       ├── caf-qa-check.md          ← Layer 2, QA companion
│       ├── caf-review-ticket.md     ← Layer 2, Reviewer companion
│       └── ...                      ← audit-scan, discovery-start, run-pipeline, etc. — all caf-*
│
├── .caf/
│   ├── knowledge/                   ← Layer 1, CAF-generated (different from docs/ below)
│   │   ├── INDEX.md                 ← ✓/✗ status of the docs/ documents below
│   │   ├── decisions/               ← ADRs
│   │   └── golden-examples/         ← code references (paths to the original files, not copies)
│   │       ├── {{app_2}}/
│   │       │   └── RULES.md         ← path + pattern + do/don't
│   │       └── {{app_1}}/
│   │           └── RULES.md         ← path + pattern + do/don't
│   ├── workflows/
│   │   ├── task-completion.md       ← Layer 4
│   │   ├── piv-workflow.md          ← Layer 4, PIV SOP + retry
│   │   └── agent-handoff.md         ← Layer 3, artifact format
│   ├── tasks/
│   │   ├── README.md                ← explains the structure for agents
│   │   └── {{TICKET-ID}}/           ← created at runtime per ticket, not scaffolded at generate time
│   ├── discovery/                   ← created at runtime per feature (Cluster 1), not scaffolded
│   │   └── {{slug}}/
│   └── audits/                      ← created at runtime per date (Cluster 4), not scaffolded
│       └── {{DATE}}/
│
├── docs/                             ← project-owned, read-only for CAF (see Layer 1)
│   ├── product/
│   │   ├── prd.md                    ← optional
│   │   └── features/
│   │       └── {{feature-name}}.md   ← Feature Spec, optional
│   ├── architecture/
│   │   └── system-overview.md        ← optional
│   ├── schema/
│   │   └── erd.md                    ← optional
│   ├── api-contract.md               ← optional/conditional (FE+BE separate within one repo)
│   ├── testing-strategy.md           ← optional
│   └── ...                           ← adapt to the project's domain
│
└── {{apps_dir}}/ / {{packages_dir}}/ ← project code as usual
```

**Transition complete (CAF-REORG-07):** `{{app_1}}.md`/`{{app_2}}.md` (the implementation agents, e.g.
`frontend`/`backend`) now get the `caf-` prefix just like the 8 other agents above —
`caf-frontend.md`/`caf-backend.md`. The automated orchestrator (Layer 5) has fully cut over to the
prefixed names since Checkpoint 4B, so the generator and orchestrator are consistent for new projects.

**`.caf/tasks/{{TICKET-ID}}/`, `.caf/discovery/{{slug}}/`, and `.caf/audits/{{DATE}}/` are not
scaffolded empty at generate time** — the structure above shows their shape after
use, not the generator's direct output. All three are created by agents at runtime, per
ticket/feature/date respectively, when the pipeline actually runs.

---

## Recommended Implementation Order

### Phase 1 — Foundation (start here)
1. **(Optional)** Check whether `docs/product/prd.md`, `docs/product/features/*.md`, or
   `docs/schema/erd.md` already exist (usually from the Product/Design team). If so, use them as
   references for step 5 (ADRs). If not, **skip** — don't make them a
   prerequisite, go straight to step 2
2. Create a concise root `CLAUDE.md` (<150 lines) + a per-app `CLAUDE.md`
3. Create `AGENTS.md` with concrete (not abstract) rules, complete with right/wrong examples
4. Pick the 2-3 cleanest existing files → write a `RULES.md` in
   `.caf/knowledge/golden-examples/{{app}}/` that points to their original paths (not copies),
   explaining why each file is a good example + its do/don'ts
5. Write the 2 most critical ADRs for your project → `.caf/knowledge/decisions/` (use the PRD/Feature
   Spec from step 1 as the "why" context, if available)
6. Create `.caf/workflows/task-completion.md` with the Definition of Done + PR checklist
   — **first verify that every referenced script actually exists**, don't assume

### Phase 2 — Agents & Artifacts
7. Create `caf-planner.md` + the most relevant implementation agent first
8. Create `.caf/workflows/piv-workflow.md` + `agent-handoff.md`
9. Manual test: run the planner agent on 1-2 real tickets, without an automatic trigger
   — start with a simple single-agent ticket, then move up to a multi-agent ticket
10. Evaluate: how accurate the plan is, how clean the code is, how many tokens were used

### Phase 3 — Automation (requires explicit confirmation from the user before starting)
11. Set up the VPS + webhook receiver
12. Connect the tracker MCP (Linear/Jira) per the chosen Variant
13. Enable the automatic trigger from the webhook
14. Add the next agents (QA, Reviewer) one at a time once the Planner + implementation agent are stable

### Phase 4 — Hardening
15. Add custom lint rules for critical rules
16. Add an automatic `gh pr create` at the end of the pipeline
17. Evaluate swapping/comparing AI runners (if relevant)
18. AI PR Reviewer + DevOps Agent

---

## What Not to Do

- Don't install another agent framework — borrow its concepts if needed
- Don't create every agent at once — start with the Planner + 1 implementation agent
- Don't auto-merge — human review remains mandatory in every phase
- Don't put every rule in one giant file — split per scope, per layer
- Don't treat `CLAUDE.md` as written once and done — it's a living document, updated every time
  an agent gets a convention wrong
- Don't run Phase 3 without explicit confirmation from the user — it touches credentials and
  live infrastructure
- Don't make `docs/product/prd.md`, Feature Specs, or other Layer 1 reference documents
  a mandatory prerequisite before the pipeline runs — CAF is an implementation framework (starting from
  an incoming ticket), not a product management framework. Those documents may be read if present, but
  their absence must not block or stop any agent

---

## Technology Reference (generic; fill in the right column from the project's detection/preferences)

| Need | Common Choices | This Project |
|---|---|---|
| Ticket tracker | Linear / Jira / GitHub Issues | `{{TRACKER}}` |
| AI runner | Claude Code (default), OpenCode, etc. | `{{AI_RUNNER}}` |
| MCP | Tracker MCP + GitHub MCP | `{{MCP_LIST}}` |
| PR & branch | `gh` CLI (early phase), MCP (mature phase) | — |
| Webhook receiver | Node.js + Express | — |
| Queue | `p-queue` (prevents race conditions) | — |
| Runner infra | Small VPS (Hetzner CX22 / DigitalOcean Droplet) | — |
| Artifact storage | Markdown files on a git branch | — |

---

## Appendix A — Placeholder Reference

Filled in by the AI during Steps 2–3 before generating any file.

| Placeholder | Filled from | Example |
|---|---|---|
| `{{REPO_MODE}}` | Step 2b — workspace markers at the repo root, or a user override (`--mode`) | `MONOREPO`, `SINGLE_REPO` |
| `{{APP_1}}`, `{{APP_2}}` | Detected app folder names (`MONOREPO` only; not used in `SINGLE_REPO`) | `web`, `api` |
| `{{PKG_MANAGER}}` | `packageManager` in the root `package.json`, falling back to the lockfile | `pnpm`, `npm`, `yarn`, `bun` |
| `{{apps_dir}}` / `{{packages_dir}}` | Detected monorepo structure (`MONOREPO` only; not used in `SINGLE_REPO`) | `apps/`, `packages/` |
| `{{TRACKER}}` | Step 3 detection/confirmation result | `Linear`, `Jira`, `GitHub Issues` |
| `{{AI_RUNNER}}` | Detected AI config folder, or ask the user | `Claude Code` |
| `{{TICKET-ID}}` | Key format of the chosen tracker | `ENG-123`, `#42` |

> If any placeholder can't be determined with certainty from automatic detection, **ask the user**
> instead of guessing. A wrongly filled placeholder spreads through all of Layers 1–5.
