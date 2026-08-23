import { ARTIFACT_BY_ROLE } from './artifact-by-role.js';

// pm/ux-designer (Klaster 1) and auditor (Klaster 4) have real, standard artifacts — just not
// in `.caf/tasks/{TICKET-ID}/` like the table below (and ARTIFACT_BY_ROLE, see its own header
// comment) assumes for every other role. Checked explicitly by kind rather than "ARTIFACT_BY_ROLE
// lookup missing" — auditor already has an ARTIFACT_BY_ROLE entry (used by agent-md.js's
// buildOutputSection, which states its own correct `.caf/audits/<DATE>/` location), so a
// missing-key guard alone would silently reuse it here with the wrong location implied.
const OUT_OF_TREE_ARTIFACT = {
  pm: '`prd.md`, `flow.md` (in `.caf/discovery/{slug}/`, not `.caf/tasks/` — see CAF.md Klaster 1)',
  'ux-designer': '`flow.md` (in `.caf/discovery/{slug}/`, not `.caf/tasks/` — see CAF.md Klaster 1)',
  auditor: '`audit-report.md` (in `.caf/audits/{DATE}/`, not `.caf/tasks/` — see CAF.md Klaster 4)',
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

\`\`\`markdown
# Verify Report

Status: PASS | NEEDS_HUMAN

## Checklist
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build

## Notes
TODO: verification result details, errors if any
\`\`\`

## Additional Agents (Custom)

${customSection(roster.custom)}
`;
}
