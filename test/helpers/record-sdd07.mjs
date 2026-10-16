// Records test/fixtures/pre-sdd07/ (CAF-SDD-07) from the code as it was before the ticket touched
// `src/` (HEAD dddb1e8, on top of CAF-SDD-06): frontend, backend, implementer, reviewer and
// validator, rendered without `## Skills`. Run once; the golden is never regenerated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FIXTURE_NAMES, fixtureDir, renderAgents } from './frozen-kinds.js';
import { renderImplementationAgents } from './implementation-agents.js';
import { buildValidatorAgent } from '../../src/commands/agents.js';
import { detectStack } from '../../src/steps/02-detect-stack.js';
import { silenced } from './mono-snapshot.js';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'pre-sdd07');
fs.mkdirSync(OUT, { recursive: true });
const write = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');

for (const [id, a] of Object.entries(await renderImplementationAgents())) {
  write(`${id}.json`, { id, kind: a.kind, fixture: a.fixture, file: a.file, content: a.content });
}
for (const fixture of FIXTURE_NAMES) {
  const { reviewer } = await renderAgents(fixture);
  write(`reviewer.${fixture}.json`, { kind: 'reviewer', fixture, file: reviewer.file, content: reviewer.content });
  const dir = fixtureDir(fixture);
  const stack = await silenced(() => detectStack({ dir, explicitGlobs: undefined }));
  const validator = buildValidatorAgent(dir, stack);
  write(`validator.${fixture}.json`, { kind: 'validator', fixture, file: validator.file, content: validator.content });
}
