import { ARTIFACT_BY_ROLE } from './artifact-by-role.js';

// pm/ux-designer (Cluster 1) and auditor (Cluster 4) have real, standard artifacts — just not
// in `.caf/tasks/{TICKET-ID}/` like the table below (and ARTIFACT_BY_ROLE, see its own header
// comment) assumes for every other role. Checked explicitly by kind rather than "ARTIFACT_BY_ROLE
// lookup missing" — auditor already has an ARTIFACT_BY_ROLE entry (used by agent-md.js's
// buildOutputSection, which states its own correct `.caf/audits/<DATE>/` location), so a
// missing-key guard alone would silently reuse it here with the wrong location implied.
const OUT_OF_TREE_ARTIFACT = {
  pm: '`prd.md`, `flow.md` (in `.caf/discovery/{slug}/`, not `.caf/tasks/` — see CAF.md Cluster 1)',
  'ux-designer': '`flow.md` (in `.caf/discovery/{slug}/`, not `.caf/tasks/` — see CAF.md Cluster 1)',
  auditor: '`audit-report.md` (in `.caf/audits/{DATE}/`, not `.caf/tasks/` — see CAF.md Cluster 4)',
};

// role.slug is the on-disk filename stem (e.g. 'caf-planner'), but ARTIFACT_BY_ROLE is keyed by
// the bare kind ('planner') — strip the prefix before lookup.
function artifactRow(role) {
  const kind = role.slug.startsWith('caf-') ? role.slug.slice(4) : role.slug;
  const artifact = OUT_OF_TREE_ARTIFACT[kind] || ARTIFACT_BY_ROLE[kind];
  return `| ${role.label} | ${artifact} |`;
}

function customSection(custom) {
  if (custom.length === 0) {
    return 'No custom agents detected outside the standard CAF roles.';
  }
  const lines = custom.map(
    (file) => `- \`${file}\` — artifact format not yet standard, needs manual definition (TODO)`
  );
  return lines.join('\n');
}

// `## Format verify-report.md` below is the one generated source of that format (CAF-SDD-02,
// Q-3): agents are told which file and which `Status:` word in their own Retry Logic, the shape
// lives here. The per-AC evidence forms are the ones the `caf-traceability` skill states — keep
// the two identical. caf-orchestrator's readVerifyReport() tests the WHOLE file for
// `\bSUCCESS\b`, so nothing added to the skeleton may contain that word outside the `Status:`
// line (guarded by test/sdd02-planner-spec.test.js).
export function buildAgentHandoffMd({ roster }) {
  const presentRoles = roster.known.filter((r) => r.present);
  const table = presentRoles.map(artifactRow).join('\n');

  return `# Agent Handoff Format

> Part of this file is auto-generated from the detected agent roster.

Each ticket has its own folder: \`.caf/tasks/{TICKET-ID}/\`. An agent reads the previous
agent's output from this folder, not from chat/memory.

## Artifact per Agent (based on detected roster)

| Agent | Artifact Output |
|---|---|
${table}

## Format \`verify-report.md\`

Use the literal word \`SUCCESS\` on success — not \`PASS\`/\`DONE\`/\`OK\`. If this project uses
caf-orchestrator, it greps this file for \`\\bSUCCESS\\b\`; anything else is read as
\`NEEDS_HUMAN\` and stops the pipeline before QA/Reviewer/PR creation.

\`\`\`markdown
# Verify Report

Status: SUCCESS | NEEDS_HUMAN

## Checklist
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build

## Acceptance Criteria
- AC-1: automated-test — <file>::<test name>
- AC-2: build-only — <command that passed>; no test exists for this behavior
- AC-3: manual — <steps a human must run, or steps already run>
- AC-4: none — <why>

## Proposed Spec Changes
-

## Notes
TODO: verification result details, errors if any
\`\`\`

\`## Acceptance Criteria\`: one line per AC of \`requirements.md\`, in exactly one of the four forms
above. Name the test; the number of passing tests is never evidence. An AC marked
\`Verify: manual\` is reported as \`manual\`, and an area with no test runner as \`build-only\` or
\`manual\` — not as \`automated-test\`.

\`## Proposed Spec Changes\`: once \`requirements.md\` says \`Status: APPROVED\`, never edit it. If
the spec is wrong or impossible to satisfy, write the proposed change here and a human decides.
Write \`-\` when there is none.

Keep the word the \`Status:\` line uses for success out of every other line of the report: the
grep above reads the whole file, not only that line.

## Additional Agents (Custom)

${customSection(roster.custom)}
`;
}
