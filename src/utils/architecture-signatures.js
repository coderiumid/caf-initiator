import path from 'node:path';
import fg from 'fast-glob';

/**
 * Internal architecture pattern detection — runs *after* detectStack() has already resolved the
 * base framework (NestJS/Nuxt/…). Framework alone doesn't say how features are laid out, and the
 * feature-catalog scan strategy depends on the layout, not the framework: a NestJS+Vue monorepo
 * needs a controller→route intersection, a Nuxt layers repo needs a per-domain pages scan.
 *
 * Purely filesystem-based (no package.json signatures) — the layout is the signal here.
 */

const IGNORE_GLOBS = ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.next/**', '**/build/**'];

const CONTROLLER_GLOB = '**/*.controller.ts';
const ROUTER_GLOBS = ['**/router/index.{ts,js}', '**/src/router/**/*.{ts,js}'];
// A DDD layer only counts when it has its own pages/ — `layers/` alone is also a plain Nuxt
// layers convention for shared config, which carries no feature information.
const DDD_LAYER_GLOB = 'layers/*/pages/**';

async function hasMatch(patterns, dir) {
  const matches = await fg(patterns, {
    cwd: dir,
    ignore: IGNORE_GLOBS,
    absolute: false,
    onlyFiles: true,
  });
  return matches.length > 0;
}

/**
 * detectArchitecture({ dir, stack }) → 'controller-based' | 'ddd-layer' | null
 *
 * - 'controller-based': **\/*.controller.ts exists AND a frontend router is present somewhere in
 *   the same repo (the catalog is built from the controller × route intersection, so both halves
 *   must exist).
 * - 'ddd-layer': layers/<domain>/pages/ exists.
 * - null: neither, or both (ambiguous). Never guessed — the calling command decides the fallback.
 *
 * `stack` is detectStack() output; only used to keep the scan inside detected app paths so a
 * monorepo with unrelated sibling folders doesn't produce false positives. A single-package repo
 * (apps: [{ path: '.' }]) scans the whole dir.
 */
export async function detectArchitecture({ dir, stack }) {
  const scopes = (stack?.apps ?? [{ path: '.' }]).map((app) => app.path);

  let hasController = false;
  let hasRouter = false;
  let hasDddLayer = false;

  for (const scope of scopes) {
    const scopeDir = scope === '.' ? dir : path.join(dir, scope);
    if (!hasController) hasController = await hasMatch(CONTROLLER_GLOB, scopeDir);
    if (!hasRouter) hasRouter = await hasMatch(ROUTER_GLOBS, scopeDir);
    if (!hasDddLayer) hasDddLayer = await hasMatch(DDD_LAYER_GLOB, scopeDir);
  }

  // Root-level scan too: `layers/` and a root `router/` live outside apps/* in a repo whose
  // workspace globs only cover packages.
  if (!hasDddLayer) hasDddLayer = await hasMatch(DDD_LAYER_GLOB, dir);

  const controllerBased = hasController && hasRouter;

  if (controllerBased && hasDddLayer) return null;
  if (controllerBased) return 'controller-based';
  if (hasDddLayer) return 'ddd-layer';
  return null;
}
