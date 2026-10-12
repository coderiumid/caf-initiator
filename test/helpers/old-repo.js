// A repo scaffolded before CAF-SDD-03c1: every agent kind a scaffold could write (the six dropped
// ones included) and all 13 commands, then `curate baseline`. Agents come from the real builders
// (renderAgents, every candidate, hidden ones included); commands are the ones recorded in
// test/fixtures/pre-sdd03b3/, which is what such a repo holds. Used once to record
// test/fixtures/pre-sdd03c1/curate-old-repo.*.json (before the ticket touched `src/`) and on
// every test run to prove `curate` treats that repo the same.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prompts from 'prompts';

import { agentsSync } from '../../src/commands/agents-sync.js';
import { audit } from '../../src/commands/audit.js';
import { curateBaseline } from '../../src/commands/curate-baseline.js';
import { workflow } from '../../src/commands/workflow.js';
import { detectStack } from '../../src/steps/02-detect-stack.js';
import { generateDrafts } from '../../src/steps/04-generate-drafts.js';
import { copyFixture, snapshotTree } from './make-repo.js';
import { AGENT_DIR, fixtureDir, renderAgents } from './frozen-kinds.js';
import { silenced } from './mono-snapshot.js';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
export const COMMAND_DIR = '.claude/commands';

/** `{ dir, agents, commands }` — the temp repo, and the file names written to the two directories. */
export async function makeOldRepo(fixture) {
  const dir = copyFixture(fixtureDir(fixture), 'caf-old-repo-');
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  await silenced(() => generateDrafts({ dir, dryRun: false, stack, tracker: { tracker: 'Linear' } }));

  const write = (rel, content) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content, 'utf8');
  };
  const agents = Object.values(await renderAgents(fixture));
  for (const { file, content } of agents) write(path.join(AGENT_DIR, file), content);
  const commands = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, 'pre-sdd03b3', `commands.${fixture}.json`), 'utf8')).files;
  for (const [file, content] of Object.entries(commands)) write(path.join(COMMAND_DIR, file), content);

  await silenced(() => workflow({ dir, dryRun: false }));
  await silenced(() => curateBaseline({ dir, yes: true }));
  return { dir, agents: agents.map((a) => a.file).sort(), commands: Object.keys(commands).sort() };
}

/**
 * What `curate audit`, `curate sync --dry-run` and `curate sync` report for the repo, with the
 * temp dir taken out of every path, plus the file tree before and after the three runs.
 */
export async function curateOldRepo(dir) {
  const relative = (value) => JSON.parse(JSON.stringify(value).split(JSON.stringify(dir).slice(1, -1)).join('<repo>'));
  const before = snapshotTree(dir);
  prompts.inject([]);
  try {
    const { layers, requiredGaps, optionalGaps, declined, sectionCounts } = await silenced(() => audit({ dir }));
    const syncDryRun = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: true }));
    const syncWrite = await silenced(() => agentsSync({ dir, agentDir: AGENT_DIR, dryRun: false }));
    return {
      report: relative({
        audit: { layers, requiredGaps: requiredGaps.length, optionalGaps: optionalGaps.length, declined: declined.length, sectionCounts },
        syncDryRun,
        syncWrite,
      }),
      before,
      after: snapshotTree(dir),
    };
  } finally {
    prompts._injected.length = 0;
  }
}
