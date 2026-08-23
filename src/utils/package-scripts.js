import path from 'node:path';
import { readJsonSafe } from '../util.js';

// slot key -> regex matched against package.json script keys (case-insensitive, partial match).
const SLOT_PATTERNS = {
  lint: /lint/i,
  typecheck: /type.?check|check.?types/i,
  test: /test/i,
  build: /build/i,
};

/**
 * Read package.json for the given app path and match its scripts against the standard
 * lint/typecheck/test/build slots. Never guesses a script name — only reports scripts that
 * actually exist.
 *
 * Returns { lint, typecheck, test, build } where each value is the real script name (string)
 * or null if no script in that app matches the slot.
 */
export function matchVerifyScripts(rootDir, appPath) {
  const pkg = readJsonSafe(path.join(rootDir, appPath, 'package.json'));
  const scripts = pkg?.scripts ? Object.keys(pkg.scripts) : [];

  const matched = {};
  for (const [slot, pattern] of Object.entries(SLOT_PATTERNS)) {
    // Exact slot name wins over the pattern: the patterns are partial matches, so `lint` also
    // hits `lint-staged` and `test` also hits `test:watch`/`pretest`. Without this, which one
    // is picked depends on declaration order in package.json — `test:watch` declared above
    // `test` would silently become the test gate.
    matched[slot] = scripts.find((name) => name === slot) || scripts.find((name) => pattern.test(name)) || null;
  }
  return matched;
}

/**
 * The `name` field of the app's package.json — the identifier workspace filters address a
 * package by (`pnpm --filter <name>`), which is not the same as its path.
 *
 * Returns null for root scope (`appPath` '.' or empty) and for any app whose package.json is
 * missing or unnamed: callers render the unscoped `<pm> run <script>` form in that case, since
 * a filter on a name that doesn't exist would fail rather than degrade.
 */
export function readPackageName(rootDir, appPath) {
  if (!appPath || appPath === '.') return null;
  const pkg = readJsonSafe(path.join(rootDir, appPath, 'package.json'));
  return pkg?.name || null;
}
