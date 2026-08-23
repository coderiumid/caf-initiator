import { verifyCommand, unresolvedPmTodo } from '../utils/runner-command.js';
import { ARTIFACT_BY_ROLE } from './artifact-by-role.js';
import { WHAT_TO_LOOK_FOR, reportSkeleton } from './audit-report-format.js';

function slugifyAppPath(appPath) {
  return appPath
    .replace(/^apps\//, '')
    .replace(/^packages\//, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Kinds that get a `caf-` filename prefix (checkpoint CAF-REORG-01 AC5). `frontend`/`backend`
// joined the list at CAF-REORG-07 — caf-orchestrator finished its cutover to prefixed names at
// Checkpoint 4B, so new projects no longer need the unprefixed filenames. `devops` is still
// excluded — not yet a finalized kind.
export const CAF_PREFIXED_KINDS = ['planner', 'architect', 'qa', 'reviewer', 'documentation', 'auditor', 'pm', 'ux-designer', 'frontend', 'backend'];

export function agentSlug(kind, app) {
  if (kind === 'implementation') return slugifyAppPath(app.path);
  return CAF_PREFIXED_KINDS.includes(kind) ? `caf-${kind}` : kind;
}

function verifyLine(label, script, packageManager, packageName) {
  if (!script) {
    return `- [ ] TODO: no ${label} script detected in package.json — verify manually or add the script`;
  }
  const command = verifyCommand({ packageManager, script, packageName });
  if (!command) return `- [ ] ${unresolvedPmTodo({ packageName, script })}`;
  return `- [ ] \`${command}\``;
}

// packageName scopes each command to the agent's own workspace — without it the agent, which
// runs from the repo root, would trigger the root script (in a monorepo: every workspace).
function buildVerifyChecklist(scripts, packageManager, packageName) {
  if (!scripts) {
    return [
      '- [ ] TODO: this agent\'s scope is not a single app — no reference package.json for auto-detecting scripts',
      '- [ ] TODO: determine the relevant verification manually',
    ].join('\n');
  }
  return [
    verifyLine('lint', scripts.lint, packageManager, packageName),
    verifyLine('typecheck', scripts.typecheck, packageManager, packageName),
    verifyLine('test', scripts.test, packageManager, packageName),
    verifyLine('build', scripts.build, packageManager, packageName),
  ].join('\n');
}

// Planner/Architect may optionally read Layer 1 reference docs (CAF.md Layer 2) — these are
// never a gate, so the language here must stay explicit that missing docs are fine.
// Planner's discovery-draft fallback is deliberately verbose: the mandatory re-copying of
// unanswered Open Questions into requirements.md is the safety contract (a draft PRD must
// never silently become requirements with assumed answers) — don't compress that away.
// The escalation MECHANISM branches on environment: interactive (default) still STOPs and waits
// for chat confirmation, unchanged from before. Headless runs (caf-orchestrator prepends a
// "[SYSTEM CONTEXT: Environment = headless...]" marker to the prompt) have no chat to wait on —
// STOPping there means the run silently exits 0 with no tasks.md, which caf-orchestrator can't
// distinguish from success. So headless redirects escalation to a file artifact instead of chat:
// requirements.md still carries every unanswered Open Question verbatim (same no-assume
// guarantee), just tagged `Status: NEEDS_HUMAN` for a human to resolve later, and tasks.md is
// still written (minimal/blocked) so downstream file-existence checks don't except. This is a
// different delivery channel for the same contract, not a weaker one.
// TODO project-specific: the headless marker is only consumed by the Planner branch below for
// now. Other roles (frontend/backend/qa/reviewer/documentation) may hit similar interactive-STOP
// situations under headless runs but are intentionally left untouched here — needs its own
// discussion/implementation, not silently extended.
// appNames: real app.path values for the assigned frontend/backend agents (e.g. ['apps/admin',
// 'apps/api']), only meaningful for kind 'qa'/'reviewer'. Optional — callers that only know
// `kind` (agents-sync.js, audit.js regenerating this section from an existing file on disk,
// where the original app assignment isn't recoverable) get the generic phrasing below instead
// of a literal template placeholder.
export function buildInputSection(kind, appNames = []) {
  if (kind === 'planner') {
    return [
      'Ticket description from the tracker (required).',
      '',
      '### Fallback — Discovery draft without a ticket',
      '',
      '1. If the given TICKET-ID is not found in either the tracker or the repo backlog, check',
      '   whether `.caf/discovery/{TICKET-ID}/prd.md` exists (TICKET-ID is used as the folder name —',
      '   the slug produced by `/caf-discovery-start`, used consistently as the identity throughout',
      '   the pipeline when not going through the tracker).',
      '2. If `.caf/discovery/{TICKET-ID}/` does NOT exist: proceed with the existing behavior (ask',
      '   the user for the task description directly) — the remaining steps below don\'t apply.',
      '3. If `prd.md` exists: first check the list of Open Questions that are still UNANSWERED (from',
      '   `prd.md`/`flow.md`), then check whether the received prompt/context is prefixed with the',
      '   `[SYSTEM CONTEXT: Environment = headless...]` marker.',
      '   - **No open questions remain at all** (all answered): proceed to generate',
      '     `requirements.md` with `## Status: PLAN` as usual — unaffected by headless or not, no',
      '     need to show anything in chat first.',
      '   - **There are unanswered Open Questions, NOT headless**: first show the user a summary',
      '     of `prd.md` (Problem, Scope, Success Metric) and the list of questions, then ask',
      '     explicitly "Found a discovery draft for this. [N open questions unanswered]. Proceed',
      '     using this as the requirement as-is?" — STOP until the user answers. If the user says',
      '     no/cancel, don\'t proceed to generate `requirements.md` — report and stop. (Existing',
      '     behavior, unchanged.)',
      '   - **There are unanswered Open Questions, headless**: do NOT STOP waiting for chat — no',
      '     human will answer. Generate `requirements.md` directly with `## Status: NEEDS_HUMAN`,',
      '     and still create `tasks.md` (may be minimal, containing a short note like "blocked —',
      '     waiting on answers to Open Questions, see requirements.md") so caf-orchestrator doesn\'t',
      '     except on its file-existence check. See the `Constraints` section below.',
      '4. On both "has open questions" paths above (headless or not) that proceed to generate:',
      '   `requirements.md` MUST re-copy all still-unanswered Open Questions into the',
      '   `## Open Questions` section (a new section, added to the existing `requirements.md`',
      '   format) — do NOT silently assume the answers, on either path.',
      '',
      '### Optional — Layer 1 reference docs',
      '',
      'If available, read in the following priority order; if not available, proceed from the',
      'ticket description alone as usual (not a hard requirement):',
      '1. `docs/product/features/{{feature-name}}.md` (Feature Spec, if the ticket is linked to one)',
      '2. `docs/product/prd.md`',
    ].join('\n');
  }
  if (kind === 'architect') {
    return [
      '`requirements.md` from the Planner Agent (required).',
      '',
      'Optional — for tasks spanning more than one app, may be read if available as additional',
      'context; if not available, proceed to write `design.md` from `requirements.md` alone (not',
      'a hard requirement):',
      '- `docs/architecture/system-overview.md`',
      '- `docs/api-contract.md`',
      '- `docs/schema/erd.md`',
    ].join('\n');
  }
  if (kind === 'frontend' || kind === 'backend' || kind === 'implementation') {
    return [
      '`requirements.md` and `tasks.md` from the Planner Agent in `.caf/tasks/{TICKET-ID}/` (required).',
      '',
      'Optional — if the task involves the Architect Agent, read as additional context before',
      'implementation; if not available, proceed from `requirements.md`/`tasks.md` alone (not a',
      'hard requirement):',
      '- `design.md`',
    ].join('\n');
  }
  if (kind === 'qa') {
    const who = appNames.length > 0 ? `implementation agent (${appNames.join(', ')})` : 'implementation agent';
    return `\`verify-report.md\` from the ${who} in \`.caf/tasks/{TICKET-ID}/\` (required).`;
  }
  if (kind === 'reviewer') {
    const who = appNames.length > 0 ? `implementation agent (${appNames.join(', ')})` : 'implementation agent';
    return [
      `\`verify-report.md\` from the ${who} and \`qa-report.md\` from the QA Agent, both in`,
      '`.caf/tasks/{TICKET-ID}/` (required).',
      '',
      'Optional — when invoked from post-PR mode (`/caf-fix-review`, not the normal pre-PR pipeline',
      'gate), this agent also receives human reviewer comments from GitHub (comment text +',
      'INLINE path:line or GENERAL metadata, and scoped/global mode) as additional input, inserted',
      'directly into the spawn prompt by that command — not a separate file artifact in',
      '`.caf/tasks/{TICKET-ID}/`. If this input is absent (normal pre-PR mode), proceed as usual',
      'from `verify-report.md`/`qa-report.md` alone.',
    ].join('\n');
  }
  if (kind === 'documentation') {
    return [
      '`requirements.md` and `verify-report.md` in `.caf/tasks/{TICKET-ID}/` (optional — per',
      'CAF.md, the Documentation Agent runs in parallel and isn\'t a blocking gate; if these',
      'artifacts aren\'t available yet when the Documentation Agent runs, proceed from the ticket',
      'description alone).',
    ].join('\n');
  }
  if (kind === 'auditor') {
    return [
      'No required input — the agent proactively scans the whole repo.',
      '',
      'Optional: a scope hint from the user (e.g. "focus on apps/api" or "only check the auth module").',
    ].join('\n');
  }
  return 'TODO: which artifact is received from the previous agent (see .caf/tasks/{TICKET-ID}/)';
}

// Per-role tool allowlist. This is the list the harness actually enforces via the frontmatter
// `tools:` field, and `## Allowed Tools` in the body is rendered from the same map so the
// two can never drift. Deliberately NOT uniform across roles: only implementation agents get
// write access to code, and Auditor stays read-only (Bash for inspection only — ls/grep/git
// blame), matching the hand-written umkm-pos auditor definition.
// Adding MCP servers to any of these is a security decision a human must make — hence the TODO
// kept in the body text.
const TOOLS_BY_KIND = {
  planner: ['Read', 'Write'],
  architect: ['Read', 'Write'],
  frontend: ['Read', 'Write', 'Edit', 'Bash'],
  backend: ['Read', 'Write', 'Edit', 'Bash'],
  implementation: ['Read', 'Write', 'Edit', 'Bash'],
  qa: ['Read', 'Write', 'Bash'],
  reviewer: ['Read', 'Write', 'Bash'],
  documentation: ['Read', 'Write', 'Edit'],
  auditor: ['Read', 'Bash'],
  devops: ['Read', 'Bash'],
};

const TOOLS_RATIONALE = {
  planner: 'Read for ticket/docs context, Write for artifacts in `.caf/tasks/{TICKET-ID}/`. Does NOT touch code.',
  architect: 'Read for architecture context, Write for `design.md`. Does NOT touch code.',
  frontend: 'Read/Write/Edit for code within this agent\'s scope, Bash to run the Verify Checklist.',
  backend: 'Read/Write/Edit for code within this agent\'s scope, Bash to run the Verify Checklist.',
  implementation: 'Read/Write/Edit for code within this agent\'s scope, Bash to run the Verify Checklist.',
  qa: 'Read for artifacts + code, Bash to run tests/build, Write for `qa-report.md`. Does NOT change code.',
  reviewer:
    'Read for code + artifacts, Bash to read diffs (`git diff`/`git log`), Write for ' +
    '`review-notes.md`. Does NOT change code — findings are written as notes, not fixed directly.',
  documentation: 'Read/Write/Edit limited to documentation (README, CHANGELOG, `docs/`). Does NOT touch code.',
  auditor:
    'READ-ONLY. Read for code, Bash only for inspection (`ls`, `grep`, `git blame`) — not ' +
    'for changing anything. No Write, no Edit, no write access to the tracker ' +
    '(Linear/Jira/GitHub) — converting findings into tickets is a human decision via ' +
    '`/caf-audit-to-ticket`.',
  devops:
    'TODO: CAF.md doesn\'t yet define the artifact/permission contract for DevOps (post-merge, next ' +
    'phase). `[Read, Bash]` in the frontmatter is the safest default — determine manually before ' +
    'this agent is used, especially access to deployment credentials.',
};

function toolsForKind(kind) {
  return TOOLS_BY_KIND[kind] || ['Read'];
}

function buildToolsSection(kind) {
  const list = toolsForKind(kind)
    .map((t) => `\`${t}\``)
    .join(', ');
  const rationale =
    TOOLS_RATIONALE[kind] ||
    'TODO: read-only or write — must be decided by a human, can\'t be inferred from stack detection.';
  return [
    `The frontmatter \`tools\` above is the list that applies: ${list}.`,
    '',
    rationale,
    '',
    'TODO project-specific: which MCP server (if any) this agent may access — this is a security',
    'decision that must be made by a human. Add the MCP tool name to the frontmatter `tools` too,',
    'not just this section.',
  ].join('\n');
}

// The Auditor's report contract lives with its companion commands (audit-report-format.js) so
// auditor.md and /caf-audit-scan can never disagree again. Other roles' output contracts are a
// single line in the Output section, so they get no extra section.
// Rendered as the LAST two sections of auditor.md on purpose: the report skeleton contains
// literal `## ...` lines inside a fenced block, and the section parser in utils/agent-sections.js
// is fence-unaware. Keeping them at the end means those lines can never split a real section or
// become an insertion anchor for agents-sync.
function buildAuditContractSections(kind) {
  if (kind !== 'auditor') return '';
  return `
## What to Look For
${WHAT_TO_LOOK_FOR}

## Report Format
Save the report to \`.caf/audits/<DATE>/audit-report.md\` (this name is reserved for a full-repo
scan by this agent — the scoped \`/caf-audit-scan\` command uses the suffix \`-{scope-slug}\`).

The frontmatter \`tools\` above deliberately does NOT grant \`Write\` (this agent is read-only
against the repo), so save the file via a Bash redirect/heredoc — the only write allowed, and
ONLY under \`.caf/audits/\`. TODO: if you'd rather use \`Write\` for this, add \`Write\` to the
frontmatter and constrain its scope in the Scope section — a human decision.

${reportSkeleton({
  agentLabel: 'auditor (agent)',
  scopeLine: '## Scope: <area being scanned>',
  maxPriority: 5,
})}

The cap of 5 Priority Findings applies specifically to this agent because it scans the entire
repo (budget control for the weekly AI run). \`/caf-audit-scan\` has no cap because it's scoped to
whatever area the user requested.
`;
}

// Planner-only: makes the headless-vs-interactive escalation branch in buildInputSection() an
// explicit, hard-to-miss rule instead of something buried inside the Fallback Discovery flow.
// Not generalized to other kinds yet — see TODO near buildInputSection().
function buildBatasanSection(kind) {
  if (kind !== 'planner') return '';
  return `
## Constraints
- The Planner is NEVER allowed to end a run waiting for chat confirmation if the prompt/context
  it received is prefixed with the \`[SYSTEM CONTEXT: Environment = headless...]\` marker. The
  default escalation in this case is writing a file (\`requirements.md\` with
  \`Status: NEEDS_HUMAN\` + \`tasks.md\` blocked), not asking in chat — see Fallback — Discovery
  draft in the Input section.
`;
}

// devops: CAF.md Layer 3 (.caf/tasks/{TICKET-ID}/) doesn't yet have an official artifact contract
// for DevOps (post-merge, next phase) — stays TODO until CAF.md defines it.
export function buildOutputSection(kind) {
  if (kind === 'auditor') {
    return (
      `Produces ${ARTIFACT_BY_ROLE.auditor} in \`.caf/audits/<DATE>/\` for human review — ` +
      'NOT for the next agent, and NOT a ticket directly (see `/caf-audit-to-ticket` to convert ' +
      'into a ticket after per-item approval).'
    );
  }
  const artifactKind = kind === 'implementation' ? 'frontend' : kind;
  const artifact = ARTIFACT_BY_ROLE[artifactKind];
  if (!artifact) {
    return 'TODO: which artifact is produced for the next agent';
  }
  return `Produces ${artifact} in \`.caf/tasks/{TICKET-ID}/\` for the next agent to read.`;
}

// Frontmatter is what makes the file a real, dispatchable subagent type instead of an inert
// markdown doc (without it Claude Code falls back to `general-purpose`). Same shape as
// discoveryAgentMd() in discovery-commands.js, which pm.md/ux-designer.md already use.
function buildFrontmatter({ slug, name, role, kind, model }) {
  const description = [
    ...role.split('\n'),
    `Use for "${slug}", "${name} agent".`,
  ]
    .map((line) => `  ${line}`)
    .join('\n');
  return `---
name: ${slug}
description: >
${description}
tools: [${toolsForKind(kind).join(', ')}]
model: ${model}
---
`;
}

/**
 * Build a single agent definition draft. `scope` is a human-readable description (path glob
 * or "TODO"), `scripts`/`packageManager` come from matchVerifyScripts for app-scoped agents,
 * or null for whole-repo agents (Planner, QA, Reviewer, Documentation, DevOps). `packageName`
 * (readPackageName for the same app) scopes the Verify Checklist commands to that workspace;
 * null means root scope. `kind` selects
 * the Input section — Planner/Architect get an explicit list of optional Layer 1 reference docs.
 * `slug` must be the filename stem the file is written as (agentSlug(kind, app)) — Claude Code
 * dispatches on the frontmatter `name`, so a mismatch with the filename is a latent bug.
 */
export function buildAgentMd({ name, role, scope, scripts, packageManager, packageName = null, kind, appNames, slug, model = 'sonnet' }) {
  const agentName = slug || kind;
  return `${buildFrontmatter({ slug: agentName, name, role, kind, model })}
# Agent: ${name}

> DRAFT produced by caf-initiator — review and complete before use, especially the
> parts marked TODO project-specific.

## Role
${role}

## Scope
${scope}

## Allowed Tools
${buildToolsSection(kind)}

## Input
${buildInputSection(kind, appNames)}

## Output
${buildOutputSection(kind)}
${buildBatasanSection(kind)}
## Working Pattern (PIV)
1. PLAN — write a plan first, don't touch code yet
2. IMPLEMENT — execute per the plan
3. VERIFY — run the Verify Checklist below before declaring done

## Verify Checklist
${buildVerifyChecklist(scripts, packageManager, packageName)}

## Retry Logic
Verify fails → fix, retry up to 3x → if still failing, stop and write
\`verify-report.md\` with Status: NEEDS_HUMAN
${buildAuditContractSections(kind)}`;
}
