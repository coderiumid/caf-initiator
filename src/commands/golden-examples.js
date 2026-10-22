import path from 'node:path';
import fg from 'fast-glob';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, readFileSafe, writeIfAbsent, exists, dirHasContent } from '../util.js';
import { detectStack } from '../steps/02-detect-stack.js';
import { scoreFile } from '../utils/scoring.js';
import { buildRulesMd } from '../templates/golden-example-rules-md.js';
import { agentSlug } from '../templates/agent-md.js';

// `suffixes` is a fallback/addition to `dirs`, not a replacement — a file matches a category
// if it sits in one of `dirs` OR its filename ends in `.{suffix}.{ext}` (e.g. `*.controller.ts`).
// This catches repos that organize by naming convention instead of folder (common outside
// Nest-style layouts too — Angular services/components use the same `.service.ts` pattern).
// Only categories with a well-established cross-stack suffix convention get one; `Component`,
// `Composable/Hook`, and `Store/State` stay dirs-only since there's no equally common suffix.
export const PATTERN_CATEGORIES = [
  { name: 'Controller/Route Handler', dirs: ['controllers', 'routes', 'api'], suffixes: ['controller'] },
  { name: 'Service/Business Logic', dirs: ['services', 'use-cases', 'usecases'], suffixes: ['service'] },
  { name: 'Component', dirs: ['components'] },
  { name: 'Composable/Hook', dirs: ['composables', 'hooks'] },
  { name: 'Store/State', dirs: ['stores', 'store'] },
  { name: 'DTO/Validation', dirs: ['dto', 'dtos', 'schemas', 'validators'], suffixes: ['dto'] },
  { name: 'Repository/Data Access', dirs: ['repositories', 'repository', 'models'], suffixes: ['repository'] },
];

const CODE_EXT_GLOB = '*.{ts,tsx,js,jsx,vue}';
const IGNORE_GLOBS = ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.next/**', '**/*.spec.*', '**/*.test.*'];

const MAX_CANDIDATES_PER_CATEGORY = 3;

export async function findCandidates(scopeDir, category) {
  const dirSegment = category.dirs.length > 1 ? `{${category.dirs.join(',')}}` : category.dirs[0];
  const patterns = [`**/${dirSegment}/**/${CODE_EXT_GLOB}`];

  if (category.suffixes && category.suffixes.length > 0) {
    const suffixSegment = category.suffixes.length > 1 ? `{${category.suffixes.join(',')}}` : category.suffixes[0];
    patterns.push(`**/*.${suffixSegment}.${CODE_EXT_GLOB.slice(2)}`);
  }

  const fgOpts = { cwd: scopeDir, ignore: IGNORE_GLOBS, caseSensitiveMatch: false, absolute: false };
  const matchLists = await Promise.all(patterns.map((pattern) => fg(pattern, fgOpts)));
  return [...new Set(matchLists.flat())];
}

function describeScore(score) {
  if (score >= 100) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export async function scoreCandidates(scopeDir, relPaths) {
  const scored = [];
  for (const relPath of relPaths) {
    const absPath = path.join(scopeDir, relPath);
    const content = readFileSafe(absPath);
    if (content == null) continue;
    const score = scoreFile(absPath, content, { cwd: scopeDir });
    const lines = content.split(/\r?\n/).length;
    const hasTodo = /\b(TODO|FIXME|HACK)\b/.test(content);
    scored.push({ relPath, absPath, score, lines, hasTodo });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_CANDIDATES_PER_CATEGORY);
}

const GOLDEN_DIR = ['.caf', 'knowledge', 'golden-examples'];

function rulesPathFor(dir, app) {
  return path.join(dir, ...GOLDEN_DIR, app.path === '.' ? '' : app.path, 'RULES.md');
}

function appSlug(app) {
  return agentSlug('implementation', app);
}

/**
 * Resolve `--app` values (repo path or slug) against the detected apps. A path wins over a slug;
 * a slug that matches several apps, or a value that matches none, is an error — nothing is
 * guessed. Returns `{ apps }` (in detection order, no duplicates) or `{ error }`.
 */
export function resolveAppSelectors(stack, selectors) {
  const picked = [];
  for (const value of selectors) {
    const byPath = stack.apps.find((a) => a.path === value);
    if (byPath) {
      if (!picked.includes(byPath)) picked.push(byPath);
      continue;
    }
    const bySlug = stack.apps.filter((a) => appSlug(a) === value);
    if (bySlug.length > 1) {
      return { error: `--app ${value} is ambiguous — it matches ${bySlug.map((a) => a.path).join(' and ')}; use the path` };
    }
    if (bySlug.length === 0) {
      const known = stack.apps.map((a) => `${appSlug(a)} (${a.path})`).join(', ');
      return { error: `--app ${value} not found in detected stack (known apps: ${known})` };
    }
    if (!picked.includes(bySlug[0])) picked.push(bySlug[0]);
  }
  return { apps: stack.apps.filter((a) => picked.includes(a)) };
}

async function pickApps(stack, dir) {
  const { picked } = await prompts({
    type: 'multiselect',
    name: 'picked',
    message: 'Pick the apps to scan (space to tick, none ticked by default):',
    instructions: false,
    choices: stack.apps.map((a) => ({
      title: `${a.name} (${a.path})${exists(rulesPathFor(dir, a)) ? ' — RULES.md already exists' : ''}`,
      value: a.path,
    })),
  });
  if (!picked) return [];
  return stack.apps.filter((a) => picked.includes(a.path));
}

function printMissingSummary(dir, stack, writtenPaths) {
  const missing = stack.apps.filter((a) => !exists(rulesPathFor(dir, a)) && !writtenPaths.includes(rulesPathFor(dir, a)));
  console.log('');
  if (missing.length === 0) {
    console.log(kleur.dim('apps without golden example: none'));
    return;
  }
  console.log(`apps without golden example: ${missing.map((a) => `${appSlug(a)} (${a.path})`).join(', ')}`);
  console.log(kleur.dim(`  add them later with: caf-init scaffold golden-examples --app <slug-or-path>   (or --all-apps)`));
}

async function scanApp({ dir, app, dryRun }) {
  const appFolder = path.join(dir, ...GOLDEN_DIR, app.path === '.' ? '' : app.path);
  const rulesPath = path.join(appFolder, 'RULES.md');
  const folderExistedBefore = dirHasContent(appFolder);
  const rulesExistedBefore = exists(rulesPath);

  const destinations = [];
  const skipped = [];
  // A dry run writes nothing but still counts toward the closing summary of what would exist.
  const planned = [];

  // CAF-INIT-DOCS-REMOVE amendment 4: a RULES.md that already exists is never overwritten, so
  // asking the category questions would only throw the answers away — say so up front instead.
  if (rulesExistedBefore) {
    console.log(kleur.dim(`${rulesPath} already exists, skipped (sudah ada, skip)`));
    return { written: destinations, skipped: [rulesPath], planned };
  }

  // RULES.md is a mandatory pair for every golden-examples/{{app}}/ folder (CAF.md Layer 1).
  // A pre-existing folder from before this rule existed is a gap — flag and offer it up front,
  // independent of whether this run ends up copying any new files.
  let generateRules = false;
  if (folderExistedBefore && !rulesExistedBefore) {
    console.log('');
    console.log(
      kleur.yellow(`⚠ ${appFolder} already has golden examples but no companion RULES.md.`)
    );
    const { confirmRules } = await prompts({
      type: 'confirm',
      name: 'confirmRules',
      message: 'Generate the missing RULES.md now?',
      initial: true,
    });
    generateRules = Boolean(confirmRules);
  }

  const scopeDir = path.join(dir, app.path === '.' ? '' : app.path);

  const categoriesWithCandidates = [];
  for (const category of PATTERN_CATEGORIES) {
    const matches = await findCandidates(scopeDir, category);
    if (matches.length === 0) continue;
    const topCandidates = await scoreCandidates(scopeDir, matches);
    if (topCandidates.length === 0) continue;
    categoriesWithCandidates.push({ category, candidates: topCandidates });
  }

  let selections = [];
  if (categoriesWithCandidates.length === 0) {
    console.log(kleur.dim('no candidate files found in any category — nothing to select'));
  } else {
    for (const { category, candidates } of categoriesWithCandidates) {
      const { picked } = await prompts({
        type: 'multiselect',
        name: 'picked',
        message: `${category.name} — pick files to use as golden examples:`,
        instructions: false,
        choices: candidates.map((c) => ({
          title: `${c.relPath} (score ${describeScore(c.score)}${c.hasTodo ? ', has TODO' : ''}, ${c.lines} lines)`,
          value: c,
        })),
      });
      if (picked && picked.length > 0) {
        selections.push(...picked.map((c) => ({ ...c, patternName: category.name })));
      }
    }
    if (selections.length === 0) {
      console.log(kleur.dim('no files selected'));
    }
  }

  // Reference-based: RULES.md points at the file's real repo path (no copy), so it keeps
  // "living" alongside the code instead of drifting from an unmaintained snapshot.
  const entries = selections.map((c) => ({
    relPath: path.join(app.path === '.' ? '' : app.path, c.relPath),
    patternName: c.patternName,
  }));

  // New selections this run always get a RULES.md too, on top of any gap-fill above.
  if (entries.length > 0) generateRules = true;

  if (generateRules) {
    const rulesContent = buildRulesMd({ appLabel: app.name, entries });
    const result = writeIfAbsent(rulesPath, rulesContent, { dryRun });
    if (result === 'written') destinations.push(rulesPath);
    else if (result === 'skipped') skipped.push(rulesPath);
    else if (result === 'dry-run') planned.push(rulesPath);
  }

  console.log('');
  if (destinations.length === 0) {
    console.log(kleur.dim('no RULES.md written'));
  } else {
    console.log(kleur.green(`generated RULES.md in .caf/knowledge/golden-examples/ referencing ${entries.length} file(s)`));
    for (const dest of destinations) {
      console.log(`  - ${dest}`);
    }
  }

  return { written: destinations, skipped, planned };
}

/**
 * `app` is the `--app` values (path or slug; a string or an array), `allApps` is `--all-apps`.
 * Either one removes only the app picker — the per-category file questions still run, because
 * which files are golden examples is a human decision. One detected app is used without a picker
 * (single repo: unchanged). Several apps: a multiselect with nothing ticked.
 */
export async function goldenExamples({ dir, app: appOpt, allApps = false, dryRun = false, mode }) {
  section('golden-examples — scan & select reference files');

  const stack = await detectStack({ dir, explicitGlobs: undefined, mode });
  const selectors = [].concat(appOpt ?? []);

  let apps;
  if (allApps || selectors.length > 0) {
    if (allApps && selectors.length > 0) {
      console.error(kleur.red('--all-apps and --app cannot be combined — pick one'));
      process.exitCode = 1;
      return { written: [], skipped: [] };
    }
    if (allApps) {
      apps = stack.apps;
    } else {
      const resolved = resolveAppSelectors(stack, selectors);
      if (resolved.error) {
        console.error(kleur.red(resolved.error));
        process.exitCode = 1;
        return { written: [], skipped: [] };
      }
      apps = resolved.apps;
    }
  } else if (stack.apps.length === 1) {
    apps = stack.apps;
  } else {
    apps = await pickApps(stack, dir);
  }

  if (apps.length === 0) {
    console.log(kleur.dim('no app selected — nothing written'));
    printMissingSummary(dir, stack, []);
    return { written: [], skipped: [] };
  }

  const written = [];
  const skipped = [];
  const planned = [];
  for (const [i, app] of apps.entries()) {
    if (apps.length > 1) {
      console.log('');
      console.log(kleur.bold(`App ${i + 1}/${apps.length}: ${appSlug(app)} (${app.path})`));
    }
    const result = await scanApp({ dir, app, dryRun });
    written.push(...result.written);
    skipped.push(...result.skipped);
    planned.push(...result.planned);
  }

  if (stack.apps.length > 1) printMissingSummary(dir, stack, [...written, ...planned]);

  return { written, skipped };
}
