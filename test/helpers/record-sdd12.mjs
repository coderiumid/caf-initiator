// Records test/fixtures/pre-sdd12/ (CAF-SDD-12) from the code as it was before the ticket touched
// `src/` (HEAD of CAF-SDD-11): the planner of both fixtures, and the `## Output` of every kind the
// fixtures render. Run once; the golden is never regenerated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIXTURE_NAMES, renderAgents, trackedSections } from './frozen-kinds.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'pre-sdd12');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');

for (const fixture of FIXTURE_NAMES) {
  const agents = await renderAgents(fixture);
  const { planner } = agents;
  write(`planner.${fixture}.json`, { kind: 'planner', fixture, file: planner.file, content: planner.content });
  const outputs = {};
  for (const [kind, a] of Object.entries(agents)) outputs[kind] = trackedSections(a.content).Output ?? null;
  write(`output-by-kind.${fixture}.json`, { fixture, outputs });
}
