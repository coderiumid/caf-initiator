import prompts from 'prompts';
import kleur from 'kleur';

import { section } from '../util.js';
import { runSetup } from './setup.js';
import { goldenExamples } from './golden-examples.js';
import { adr } from './adr.js';
import { agents } from './agents.js';
import { taskCompletion } from './task-completion.js';
import { workflow } from './workflow.js';
import { featureCatalogSync } from './feature-catalog-sync.js';

// feature-catalog-sync is intentionally excluded from the bare chain — unlike every other step
// here, its output is not usable the moment it's generated: the first run of the generated
// command produces a catalog full of `TODO` entries that a human has to verify feature by
// feature before the file means anything. Folding that into the chain would end `scaffold`
// with work that only looks done. Reachable only via `scaffold feature-catalog-sync` explicitly.
//
// docs (Reference Docs) is intentionally excluded too — Phase 1 made it a fully separate,
// opt-in-only command ("optional, never required"); `scaffold` no longer entangles with it
// the way `full` used to.
export const TARGETS = {
  'golden-examples': { label: 'Golden Examples Selector', run: (ctx) => goldenExamples({ dir: ctx.dir, dryRun: ctx.dryRun }) },
  adr: { label: 'ADR Draft Generator', run: (ctx) => adr({ dir: ctx.dir, dryRun: ctx.dryRun }) },
  agents: { label: 'Agent Definitions Scaffolder', run: (ctx) => agents({ dir: ctx.dir, agentDir: ctx.agentDir, dryRun: ctx.dryRun }) },
  'task-completion': { label: 'Task Completion Generator', run: (ctx) => taskCompletion({ dir: ctx.dir, dryRun: ctx.dryRun }) },
  workflow: { label: 'Workflow Docs Generator', run: (ctx) => workflow({ dir: ctx.dir, agentDir: ctx.agentDir, dryRun: ctx.dryRun }) },
  'feature-catalog-sync': { label: 'Feature Catalog Sync Command Generator', run: (ctx) => featureCatalogSync({ dir: ctx.dir, agentDir: ctx.agentDir, dryRun: ctx.dryRun }) },
};

// Order for the bare chain — feature-catalog-sync stays out per decision B above.
const CHAIN_ORDER = ['golden-examples', 'adr', 'agents', 'task-completion', 'workflow'];

function printSummary(summary) {
  console.log('');
  section('scaffold — summary');
  for (const entry of summary) {
    if (entry.error) {
      console.log(kleur.red(`  ✗ ${entry.step} — failed: ${entry.error}`));
    } else if (!entry.ran) {
      console.log(kleur.dim(`  - ${entry.step} — skipped`));
    } else {
      console.log(kleur.green(`  ✓ ${entry.step} — ${entry.written} written, ${entry.skipped} skipped (already exist)`));
    }
  }
}

/**
 * `scaffold` bare: Setup → Golden Examples → ADR → Agents → Task Completion → Workflow,
 * per-step confirm (default yes). Identical to the old `full` chain minus Reference Docs.
 */
export async function runScaffold({ dir, dryRun, explicitGlobs, agentDir }) {
  section('scaffold — run Setup → Golden Examples → ADR → Agents → Task Completion → Workflow in sequence');

  const summary = [];

  const setupResult = await runSetup({ dir, dryRun, explicitGlobs });
  if (!setupResult.ok) {
    console.log('');
    console.log(kleur.red(`chain stopped — Setup did not complete (${setupResult.reason})`));
    return;
  }
  summary.push({ step: 'Setup', ran: true, written: setupResult.written.length, skipped: setupResult.skipped.length });

  const ctx = { dir, dryRun, agentDir };

  for (const key of CHAIN_ORDER) {
    const { label, run } = TARGETS[key];
    console.log('');
    const { proceed } = await prompts({
      type: 'confirm',
      name: 'proceed',
      message: `Continue to step "${label}"?`,
      initial: true,
    });

    if (!proceed) {
      summary.push({ step: label, ran: false });
      continue;
    }

    try {
      const result = await run(ctx);
      summary.push({
        step: label,
        ran: true,
        written: result?.written?.length ?? 0,
        skipped: result?.skipped?.length ?? 0,
      });
    } catch (err) {
      summary.push({ step: label, ran: false, error: err.message });
      printSummary(summary);
      console.log('');
      console.log(kleur.red(`chain stopped — step "${label}" failed. The rest can be run manually.`));
      return;
    }
  }

  printSummary(summary);
}

/**
 * `scaffold <target>`: run a single target standalone, behavior identical to the old
 * individual command.
 */
export async function runScaffoldTarget(target, { dir, dryRun, agentDir, app, commandDir }) {
  if (!TARGETS[target]) {
    console.error(kleur.red(`scaffold: unknown target "${target}" (choices: ${Object.keys(TARGETS).join(', ')})`));
    process.exitCode = 1;
    return;
  }

  switch (target) {
    case 'golden-examples':
      return goldenExamples({ dir, app, dryRun });
    case 'adr':
      return adr({ dir, app, dryRun });
    case 'agents':
      return agents({ dir, app, agentDir, commandDir, dryRun });
    case 'task-completion':
      return taskCompletion({ dir, app, dryRun });
    case 'workflow':
      return workflow({ dir, agentDir, dryRun });
    case 'feature-catalog-sync':
      return featureCatalogSync({ dir, commandDir, agentDir, dryRun });
    default:
      throw new Error(`unreachable: unhandled scaffold target "${target}"`);
  }
}
