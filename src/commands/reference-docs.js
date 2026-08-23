import path from 'node:path';
import prompts from 'prompts';
import kleur from 'kleur';

import { section, writeIfAbsent, exists } from '../util.js';
import { detectStack } from '../steps/02-detect-stack.js';
import {
  buildPrdMd,
  buildFeatureSpecMd,
  buildSystemOverviewMd,
  buildApiContractMd,
  buildErdMd,
  buildTestingStrategyMd,
} from '../templates/reference-docs-md.js';

// Same FRAMEWORK_SIGNATURES labels as 02-detect-stack.js — api-contract.md is only offered
// when a repo has a detected app on each side, never for a pure-frontend consumer of an
// external API.
const FRONTEND_FRAMEWORKS = ['Next.js', 'Nuxt', 'Angular', 'Svelte', 'React', 'Vue'];
const BACKEND_FRAMEWORKS = ['NestJS', 'Fastify', 'Koa', 'Express'];

function hasSeparateFrontendAndBackend(stack) {
  const frameworks = stack.apps.map((a) => a.framework).filter(Boolean);
  const hasFrontend = frameworks.some((f) => FRONTEND_FRAMEWORKS.includes(f));
  const hasBackend = frameworks.some((f) => BACKEND_FRAMEWORKS.includes(f));
  return hasFrontend && hasBackend;
}

function buildItems({ dir, stack }) {
  const items = [
    {
      key: 'product',
      label: 'docs/product/prd.md (product-level PRD)',
      filePath: path.join(dir, 'docs', 'product', 'prd.md'),
      build: buildPrdMd,
    },
    {
      key: 'architecture',
      label: 'docs/architecture/system-overview.md',
      filePath: path.join(dir, 'docs', 'architecture', 'system-overview.md'),
      build: buildSystemOverviewMd,
    },
    {
      key: 'schema',
      label: 'docs/schema/erd.md',
      filePath: path.join(dir, 'docs', 'schema', 'erd.md'),
      build: buildErdMd,
    },
    {
      key: 'testing-strategy',
      label: 'docs/testing-strategy.md',
      filePath: path.join(dir, 'docs', 'testing-strategy.md'),
      build: buildTestingStrategyMd,
    },
  ];

  if (hasSeparateFrontendAndBackend(stack)) {
    items.push({
      key: 'api-contract',
      label: 'docs/api-contract.md (separate FE+BE detected within one repo)',
      filePath: path.join(dir, 'docs', 'api-contract.md'),
      build: buildApiContractMd,
    });
  }

  return items;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function pickFeatureNames() {
  const { featureInput } = await prompts({
    type: 'text',
    name: 'featureInput',
    message:
      'Feature Spec names to create placeholders for in docs/product/features/ (comma-separated, leave empty to skip):',
  });
  if (!featureInput) return [];
  return featureInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Scaffold the optional Layer 1 reference docs (PRD, Feature Spec, system-overview,
 * api-contract, ERD, testing-strategy). Every item here is read-only reference material for
 * CAF (see CAF.md Layer 1) — none of it is ever required for the pipeline to run, so this
 * never blocks. `scaffold` never calls this at all (decision: `docs` stays fully separate,
 * "optional, never required" — see requirements-CAF-UX-03.md).
 *
 * This is the deliberate exception to "CAF never writes into docs/" (see
 * knowledge-index-md.js) — not redundant with INDEX.md's ✓/✗ status bridge, it's the tool
 * INDEX.md itself points users at to actually fill the gaps it reports. Keep both in sync
 * if either the doc set or the writing behavior changes.
 *
 * `interactive: true` prompts per item (used by the standalone command and the menu).
 * `interactive: false` only generates items listed in `include` / `features`, no prompts —
 * used by `caf-init docs --include ...` / `--feature ...` for non-interactive/CI use.
 */
export async function referenceDocs({ dir, dryRun = false, interactive = true, include = [], features = [] }) {
  section('reference-docs — optional Layer 1: PRD, Feature Spec, system-overview, api-contract, ERD, testing-strategy');

  const stack = await detectStack({ dir, explicitGlobs: undefined });
  const items = buildItems({ dir, stack });

  const written = [];
  const skipped = [];

  for (const item of items) {
    if (exists(item.filePath)) {
      console.log(kleur.dim(`  ${item.label} — already exists, fill in manually (not overwritten)`));
      skipped.push(item.filePath);
      continue;
    }

    let shouldCreate;
    if (interactive) {
      const { create } = await prompts({
        type: 'confirm',
        name: 'create',
        message: `Create an empty placeholder for ${item.label}?`,
        initial: false,
      });
      shouldCreate = Boolean(create);
    } else {
      shouldCreate = include.includes(item.key);
    }

    if (!shouldCreate) {
      console.log(kleur.dim(`  ${item.label} — skipped`));
      continue;
    }

    const content = item.build();
    const result = writeIfAbsent(item.filePath, content, { dryRun });
    if (result === 'written') written.push(item.filePath);
    else if (result === 'skipped') skipped.push(item.filePath);
  }

  let featureNames = features;
  if (interactive && featureNames.length === 0) {
    featureNames = await pickFeatureNames();
  }
  for (const name of featureNames) {
    const slug = slugify(name);
    if (!slug) continue;
    const filePath = path.join(dir, 'docs', 'product', 'features', `${slug}.md`);
    const content = buildFeatureSpecMd({ featureName: name });
    const result = writeIfAbsent(filePath, content, { dryRun });
    if (result === 'written') written.push(filePath);
    else if (result === 'skipped') skipped.push(filePath);
  }

  console.log('');
  if (written.length === 0) {
    console.log(kleur.dim('no new reference docs written'));
  } else {
    console.log(kleur.green(`generated ${written.length} reference doc placeholder(s)`));
    for (const filePath of written) {
      console.log(`  - ${filePath}`);
    }
  }

  return { written, skipped };
}
