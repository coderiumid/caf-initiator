import { verifyCommand, unresolvedPmTodo } from '../utils/runner-command.js';
import { ARTIFACT_BY_ROLE } from './artifact-by-role.js';
import { WHAT_TO_LOOK_FOR, reportSkeleton } from './audit-report-format.js';
import { DISCOVERY_RETRY_LOGIC, DISCOVERY_ALLOWED_TOOLS, DISCOVERY_FOCUS, DISCOVERY_TOOLS } from './discovery-commands.js';

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
// `implementer` (CAF-INIT-SINGLE-REPO) is the SINGLE_REPO implementation agent — one agent for
// the whole repo instead of the monorepo's frontend/backend split.
// `validator` (CAF-SDD-03b1) is written as caf-validator.md.
export const CAF_PREFIXED_KINDS = ['planner', 'architect', 'qa', 'reviewer', 'documentation', 'auditor', 'pm', 'ux-designer', 'frontend', 'backend', 'implementer', 'validator'];

// Kinds that write application code. `implementation` is the per-app agent outside
// caf-orchestrator's routing (monorepo "extra apps"); `implementer` is SINGLE_REPO's one agent.
export const IMPLEMENTATION_KINDS = ['frontend', 'backend', 'implementation', 'implementer'];

export function agentSlug(kind, app) {
  if (kind === 'implementation') {
    // A root-scoped app (path '.') slugifies to an empty string, which used to produce a file
    // literally named `.md` with a blank frontmatter `name` (CAF-INIT-SINGLE-REPO). Fall back to
    // the package name, then to a fixed word — never an empty slug.
    return slugifyAppPath(app.path) || slugifyAppPath(app.name || '') || 'app';
  }
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
function buildVerifyChecklistSingle(scripts, packageManager, packageName) {
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

// verifyApps: array of { scripts, packageManager, packageName, appPath } — one entry per app
// this agent covers (CAF-MULTIAPP-01). Empty/undefined renders the same "not a single app" TODO
// as before. Exactly one entry renders byte-identical to the pre-multi-app format (no per-app
// header) — this is what keeps single-app projects and single-app roles regression-safe.
// More than one entry groups the checklist under a `#### <appPath>` header per app.
export function buildVerifyChecklist(verifyApps) {
  if (!verifyApps || verifyApps.length === 0) {
    return buildVerifyChecklistSingle(null, null, null);
  }
  if (verifyApps.length === 1) {
    const { scripts, packageManager, packageName } = verifyApps[0];
    return buildVerifyChecklistSingle(scripts, packageManager, packageName);
  }
  const groups = verifyApps
    .map(
      ({ scripts, packageManager, packageName, appPath }) =>
        `#### ${appPath}\n${buildVerifyChecklistSingle(scripts, packageManager, packageName)}`
    )
    .join('\n\n');
  return `${groups}\n\nRun only the checklist for the app(s) actually touched by this task — not every app every time.`;
}

// Planner/Architect may optionally read Layer 1 reference docs (CAF.md Layer 2) — these are
// never a gate, so the language here must stay explicit that missing docs are fine.
// The Planner's Input used to hold a "Fallback — Discovery draft without a ticket" flow (a PRD
// draft read as the requirement). CAF-SDD-03c2 removed it: the Discovery flow and its command are
// no longer scaffolded. The planner's `## Constraints` says the headless run escalates to a file
// and not to chat (see buildBatasanSection).
// The escalation MECHANISM branches on environment: interactive (default) still STOPs and waits
// for chat confirmation, unchanged from before. Headless runs (caf-orchestrator prepends a
// "[SYSTEM CONTEXT: Environment = headless...]" marker to the prompt) have no chat to wait on —
// STOPping there means the run silently exits 0 with no tasks.md, which caf-orchestrator can't
// distinguish from success. So headless redirects escalation to a file artifact instead of chat:
// requirements.md still carries every unanswered Open Question verbatim (same no-assume
// guarantee), just tagged `Status: NEEDS_CLARIFICATION` (CAF-SDD-03c2b; it was `NEEDS_HUMAN` plus
// a blocked tasks.md before) with no tasks.md: caf-orchestrator (SDD-04c) stops on that status
// before it needs tasks.md, pushes the draft and asks on the ticket. This is a different delivery
// channel for the same contract, not a weaker one.
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
  if (DISCOVERY_FOCUS[kind]) {
    return `Feature name/slug from the \`/caf-discovery-start\` command (required).${DISCOVERY_FOCUS[kind].input}`;
  }
  if (kind === 'planner') {
    return [
      'Ticket description from the tracker (required).',
      '',
      '### Optional — Layer 1 reference docs',
      '',
      'If available, read in the following priority order; if not available, proceed from the',
      'ticket description alone as usual (not a hard requirement):',
      '1. `docs/product/features/{{feature-name}}.md` (Feature Spec, if the ticket is linked to one)',
      '2. `docs/product/prd.md`',
      '',
      '### App-tag requirement — multi-app Frontend/Backend agents',
      '',
      'Before writing the `## Frontend Tasks` / `## Backend Tasks` sections in `tasks.md`, first',
      'read `## Scope` in this project\'s `caf-frontend.md` / `caf-backend.md` (the agent that will',
      'receive that section):',
      '- Scope lists **more than one app** → every task line under that section MUST start with',
      '  the target app path in parentheses, e.g. `- [ ] (apps/web) Fix email validation`. An',
      '  untagged line forces the implementation agent to stop and ask which app is meant instead',
      '  of guessing — don\'t leave a line untagged when the scope has more than one app.',
      '- Scope lists exactly **one app** → do not add a tag, keep the plain `- [ ] ...` format',
      '  (unchanged from before).',
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
  if (IMPLEMENTATION_KINDS.includes(kind)) {
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
  // Kind-only on purpose (CAF-SDD-03b1): `appNames` is ignored, so this section needs no
  // per-file context to be compared by `curate` (unlike qa/reviewer just around it).
  if (kind === 'validator') {
    return [
      '`requirements.md` (the spec and its acceptance criteria) and `tasks.md` from the Planner Agent,',
      'and `verify-report.md` from the implementation agent, all in `.caf/tasks/{TICKET-ID}/` (required).',
      '',
      'If `requirements.md` or `verify-report.md` is missing, or the spec has no acceptance criteria,',
      'do not guess what was meant: report it, see Retry Logic.',
    ].join('\n');
  }
  if (kind === 'reviewer') {
    const who = appNames.length > 0 ? `implementation agent (${appNames.join(', ')})` : 'implementation agent';
    // CAF-SDD-03c2: the gate report is validate-report.md (caf-validator), or qa-report.md in a repo
    // that still has caf-qa; both names stay so a repo with the new reviewer and the old gate reads
    // right. The phrase "from the implementation agent" is what parseInputAppNames() reads the app
    // list after: keep it, with the list right behind it.
    return [
      `\`verify-report.md\` from the ${who}, and the gate report — \`validate-report.md\` from the`,
      'Validator Agent, or `qa-report.md` from the QA Agent in a repo that still uses `caf-qa` — all in',
      '`.caf/tasks/{TICKET-ID}/` (required).',
      '',
      'Optional — when invoked from post-PR mode (`/caf-fix-review`, not the normal pre-PR pipeline',
      'gate), this agent also receives human reviewer comments from GitHub (comment text +',
      'INLINE path:line or GENERAL metadata, and scoped/global mode) as additional input, inserted',
      'directly into the spawn prompt by that command — not a separate file artifact in',
      '`.caf/tasks/{TICKET-ID}/`. If this input is absent (normal pre-PR mode), proceed as usual',
      'from `verify-report.md` and the gate report alone.',
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
  planner: ['Read', 'Write', 'Glob', 'Grep'],
  architect: ['Read', 'Write'],
  frontend: ['Read', 'Write', 'Edit', 'Bash'],
  backend: ['Read', 'Write', 'Edit', 'Bash'],
  implementation: ['Read', 'Write', 'Edit', 'Bash'],
  implementer: ['Read', 'Write', 'Edit', 'Bash'],
  qa: ['Read', 'Write', 'Bash'],
  reviewer: ['Read', 'Write', 'Bash'],
  validator: ['Read', 'Write', 'Bash'],
  documentation: ['Read', 'Write', 'Edit'],
  auditor: ['Read', 'Bash'],
  devops: ['Read', 'Bash'],
};

const TOOLS_RATIONALE = {
  planner:
    'Read, Glob and Grep (read-only) for ticket/docs context and facts about the repo, Write for ' +
    'artifacts in `.caf/tasks/{TICKET-ID}/`. Does NOT touch code.',
  architect: 'Read for architecture context, Write for `design.md`. Does NOT touch code.',
  frontend: 'Read/Write/Edit for code within this agent\'s scope, Bash to run the Verify Checklist.',
  backend: 'Read/Write/Edit for code within this agent\'s scope, Bash to run the Verify Checklist.',
  implementation: 'Read/Write/Edit for code within this agent\'s scope, Bash to run the Verify Checklist.',
  implementer: 'Read/Write/Edit for code within this agent\'s scope, Bash to run the Verify Checklist.',
  qa: 'Read for artifacts + code, Bash to run tests/build, Write for `qa-report.md`. Does NOT change code.',
  reviewer:
    'Read for code + artifacts, Bash to read diffs (`git diff`/`git log`), Write for ' +
    '`review-notes.md`. Does NOT change code — findings are written as notes, not fixed directly.',
  // CAF-SDD-03e: the commands of the spec's `Verify: command:` lines are stated here, where the
  // Bash limit is. Q-1 (APPROVED only) and Q-2 (one command or an `&&` chain; the rejected list)
  // of that ticket, word for word; `## Output` refers to this section and does not repeat it.
  // Write stays `validate-report.md` only. No `TODO` word and no line starting with `## `.
  validator: [
    'Read for the spec, the artifacts and the code. Bash only for the commands of the Verify',
    'Checklist, read-only git inspection (`git diff`, `git log`, `git status`, `git show`), and the',
    '`Verify: command:` lines of `requirements.md` under the rules below. Write only for',
    '`validate-report.md`. No Edit. Does NOT change code, tests, the spec or `verify-report.md`.',
    '',
    'Commands from the spec (`Verify: command: <command> | expect: <exit code or output>`):',
    '- Run one only when `requirements.md` says `Status: APPROVED`. With any other status, do not',
    '  run it.',
    '- Accepted form: one command, or commands chained with `&&`.',
    '- Rejected, never run: `;`, `|`, a redirect (`>`, `>>`, `<`), `$()`, a backtick, `sudo`, `rm`,',
    '  `curl`, `wget`, `git push` anywhere in the command itself, the part before ` | expect:`.',
    '- A command that is not run (the spec is not `APPROVED`, or the form is rejected): do not run',
    '  it; the AC is `UNVERIFIED`, with the reason (the status, or what was rejected). It is never a',
    '  `FAIL`.',
    '- A command that is run: compare its exit code or output with `expect:`. The AC is `PASS` only',
    '  when they match; when they do not, it is `FAIL`, with the output you observed.',
  ].join('\n'),
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

// The frontmatter `tools:` list the template gives a kind, for `curate audit` to compare an
// existing file against (CAF-SDD-02d): `curate sync` never writes frontmatter, so a file generated
// before a tools change keeps its old line. Covers pm/ux-designer, whose file is rendered by
// discoveryAgentMd(). null for a kind with no row — the `['Read']` default of toolsForKind() is
// what an unknown kind is rendered with, not a template to hold a file against.
export function templateToolsForKind(kind) {
  if (DISCOVERY_FOCUS[kind]) return [...DISCOVERY_TOOLS];
  return TOOLS_BY_KIND[kind] ? [...TOOLS_BY_KIND[kind]] : null;
}

// Exported (alongside buildInputSection/buildOutputSection) so utils/agent-sections.js can
// regenerate this section's canonical content from `kind` alone for content-level drift
// detection (CAF-CURATE-DIFF-01) — same reasoning as Input/Output, this section has no
// per-project data baked in, so its template content IS fully recoverable post-generation.
export function buildToolsSection(kind) {
  if (DISCOVERY_KINDS.includes(kind)) return DISCOVERY_ALLOWED_TOOLS;
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
// auditor-only — returns null for every other kind so callers (curate's content-drift check)
// can tell "not applicable to this kind" apart from "empty content".
export function buildWhatToLookForSection(kind) {
  if (kind !== 'auditor') return null;
  return WHAT_TO_LOOK_FOR;
}

// reviewer's contract (CAF-REVIEWER-FORMAT-01): review-notes.md's Verdict line must match
// report-reader.ts's parsers word-for-word — both the strict webhook-mode-initial parser
// (readInitialReviewReport, exact-match after stripping markdown emphasis) and the loose
// pre-PR gate parser (readReviewerReport, /\bAPPROVE\b/i et al, the one CDR-43 actually hit).
// This skeleton is copied verbatim from caf-orchestrator's buildInitialReviewPrompt()
// (run-pr-review.use-case.ts, CAF-ORCH-PRREVIEW-03) — do not reword it independently. The two
// files are separate npm packages with no shared import, so they can drift; guarded by a test
// that asserts this content against a copy of report-reader.ts's regexes (CAF-REVIEWER-FORMAT-01
// Task 3) rather than attempting cross-repo single-sourcing.
function buildReviewerReportFormat() {
  return `Save the report to \`.caf/tasks/<TICKET-ID>/review-notes.md\`.

\`\`\`
## Review Notes — {TICKET-ID}
Ticket: {TICKET-ID}
Agent: caf-reviewer
Verdict: APPROVE | CHANGES REQUESTED | DEFER

### Security Audit
{security findings, or "None" if none}

### Qualitative Review
{code quality notes}

### Verdict Rationale
{reasoning for the verdict above}

### For Developer
{notes for the developer, if relevant}
\`\`\`

Verdict MUST be exactly one of the three values above (APPROVE / CHANGES REQUESTED / DEFER) —
don't use other values (e.g. NEEDS_HUMAN is for the automated pipeline's retry cycle, not this
Verdict line).`;
}

// qa's contract (CAF-QAREPORT-01): qa-report.md's `Status:` line is what caf-orchestrator's
// readQaReport() (report-reader.ts) parses to decide PASS vs FAIL. The parse is line-anchored on
// `Status:` and case-sensitive on the literal PASS/FAIL, and anything it can't parse falls back to
// FAIL (fail-safe) — so the skeleton below must keep that line, uppercase and on its own line.
// Before this existed, buildReportFormatSection('qa') returned null and Retry Logic told QA to
// write `verify-report.md` with `Status: SUCCESS` — the wrong file and a value this parser never
// treats as PASS. Same cross-repo caveat as buildReviewerReportFormat(): caf-orchestrator is a
// separate npm package, so this contract is guarded by a test here, not by a shared import.
export function buildQaReportFormat() {
  return `Save the report to \`.caf/tasks/<TICKET-ID>/qa-report.md\`.

\`\`\`
## QA Report — {TICKET-ID}
Ticket: {TICKET-ID}
Agent: caf-qa
Status: PASS | FAIL

### Verification Matrix
| # | Acceptance Criteria (requirements.md) | How Verified | Result |
|---|---------------------------------------|--------------|--------|
| 1 | {criterion, verbatim from requirements.md} | {command run / manual step} | PASS or FAIL |

### Findings
{for every FAIL row: what was expected, what actually happened, \`path/to/file.ext:line\`, and the
steps to reproduce — or "None" if everything passed}

### Notes
{anything the Reviewer or the developer should know; out-of-scope observations go here, not in
the matrix}
\`\`\`

\`Status\` MUST be exactly \`PASS\` or \`FAIL\` — uppercase, on its own \`Status:\` line.
caf-orchestrator reads ONLY that line (line-anchored, case-sensitive) and treats anything else,
including \`SUCCESS\`/\`OK\`/\`Passed\`/an empty value, as \`FAIL\`. A \`PASS\` appearing elsewhere in the
report (e.g. a Result cell in the matrix above) is NOT read as the report status.

\`Status: PASS\` only if EVERY acceptance criterion in the matrix passed. One FAIL row → \`Status: FAIL\`.
Every row needs a real verification (a command that was actually run, or a manual step that was
actually performed) — an unverified criterion is a FAIL, not a PASS.`;
}

// validator's contract (CAF-SDD-03b1): `validate-report.md`. Nothing reads it yet — the gate that
// does is CAF-SDD-04 — so the `Status:` line keeps the shape readQaReport() already parses for
// `qa-report.md` (line-anchored, uppercase, first `Status:` line of the file): a reader built on
// that parse takes PASS as a pass and everything else, NEEDS_HUMAN included, as not a pass.
// Rules this text must keep:
// - The `Status:` line is the first line of the skeleton that carries `Status:`; the table header
//   below it says `Status` without the colon.
// - `UNVERIFIED` is a per-AC status, never a report status, and never turns the report into FAIL
//   on its own: the count and the list on the `Unverified:` line are what make it visible.
// - The per-AC rules themselves are in the validator's `## Output` (VALIDATOR_WORKFLOW); the five
//   evidence kinds are the ones of the verify-report format in agent-handoff-md.js.
// - The skeleton stays inside the fence: its `## ` line would otherwise be a section boundary.
export function buildValidateReportFormat() {
  return `Save the report to \`.caf/tasks/<TICKET-ID>/validate-report.md\`.

\`\`\`
## Validate Report — {TICKET-ID}
Ticket: {TICKET-ID}
Agent: caf-validator
Status: PASS | FAIL | NEEDS_HUMAN
Unverified: {count} — {AC ids, comma-separated, or "none"}

### Acceptance Criteria
| AC | Status | Evidence kind | Evidence |
|----|--------|---------------|----------|
| AC-1 | PASS, FAIL or UNVERIFIED | automated-test, command, build-only, manual or none | {test or command and what you observed when you ran it, or the reason it is unverified} |

### Verification Gate
| Command | Result |
|---------|--------|
| {command from the Verify Checklist} | {exit code observed} |

### Verification Gate Gaps
{every Verify Checklist line that has no command (no lint, typecheck, test or build script
detected), one per line — or "None"}

### Notes
{anything the Reviewer or the developer should know; observations outside the acceptance criteria
go here, not in the table}
\`\`\`

\`Status\` MUST be exactly \`PASS\`, \`FAIL\` or \`NEEDS_HUMAN\` — uppercase, on its own \`Status:\` line,
above the table. A \`PASS\` in a row of the table is not the report status.

- \`Status: PASS\` only when no AC is \`FAIL\` and every command of the verification gate passed.
- \`Status: FAIL\` when at least one AC is \`FAIL\` or a command of the verification gate failed.
- \`Status: NEEDS_HUMAN\` when the validation could not be done at all (see Retry Logic).

\`UNVERIFIED\` rows do not make the status \`FAIL\`, and they are never left out: the \`Unverified:\`
line carries how many there are and which ones, for example \`Unverified: 2 — AC-3, AC-7\`. With
none, write \`Unverified: 0 — none\`. One row per AC of \`requirements.md\`; a gap of the gate is
listed under \`### Verification Gate Gaps\`, never counted as a command that passed.`;
}

export function buildReportFormatSection(kind) {
  if (kind === 'reviewer') return buildReviewerReportFormat();
  if (kind === 'qa') return buildQaReportFormat();
  if (kind === 'validator') return buildValidateReportFormat();
  if (kind !== 'auditor') return null;
  return `Save the report to \`.caf/audits/<DATE>/audit-report.md\` (this name is reserved for a full-repo
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
whatever area the user requested.`;
}

// Auditor gets both What to Look For + Report Format; reviewer gets Report Format only (What to
// Look For stays auditor-only — CAF-REVIEWER-FORMAT-01 is scoped to the Verdict/report contract,
// not reviewer's review criteria). Both rendered last for the same fence-unaware-parser reason
// noted above buildWhatToLookForSection.
function buildAuditContractSections(kind) {
  if (kind === 'auditor') {
    return `
## What to Look For
${buildWhatToLookForSection(kind)}

## Report Format
${buildReportFormatSection(kind)}
`;
  }
  if (kind === 'reviewer' || kind === 'qa' || kind === 'validator') {
    return `
## Report Format
${buildReportFormatSection(kind)}
`;
  }
  return '';
}

// Fixed text per kind — same reasoning as buildToolsSection: fully recoverable post-generation,
// so curate's content-drift check can regenerate and compare it.
// `kind` only matters for the Discovery kinds (CAF-SDD-03a2): caf-pm.md/caf-ux-designer.md are
// written by discoveryAgentMd() with their own wording (documents, not code), and a comparator
// that rendered the generic text read them as DRIFT and overwrote them. The lines below repeat
// what discoveryAgentMd() renders, they don't replace it — test/false-drift.test.js and the
// frozen-kinds goldens fail if the two ever differ. Every other kind, and no kind at all, gets
// the generic text unchanged.
// CAF-SDD-03e: the validator and the reviewer get a pattern of their own (they read and report,
// they do not plan and implement). The header stays `## Working Pattern (PIV)`: a renamed header
// would read as a missing section to `curate sync`. Each line refers to a section of the same
// file instead of restating it: no command rule, no status or verdict value here.
const VALIDATOR_WORKING_PATTERN = [
  '1. READ — read the spec (`requirements.md`: its `Status:` line, every AC and its `Verify:` line), `tasks.md`, `verify-report.md` and the change',
  '2. RUN — run the Verify Checklist below, then the `Verify: command:` lines the Allowed Tools section lets you run (an `APPROVED` spec, an accepted form); a command you do not run leaves its AC `UNVERIFIED`, with the reason',
  '3. REPORT — write `validate-report.md`: one row per AC with its evidence, as the Report Format section below defines',
].join('\n');

const REVIEWER_WORKING_PATTERN = [
  '1. READ — read the spec (`requirements.md`, `tasks.md`) and the reports (`verify-report.md`, and `validate-report.md` if present), then the diff',
  '2. COMPARE — compare every AC and the scope of the spec with the change, as the Output section describes',
  '3. VERDICT — write `review-notes.md` with its `Verdict:` line, as the Report Format section below defines',
].join('\n');

export function buildWorkingPatternSection(kind) {
  if (kind === 'validator') return VALIDATOR_WORKING_PATTERN;
  if (kind === 'reviewer') return REVIEWER_WORKING_PATTERN;
  if (DISCOVERY_FOCUS[kind]) {
    return [
      '1. PLAN — first determine what\'s still unknown and needs to be asked of a human',
      '2. IMPLEMENT — write the document',
      '3. VERIFY — run the Verify Checklist below before claiming completion',
    ].join('\n');
  }
  return [
    '1. PLAN — write a plan first, don\'t touch code yet',
    '2. IMPLEMENT — execute per the plan',
    '3. VERIFY — run the Verify Checklist below before declaring done',
  ].join('\n');
}

// Discovery (CAF.md Cluster 1) kinds. Their agent definitions are NOT rendered by buildAgentMd
// at all — discovery-commands.js/discoveryAgentMd() writes them — but detectKind() does return
// these kinds for caf-pm.md/caf-ux-designer.md, so every builder `curate` regenerates from a
// bare `kind` has to answer for them too. See DISCOVERY_GUARDED_SECTIONS in
// utils/agent-sections.js for the sections that currently can't.
export const DISCOVERY_KINDS = ['pm', 'ux-designer'];

// CAF-QAREPORT-01: qa and reviewer don't produce `verify-report.md` at all — qa writes
// `qa-report.md` (`Status: PASS|FAIL`, read by readQaReport()) and reviewer writes
// `review-notes.md` (`Verdict:`, read by readReviewerReport()). The Delivery text below told both
// to write `verify-report.md` with `Status: SUCCESS`, a file/value neither parser looks at.
const QA_RETRY_LOGIC = [
  'Verify passes → write `qa-report.md` with **`Status: PASS`** (this exact uppercase literal, on',
  'its own `Status:` line — caf-orchestrator parses that line only and treats anything else,',
  'including "SUCCESS"/"OK"/"Passed", as `FAIL`).',
  'Verify fails → write `qa-report.md` with **`Status: FAIL`**, listing every failing acceptance',
  'criterion with evidence (`path/to/file.ext:line`) and repro steps. Do NOT fix the code yourself',
  'and do NOT retry-until-green: QA verifies, the implementation agent fixes — a `FAIL` is the',
  'signal the pipeline routes back for rework.',
  'Never leave `qa-report.md` unwritten: a missing report is not a pass.',
  'See the Report Format section below for the full skeleton.',
].join('\n');

const REVIEWER_RETRY_LOGIC = [
  'Review complete → write `review-notes.md` with the `Verdict:` line set to one of the values',
  'listed in the Report Format section below (that section is the single source of the exact',
  'values — do not restate or invent them here).',
  'Blocked (missing diff/context, or the change needs a human architectural decision) → still write',
  '`review-notes.md`, with the DEFER verdict and the reason under `### Verdict Rationale`.',
  'Never leave `review-notes.md` unwritten: caf-orchestrator treats a missing or unparseable',
  '`Verdict:` line as CHANGES REQUESTED, which stops the PR from going out with no explanation.',
].join('\n');

// CAF-SDD-03b1: the validator writes `validate-report.md` and nothing else. It must not get the
// Delivery text below (fix, retry, write `verify-report.md`) — it has no Edit tool and
// `verify-report.md` is its input.
const VALIDATOR_RETRY_LOGIC = [
  'The Validator does not retry and does not fix: it validates once and reports what it found. A',
  'failing AC or a failing gate command is a result to report, not something to work on.',
  'Validation complete → write `validate-report.md` with the `Status:` line set as the Report',
  'Format section below defines (that section is the single source of the values).',
  'Blocked (`requirements.md` or `verify-report.md` is missing, or the spec has no acceptance',
  'criteria) → still write `validate-report.md`, with `Status: NEEDS_HUMAN` and the reason under',
  '`### Notes`.',
  'Never leave `validate-report.md` unwritten: a missing report is not a pass.',
].join('\n');

// Role-aware since CAF-RETRYLOGIC-01. Discovery agents produce `prd.md`/`flow.md` for a human to
// read; they never enter the pipeline that greps `verify-report.md`, so the Delivery wording
// below (write `Status: SUCCESS`) is actively wrong for them — `curate sync` wrote it into two
// production repos' caf-pm.md/caf-ux-designer.md before this branch existed. The Delivery text
// is unchanged, byte for byte, from before that fix.
export function buildRetryLogicSection(kind) {
  if (DISCOVERY_KINDS.includes(kind)) return DISCOVERY_RETRY_LOGIC;
  if (kind === 'qa') return QA_RETRY_LOGIC;
  if (kind === 'reviewer') return REVIEWER_RETRY_LOGIC;
  if (kind === 'validator') return VALIDATOR_RETRY_LOGIC;
  return [
    'Verify passes → write `verify-report.md` with **`Status: SUCCESS`** (this exact literal word —',
    'caf-orchestrator greps for `\\bSUCCESS\\b` and treats anything else, including "PASS"/"DONE"/"OK",',
    'as `NEEDS_HUMAN`, which stops the whole pipeline and skips QA/Reviewer/PR creation).',
    'Verify fails → fix, retry up to 3x → if still failing, stop and write',
    '`verify-report.md` with Status: NEEDS_HUMAN',
  ].join('\n');
}

// Planner-only: makes the headless-vs-interactive escalation an explicit, hard-to-miss rule.
// Not generalized to other kinds yet — see TODO near buildInputSection().
// Not in SYNCABLE_SECTIONS on purpose (CAF-SDD-03c2b): a planner generated earlier gets a `curate
// audit` rollout warning for this section (`rolloutWarnings`) and its text is changed by hand.
export function buildBatasanSection(kind) {
  if (kind !== 'planner') return '';
  return `
## Constraints
- The Planner is NEVER allowed to end a run waiting for chat confirmation if the prompt/context
  it received is prefixed with the \`[SYSTEM CONTEXT: Environment = headless...]\` marker. The
  escalation in this case is a file, not chat: \`requirements.md\` with
  \`Status: NEEDS_CLARIFICATION\` and the \`BLOCKING\` questions that have no \`Answer:\`, and no
  \`tasks.md\`.
`;
}

// `## Skills` (CAF-SKILLS-01) — optional pointers to `.claude/skills/<name>/SKILL.md`. The agent
// reads them with its `Read` tool: a `skills:` frontmatter key is not honoured under
// `claude --agent`, and granting the `Skill` tool would change `## Allowed Tools` (syncable) for
// every kind. `skillPaths` are repo-relative paths, already in display order.
// NOT in SYNCABLE_SECTIONS on purpose: which skills an agent points at is per-project data that
// can't be regenerated from `kind` alone (same class as Role/Scope/Constraints).
export function buildSkillsBody(skillPaths) {
  return [
    // Worded as a hard first step on purpose (AC-9, real dispatch): a softer "before you start,
    // Read ..." was skipped on ordinary tasks. One line, verbatim — don't reflow or soften it.
    'MANDATORY FIRST STEP: before you write any answer or call any other tool, call `Read` once for EACH skill file listed below, then apply them for the whole task. Answering or acting before reading them is a violation of this agent definition:',
    '',
    ...skillPaths.map((p) => `- \`${p}\``),
    '',
    'Skip a listed skill if its file is missing or still starts with a `DRAFT` banner: it is not',
    'ready, so apply none of it. If a skill conflicts with this agent definition, this agent',
    'definition wins.',
  ].join('\n');
}

// Returns '' for an empty list so buildAgentMd() renders byte-identical output for an agent with
// no skills — the frozen MONOREPO snapshot depends on that. Same shape as buildBatasanSection().
export function buildSkillsSection(skillPaths = []) {
  if (!skillPaths || skillPaths.length === 0) return '';
  return `
## Skills
${buildSkillsBody(skillPaths)}
`;
}

// How the Planner produces its two artifacts (CAF-SDD-02): spec-first — Specify, Clarify, Plan,
// Tasks. Rendered in the planner's `## Output`, after the one-line artifact contract, rather than
// in a section of its own: Output is tracked, so `curate sync` carries the text to a planner
// generated earlier as an ordinary DRIFT (no new header to insert, nothing new for the other
// kinds). It is not in `## Working Pattern (PIV)` because that section's text is pinned to the
// generic wording for every non-Discovery kind by a CAF-SDD-03a2 test.
// Rules this text must keep:
// - Every artifact, path and stop token the planner already had stays: the first line of Output,
//   `## Input`, `## Constraints` and `## Retry Logic` are untouched, and Clarify on the ticket path stops
//   the way the chat path does: `NEEDS_CLARIFICATION`, no `tasks.md` (CAF-SDD-03c2b; before it the
//   ticket path wrote `NEEDS_HUMAN` + a blocked `tasks.md` note, which caf-orchestrator's routing
//   threw on once SDD-04c stopped needing the file for Clarify).
// - The requirements.md format is the `caf-spec` skill's; it is named, not copied. caf-spec is
//   active since CAF-SDD-02c, but a planner generated earlier has no pointer to it until one is
//   added by hand, so the text has to stand on its own when the skill is not in `## Skills`.
// - Two rules added at CAF-SDD-02c, from a real dispatch: read the files of the task folder
//   before writing (a planner that did not re-read overwrote an approved spec with a DRAFT), and
//   a request to change an approved spec is answered in `verify-report.md` under
//   `## Proposed Spec Changes`, never by writing `requirements.md`.
// - Three rules are stated here as the `caf-spec` skill (v3) states them, since CAF-SDD-02b: what
//   reading answers is a fact and not a question, an answered question keeps its tag, and the
//   three `Verify:` forms (`command:` included). Change them here and in the skill together.
// - Rules added at CAF-SDD-02d, from a real dispatch and an audit, all whole lines inside steps
//   that already exist: read a fact before writing it (rewritten at CAF-SDD-02e, see below), no
//   placeholder section, no `tasks.md` at all while a
//   `BLOCKING` question is unanswered (no exception since CAF-SDD-03c2b: the ticket run stops on
//   `NEEDS_CLARIFICATION` too), an `automated test` AC names its test file, the refusal to change an approved spec is the first line of
//   `verify-report.md`, and the final message starts with a plain `Status:` line.
// - One status convention: the status of `requirements.md` is a `Status:` line with four values,
//   stated once in Specify. `## Input` used to call it a heading (`## Status: PLAN`); it now
//   refers to that line. Don't name a status of `requirements.md` anywhere as a heading.
// - Rules added at CAF-SDD-02e, from a re-test on two real tickets where the 02d wording came
//   back as synonyms ("not compared yet", "not known yet") and as tasks that told the implementer
//   to read what the spec needed. They state an intent, not a list of words to avoid: a fact is
//   read before any artifact is written and never handed on; a behavior comes from a file opened
//   with `Read` in this run (`CLAUDE.md`, an ADR and a `Glob` name are pointers); the related ADRs
//   are read; no sentence says something is still to be read, compared, checked or found out; an
//   unsourced claim is `Assumption A-n:` and a `Finding:` is an observation; one AC is one
//   behavior; a path or a symbol name only in a `Finding:`, an assumption and `Verify:`;
//   `tasks.md` ends with `## Coverage`; the same list, number or term everywhere, checked by
//   reading the written files again. They replace the four 02d lines about a "not read yet" note:
//   what reading cannot settle is no longer a `Finding:` that says what is not known.
// - Two skills say otherwise and the agent definition wins: `caf-spec` (`-` for an empty section,
//   `Assumption:` with no number, a refactor ticket may name the artifact in an AC) and
//   `caf-no-guess` (item 4, the open-item line), which the text names. The skills are not changed.
// - `###` sub-headings only: a `## ` line here would be read as a section boundary.
// - No `TODO` word (check-drafts counts them per agent) and no generate-time placeholder.
const PLANNER_SPEC_WORKFLOW = [
  'How the two files are produced — spec-first. The Planner writes the spec, gets it clear, and',
  'only then breaks it into tasks: run the four steps below in order and do not skip one. Every',
  'artifact goes in `.caf/tasks/{TICKET-ID}/`. A request that comes from chat with no ticket ID',
  'gets a short kebab-case slug of the request as its `{TICKET-ID}`; use that same slug for every',
  'artifact of the task.',
  '',
  '### 1. Specify',
  '- Before writing anything, read the files that already exist in the task folder:',
  '  `requirements.md`, `tasks.md`, `verify-report.md`. A file that is there is the starting point;',
  '  never write over one you have not read in this run.',
  '- A fact about the repo that `Read`, `Glob` or `Grep` can answer is read before any artifact is',
  '  written, in this run, and is never handed on: no task in `tasks.md` asks the implementer to',
  '  find out a fact the spec needs. A task may tell the implementer to read the file it is about',
  '  to change.',
  '- Every `Finding:` and every AC that says how a file or a module behaves comes from a file',
  '  opened with `Read` in this run. A summary in `CLAUDE.md`, an ADR, or a file name returned by',
  '  `Glob` shows where to look: it is not the source of a behavior.',
  '- When `.caf/knowledge/decisions/` holds ADRs, read the ones whose name relates to the subject',
  '  of the ticket and name each one read in a `Finding:`. When a `Glob` result is mostly',
  '  `node_modules` or hidden tool directories, narrow the pattern and run it again.',
  '- An artifact never says that something is still to be read, compared, checked or found out,',
  '  in whatever words. What reading can answer is read now; what a human must decide is an open',
  '  question.',
  '- A claim that comes neither from a file read in this run nor from the ticket is written',
  '  `Assumption A-n:` (`A-1`, `A-2`, ...) with what it rests on, never as a `Finding:` and never',
  '  as a fact in an AC. A word of doubt ("maybe", "it seems") is written on an assumption line',
  '  and nowhere else.',
  '- A `Finding:` holds only what was observed in the files that were read. A conclusion drawn',
  '  from them, or a prediction of what the code does when it runs, is an assumption.',
  '- The `caf-no-guess` skill (its item 4) tells an agent to write an open item as a line that',
  '  starts with the to-do word. In the artifacts of this agent the rules above win: no such line',
  '  is written.',
  '- Write `requirements.md`: what is asked and why. Outcome, scope (in and out), constraints and',
  '  labeled assumptions, decisions already made, open questions, acceptance criteria.',
  '- The status of `requirements.md` is one plain line, `Status: <value>`, never a heading. The',
  '  values are `DRAFT`, `NEEDS_CLARIFICATION`, `APPROVED` and `NEEDS_HUMAN`. A spec written with',
  '  no open `BLOCKING` question is `Status: DRAFT`.',
  '- A section with nothing to say is written `Tidak ada`. Never a placeholder: not `- -`, not an',
  '  empty section, not `TBD`.',
  '- Number every acceptance criterion `AC-1:`, `AC-2:`, ... and end each one with `Verify:` in',
  '  one of three forms: `automated test`, `command: <command> | expect: <exit code or output>`',
  '  (a deterministic command from the verify checklist of the repo), or `manual:` and the steps',
  '  when neither of the other two is possible. One observable behavior per AC.',
  '- An AC that holds more than one behavior is split into one AC per behavior.',
  '- An AC with `Verify: automated test` names the test file, or the task in `tasks.md` that',
  '  creates that file.',
  '- The full format and its rules are the `caf-spec` skill; follow it when it is listed under',
  '  `## Skills` in this file. It is not repeated here.',
  '- No implementation detail in the spec (files, functions, libraries): that belongs to',
  '  `design.md` and `tasks.md`.',
  '- A file path or a symbol name may be written in a `Finding:`, on an assumption line and on a',
  '  `Verify:` line. It is never written in the outcome, the scope, the decisions or the',
  '  `When ... then` sentence of an AC.',
  '- Exception, on a refactor or config ticket only: the `When ... then` sentence of an AC may name',
  '  the file path or the symbol name that is the subject of the ticket. It may name no other path',
  '  or symbol, and the outcome, the scope and the decisions keep the rule above.',
  '',
  '### 2. Clarify',
  '- First check the ticket, the code, the ADRs and `CLAUDE.md`. Whatever you can answer by reading',
  '  them is a fact, written with the constraints and assumptions, never a question.',
  '- Ask only for decisions a human must make. At most 5 questions in the file, the most decisive',
  '  first. Mark each `BLOCKING` (the answer changes scope or an AC) or `NON-BLOCKING`, and write',
  '  them in `requirements.md`.',
  '- Once a question is answered, write the answer and keep the question and its original tag; do',
  '  not delete or retag it.',
  '- `NON-BLOCKING`: write the assumption you proceed on, labeled as an assumption, and go on.',
  '- `BLOCKING` and unanswered: set `Status: NEEDS_CLARIFICATION` in `requirements.md` and stop.',
  '  Do not go on to Plan or Tasks, and do not write `tasks.md` at all while a `BLOCKING` question',
  '  is unanswered (it has no `Answer:`): no task breakdown, no placeholder, no marker line.',
  '- Ticket run (the headless marker, see Constraints): nobody answers in chat and the run does',
  '  not wait for an answer. A `BLOCKING` question with no `Answer:` ends it the same way: the',
  '  `requirements.md` with `Status: NEEDS_CLARIFICATION` and that question in it, no `tasks.md`',
  '  of any kind, then stop.',
  '',
  '### 3. Plan',
  '- Only when no `BLOCKING` question is open.',
  '- Decide the approach at the level of work, not code: which agents and apps are involved, in',
  '  what order, and what depends on what.',
  '- A change that touches more than one app or service, adds or changes a schema or a migration,',
  '  or changes a contract between layers needs a technical design: write `design.md` in the task',
  '  folder before `tasks.md`, following the `caf-design` skill when `## Skills` lists it.',
  '  Otherwise write none. Do not design inside `requirements.md` or `tasks.md`.',
  '',
  '### 4. Tasks',
  '- Write `tasks.md` under the task sections described in Input.',
  '- Every task line ends with the AC ids it serves, for example `(AC-1, AC-3)`. A task that',
  '  serves no AC needs a one-line reason, or it is dropped.',
  '- Every AC is served by at least one task. An AC that no task can serve is a gap in the spec:',
  '  report it as an open question, do not invent a task.',
  '- For an AC marked `Verify: automated test`, the task that writes the test comes before the',
  '  task that implements the behavior.',
  '- A `tasks.md` that holds tasks ends with a part headed `## Coverage`: one line per AC, the AC',
  '  id and the tasks that serve it. Every AC id of `requirements.md` is there.',
  '',
  '### An approved spec is a contract',
  '- Once `requirements.md` says `Status: APPROVED`, do not change its goal, scope or acceptance',
  '  criteria. This holds for every agent, the Planner included.',
  '- If an approved spec turns out wrong or impossible to satisfy, the proposed change is written',
  '  in `verify-report.md` and a human decides.',
  '- Asked to change the content of a `requirements.md` that says `Status: APPROVED`: do not write',
  '  `requirements.md`, not even its status line. Write the proposed change in `verify-report.md`',
  '  under `## Proposed Spec Changes`, keeping what that file already holds, then stop. The status',
  '  of that refusal is the first line of `verify-report.md`, `Status: NEEDS_HUMAN`: it is written',
  '  in that file, never in `requirements.md`.',
  '',
  '### Before declaring done',
  '- Every AC id in `requirements.md` appears in at least one task of `tasks.md`.',
  '- No guess that is not labeled as an assumption or an open question.',
  '- Run the Verify Checklist of this file.',
  '- The same list, number or term is written the same way in every artifact. Before ending the',
  '  run, read again the files written in this run and make them agree.',
  '- The final message starts with one plain line, `Status: <value>`: no bold, no backticks, no',
  '  heading mark, nothing before it. The value is the status this run ended on, one of `DRAFT`,',
  '  `NEEDS_CLARIFICATION`, `APPROVED` and `NEEDS_HUMAN`, the same words the artifacts use.',
].join('\n');

// How the Validator produces `validate-report.md` (CAF-SDD-03b1): the repo verification gate, then
// one verdict per acceptance criterion of the spec. Rendered in the validator's `## Output` after
// the one-line artifact contract, for the reasons PLANNER_SPEC_WORKFLOW is: Output is tracked, and
// `## Working Pattern (PIV)` is pinned to the generic wording for every non-Discovery kind.
// Rules this text must keep:
// - `PASS` only for `automated-test` or `command` evidence the validator ran itself. `manual`,
//   `build-only`, a test that imports no production code and an AC with no evidence line are
//   `UNVERIFIED`, never `PASS` and never `FAIL`.
// - The commands it may run are the Verify Checklist of its own file, read-only git and, since
//   CAF-SDD-03e, the `Verify: command:` lines of an APPROVED spec within the rules of
//   `## Allowed Tools` (TOOLS_RATIONALE.validator), which this text refers to. Nothing else, and no
//   edit of code, tests, the spec or `verify-report.md`: a proposed spec change is a
//   `Proposed Spec Changes:` line under `### Notes` of `validate-report.md`.
// - The five evidence kinds are the ones of the verify-report format (agent-handoff-md.js), of
//   the `caf-traceability` skill and of REVIEWER_SPEC_WORKFLOW. A sixth kind goes in all five or
//   in none.
// - The report format and its status words live in `## Report Format`, not here.
// - `###` sub-headings only, no `TODO` word, no generate-time placeholder (same as the planner).
const VALIDATOR_WORKFLOW = [
  'How the report is produced. The Validator checks the implementation against every acceptance',
  'criterion (AC) of the spec and reports what it could confirm itself. It reports; it does not fix.',
  'Run the three steps below in order.',
  '',
  '### 1. Read',
  '- `requirements.md`: its `Status:` line, every AC (`AC-1:`, `AC-2:`, ...) and its `Verify:` line.',
  '- `tasks.md`: which task serves which AC.',
  '- `verify-report.md`: the evidence line the implementation agent wrote for each AC.',
  '- The change itself (`git diff`, `git log`, `git show`) and the test files named as evidence.',
  '',
  '### 2. Run the repo verification gate',
  '- Run every command of the Verify Checklist of this file, for the app(s) the change touches,',
  '  and record the exit code of each one.',
  '- A checklist line with no command (no script detected) is a gap of the gate. Report it as a',
  '  gap; do not put a command of your own in its place and do not count it as passed.',
  '',
  '### 3. Judge every AC',
  'One row per AC of `requirements.md`, none skipped. The evidence kind is the one',
  '`verify-report.md` gives for that AC: `automated-test`, `command`, `build-only`, `manual` or',
  '`none`.',
  '- `PASS`: only for `automated-test` or `command` evidence that you ran yourself and whose result',
  '  matches the AC.',
  '  - `automated-test`: the named test exists, exercises the behavior of that AC, and passed in',
  '    the test command of the Verify Checklist.',
  '  - `command`: it is a command you may run (see below), you ran it, and the exit code or output',
  '    is the one the AC expects.',
  '- `FAIL`: you ran it and the result contradicts the AC. Write the output you observed.',
  '- `UNVERIFIED`: everything else. In particular:',
  '  - `manual` and `build-only` evidence: nothing you ran shows the behavior;',
  '  - evidence that names no test;',
  '  - a test that does not import the production code it claims to cover: it is not counted as',
  '    evidence;',
  '  - a command outside the ones you may run: do not run it, and give the reason;',
  '  - an AC with no line in `verify-report.md`: `UNVERIFIED`, evidence kind `none`, reason',
  '    `no evidence reported`. It is not a `FAIL`.',
  '- What `verify-report.md` claims is never a reason for `PASS` on its own: only what you ran is.',
  '',
  '### Commands you may run',
  '- The commands of the Verify Checklist of this file.',
  '- Read-only git inspection: `git diff`, `git log`, `git status`, `git show`.',
  '- The command of a `Verify: command:` line of `requirements.md`, only within the rules of the',
  '  Allowed Tools section (an `APPROVED` spec, an accepted form).',
  '- Nothing else. No install, no script of your own, no command copied from `verify-report.md`',
  '  or from the spec that is not one of the above.',
  '',
  '### What the Validator never does',
  '- Edit code, tests, the spec (`requirements.md`, `tasks.md`) or `verify-report.md`. The only',
  '  file it writes is `validate-report.md`.',
  '- Write a proposed change to the spec in the spec or in `verify-report.md`. A proposal is one',
  '  line under `### Notes` of `validate-report.md` that starts with `Proposed Spec Changes:`.',
  '- Fix a failure, or run something again until it passes.',
  '- Turn a missing or weak piece of evidence into a `PASS`.',
].join('\n');

// What the Reviewer checks (CAF-SDD-03b2): the change against the spec — scope, tasks, AC
// evidence, spec changes after approval, ADRs — on top of the quality of the code. Rendered in the
// reviewer's `## Output` after the one-line artifact contract, for the reasons
// PLANNER_SPEC_WORKFLOW is: Output is tracked, so `curate sync` carries the text to a reviewer
// generated earlier as an ordinary DRIFT, and a new header would not reach it at all.
// Rules this text must keep:
// - `## Input`, `## Retry Logic`, `## Report Format` and the frontmatter `tools:` are untouched
//   (`test/fixtures/pre-sdd03b2/` is the pre-change render — never regenerate it). The Input
//   sentence is what parseInputAppNames() reads the app list from.
// - No verdict value is named here, and no part is added to the `review-notes.md` skeleton: the
//   findings go under the `###` parts the skeleton already has. caf-orchestrator reads the
//   `Verdict:` line of that file, and Report Format is the single source of its values.
// - The Reviewer reads evidence. It never runs the tests or the verification gate again (the
//   Validator's work) and never edits code, tests or the spec.
// - The five evidence kinds are the ones of the verify-report format (agent-handoff-md.js), of the
//   `caf-traceability` skill and of VALIDATOR_WORKFLOW. A sixth kind goes in all five or in none.
// - `design.md` and `validate-report.md` are read "if present": the validator is not connected
//   to the pipeline yet.
// - `###` sub-headings only, no `TODO` word, no generate-time placeholder (same as the planner).
const REVIEWER_SPEC_WORKFLOW = [
  'How the review is done. The Reviewer checks the change against the spec, not only the quality',
  'of the code. It reports; it does not fix. Run the four steps below in order, on top of the',
  'security and code quality review.',
  '',
  '### 1. Read',
  'Everything is in `.caf/tasks/{TICKET-ID}/` unless another path is given.',
  '- `requirements.md`: the goal, the scope (In and Out) and every acceptance criterion (`AC-1:`,',
  '  `AC-2:`, ...).',
  '- `tasks.md`: every task and the AC ids it serves.',
  '- `design.md`, if present.',
  '- `verify-report.md`: the evidence line of each AC, and `## Proposed Spec Changes`.',
  '- `validate-report.md`, if present.',
  '- The ADRs in `.caf/knowledge/decisions/`.',
  '- The diff of the change (`git diff`, `git log`).',
  '',
  'A missing `requirements.md` or `tasks.md` is missing context: see Retry Logic. Do not guess',
  'what the spec was.',
  '',
  '### 2. Scope',
  '- A file or change in the diff that no task of `tasks.md` and no item of Scope In covers is a',
  '  scope deviation. Report it with the file, and with the Scope Out item it falls under when',
  '  there is one.',
  '- A task of `tasks.md` that the diff does not reflect is a task not done. Report it with the',
  '  task id, or the task line when tasks carry no id.',
  '- Every finding names the task id or the Scope item it is about.',
  '',
  '### 3. Acceptance criteria',
  '- Map every AC of `requirements.md` to the task(s) that serve it and to its evidence line in',
  '  `verify-report.md`. An AC that no task serves is a finding.',
  '- Evidence `manual`, `build-only` or `none`, or no evidence line at all: list the AC as',
  '  `needs human check`. It is not counted as passed.',
  '- Evidence `automated-test` or `command`: report it as the evidence claimed, with what',
  '  `validate-report.md` says for that AC when the file is present.',
  '- The Reviewer reads the evidence; it does not run the tests or the verification gate again.',
  '',
  '### 4. Spec integrity and ADRs',
  '- Read the history of the spec (`git log -p` on `requirements.md`) and find the commit that set',
  '  `Status: APPROVED`. A change to the goal, the scope or an AC of `requirements.md` in a commit',
  '  after that one is a blocking finding: name the commit and what changed.',
  '- If `requirements.md` has no git history, or was never approved, say that this check could not',
  '  be done. Do not assume the spec is unchanged.',
  '- An entry under `## Proposed Spec Changes` of `verify-report.md` is always raised to a human:',
  '  copy it into the notes as proposed. Do not accept it, reject it or apply it.',
  '- A change that contradicts an ADR is reported with the name of that ADR.',
  '',
  '### Where the findings go',
  'The skeleton of the Report Format section below is used as it is; no part is added to it.',
  '- Scope deviations, tasks not done, spec changes after approval and ADR violations: under',
  '  `### Qualitative Review`, one line each, starting with what it is (`Scope deviation:`,',
  '  `Task not done:`, `Spec changed after approval:`, `ADR violation:`).',
  '- ACs that need a human check and proposed spec changes: under `### For Developer`.',
  '- A blocking finding rules out an approving verdict; give it as the reason under',
  '  `### Verdict Rationale`. The verdict values are the ones of the Report Format section.',
  '',
  '### What the Reviewer never does',
  '- Edit code, tests or the spec (`requirements.md`, `tasks.md`). The only file it writes is',
  '  `review-notes.md`.',
  '- Run the tests or the verification gate again, or fix a finding.',
  '- Count an AC as passed on evidence that needs a human check.',
].join('\n');

// How an implementation agent works against the spec (CAF-SDD-03d): read the task folder first,
// every AC is a contract, the spec and the tasks are never written, evidence per AC, and a stop
// with a proposal when the spec is unclear. Rendered in the `## Output` of `frontend`, `backend`
// and `implementer`, after the one-line artifact contract, for the reasons PLANNER_SPEC_WORKFLOW
// is: Output is tracked, so `curate sync` carries the text to an agent generated earlier as an
// ordinary DRIFT, and a new header would not reach it at all.
// Rules this text must keep:
// - Those three kinds only, checked by name in buildOutputSection(). The `implementation`
//   fallback (an agent file no kind claims) shares the artifact line and must not get this text:
//   `curate sync` would write it into a custom agent.
// - Nothing outside `## Output` changed: tools, `## Allowed Tools`, `## Input`, `## Retry Logic`
//   and `## Skills` are the ones of `test/fixtures/pre-sdd03d/` (the pre-change render — never
//   regenerate it). The `Status:` words of `verify-report.md` stay in Retry Logic; the word
//   caf-orchestrator greps that file for is not repeated here.
// - No vocabulary of its own. The five evidence lines are the ones of the verify-report format
//   (agent-handoff-md.js) and of the `caf-traceability` skill, kind for kind and word for word;
//   VALIDATOR_WORKFLOW and REVIEWER_SPEC_WORKFLOW judge those same five. A sixth kind goes in
//   all of them or in none (a test compares this text with the rendered handoff).
// - The full layout of `verify-report.md` is not copied: it stays in
//   `.caf/workflows/agent-handoff.md`, which has no sync.
// - It stops only on `NEEDS_CLARIFICATION` or a `BLOCKING` question with no `Answer:`. `DRAFT`
//   and `APPROVED` go on: the approval gate is for labeled tickets only.
// - `###` sub-headings only, no `TODO` word, no generate-time placeholder (same as the planner).
const IMPLEMENTATION_SPEC_WORKFLOW = [
  'How the work is done. The spec is the contract: the implementation agent builds what',
  '`requirements.md` asks for and reports, per acceptance criterion (AC), what shows it. Follow the',
  'five rules below on top of the Working Pattern of this file. Everything is in',
  '`.caf/tasks/{TICKET-ID}/`.',
  '',
  '### 1. Read',
  '- Before changing any code, read the files that already exist in the task folder:',
  '  `requirements.md`, `tasks.md`, and `verify-report.md` if present. A `verify-report.md` that',
  '  is there is the starting point; never write over one you have not read in this run.',
  '- `requirements.md`: the scope (In and Out) and every AC (`AC-1:`, `AC-2:`, ...) with its',
  '  `Verify:` line.',
  '- `tasks.md`: the tasks of this agent and the AC ids each one serves.',
  '',
  '### 2. When to stop before coding',
  '- `requirements.md` says `Status: NEEDS_CLARIFICATION`, or a question marked `BLOCKING` has no',
  '  `Answer:`: do not change code. Write `verify-report.md` with `Status: NEEDS_HUMAN` and the',
  '  reason, then stop.',
  '- `Status: DRAFT` and `Status: APPROVED` do not stop the work: go on.',
  '',
  '### 3. Every AC is a contract',
  '- Every AC of `requirements.md` is a contract: implement each AC that falls in the scope of this',
  '  agent (see Scope) as it is written.',
  '- An AC you cannot satisfy is reported, never skipped silently: give it its evidence line (rule',
  '  5) with the reason.',
  '',
  '### 4. Never edit the spec',
  '- Do not write `requirements.md` or `tasks.md`, not even a status line.',
  '- If the spec is wrong, ambiguous, impossible to satisfy, or contradicts the code: do not guess',
  '  and do not change the spec. Write the proposed change in `verify-report.md` under',
  '  `## Proposed Spec Changes`, keeping what that file already holds, then stop with',
  '  `Status: NEEDS_HUMAN` and the reason in `verify-report.md`.',
  '',
  '### 5. Evidence per AC',
  '- In `verify-report.md`: one line per AC of `requirements.md`, in exactly one of five forms:',
  '  - `AC-n: automated-test — <file>::<test name>`',
  '  - `AC-n: command — <command> | <exit code or output observed>`',
  '  - `AC-n: build-only — <command that passed>; no test exists for this behavior`',
  '  - `AC-n: manual — <steps a human must run, or steps already run>`',
  '  - `AC-n: none — <why>`',
  '- Name the test; the number of passing tests is never evidence.',
  '- An AC marked `Verify: manual` is reported as `manual`, an AC marked `Verify: command:` as',
  '  `command` with the result observed, and an area with no test runner as `build-only` or',
  '  `manual` — not as `automated-test`.',
  '- `manual`, `build-only` and `none` are not counted as passed: such an AC needs a human check.',
  '  Never report one of them as `automated-test` or `command`.',
  '- The full layout of `verify-report.md` is in `.caf/workflows/agent-handoff.md`.',
].join('\n');

// The kinds whose `## Output` carries IMPLEMENTATION_SPEC_WORKFLOW. Written out, not derived:
// `implementation` (the fallback of detectKind) is deliberately not one of them.
const SPEC_AWARE_IMPLEMENTATION_KINDS = ['frontend', 'backend', 'implementer'];

// devops: CAF.md Layer 3 (.caf/tasks/{TICKET-ID}/) doesn't yet have an official artifact contract
// for DevOps (post-merge, next phase) — stays TODO until CAF.md defines it.
export function buildOutputSection(kind) {
  if (DISCOVERY_FOCUS[kind]) return DISCOVERY_FOCUS[kind].output;
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
  const contract = `Produces ${artifact} in \`.caf/tasks/{TICKET-ID}/\` for the next agent to read.`;
  if (kind === 'planner') return `${contract}\n\n${PLANNER_SPEC_WORKFLOW}`;
  if (kind === 'validator') return `${contract}\n\n${VALIDATOR_WORKFLOW}`;
  if (kind === 'reviewer') return `${contract}\n\n${REVIEWER_SPEC_WORKFLOW}`;
  if (SPEC_AWARE_IMPLEMENTATION_KINDS.includes(kind)) return `${contract}\n\n${IMPLEMENTATION_SPEC_WORKFLOW}`;
  return contract;
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
 * `## Scope` text for SINGLE_REPO's implementer (CAF-INIT-SINGLE-REPO). No directories → one
 * scope covering the whole repo (the default). One or more directories (`--scope`, e.g. the
 * domain layers of a DDD repo) → the agent is limited to exactly those, nothing hardcoded.
 * `dirs` are repo-relative, already normalized (no leading `./`, no trailing `/`).
 */
export function buildDirScopeSection(dirs = []) {
  if (!dirs || dirs.length === 0) {
    return 'Whole repository — this is a single-package repo with no per-app split, so every path in it is in scope.';
  }
  const list = dirs.map((d) => `- \`${d}/**\``).join('\n');
  return [
    list,
    '',
    'Only the directories above are in scope. If a task needs a change outside them, STOP and ask',
    'the user instead of editing the file — do not widen the scope yourself.',
  ].join('\n');
}

// CAF-MULTIAPP-01: one app renders byte-identical to the pre-multi-app single-line scope (this
// is the regression guarantee for non-monorepo projects and single-app roles). More than one app
// lists every scope plus the app-tag instruction the implementation agent must follow when
// reading tasks.md (mirrors the Planner-side instruction in buildInputSection('planner')).
function buildScopeSection(apps) {
  if (apps.length === 1) return `\`${apps[0].path}/**\``;
  const list = apps.map((a) => `\`${a.path}/**\``).join(', ');
  return [
    list,
    '',
    'This agent covers more than one app. Every task line assigned to this agent in `tasks.md`',
    'MUST be tagged with the app it targets, e.g. `- [ ] (apps/web) Fix email validation` — match',
    'the tag against the scopes above before touching any file. If a task has no tag, or the tag',
    'does not match any scope above, STOP and ask the user which app is meant — do not guess.',
  ].join('\n');
}

/**
 * Build a single agent definition draft. `scope` is a human-readable description (path glob
 * or "TODO"), used as-is unless `scopeApps` (array of detected apps, CAF-MULTIAPP-01) is given —
 * when given, it takes over rendering (see buildScopeSection).
 * `scripts`/`packageManager`/`packageName` come from matchVerifyScripts for a single app-scoped
 * agent, or null for whole-repo agents (Planner, QA, Reviewer, Documentation, DevOps). For an
 * agent covering more than one app, pass `verifyApps` instead (array of
 * `{ scripts, packageManager, packageName, appPath }`, one per app) — it takes over rendering
 * the Verify Checklist and `scripts`/`packageManager`/`packageName` are ignored.
 * `kind` selects the Input section — Planner/Architect get an explicit list of optional Layer 1
 * reference docs.
 * `slug` must be the filename stem the file is written as (agentSlug(kind, app)) — Claude Code
 * dispatches on the frontmatter `name`, so a mismatch with the filename is a latent bug.
 * `skills` (CAF-SKILLS-01): repo-relative SKILL.md paths rendered as `## Skills`; empty (the
 * default) renders nothing at all.
 */
export function buildAgentMd({
  name,
  role,
  scope,
  scopeApps = null,
  scripts,
  packageManager,
  packageName = null,
  verifyApps = null,
  kind,
  appNames,
  slug,
  model = 'sonnet',
  skills = [],
}) {
  const agentName = slug || kind;
  const scopeText = scopeApps && scopeApps.length > 0 ? buildScopeSection(scopeApps) : scope;
  const verifyChecklist =
    verifyApps !== null ? buildVerifyChecklist(verifyApps) : buildVerifyChecklist(scripts ? [{ scripts, packageManager, packageName }] : []);
  return `${buildFrontmatter({ slug: agentName, name, role, kind, model })}
# Agent: ${name}

> DRAFT produced by caf-initiator — review and complete before use, especially the
> parts marked TODO project-specific.

## Role
${role}

## Scope
${scopeText}

## Allowed Tools
${buildToolsSection(kind)}

## Input
${buildInputSection(kind, appNames)}

## Output
${buildOutputSection(kind)}
${buildSkillsSection(skills)}${buildBatasanSection(kind)}
## Working Pattern (PIV)
${buildWorkingPatternSection(kind)}

## Verify Checklist
${verifyChecklist}

## Retry Logic
${buildRetryLogicSection(kind)}
${buildAuditContractSections(kind)}`;
}
