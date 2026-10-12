import path from 'node:path';
import { readJsonSafe } from '../util.js';

// slot key -> regex matched against package.json script keys (case-insensitive, partial match).
const SLOT_PATTERNS = {
  lint: /lint/i,
  typecheck: /type.?check|check.?types/i,
  test: /test/i,
  build: /build/i,
};

// Same patterns anchored at the start of a name, used to recognize `pre<slot>`/`post<slot>`.
const SLOT_START_PATTERNS = Object.fromEntries(
  Object.entries(SLOT_PATTERNS).map(([slot, pattern]) => [slot, new RegExp(`^(?:${pattern.source})`, 'i')])
);

// `test:watch`, `test-watch`, `lint_watch`: a script that never exits can't be a verify gate.
function isWatchScript(name) {
  return name.split(/[:\-_.\s]+/).some((segment) => segment.toLowerCase() === 'watch');
}

// npm lifecycle hooks (`pretest`, `postbuild`) run around another script, they aren't the gate
// itself. Only a `pre`/`post` name whose remainder is another script in this package.json, or
// itself starts like the slot, counts — `prettier:lint` and `postcss:build` are ordinary scripts.
function isLifecycleHook(name, slot, scripts) {
  const m = name.match(/^(?:pre|post)(.+)$/i);
  if (!m) return false;
  return scripts.includes(m[1]) || SLOT_START_PATTERNS[slot].test(m[1]);
}

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
    // hits `lint-staged` and `test` also hits `test:ci`. Without this, which one is picked
    // depends on declaration order in package.json.
    // The pattern fallback never picks a watch-mode script or a lifecycle hook (CAF-SDD-03a): if
    // those are the only candidates the slot stays null and renders as a TODO gap, rather than
    // `test:watch` silently becoming the test gate.
    matched[slot] =
      scripts.find((name) => name === slot) ||
      scripts.find((name) => pattern.test(name) && !isWatchScript(name) && !isLifecycleHook(name, slot, scripts)) ||
      null;
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
