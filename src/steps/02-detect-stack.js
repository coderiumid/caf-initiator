import path from 'node:path';
import fg from 'fast-glob';
import kleur from 'kleur';
import { exists, readFileSafe, readJsonSafe, section } from '../util.js';

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

function detectPackageManager(rootDir, rootPkg) {
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

function detectFramework(pkg) {
  if (!pkg) return null;
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const { dep, label } of FRAMEWORK_SIGNATURES) {
    if (deps[dep]) return label;
  }
  return null;
}

function detectMonorepoTool(rootDir) {
  for (const { file, tool } of MONOREPO_TOOL_FILES) {
    if (exists(path.join(rootDir, file))) return tool;
  }
  return null;
}

function extractDatasourceProvider(schemaContent) {
  const datasourceBlock = schemaContent.match(/datasource\s+\w+\s*{([^}]*)}/);
  if (!datasourceBlock) return null;

  const providerMatch = datasourceBlock[1].match(/provider\s*=\s*"([^"]+)"/);
  return providerMatch ? providerMatch[1] : null;
}

function detectDatabase(rootDir, apps) {
  const scopes = [
    { label: 'root', dir: rootDir },
    ...apps.filter((a) => a.path !== '.').map((a) => ({ label: a.path, dir: path.join(rootDir, a.path) })),
  ];
  const findings = [];

  for (const { label, dir } of scopes) {
    const schema = readFileSafe(path.join(dir, 'prisma', 'schema.prisma'));
    if (schema) {
      const provider = extractDatasourceProvider(schema);
      findings.push({
        type: provider || 'unknown (Prisma, datasource provider not found)',
        source: path.join(label, 'prisma', 'schema.prisma'),
        scope: label,
      });
      continue;
    }

    const envExample = readFileSafe(path.join(dir, '.env.example'));
    if (envExample) {
      const lower = envExample.toLowerCase();
      let type = null;
      if (lower.includes('mysql')) type = 'mysql';
      else if (lower.includes('postgres')) type = 'postgresql';
      else if (lower.includes('mongodb') || lower.includes('mongo')) type = 'mongodb';
      if (type) {
        findings.push({ type, source: path.join(label, '.env.example'), scope: label });
      }
    }
  }

  return findings;
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

/**
 * Step 2: detect monorepo structure, package manager, apps/frameworks, database.
 */
export async function detectStack({ dir, explicitGlobs }) {
  section('Step 2 — Detect structure & stack');

  const rootPkg = readJsonSafe(path.join(dir, 'package.json'));
  const monorepoTool = detectMonorepoTool(dir);
  const hasWorkspaces = Boolean(rootPkg?.workspaces) || Boolean(monorepoTool);
  const packageManager = detectPackageManager(dir, rootPkg);

  const found = await findApps(dir, rootPkg, explicitGlobs);
  let apps = found.apps;
  const globAppCount = apps.length;
  const { confidence } = found;
  const isMonorepo = hasWorkspaces || apps.length > 0;

  if (!isMonorepo) {
    apps = [
      {
        name: rootPkg?.name || path.basename(path.resolve(dir)),
        path: '.',
        framework: detectFramework(rootPkg),
        packageManager,
      },
    ];
  }

  const database = detectDatabase(dir, apps);

  console.log(`  monorepo: ${isMonorepo ? kleur.green('yes') : 'no'}${monorepoTool ? ` (${monorepoTool})` : ''}`);
  console.log(`  package manager: ${packageManager ? kleur.green(packageManager) : kleur.yellow('not detected')}`);
  if (database.length === 0) {
    console.log(`  database: ${kleur.dim('not detected')}`);
  } else {
    console.log('  database:');
    for (const d of database) {
      console.log(`    - ${kleur.green(d.type)} (scope: ${d.scope}, via ${d.source})`);
    }
  }
  console.log(`  apps found: ${apps.length}`);
  for (const app of apps) {
    console.log(
      `    - ${app.name} (${app.path}) — framework: ${app.framework ? kleur.green(app.framework) : kleur.dim('unknown')}`
    );
  }

  if (confidence === 'guessed' && globAppCount === 0) {
    console.log(
      kleur.yellow(
        '  warning: no "workspaces" field found and default apps/*, packages/* patterns matched nothing — treating repo as single-package. Use --workspace-glob if this is wrong.'
      )
    );
  } else if (confidence === 'guessed' && globAppCount > 0) {
    console.log(
      kleur.dim(
        '  note: app locations guessed from default apps/*, packages/* patterns (no "workspaces" field found) — verify detected apps manually.'
      )
    );
  }

  return {
    isMonorepo,
    monorepoTool,
    packageManager,
    apps,
    database,
    confidence,
  };
}
