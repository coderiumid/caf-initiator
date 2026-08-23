function checklistLine(role) {
  if (role.present) return `- [x] ${role.label}`;
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
              if it fails → fix and retry (max 3x)
              if still failing → stop, escalate to a human (Status: NEEDS_HUMAN)
\`\`\`

## Active Agents in This Project

${checklist}

## Retry Logic per Gate

- Implementation (Frontend/Backend): max 3x (CAF.md default), then stop → NEEDS_HUMAN
${retryLine('QA', qaRetries)}
${retryLine('Reviewer', reviewerRetries)}

## Warning: Parser Contract

The \`Status:\` field emitted by each agent (e.g. \`PASS\`/\`NEEDS_HUMAN\` for QA,
\`READY_FOR_HUMAN_REVIEW\`/\`NEEDS_CHANGES\` for Reviewer) MUST be the exact literal token
the orchestrator parses — no extra wording/qualifiers.
A mismatch here burns the retry budget with no clear error surfaced to the user. Always
verify the agent prompt and the orchestrator parser as a pair, never separately.

TODO: confirm the literal tokens used by this project's orchestrator match exactly what
each agent above emits.
`;
}
