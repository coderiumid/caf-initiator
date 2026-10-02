import path from 'node:path';
import kleur from 'kleur';
import { readFileSafe, section } from '../util.js';
import { detectRepoContext, REPO_MODE } from '../utils/repo-context.js';

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

/**
 * Step 2: detect repo mode (MONOREPO / SINGLE_REPO), package manager, apps/frameworks, database.
 *
 * The mode/package-manager/apps decision itself lives in utils/repo-context.js
 * (`detectRepoContext`) — this step adds console output and database detection on top, and keeps
 * returning the pre-CAF-INIT-SINGLE-REPO shape (`isMonorepo`, `packageManager`, ...) alongside
 * the new `mode`, so existing callers don't have to change.
 *
 * `mode` is the `--mode single|mono` override; leave it undefined to auto-detect.
 */
export async function detectStack({ dir, explicitGlobs, mode: modeOverride }) {
  section('Step 2 — Detect structure & stack');

  const context = await detectRepoContext({ dir, mode: modeOverride, explicitGlobs });
  const { mode, modeSource, monorepoTool, apps, confidence, globAppCount } = context;
  const packageManager = context.pkgManager;
  const isMonorepo = mode === REPO_MODE.MONOREPO;

  const database = detectDatabase(dir, apps);

  console.log(`  monorepo: ${isMonorepo ? kleur.green('yes') : 'no'}${monorepoTool ? ` (${monorepoTool})` : ''}`);
  console.log(`  mode: ${kleur.green(mode)}${modeSource === 'override' ? kleur.yellow(' (--mode override)') : ''}`);
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

  // A single-package repo is a normal, supported mode — nothing to warn about. The warning is
  // kept only for a MONOREPO whose default apps/*, packages/* guess matched nothing.
  if (isMonorepo && modeSource === 'override' && apps.length === 0) {
    console.log(
      kleur.yellow(
        '  warning: --mode mono was passed but no workspace package was found (no "workspaces" field, and apps/*, packages/* matched nothing) — the app list is empty. Declare workspaces in package.json, or drop --mode mono.'
      )
    );
  } else if (isMonorepo && confidence === 'guessed' && globAppCount === 0) {
    console.log(
      kleur.yellow(
        '  warning: no "workspaces" field found and default apps/*, packages/* patterns matched nothing — treating repo as single-package. Add a "workspaces" field to package.json if this is wrong.'
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
    mode,
    isMonorepo,
    monorepoTool,
    packageManager,
    apps,
    database,
    confidence,
  };
}
