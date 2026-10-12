// The set of files a default scaffold writes for a fixture (CAF-SDD-03c1), through the real
// commands on a temp copy of the fixture: Setup's draft step, `scaffold agents` with every agent
// the picker offers picked and every opt-in command accepted, `scaffold workflow`,
// `scaffold complete-drafts` and `scaffold feature-catalog-sync`. Used once to record
// test/fixtures/pre-sdd03c1/ (before the ticket touched `src/`) and on every test run to compare
// against it. Paths only — what the files contain is held by the other goldens.
import fs from 'node:fs';
import path from 'node:path';

import prompts from 'prompts';

import { agents, buildCandidates, buildSingleRepoCandidates, HIDDEN_CANDIDATE_KINDS } from '../../src/commands/agents.js';
import { completeDrafts } from '../../src/commands/complete-drafts.js';
import { featureCatalogSync } from '../../src/commands/feature-catalog-sync.js';
import { workflow } from '../../src/commands/workflow.js';
import { detectStack } from '../../src/steps/02-detect-stack.js';
import { generateDrafts } from '../../src/steps/04-generate-drafts.js';
import { copyFixture, snapshotTree } from './make-repo.js';
import { fixtureDir } from './frozen-kinds.js';
import { silenced } from './mono-snapshot.js';

export const AGENT_DIR = '.claude/agents';
export const COMMAND_DIR = '.claude/commands';

// Every way the CLI can be pointed at the two fixtures: detected mode, `--mode` forcing the
// other one, and the three `--role` values of SINGLE_REPO.
export const VARIANTS = [
  { fixture: 'mono-pnpm' },
  { fixture: 'mono-pnpm', mode: 'single' },
  { fixture: 'single-nuxt' },
  { fixture: 'single-nuxt', role: 'frontend' },
  { fixture: 'single-nuxt', role: 'backend' },
  { fixture: 'single-nuxt', mode: 'mono' },
];

export function variantName({ fixture, mode, role }) {
  return [fixture, mode || 'auto', role].filter(Boolean).join('.');
}

async function run(answers, fn) {
  prompts.inject(answers);
  try {
    return await silenced(fn);
  } finally {
    // Not every prompt is reached on every variant; a leftover answer must not leak into the
    // next run.
    prompts._injected.length = 0;
  }
}

function dirsUnder(root, base = root) {
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(root, entry.name);
    out.push(path.relative(base, abs), ...dirsUnder(abs, base));
  }
  return out;
}

/**
 * The candidates the agent picker offers for this stack, and the prompt answers that come before
 * the picker (MONOREPO: the frontend and backend app pickers, asked only when there are apps).
 */
function offeredFor(stack, role) {
  const offered = (c) => !HIDDEN_CANDIDATE_KINDS.includes(c.kind);
  if (!stack.isMonorepo) {
    return { before: [], candidates: buildSingleRepoCandidates(stack.apps[0], [], role || 'implementer').filter(offered) };
  }
  const web = stack.apps.find((a) => a.path === 'apps/web');
  const api = stack.apps.find((a) => a.path === 'apps/api');
  if (!web || !api) return { before: [], candidates: buildCandidates({}, []).filter(offered) };
  return { before: [[web], [api]], candidates: buildCandidates({ frontend: [web], backend: [api] }, []).filter(offered) };
}

/**
 * `{ dir, offered, agents, commands, files, cafDirs }` for one variant. `offered` is the kinds
 * the picker offers, in order; `agents` and `commands` are the file names in the two
 * directories; `files` is every path the run added to the fixture; `cafDirs` every directory
 * under `.caf/`. All sorted except `offered`.
 */
export async function renderDefaultFileSet({ fixture, mode, role }) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-default-file-set-');
  const original = Object.keys(snapshotTree(dir));
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined, mode }));

  await silenced(() => generateDrafts({ dir, dryRun: false, stack, tracker: { tracker: 'Linear' } }));

  // Answers in prompt order: the app pickers, the agent multiselect, /caf-run-pipeline,
  // /caf-fix-review, /caf-review, then the tracker (asked once, for the auditor and PM commands).
  const { before, candidates } = offeredFor(stack, role);
  await run([...before, candidates, true, true, true, 'Linear'], () => agents({ dir, dryRun: false, mode, role }));
  await silenced(() => workflow({ dir, dryRun: false }));
  // complete-drafts offers `curate baseline` (declined); feature-catalog-sync asks for the
  // architecture when it can't detect one (the TODO strategy).
  await run([false], () => completeDrafts({ dir, dryRun: false, mode }));
  await run(['todo'], () => featureCatalogSync({ dir, dryRun: false, mode }));

  const list = (rel) => (fs.existsSync(path.join(dir, rel)) ? fs.readdirSync(path.join(dir, rel)).sort() : []);
  return {
    dir,
    offered: candidates.map((c) => c.kind),
    agents: list(AGENT_DIR),
    commands: list(COMMAND_DIR),
    files: Object.keys(snapshotTree(dir))
      .filter((rel) => !original.includes(rel))
      .map((rel) => rel.split(path.sep).join('/'))
      .sort(),
    cafDirs: dirsUnder(path.join(dir, '.caf'))
      .map((rel) => rel.split(path.sep).join('/'))
      .sort(),
  };
}
