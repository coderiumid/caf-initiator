import path from 'node:path';
import kleur from 'kleur';

import { section } from '../util.js';

const COMMAND_FILE = 'caf-feature-catalog-sync.md';

/**
 * `scaffold feature-catalog-sync` (CAF-SDD-03c1): /caf-feature-catalog-sync is no longer
 * scaffolded, so the target asks nothing, detects nothing and writes nothing; a command file
 * already in the repo is left as it is. The target itself still resolves so a script that calls it
 * gets this message instead of an unknown-target error. (Its builder and the architecture prompt
 * were removed at CAF-SDD-03c3: no path reached them.)
 */
export async function featureCatalogSync({ commandDir = '.claude/commands' } = {}) {
  section('feature-catalog-sync — generate the docs/feature-catalog.md sync command');

  console.log('');
  console.log(
    kleur.yellow(
      `  /caf-feature-catalog-sync is no longer scaffolded — nothing written. An existing\n` +
        `  ${path.join(commandDir, COMMAND_FILE)} is left as it is.`
    )
  );
  return { written: [], skipped: [] };
}
