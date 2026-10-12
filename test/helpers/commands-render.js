// Renders every slash command the CLI can write for a fixture (CAF-SDD-03b3), through the real
// commands — `scaffold agents` with every offered agent picked and every opt-in command accepted,
// then `scaffold complete-drafts` and `scaffold feature-catalog-sync` — on a temp copy of the
// fixture. Used once to record test/fixtures/pre-sdd03b3/ (before the ticket touched `src/`) and
// on every test run to compare against it.
import fs from 'node:fs';
import path from 'node:path';

import prompts from 'prompts';

import { agents, buildCandidates, buildSingleRepoCandidates, HIDDEN_CANDIDATE_KINDS } from '../../src/commands/agents.js';
import { completeDrafts } from '../../src/commands/complete-drafts.js';
import { featureCatalogSync } from '../../src/commands/feature-catalog-sync.js';
import { detectStack } from '../../src/steps/02-detect-stack.js';
import { copyFixture } from './make-repo.js';
import { fixtureDir } from './frozen-kinds.js';
import { silenced } from './mono-snapshot.js';

export const COMMAND_DIR = '.claude/commands';

async function run(answers, fn) {
  prompts.inject(answers);
  try {
    return await silenced(fn);
  } finally {
    // Not every prompt is reached on every fixture; a leftover answer must not leak into the
    // next run.
    prompts._injected.length = 0;
  }
}

/**
 * `{ dir, files }` — `files` is `{ 'caf-x.md': content }` for everything in `.claude/commands/`
 * after a full default scaffold, in file-name order. `dir` is the temp repo it was written to.
 * `role` is `--role` (SINGLE_REPO only).
 */
export async function renderCommands(fixture, { role } = {}) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-commands-render-');
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const offered = (c) => !HIDDEN_CANDIDATE_KINDS.includes(c.kind);

  // Answers in prompt order: (MONOREPO only) frontend apps, backend apps; agent multiselect;
  // /caf-run-pipeline, /caf-fix-review, /caf-review; then the tracker, asked once for the
  // auditor and PM commands.
  let answers;
  if (stack.isMonorepo) {
    const web = stack.apps.find((a) => a.path === 'apps/web');
    const api = stack.apps.find((a) => a.path === 'apps/api');
    answers = [[web], [api], buildCandidates({ frontend: [web], backend: [api] }, []).filter(offered), true, true, true, 'Linear'];
  } else {
    answers = [buildSingleRepoCandidates(stack.apps[0], [], role || 'implementer').filter(offered), true, true, true, 'Linear'];
  }
  await run(answers, () => agents({ dir, dryRun: false, role }));
  // complete-drafts offers `curate baseline` (declined); feature-catalog-sync asks for the
  // architecture when it can't detect one (the TODO strategy).
  await run([false], () => completeDrafts({ dir, dryRun: false }));
  await run(['todo'], () => featureCatalogSync({ dir, dryRun: false }));

  const commandDir = path.join(dir, COMMAND_DIR);
  const files = {};
  for (const name of fs.readdirSync(commandDir).sort()) {
    files[name] = fs.readFileSync(path.join(commandDir, name), 'utf8');
  }
  return { dir, files };
}

/** `[{ header, body }]` for every `## ` section of a command file, fence-aware; `preamble` first. */
export function commandSections(content) {
  const out = [{ header: null, lines: [] }];
  let inFence = false;
  for (const line of content.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (!inFence && /^## /.test(line)) out.push({ header: line.slice(3), lines: [] });
    else out[out.length - 1].lines.push(line);
  }
  return out.map(({ header, lines }) => ({ header, body: lines.join('\n') }));
}
