// Roles `caf-init scaffold agents` no longer offers (CAF-SDD-03c1): their absence is by design.
const NOT_SCAFFOLDED_SLUGS = ['caf-documentation', 'caf-pm', 'caf-ux-designer', 'caf-auditor'];

function checklistLine(role) {
  if (role.present) return `- [x] ${role.label}`;
  if (NOT_SCAFFOLDED_SLUGS.includes(role.slug)) {
    return `- [ ] ${role.label} — not scaffolded, caf-init no longer generates this agent role`;
  }
  return `- [ ] ${role.label} — NOT present, this project does not generate this agent role (TODO: confirm this is actually correct)`;
}

function retryLine(label, retries) {
  if (retries) {
    return `- ${label} gate: max ${retries.maxRetries}x (source: ${retries.source} agents.${label.toLowerCase()}.maxRetries)`;
  }
  return `- ${label} gate: TODO: retry count for ${label} not yet confirmed, check orchestrator`;
}

export function buildPivWorkflowMd({ agentDir, roster, qaRetries, reviewerRetries }) {
  const checklist = roster.known.map(checklistLine).join('\n');

  return `# PIV Workflow

> Part of this file is auto-generated from the agent roster detected in \`${agentDir}\`.
> Review before use — especially the TODO sections.

## Workflow Pattern

\`\`\`
PLAN       → write a plan first, don't touch code yet
IMPLEMENT  → execute according to the plan
VERIFY     → self-check (lint, typecheck, test) before claiming done
              if it fails → fix and retry inside this agent (up to 3x)
              if still failing → stop, escalate to a human (Status: NEEDS_HUMAN)
\`\`\`

## Active Agents in This Project

${checklist}

## Retry Logic per Gate

- Implementation (Frontend/Backend): verify retry inside one agent, up to 3x (CAF.md default), then stop → NEEDS_HUMAN
${retryLine('QA', qaRetries)}
${retryLine('Reviewer', reviewerRetries)}

The 3x above is the verify retry inside one agent. The QA and Reviewer gates are the
orchestrator's retry gates, a separate count (default 1, set by \`agents.qa.maxRetries\` and
\`agents.reviewer.maxRetries\`).

## Warning: Parser Contract

The \`Status:\` field emitted by each agent (e.g. \`PASS\`/\`NEEDS_HUMAN\` for QA) and the
\`Verdict:\` line of Reviewer (\`APPROVE\`, \`CHANGES REQUESTED\` or \`DEFER\`) MUST be the exact
literal token the orchestrator parses — no extra wording/qualifiers.
A mismatch here burns the retry budget with no clear error surfaced to the user. Always
verify the agent prompt and the orchestrator parser as a pair, never separately.

TODO: confirm the literal tokens used by this project's orchestrator match exactly what
each agent above emits.
`;
}
