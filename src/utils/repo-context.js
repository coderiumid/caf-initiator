import path from 'node:path';
import fg from 'fast-glob';
import { exists, readFileSafe, readJsonSafe } from '../util.js';

// The single place that decides whether a target repo is a monorepo or a single package
// (CAF-INIT-SINGLE-REPO). Pure detection — no logging, no prompts — so every command gets the
// same answer and tests can call it directly. `detectStack` (steps/02-detect-stack.js) wraps
// this with console output and database detection.
//
// Finding no workspaces is NOT an error and not a warning: it is SINGLE_REPO, a first-class mode
// with `apps = [{ name, path: '.' }]`.
export const REPO_MODE = {
  MONOREPO: 'MONOREPO',
  SINGLE_REPO: 'SINGLE_REPO',
};

// `--mode` flag value -> RepoMode.
const MODE_FLAGS = {
  single: REPO_MODE.SINGLE_REPO,
  mono: REPO_MODE.MONOREPO,
};
export const MODE_FLAG_CHOICES = Object.keys(MODE_FLAGS);

const MONOREPO_TOOL_FILES = [
  { file: 'turbo.json', tool: 'Turborepo' },
  { file: 'nx.json', tool: 'Nx' },
  { file: 'lerna.json', tool: 'Lerna' },
  { file: 'pnpm-workspace.yaml', tool: 'pnpm workspaces' },
];

// Signature list — dependency name -> framework label. Order matters: more
// specific frameworks (Next, Nuxt, Nest) are checked before their base
// libraries (React, Vue, Express) so they win.
const FRAMEWORK_SIGNATURES = [
  { dep: 'next', label: 'Next.js' },
  { dep: 'nuxt', label: 'Nuxt' },
  { dep: '@nestjs/core', label: 'NestJS' },
  { dep: '@angular/core', label: 'Angular' },
  { dep: 'svelte', label: 'Svelte' },
  { dep: 'fastify', label: 'Fastify' },
  { dep: 'koa', label: 'Koa' },
  { dep: 'express', label: 'Express' },
  { dep: 'react', label: 'React' },
  { dep: 'vue', label: 'Vue' },
];

/**
 * `--mode single|mono` -> RepoMode, or null when the flag wasn't passed (auto-detect). Also
 * accepts an already-resolved RepoMode so internal callers can pass either form. Throws on
 * anything else — an unknown mode silently falling back to auto-detect would defeat the point of
 * an override.
 */
export function resolveModeOverride(mode) {
  if (mode == null || mode === '') return null;
  if (MODE_FLAGS[mode]) return MODE_FLAGS[mode];
  if (Object.values(REPO_MODE).includes(mode)) return mode;
  throw new Error(`unknown --mode "${mode}" (choices: ${MODE_FLAG_CHOICES.join(', ')})`);
}

// `packageManager` field first, lockfile second. Returns null when neither exists — callers
// render a TODO rather than guessing a package manager that isn't there.
export function detectPackageManager(rootDir, rootPkg) {
  if (rootPkg?.packageManager) {
    const name = rootPkg.packageManager.split('@')[0];
    return name;
  }
  if (exists(path.join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(path.join(rootDir, 'yarn.lock'))) return 'yarn';
  if (exists(path.join(rootDir, 'bun.lockb'))) return 'bun';
  if (exists(path.join(rootDir, 'package-lock.json'))) return 'npm';
  return null;
}

export function detectFramework(pkg) {
  if (!pkg) return null;
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const { dep, label } of FRAMEWORK_SIGNATURES) {
    if (deps[dep]) return label;
  }
  return null;
}

export function detectMonorepoTool(rootDir) {
  for (const { file, tool } of MONOREPO_TOOL_FILES) {
    if (exists(path.join(rootDir, file))) return tool;
  }
  return null;
}

function getWorkspacePatternsFromPkg(rootPkg) {
  if (!rootPkg?.workspaces) return null;
  if (Array.isArray(rootPkg.workspaces)) return rootPkg.workspaces;
  if (Array.isArray(rootPkg.workspaces.packages)) return rootPkg.workspaces.packages;
  return null;
}

function getWorkspacePatternsFromPnpmYaml(rootDir) {
  const raw = readFileSafe(path.join(rootDir, 'pnpm-workspace.yaml'));
  if (!raw) return null;

  const lines = raw.split(/\r?\n/);
  const packagesIdx = lines.findIndex((line) => /^\s*packages\s*:/.test(line));
  if (packagesIdx === -1) return null;

  const patterns = [];
  for (let i = packagesIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^\s*-\s*['"]?([^'"#]+?)['"]?\s*(?:#.*)?$/);
    if (!match) break;
    patterns.push(match[1].trim());
  }

  return patterns.length > 0 ? patterns : null;
}

async function findApps(rootDir, rootPkg, explicitGlobs) {
  let patterns = explicitGlobs && explicitGlobs.length > 0 ? explicitGlobs : null;
  let confidence = patterns ? 'explicit' : null;

  if (!patterns) {
    patterns = getWorkspacePatternsFromPnpmYaml(rootDir) || getWorkspacePatternsFromPkg(rootPkg);
    confidence = patterns ? 'declared' : null;
  }

  if (!patterns) {
    patterns = ['apps/*', 'packages/*'];
    confidence = 'guessed';
  }

  const pkgJsonPatterns = patterns.map((p) =>
    p.endsWith('package.json') ? p : `${p.replace(/\/$/, '')}/package.json`
  );

  const pkgFiles = await fg(pkgJsonPatterns, { cwd: rootDir, absolute: false });

  const apps = pkgFiles
    .map((rel) => {
      const pkg = readJsonSafe(path.join(rootDir, rel));
      if (!pkg) return null;
      const appDir = path.dirname(rel);
      return {
        name: pkg.name || path.basename(appDir),
        path: appDir,
        framework: detectFramework(pkg),
        packageManager: detectPackageManager(path.join(rootDir, appDir), pkg),
      };
    })
    .filter(Boolean);

  return { apps, confidence, patternsUsed: patterns };
}

// SINGLE_REPO's one app: the repo itself. `name` falls back to the repo folder name when
// package.json has none (or doesn't exist).
function rootApp(dir, rootPkg, pkgManager) {
  return {
    name: rootPkg?.name || path.basename(path.resolve(dir)),
    path: '.',
    framework: detectFramework(rootPkg),
    packageManager: pkgManager,
  };
}

/**
 * Detect the repo mode, package manager and app list.
 *
 * MONOREPO when the root declares it (`workspaces` in package.json, `pnpm-workspace.yaml`,
 * `turbo.json`, `nx.json`, `lerna.json`), or — unchanged from before this function existed —
 * when the default `apps/*` / `packages/*` guess finds at least one package.json. Anything else
 * is SINGLE_REPO.
 *
 * `mode` ('single' | 'mono' | a RepoMode) overrides the detection outright:
 * - single: the workspace scan is skipped entirely, `apps` is the repo root.
 * - mono: the workspace scan runs and its result is used as-is, even when it finds nothing.
 *
 * Returns `{ mode, pkgManager, apps }` plus diagnostics (`modeSource`, `monorepoTool`,
 * `confidence`, `globAppCount`) that `detectStack` uses for its console output.
 */
export async function detectRepoContext({ dir, mode, explicitGlobs } = {}) {
  const override = resolveModeOverride(mode);

  const rootPkg = readJsonSafe(path.join(dir, 'package.json'));
  const monorepoTool = detectMonorepoTool(dir);
  const hasWorkspaces = Boolean(rootPkg?.workspaces) || Boolean(monorepoTool);
  const pkgManager = detectPackageManager(dir, rootPkg);

  if (override === REPO_MODE.SINGLE_REPO) {
    return {
      mode: REPO_MODE.SINGLE_REPO,
      modeSource: 'override',
      pkgManager,
      apps: [rootApp(dir, rootPkg, pkgManager)],
      monorepoTool,
      confidence: null,
      globAppCount: 0,
    };
  }

  const found = await findApps(dir, rootPkg, explicitGlobs);
  const detectedMonorepo = hasWorkspaces || found.apps.length > 0;
  const isMonorepo = override === REPO_MODE.MONOREPO || detectedMonorepo;

  return {
    mode: isMonorepo ? REPO_MODE.MONOREPO : REPO_MODE.SINGLE_REPO,
    modeSource: override ? 'override' : 'detected',
    pkgManager,
    apps: isMonorepo ? found.apps : [rootApp(dir, rootPkg, pkgManager)],
    monorepoTool,
    confidence: found.confidence,
    globAppCount: found.apps.length,
  };
}
