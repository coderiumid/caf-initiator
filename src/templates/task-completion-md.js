import { verifyCommand, unresolvedPmTodo } from '../utils/runner-command.js';

const SLOT_LABELS = {
  lint: 'lint',
  typecheck: 'typecheck',
  test: 'test',
  build: 'build',
};

function verifyLine(slot, script, packageManager, packageName, note) {
  if (!script) {
    return `- [ ] TODO: no ${SLOT_LABELS[slot]} script detected in package.json — add the script or note the reason for skipping`;
  }
  const command = verifyCommand({ packageManager, script, packageName });
  if (!command) return `- [ ] ${unresolvedPmTodo({ packageName, script })}`;
  return `- [ ] \`${command}\` — must pass${note ? ` ${note}` : ''}`;
}

function buildGapNotes(scripts, scope) {
  const missing = Object.entries(scripts)
    .filter(([, script]) => !script)
    .map(([slot]) => SLOT_LABELS[slot]);

  if (missing.length === 0) return null;

  return missing
    .map(
      (label) =>
        `- No \`${label}\` script detected in package.json${scope ? ` (${scope})` : ''}. This is an ` +
        'infrastructure gap — a decision is needed: add the script, or deliberately skip this gate with the reason noted here.'
    )
    .join('\n');
}

/**
 * Build .caf/workflows/task-completion.md content from scripts matched via matchVerifyScripts.
 * `scope` is a human-readable label for the app/root the scripts were read from (used in gap notes).
 * `packageName` (readPackageName for the same app) scopes the commands to that workspace so they
 * don't fan out to the whole monorepo; null means root scope.
 */
export function buildTaskCompletionMd({ scripts, packageManager, packageName = null, scope }) {
  const gapNotes = buildGapNotes(scripts, scope);
  const gapSection = gapNotes
    ? `\n## Infrastructure Gap Notes\n\n${gapNotes}\n`
    : '';

  return `# Task Completion — Definition of Done

> Part of this file is auto-generated from scripts detected in \`package.json\`.
> Review before use.

## Required Verification Commands

${verifyLine('lint', scripts.lint, packageManager, packageName)}
${verifyLine('typecheck', scripts.typecheck, packageManager, packageName)}
${verifyLine('test', scripts.test, packageManager, packageName, '(if relevant tests exist)')}
${verifyLine('build', scripts.build, packageManager, packageName, 'before opening the PR')}

## Documentation Update Rules

TODO: project-specific documentation update rules (e.g. "new endpoint → update
api-contract.md") — this is a team decision, it cannot be detected automatically.

## PR Checklist

- [ ] All Verification Commands above PASS
- [ ] \`verify-report.md\` in \`.caf/tasks/{TICKET-ID}/\` shows Status: SUCCESS
- [ ] No changes outside the ticket scope
- [ ] TODO: additional project-specific checklist items (security review, migration check, etc.)
${gapSection}`;
}
