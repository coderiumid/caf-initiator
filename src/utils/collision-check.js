import path from 'node:path';
import kleur from 'kleur';

import { exists, writeIfAbsent } from '../util.js';

/**
 * Legacy-name collision for a caf-prefixed target: given `.../caf-<name>.md`, check
 * whether `.../<name>.md` (pre-CAF-REORG-01/07 naming) already exists alongside it. Returns
 * the legacy path if found, else null. Non-`caf-`-prefixed targets never collide (nothing
 * to check for implementation-role/app-slug files, which stay unprefixed).
 */
export function detectLegacyCollision(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  if (!base.startsWith('caf-')) return null;
  const legacyPath = path.join(dir, base.slice('caf-'.length));
  return exists(legacyPath) ? legacyPath : null;
}

/**
 * writeIfAbsent, guarded by detectLegacyCollision. On collision, skips the write (no file
 * touched), records it into `collisions`, and returns 'collision' instead of delegating to
 * writeIfAbsent. Non-colliding targets behave exactly like writeIfAbsent.
 */
export function writeIfAbsentGuarded(filePath, content, opts, collisions) {
  const legacyPath = detectLegacyCollision(filePath);
  if (legacyPath) {
    collisions.push({ legacyPath, targetPath: filePath });
    return 'collision';
  }
  return writeIfAbsent(filePath, content, opts);
}

/**
 * Print an actionable summary for a batch of collisions and mark the process exit code
 * non-zero. Does not exit/throw — callers already ran to completion (partial write: every
 * non-colliding file in the same run was written normally); this only makes the failure
 * visible instead of a skip line buried in normal output.
 */
export function reportCollisions(collisions) {
  if (collisions.length === 0) return;

  console.log('');
  console.log(kleur.red(`✗ ${collisions.length} collision(s) detected — old file (pre-caf- rename) still exists:`));
  for (const { legacyPath, targetPath } of collisions) {
    console.log(kleur.red(`  - ${legacyPath}`));
    console.log(kleur.dim(`    intended target: ${targetPath} (NOT written)`));
  }
  console.log('');
  console.log(
    kleur.yellow(
      'caf-init does not auto-migrate. Migrate manually: `git mv <old file> <new file>`\n' +
        '  then patch its contents to the latest caf-* pattern (see CAF-REORG-03 as a validated example),\n' +
        '  or delete the old file if it is no longer used, then re-run caf-init.'
    )
  );

  process.exitCode = 1;
}
