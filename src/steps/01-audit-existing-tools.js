import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';
import { dirHasContent, section } from '../util.js';

const AI_TOOL_DIRS = [
  { dir: '.claude', label: 'Claude Code' },
  { dir: '.kiro', label: 'Kiro' },
  { dir: '.opencode', label: 'OpenCode' },
  { dir: 'openspec', label: 'OpenSpec' },
  { dir: '.cursor', label: 'Cursor' },
];

/**
 * Step 1: audit existing AI coding agent config in the target repo.
 * Returns { action: 'continue' | 'stop', found: [{dir,label}] }.
 */
export async function auditExistingTools({ dir }) {
  section('Step 1 — Audit existing AI tool config');

  const found = AI_TOOL_DIRS.filter(({ dir: sub }) =>
    dirHasContent(path.join(dir, sub))
  );

  if (found.length === 0) {
    console.log(kleur.green('  none found — clean slate, continuing'));
    return { action: 'continue', found: [] };
  }

  console.log(kleur.yellow('  found existing AI tool config:'));
  for (const { dir: sub, label } of found) {
    console.log(kleur.yellow(`    ${sub}/  (${label})`));
  }

  const { choice } = await prompts({
    type: 'select',
    name: 'choice',
    message: 'How do you want to proceed?',
    choices: [
      { title: 'Coexist — keep everything, caf-initiator adds alongside', value: 'coexist' },
      { title: 'Consolidate — pick one source of truth (manual migration, not automated)', value: 'consolidate' },
      { title: 'Cancel', value: 'cancel' },
    ],
  });

  if (choice === undefined || choice === 'cancel') {
    console.log(kleur.dim('  cancelled by user'));
    return { action: 'stop', found };
  }

  if (choice === 'consolidate') {
    console.log('');
    console.log(kleur.yellow('  Consolidation is a manual decision — caf-initiator will not migrate'));
    console.log(kleur.yellow('  content automatically. Review the tools above, pick one source of'));
    console.log(kleur.yellow('  truth, and move relevant content into it yourself.'));
    return { action: 'stop', found };
  }

  console.log(kleur.green('  coexisting — continuing setup'));
  return { action: 'continue', found };
}
