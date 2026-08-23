// Shared audit contract (CAF.md § Klaster 4). Single source of truth for the Auditor agent
// definition (agent-md.js, kind 'auditor') and its companion commands (audit-commands.js) —
// these two drifted before (agent said one thing, command said another), so severity scheme,
// finding categories, and the report skeleton all live here and nowhere else.

// CAF.md: "report uses severity Critical/Moderate/Minor". Not CRITICAL/HIGH/MEDIUM/LOW.
export const SEVERITY_LEVELS = ['Critical', 'Moderate', 'Minor'];

// Critical + Moderate → Temuan Prioritas, Minor → Non-Prioritas. Moderate sits at the old
// HIGH/MEDIUM boundary, so keeping it actionable preserves the same signal the 4-level scheme
// had (2 of 4 levels were priority) without inventing a 4th level CAF.md doesn't define.
export const PRIORITY_SEVERITIES = 'Critical / Moderate';
export const NON_PRIORITY_SEVERITIES = 'Minor';

// CAF.md § Klaster 4 scope: functional bugs + tech debt/performance. Deep security scanning is
// explicitly OUT of the CAF Auditor's responsibility, so there is no SECURITY category here.
export const FINDING_CATEGORIES = ['BUG', 'PERFORMANCE', 'TECH_DEBT', 'COVERAGE'];

export const CATEGORY_LIST = FINDING_CATEGORIES.map((c) => `\`${c}\``).join(' / ');

export const SECURITY_OUT_OF_SCOPE_NOTE =
  'Deep security scanning (secrets, injection, auth bypass) is OUT OF SCOPE for the CAF ' +
  'Auditor (see CAF.md § Klaster 4) — that is the responsibility of a separate security review. ' +
  'If a serious security indication is hit incidentally, write it under `## Notes` for human ' +
  'attention; do not turn it into a priority finding and do not turn it into a ticket via this path.';

// Heading of the non-ticket bucket in the report skeleton, and the subsection that holds
// sensitive-data-exposure findings. Kept as constants because /caf-audit-to-ticket has to name the
// exact heading it skips — a drift here silently turns a skipped finding into a ticket.
export const AUDIT_NOTES_HEADING = '## Notes';
export const SENSITIVE_DATA_SUBHEADING = '### Sensitive Data Exposure';

// Cross-category routing filter, NOT a 5th finding category. Runs AFTER a finding is already
// classified BUG/PERFORMANCE/TECH_DEBT/COVERAGE: the finding stays substantively a bug, only its
// handling route changes because the content is sensitive. Deliberately prose, not regex —
// naming varies (`password_hash`, `passwordHash`, `pwd_hash`, ...) and string matching
// false-negatives on all of it; the Auditor judges the substance of the finding instead.
export const SENSITIVE_DATA_ROUTING_RULE = `**Routing rule: sensitive-data-exposure (applies across categories).**

Before placing a finding into "Priority Findings" or "Non-Priority Findings", check: does this finding
involve EXPOSURE of sensitive data/credentials (password/password_hash, token, secret, API key,
session secret, or PII that should not be public) — whether found through a functional bug scan,
tech debt, or performance scan?

If YES — regardless of its original category (${CATEGORY_LIST}) — move it to
\`${AUDIT_NOTES_HEADING}\` § \`${SENSITIVE_DATA_SUBHEADING}\`, NOT to Priority
Findings/Non-Priority Findings. This is not a new category: the original category classification is
still written down, only the handling route changes.

Write just enough description to be actionable (file/line location, type of data leaked,
original category) WITHOUT including the actual exposed value/payload.

Findings in this subsection are NOT converted into tickets by \`/caf-audit-to-ticket\` — they are
treated the same as other out-of-scope security indications. A human decides the handling route
outside the normal tracker.`;

/**
 * "Yang Dicari" section body — shared by auditor.md and /caf-audit-scan so the agent and the command
 * hunt for exactly the same things. Deliberately stack-agnostic (no framework/ORM names): the
 * concrete patterns are the reader's job to map onto the detected stack.
 */
export const WHAT_TO_LOOK_FOR = `**Functional bugs (from code behavior, not assumptions):**
- Logic that is inconsistent with existing documentation/ADR/golden-example
- Edge cases that appear unhandled (missing null/undefined check on a path that clearly
  needs it, silent-swallow error handling with no log)
- API contract that changed but its consumers (frontend/other service) haven't been updated

**Tech debt:**
- Duplicated logic that should be shared (violates a documented golden-example pattern)
- Code that deviates from ADR conventions without a documented reason
- TODO/FIXME comments that have gone stale (check comment age via \`git blame\`)

**Performance (indications from static code, not runtime profiling):**
- Query inside a loop (N+1 pattern)
- An index that is clearly needed from frequently-used query patterns but doesn't exist
- Clearly excessive response payload (e.g. selecting all columns when only 2 are used)

**Out of scope for the CAF Auditor — DO NOT scan:**
- ${SECURITY_OUT_OF_SCOPE_NOTE}

${SENSITIVE_DATA_ROUTING_RULE}

Use judgment for other patterns relevant to the project's domain (check CLAUDE.md and
incident/hotfix history if available), but DO NOT assign a severity without including
supporting line-level evidence.`;

/**
 * Report skeleton. `maxPriority` is the cap on "Priority Findings" — the Auditor agent caps at 5
 * (full-repo scan, weekly AI budget control), /caf-audit-scan has no cap (user-scoped area).
 */
export function reportSkeleton({ agentLabel, scopeLine, maxPriority = null }) {
  const cap = maxPriority ? ` (max ${maxPriority})` : '';
  return `\`\`\`markdown
## Audit: <DATE>
## Agent: ${agentLabel}
${scopeLine}

## Summary

<1-2 sentence summary of the state of the scanned area>

## Priority Findings${cap}

### 1. [CATEGORY] <short title>
- **Location:** \`path/to/file.ext:line\`
- **Category:** ${CATEGORY_LIST}
- **Severity:** ${PRIORITY_SEVERITIES}
- **Issue:** <concrete description, why this is a problem>
- **Impact:** <consequence if left unaddressed>
- **Suggestion:** <short direction for a fix, not a full implementation>

### 2. ...

## Non-Priority Findings (recorded, not proposed as tasks)

- <category, file:line location, severity ${NON_PRIORITY_SEVERITIES} — short list, no detail>

${AUDIT_NOTES_HEADING}

<things that need human attention — e.g. needs an architectural decision, requested scope
turned out to be broader than can be covered, or a security indication that falls outside
the Auditor's scope>

${SENSITIVE_DATA_SUBHEADING}

<sensitive data/credential exposure findings, regardless of original category — leave empty if none>

- **Location:** \`path/to/file.ext:line\`
- **Original Category:** ${CATEGORY_LIST}
- **Exposed Data:** <type of data only, e.g. "password hash in endpoint response" —
  DO NOT write the actual value/payload>
- **Issue:** <short description>
\`\`\`

Severity ${PRIORITY_SEVERITIES} → Priority Findings; ${NON_PRIORITY_SEVERITIES} → Non-Priority
Findings. Group findings by module/area within each section. Sensitive-data-exposure
findings go under \`${AUDIT_NOTES_HEADING}\` § \`${SENSITIVE_DATA_SUBHEADING}\`
(full rule in the "What to Look For" section).`;
}
