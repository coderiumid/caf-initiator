/**
 * Build the verify command string for a script, scoped to a single workspace when the script
 * was detected inside a monorepo app.
 *
 * The scoping matters: `matchVerifyScripts` reads scripts out of `apps/x/package.json`, but the
 * agent running the checklist starts at the repo root. Emitting a bare `pnpm run lint` there
 * runs the *root* script — in a Turborepo that fans out to every workspace (a frontend ticket
 * reformatting backend files via `eslint --fix`), or fails outright when the root has no such
 * script.
 *
 * `packageName` is the `name` field of the app's package.json (workspace filters address
 * packages by name, not by path). Null/absent means root scope — the bare form is correct then.
 *
 * Returns null when the workspace needs scoping but the package manager is unknown: the filter
 * syntax differs per manager, so guessing one would emit a plausible-looking command that can
 * fail or scope differently than intended — the same class of silent wrongness this scoping
 * exists to remove. Callers render `unresolvedPmTodo()` instead.
 */
export function verifyCommand({ packageManager, script, packageName }) {
  if (!packageName) return `${packageManager || 'npm'} run ${script}`;

  switch (packageManager) {
    case 'pnpm':
      return `pnpm --filter ${packageName} run ${script}`;
    case 'yarn':
      return `yarn workspace ${packageName} run ${script}`;
    case 'bun':
      return `bun run --filter ${packageName} ${script}`;
    case 'npm':
      return `npm run ${script} --workspace ${packageName}`;
    default:
      return null;
  }
}

/** Checklist text for the case above — mirrors the "script not detected" TODO lines. */
export function unresolvedPmTodo({ packageName, script }) {
  return (
    'TODO: package manager not detected — manually verify the scoped command for workspace ' +
    `\`${packageName}\`, script \`${script}\``
  );
}
