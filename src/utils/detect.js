import path from 'node:path';
import fg from 'fast-glob';
import { exists, readFileSafe, readJsonSafe } from '../util.js';
import { detectRepoContext } from './repo-context.js';
import { agentSlug } from '../templates/agent-md.js';

// CAF-INIT-SMART-01: the one read-only inventory of a target repo (D1). Pure detection — no
// logging, no prompts, no writes — so `recommend()` and the tests can call it directly. It wraps
// `detectRepoContext` (mode, package manager, apps) and adds what the smart scaffold flow needs:
// per-app scripts and code presence, the default branch and the git host.

const SCRIPT_KEYS = ['test', 'lint', 'build'];
const CODE_GLOB = '**/*.{ts,tsx,js,jsx,mjs,cjs,vue,svelte}';
const CODE_IGNORE = ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.next/**', '**/.output/**', '**/*.config.*', '**/*.d.ts', '**/*.test.*', '**/*.spec.*'];

/** `host` is 'github' | 'gitlab' | null; a host we cannot name (bitbucket, self-hosted) is null. */
export function hostFromRemoteUrl(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (/(^|[@/.])github\.com[:/]/.test(lower)) return 'github';
  if (/(^|[@/.])gitlab\.com[:/]/.test(lower) || /(^|[@/.])gitlab\.[a-z0-9.-]+[:/]/.test(lower)) return 'gitlab';
  return null;
}

function gitDir(dir) {
  const p = path.join(dir, '.git');
  // A `.git` file (worktree/submodule) is not followed: those repos report no git facts.
  return exists(p) && readFileSafe(path.join(p, 'HEAD')) != null ? p : null;
}

// Remote named origin first, otherwise the first remote that has a url.
export function readRemoteUrl(dir) {
  const git = gitDir(dir);
  if (!git) return null;
  const config = readFileSafe(path.join(git, 'config'));
  if (!config) return null;
  const remotes = [];
  let current = null;
  for (const line of config.split(/\r?\n/)) {
    const header = line.match(/^\s*\[remote "([^"]+)"\]/);
    if (header) {
      current = header[1];
      continue;
    }
    if (/^\s*\[/.test(line)) {
      current = null;
      continue;
    }
    const url = current && line.match(/^\s*url\s*=\s*(.+?)\s*$/);
    if (url) remotes.push({ name: current, url: url[1] });
  }
  return (remotes.find((r) => r.name === 'origin') || remotes[0])?.url ?? null;
}

export function readDefaultBranch(dir) {
  const git = gitDir(dir);
  if (!git) return null;
  const originHead = readFileSafe(path.join(git, 'refs', 'remotes', 'origin', 'HEAD'));
  const fromOrigin = originHead?.match(/refs\/remotes\/origin\/(\S+)/);
  if (fromOrigin) return fromOrigin[1];
  const head = readFileSafe(path.join(git, 'HEAD'));
  const fromHead = head?.match(/^ref:\s*refs\/heads\/(\S+)/);
  return fromHead ? fromHead[1] : null;
}

function pickScripts(pkg) {
  const scripts = pkg?.scripts || {};
  const out = {};
  for (const key of SCRIPT_KEYS) out[key] = scripts[key] ? key : null;
  out.runnable = ['dev', 'start', 'serve', 'preview'].find((k) => scripts[k]) || null;
  return out;
}

async function hasCode(dir, app) {
  const files = await fg(CODE_GLOB, { cwd: path.join(dir, app.path), ignore: CODE_IGNORE, deep: 6, onlyFiles: true });
  return files.length > 0;
}

/**
 * `{ mode, packageManager, monorepoTool, apps, defaultBranch, gitHost, remoteUrl }`.
 * Each app: `{ name, path, slug, framework, scripts: { test, lint, build, runnable }, hasCode }`.
 * `mode` is the `--mode single|mono` override (undefined = auto-detect).
 */
export async function detectProject({ dir, mode } = {}) {
  const ctx = await detectRepoContext({ dir, mode });
  const apps = [];
  for (const app of ctx.apps) {
    const pkg = readJsonSafe(path.join(dir, app.path, 'package.json'));
    apps.push({
      name: app.name,
      path: app.path,
      slug: agentSlug('implementation', app),
      framework: app.framework,
      scripts: pickScripts(pkg),
      hasCode: await hasCode(dir, app),
    });
  }
  const remoteUrl = readRemoteUrl(dir);
  return {
    mode: ctx.mode,
    packageManager: ctx.pkgManager,
    monorepoTool: ctx.monorepoTool,
    apps,
    defaultBranch: readDefaultBranch(dir),
    gitHost: hostFromRemoteUrl(remoteUrl),
    remoteUrl,
  };
}
