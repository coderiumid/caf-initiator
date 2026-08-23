import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section } from '../util.js';
import { writeIfAbsentGuarded, reportCollisions } from '../utils/collision-check.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { detectArchitecture } from '../utils/architecture-signatures.js';
import { buildFeatureCatalogSyncMd } from '../templates/feature-catalog.js';

const ARCHITECTURE_LABELS = {
  'controller-based': 'controller-based (controller backend × route frontend)',
  'ddd-layer': 'DDD-layer (layers/<domain>/pages/)',
};

/**
 * Generate `.claude/commands/caf-feature-catalog-sync.md`, with the scan strategy baked in at
 * generation time from the detected architecture (same approach as audit-to-ticket.md's
 * tracker variants — the generated command carries one strategy, never a menu of them).
 *
 * When the architecture can't be determined, this never picks one silently: it asks, and a
 * declined prompt writes nothing at all rather than falling back to a guess.
 */
export async function featureCatalogSync({
  dir,
  commandDir = '.claude/commands',
  agentDir = '.claude/agents',
  dryRun = false,
}) {
  section('feature-catalog-sync — generate the docs/feature-catalog.md sync command');

  const stack = await detectStack({ dir, explicitGlobs: undefined });

  section('Architecture pattern detection');
  let architecture = await detectArchitecture({ dir, stack });

  if (architecture) {
    console.log(`  architecture: ${kleur.green(ARCHITECTURE_LABELS[architecture])}`);
  } else {
    console.log(
      kleur.yellow(
        '  architecture: not detected — the structure doesn\'t match controller-based\n' +
          '  (**/*.controller.ts + frontend router) or DDD-layer (layers/<domain>/pages/),\n' +
          '  or it matches both (ambiguous).'
      )
    );

    const { picked } = await prompts({
      type: 'select',
      name: 'picked',
      message: 'Manually determine this project\'s architecture pattern:',
      choices: [
        { title: 'Cancel — write nothing (re-run once the structure is clear)', value: 'cancel' },
        { title: 'controller-based', value: 'controller-based' },
        { title: 'DDD-layer', value: 'ddd-layer' },
        { title: 'Still generate with a TODO strategy (fill in manually later)', value: 'todo' },
      ],
      initial: 0,
    });

    if (!picked || picked === 'cancel') {
      console.log('');
      console.log(kleur.dim('cancelled — no file written'));
      return { written: [], skipped: [] };
    }

    architecture = picked === 'todo' ? null : picked;
  }

  const filePath = path.join(dir, commandDir, 'caf-feature-catalog-sync.md');
  const content = buildFeatureCatalogSyncMd({ architecture, agentDir });

  console.log('');
  const collisions = [];
  const result = writeIfAbsentGuarded(filePath, content, { dryRun }, collisions);

  const written = result === 'written' ? [filePath] : [];
  const skipped = result === 'skipped' ? [filePath] : [];

  console.log('');
  if (result === 'skipped') {
    console.log(kleur.dim(`${filePath} already exists — not overwritten`));
  } else if (result === 'written') {
    console.log(kleur.green(`generated ${filePath}`));
    if (architecture === null) {
      console.log(
        kleur.yellow('  contains a TODO detection strategy — fill it in manually before using this command')
      );
    }
  }

  reportCollisions(collisions);

  return { written, skipped };
}
