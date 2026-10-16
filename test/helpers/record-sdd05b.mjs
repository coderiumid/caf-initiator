// Records test/fixtures/pre-sdd05b/ (CAF-SDD-05b) from the code as it was before the ticket
// touched `src/` (HEAD of CAF-SDD-05a): the planner of both fixtures, /caf-plan and the
// .caf/tasks/README.md. Run once; the golden is never regenerated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildPlanMd } from '../../src/templates/plan-command.js';
import { buildTasksReadme } from '../../src/templates/tasks-readme.js';
import { FIXTURE_NAMES, renderAgents } from './frozen-kinds.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'pre-sdd05b');
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');

for (const fixture of FIXTURE_NAMES) {
  const { planner } = await renderAgents(fixture);
  write(`planner.${fixture}.json`, { kind: 'planner', fixture, file: planner.file, content: planner.content });
}

write('plan-command.json', { input: { agentDir: '.claude/agents' }, content: buildPlanMd({ agentDir: '.claude/agents' }) });

write('tasks-readme.json', Object.fromEntries(['Linear', 'Jira', null].map((tracker) => [String(tracker), { input: { tracker }, content: buildTasksReadme({ tracker }) }])));
