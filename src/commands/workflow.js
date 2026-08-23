import path from 'node:path';
import kleur from 'kleur';

import { section, writeIfAbsent } from '../util.js';
import { readAgentRoster } from '../utils/read-agent-roster.js';
import { readMaxRetries } from '../utils/read-caf-config.js';
import { buildPivWorkflowMd } from '../templates/piv-workflow-md.js';
import { buildAgentHandoffMd } from '../templates/agent-handoff-md.js';

export async function workflow({ dir, agentDir: agentDirOpt, dryRun = false }) {
  section('workflow — draft .caf/workflows/piv-workflow.md and agent-handoff.md from detected agent roster');

  const agentDirRel = agentDirOpt || '.claude/agents';
  const agentDirPath = path.join(dir, agentDirRel);

  const roster = readAgentRoster(agentDirPath);
  if (!roster) {
    console.log(
      kleur.red(
        `No agent definitions found in ${agentDirPath}. Run \`caf-init scaffold agents\` first.`
      )
    );
    return { written: [], skipped: [] };
  }

  const qaRetries = readMaxRetries(dir, 'qa');
  const reviewerRetries = readMaxRetries(dir, 'reviewer');

  const workflowDirPath = path.join(dir, '.caf/workflows');

  const pivContent = buildPivWorkflowMd({
    agentDir: agentDirRel,
    roster,
    qaRetries,
    reviewerRetries,
  });
  const handoffContent = buildAgentHandoffMd({ roster });

  console.log('');
  const written = [];
  const skipped = [];
  const pivPath = path.join(workflowDirPath, 'piv-workflow.md');
  const handoffPath = path.join(workflowDirPath, 'agent-handoff.md');

  const pivResult = writeIfAbsent(pivPath, pivContent, { dryRun });
  if (pivResult === 'written') written.push(pivPath);
  else if (pivResult === 'skipped') skipped.push(pivPath);

  const handoffResult = writeIfAbsent(handoffPath, handoffContent, { dryRun });
  if (handoffResult === 'written') written.push(handoffPath);
  else if (handoffResult === 'skipped') skipped.push(handoffPath);

  console.log('');
  if (written.length === 0) {
    console.log(kleur.dim('no new files written — all already exist'));
  } else {
    console.log(kleur.green(`generated ${written.length} workflow draft(s) in ${workflowDirPath}`));
    for (const filePath of written) {
      console.log(`  - ${filePath}`);
    }
  }

  return { written, skipped };
}
