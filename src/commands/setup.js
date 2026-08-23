import kleur from 'kleur';

import { auditExistingTools } from '../steps/01-audit-existing-tools.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { detectTracker } from '../steps/03-detect-tracker.js';
import { generateDrafts } from '../steps/04-generate-drafts.js';

/**
 * Setup — audit, detect stack/tracker, draft CLAUDE.md/AGENTS.md/tasks README.
 * Returns { ok: false, reason } if stopped early, otherwise
 * { ok: true, stack, tracker, written, skipped }.
 */
export async function runSetup({ dir, dryRun, explicitGlobs }) {
  console.log(kleur.bold(`caf-initiator — target: ${dir}${dryRun ? kleur.yellow(' (dry-run)') : ''}`));

  const audit = await auditExistingTools({ dir });
  if (audit.action === 'stop') {
    return { ok: false, reason: 'audit-stop' };
  }

  const stack = await detectStack({ dir, explicitGlobs });
  const tracker = await detectTracker({ dir });

  if (!tracker.tracker) {
    console.log(kleur.dim('\nno tracker selected — stopping'));
    return { ok: false, reason: 'no-tracker' };
  }

  const { written, skipped } = generateDrafts({ dir, dryRun, stack, tracker });

  console.log('');
  if (dryRun) {
    console.log(kleur.yellow('dry-run complete — nothing was written'));
  } else {
    console.log(kleur.green('done — review generated drafts before using them with an AI agent'));
  }

  return { ok: true, stack, tracker, written, skipped };
}
