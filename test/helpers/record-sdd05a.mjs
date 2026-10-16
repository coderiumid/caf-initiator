// Records test/fixtures/pre-sdd05a/ (CAF-SDD-05a) from the code as it was before the ticket
// touched `src/`: the planner of both fixtures, /caf-run for every Architect/Documentation/gate
// combination and the .caf/tasks/README.md. Run once; the golden is never regenerated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRunPipelineMd } from '../../src/templates/run-pipeline-command.js';
import { buildTasksReadme } from '../../src/templates/tasks-readme.js';
import { FIXTURE_NAMES, renderAgents } from './frozen-kinds.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'pre-sdd05a');
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');

for (const fixture of FIXTURE_NAMES) {
  const { planner } = await renderAgents(fixture);
  write(`planner.${fixture}.json`, { kind: 'planner', fixture, file: planner.file, content: planner.content });
}

const ROLES = {
  'mono-pnpm': { implementationRoles: ['caf-frontend', 'caf-backend'], appPaths: { 'caf-frontend': ['apps/web'], 'caf-backend': ['apps/api'] } },
  'single-nuxt': { implementationRoles: ['caf-frontend', 'caf-backend'], appPaths: { 'caf-frontend': ['.'], 'caf-backend': ['.'] } },
};
const pipeline = {};
for (const [fixture, roles] of Object.entries(ROLES)) {
  for (const gate of ['validator', 'qa']) {
    for (const hasArchitect of [true, false]) {
      for (const hasDocumentation of [true, false]) {
        const input = { agentDir: '.claude/agents', ...roles, hasArchitect, hasDocumentation, gate };
        const id = `${fixture}.${gate}.${hasArchitect ? 'architect' : 'no-architect'}.${hasDocumentation ? 'docs' : 'no-docs'}`;
        pipeline[id] = { input, content: buildRunPipelineMd(input) };
      }
    }
  }
}
write('run-pipeline.json', pipeline);

write('tasks-readme.json', Object.fromEntries(['Linear', 'Jira', null].map((tracker) => [String(tracker), { input: { tracker }, content: buildTasksReadme({ tracker }) }])));
