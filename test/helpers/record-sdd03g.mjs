// One-off recorder for test/fixtures/pre-sdd03g/ — run from main BEFORE src/ changes; never rerun.
import fs from 'node:fs';
import path from 'node:path';
import { makeKindsRepo, makeDrift, reportKindsRepo, APP_AGENT } from './sdd03g-repo.js';
import { CONTENT_VARIANTS, renderScaffoldContents } from './scaffold-contents.js';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'fixtures', 'pre-sdd03g');
const save = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n');

for (const v of CONTENT_VARIANTS) {
  const r = await renderScaffoldContents(v);
  save(`scaffold.${v.id}.json`, { offered: r.offered, agents: r.agents, commands: r.commands, files: r.files });
}
for (const custom of [true, false]) {
  const { dir, files } = await makeKindsRepo({ custom });
  makeDrift(dir, APP_AGENT);
  save(`curate.${custom ? 'with-custom' : 'known-only'}.json`, { files, ...(await reportKindsRepo(dir)) });
}
