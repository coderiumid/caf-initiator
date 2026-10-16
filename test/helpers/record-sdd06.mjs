// Records test/fixtures/pre-sdd06/ (CAF-SDD-06) from the code as it was before the ticket
// touched `src/` (HEAD of main 2d3adab): the planner of both fixtures and the default
// .caf/workflows/agent-handoff.md of both. Run once; the golden is never regenerated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIXTURE_NAMES, renderAgents } from './frozen-kinds.js';
import { renderDefaultFileSet } from './default-file-set.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'pre-sdd06');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');

for (const fixture of FIXTURE_NAMES) {
  const { planner } = await renderAgents(fixture);
  write(`planner.${fixture}.json`, { kind: 'planner', fixture, file: planner.file, content: planner.content });

  const set = await renderDefaultFileSet({ fixture });
  const rel = '.caf/workflows/agent-handoff.md';
  write(`agent-handoff.${fixture}.json`, { fixture, file: rel, content: fs.readFileSync(path.join(set.dir, rel), 'utf8') });
}
