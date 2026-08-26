import prompts from 'prompts';
import kleur from 'kleur';

import { audit } from './audit.js';
import { agentsSync } from './agents-sync.js';

const SYNC_COMMAND = 'caf-init curate --sync-only';

// audit() unconditionally sets process.exitCode = 1 on required gaps — that's correct for
// --audit-only (CI gate) but wrong for bare/--sync-only, which aren't compliance checks.
// Reset happens right after the audit() call that set it, before any further processing
// (the sync offer/flow) — not after the sync flow finishes, so it never leaks into the
// bare-mode exit code regardless of whether the user proceeds with sync.
export async function curate({ dir, agentDir, output, mode = 'default', dryRun = false }) {
  if (mode === 'sync-only') {
    return agentsSync({ dir, agentDir, dryRun });
  }

  const auditResult = await audit({ dir, agentDir, output });

  if (mode === 'audit-only') {
    return auditResult;
  }

  process.exitCode = undefined;

  const syncableGaps = auditResult.requiredGaps.filter((e) => e.syncCommand === SYNC_COMMAND);
  if (syncableGaps.length === 0) {
    return auditResult;
  }

  console.log(kleur.bold(`${syncableGaps.length} gap(s) can be synced directly into .claude/agents/*.md.`));
  const { proceed } = await prompts({
    type: 'confirm',
    name: 'proceed',
    message: 'Proceed to the sync flow now?',
    initial: true,
  });

  if (!proceed) {
    return auditResult;
  }

  const syncResult = await agentsSync({ dir, agentDir, dryRun });
  return { ...auditResult, sync: syncResult };
}
