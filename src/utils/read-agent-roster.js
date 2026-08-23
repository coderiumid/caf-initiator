import fs from 'node:fs';
import path from 'node:path';

// frontend/backend got the `caf-` prefix at CAF-REORG-07 (caf-orchestrator cutover to prefixed
// filenames finished at Checkpoint 4B — see CAF_PREFIXED_KINDS in templates/agent-md.js).
// auditor/pm/ux-designer are Klaster 1/4 roles (CAF.md) whose artifact doesn't live in
// `.caf/tasks/{TICKET-ID}/` like the other seven — included here anyway (CAF-REORG-06 AC2) so
// they read as real CAF roles in agent-handoff.md instead of falling into the generic "custom,
// format belum standar" bucket. See agent-handoff-md.js's OUT_OF_TREE_ARTIFACT for how their
// artifact line stays location-honest.
export const KNOWN_ROLES = [
  { slug: 'caf-planner', label: 'Planner' },
  { slug: 'caf-architect', label: 'Architect' },
  { slug: 'caf-frontend', label: 'Frontend' },
  { slug: 'caf-backend', label: 'Backend' },
  { slug: 'caf-qa', label: 'QA' },
  { slug: 'caf-reviewer', label: 'Reviewer' },
  { slug: 'caf-documentation', label: 'Documentation' },
  { slug: 'caf-pm', label: 'PM' },
  { slug: 'caf-ux-designer', label: 'UX Designer' },
  { slug: 'caf-auditor', label: 'Auditor' },
];

/**
 * Scan agentDirPath for *.md files and classify against KNOWN_ROLES by filename
 * (without extension). Files that don't match a known role slug are returned as
 * `custom`, not folded into any of the 7 standard roles.
 *
 * Returns { known: [{ slug, label, present }], custom: [filename] } or null if
 * the directory doesn't exist / has no .md files.
 */
export function readAgentRoster(agentDirPath) {
  if (!fs.existsSync(agentDirPath)) return null;

  const files = fs
    .readdirSync(agentDirPath)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) return null;

  const slugs = new Set(files.map((f) => path.basename(f, '.md')));
  const known = KNOWN_ROLES.map((role) => ({ ...role, present: slugs.has(role.slug) }));
  const knownSlugs = new Set(KNOWN_ROLES.map((r) => r.slug));
  const custom = files.filter((f) => !knownSlugs.has(path.basename(f, '.md')));

  return { known, custom };
}
