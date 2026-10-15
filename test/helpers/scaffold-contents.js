// The files a default scaffold writes, with their content (CAF-SDD-03c3), through the real
// commands on a temp copy of the fixture (renderDefaultFileSet). Used once, from main before the
// ticket touched `src/`, to record test/fixtures/pre-sdd03c3/, and on every test run to compare.
import fs from 'node:fs';
import path from 'node:path';

import { renderDefaultFileSet } from './default-file-set.js';

// The four ways a scaffold is pointed at the fixtures that the ticket compares.
export const CONTENT_VARIANTS = [
  { id: 'single-nuxt.default', fixture: 'single-nuxt' },
  { id: 'single-nuxt.frontend', fixture: 'single-nuxt', role: 'frontend' },
  { id: 'single-nuxt.backend', fixture: 'single-nuxt', role: 'backend' },
  { id: 'mono-pnpm.default', fixture: 'mono-pnpm' },
];

/** `{ offered, agents, commands, files: { [path]: content } }` of one variant. */
export async function renderScaffoldContents({ fixture, role }) {
  const set = await renderDefaultFileSet({ fixture, role });
  const files = {};
  for (const rel of set.files) files[rel] = fs.readFileSync(path.join(set.dir, rel), 'utf8');
  return { dir: set.dir, offered: set.offered, agents: set.agents, commands: set.commands, files };
}
