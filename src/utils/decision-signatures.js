/**
 * Candidate ADR decisions derived from detectStack() output. Each candidate carries only
 * evidence of *what* was detected and *where* — never a reason. The "why" is always left
 * TODO for a human in the generated ADR (see src/templates/adr.js).
 */
export function buildDecisionCandidates(stack) {
  const candidates = [];

  if (stack.monorepoTool) {
    candidates.push({
      title: 'Monorepo tool selection',
      label: `Monorepo tool selection — ${stack.monorepoTool} (root)`,
      evidence: `Detected ${stack.monorepoTool} from a config file at the root.`,
      scope: 'root',
    });
  }

  if (stack.packageManager) {
    candidates.push({
      title: 'Package manager selection',
      label: `Package manager selection — ${stack.packageManager} (root)`,
      evidence: `Detected ${stack.packageManager} from a lockfile/the "packageManager" field.`,
      scope: 'root',
    });
  }

  for (const d of stack.database) {
    candidates.push({
      title: 'ORM/database layer selection',
      label: `ORM/database layer selection — ${d.type} (${d.scope})`,
      evidence: `${d.type} (${d.source}, scope: ${d.scope})`,
      scope: d.scope,
    });
  }

  for (const app of stack.apps) {
    if (!app.framework) continue;
    candidates.push({
      title: `Framework: ${app.path}`,
      label: `Framework: ${app.path} — ${app.framework}`,
      evidence: `App "${app.name}" (${app.path}) uses ${app.framework}.`,
      scope: app.path,
    });
  }

  return candidates;
}
